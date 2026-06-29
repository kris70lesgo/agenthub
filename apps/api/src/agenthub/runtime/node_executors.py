import asyncio
import hashlib
import hmac
import json
from collections.abc import Mapping
from typing import Literal
from urllib.parse import urlparse
from uuid import UUID

import httpx
from pydantic import BaseModel, Field, ValidationError, field_validator
from sqlalchemy import select

from agenthub.agents.base import AgentResult
from agenthub.database.session import get_session_factory
from agenthub.memory.workflow import WorkflowMemory
from agenthub.models import WorkflowMemoryRecord
from agenthub.schemas.workflows import WorkflowNodeInput


class RuntimeExecutionState(BaseModel):
    run_id: str
    goal: str
    language: str
    memory: WorkflowMemory
    payment_confirmations: dict[str, str] = Field(default_factory=dict)


class HttpRequestConfig(BaseModel):
    method: Literal["GET", "POST", "PUT", "PATCH", "DELETE"] = "GET"
    url: str
    headers: dict[str, str] = Field(default_factory=dict)
    query: dict[str, str | int | float | bool] = Field(default_factory=dict)
    json_body: object | None = None
    bearer_token: str | None = None
    api_key_header: str | None = None
    api_key_value: str | None = None
    timeout_seconds: float = Field(default=30, gt=0, le=120)
    retry_count: int = Field(default=0, ge=0, le=5)

    @field_validator("url")
    @classmethod
    def validate_url(cls, value: str) -> str:
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("API node requires an absolute http(s) URL.")
        return value


class WebhookConfig(BaseModel):
    url: str
    method: Literal["POST", "PUT", "PATCH"] = "POST"
    headers: dict[str, str] = Field(default_factory=dict)
    secret: str | None = None
    timeout_seconds: float = Field(default=20, gt=0, le=120)
    retry_count: int = Field(default=0, ge=0, le=5)

    @field_validator("url")
    @classmethod
    def validate_url(cls, value: str) -> str:
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("Webhook node requires an absolute http(s) URL.")
        return value


class DelayConfig(BaseModel):
    seconds: float = Field(default=1, ge=0, le=86_400)


class ConditionConfig(BaseModel):
    left: str = "$.goal"
    operator: Literal["exists", "equals", "not_equals", "contains", "gt", "gte", "lt", "lte"] = "exists"
    right: object | None = None


class MemoryConfig(BaseModel):
    operation: Literal["snapshot", "recall", "write"] = "snapshot"
    namespace: str = "default"
    key: str | None = None
    value: object | None = None


async def execute_runtime_node(node: WorkflowNodeInput, state: RuntimeExecutionState) -> AgentResult:
    if node.kind == "trigger":
        return _trigger_result(state)
    if node.kind == "api":
        return await _api_result(node, state)
    if node.kind == "webhook":
        return await _webhook_result(node, state)
    if node.kind == "delay":
        return await _delay_result(node, state)
    if node.kind in {"condition", "decision"}:
        return _condition_result(node, state)
    if node.kind == "memory":
        return await _memory_result(node, state)
    if node.kind == "approval":
        return _approval_result(node, state)
    if node.kind == "output":
        return _output_result(state)
    if node.kind == "payment":
        return _payment_result(node, state)
    if node.kind == "custom":
        raise LookupError(
            "Custom Agent node requires a registered plugin executor. Configure Phase 16 before using it."
        )
    raise LookupError(f"No executor is registered for node kind '{node.kind}'.")


def _trigger_result(state: RuntimeExecutionState) -> AgentResult:
    output: dict[str, object] = {"goal": state.goal, "language": state.language}
    return AgentResult(
        output=output,
        summary="Workflow trigger accepted the user goal.",
        logs=["Trigger event captured"],
    )


async def _api_result(node: WorkflowNodeInput, state: RuntimeExecutionState) -> AgentResult:
    config = _parse_config(HttpRequestConfig, node.configuration, "API")
    headers = dict(config.headers)
    if config.bearer_token:
        headers["Authorization"] = f"Bearer {config.bearer_token}"
    if config.api_key_header and config.api_key_value:
        headers[config.api_key_header] = config.api_key_value
    body = config.json_body if config.json_body is not None else state.memory.snapshot()
    response = await _request_with_retries(
        method=config.method,
        url=config.url,
        headers=headers,
        params=config.query,
        json_body=None if config.method == "GET" else body,
        timeout_seconds=config.timeout_seconds,
        retry_count=config.retry_count,
    )
    payload = _response_payload(response)
    output = {
        "request": {
            "method": config.method,
            "url": _redact_url(config.url),
            "query": config.query,
        },
        "response": payload,
    }
    return AgentResult(
        output=output,
        summary=f"HTTP {config.method} completed with status {response.status_code}.",
        logs=[
            f"HTTP {config.method} {_redact_url(config.url)}",
            f"Status: {response.status_code}",
            f"Content-Type: {response.headers.get('content-type', 'unknown')}",
        ],
        memory_mb=_estimate_object_memory(output),
        telemetry={"status_code": response.status_code, "url": _redact_url(config.url)},
    )


async def _webhook_result(node: WorkflowNodeInput, state: RuntimeExecutionState) -> AgentResult:
    config = _parse_config(WebhookConfig, node.configuration, "Webhook")
    body = {
        "workflow": {
            "goal": state.goal,
            "language": state.language,
        },
        "node": node.model_dump(mode="json"),
        "memory": state.memory.snapshot(),
    }
    headers = {"Content-Type": "application/json", **config.headers}
    if config.secret:
        encoded_body = json.dumps(body, separators=(",", ":"), default=str).encode()
        signature = hmac.new(config.secret.encode(), encoded_body, hashlib.sha256).hexdigest()
        headers["X-AgentHub-Signature-256"] = f"sha256={signature}"
    response = await _request_with_retries(
        method=config.method,
        url=config.url,
        headers=headers,
        params={},
        json_body=body,
        timeout_seconds=config.timeout_seconds,
        retry_count=config.retry_count,
    )
    output = {"delivery": _response_payload(response)}
    return AgentResult(
        output=output,
        summary=f"Webhook delivered with status {response.status_code}.",
        logs=[f"Webhook {config.method} {_redact_url(config.url)}", f"Status: {response.status_code}"],
        memory_mb=_estimate_object_memory(output),
        telemetry={"status_code": response.status_code, "url": _redact_url(config.url)},
    )


async def _delay_result(node: WorkflowNodeInput, state: RuntimeExecutionState) -> AgentResult:
    config = _parse_config(DelayConfig, node.configuration, "Delay")
    await asyncio.sleep(config.seconds)
    output = {
        "delayed_seconds": config.seconds,
        "latest_memory": state.memory.execution_history[-1].model_dump(mode="json")
        if state.memory.execution_history
        else None,
    }
    return AgentResult(
        output=output,
        summary=f"Delayed execution for {config.seconds:g} seconds.",
        logs=[f"Delay completed after {config.seconds:g}s"],
    )


def _condition_result(node: WorkflowNodeInput, state: RuntimeExecutionState) -> AgentResult:
    config = _parse_config(ConditionConfig, node.configuration, "Condition")
    context = state.memory.snapshot() | {"goal": state.goal, "language": state.language}
    left = _lookup_json_path(context, config.left)
    matched = _evaluate(left, config.operator, config.right)
    output = {
        "matched": matched,
        "left": left,
        "operator": config.operator,
        "right": config.right,
        "branch": "true" if matched else "false",
    }
    return AgentResult(
        output=output,
        summary=f"{node.label} evaluated to {'true' if matched else 'false'}.",
        logs=[f"Condition {config.left} {config.operator} {config.right!r} => {matched}"],
    )


async def _memory_result(node: WorkflowNodeInput, state: RuntimeExecutionState) -> AgentResult:
    config = _parse_config(MemoryConfig, node.configuration, "Memory")
    snapshot = state.memory.snapshot()
    if config.operation == "recall" and config.key:
        persisted_value = await _recall_memory(config.namespace, config.key)
        output = {
            "namespace": config.namespace,
            "key": config.key,
            "value": persisted_value
            if persisted_value is not None
            else _lookup_json_path(snapshot, config.key),
            "source": "postgres" if persisted_value is not None else "workflow",
        }
        summary = f"Recalled memory value for {config.namespace}/{config.key}."
    elif config.operation == "write" and config.key:
        value = _memory_value(config.value)
        await _write_memory(
            namespace=config.namespace,
            key=config.key,
            value=value,
            run_id=state.run_id,
            node_id=node.id,
        )
        output = {"namespace": config.namespace, "key": config.key, "value": value}
        summary = f"Persisted memory value for {config.namespace}/{config.key}."
    else:
        output = snapshot
        summary = "Workflow memory snapshot captured."
    return AgentResult(output=output, summary=summary, logs=[f"Memory operation: {config.operation}"])


async def _recall_memory(namespace: str, key: str) -> dict[str, object] | None:
    session_factory = get_session_factory()
    async with session_factory() as session:
        record = await session.scalar(
            select(WorkflowMemoryRecord).where(
                WorkflowMemoryRecord.namespace == namespace,
                WorkflowMemoryRecord.memory_key == key,
            )
        )
        return dict(record.value) if record else None


async def _write_memory(
    *,
    namespace: str,
    key: str,
    value: dict[str, object],
    run_id: str,
    node_id: str,
) -> None:
    session_factory = get_session_factory()
    async with session_factory() as session:
        record = await session.scalar(
            select(WorkflowMemoryRecord).where(
                WorkflowMemoryRecord.namespace == namespace,
                WorkflowMemoryRecord.memory_key == key,
            )
        )
        if record is None:
            record = WorkflowMemoryRecord(
                namespace=namespace,
                memory_key=key,
                value=value,
                source_run_id=UUID(run_id),
                source_node_key=node_id,
            )
            session.add(record)
        else:
            record.value = value
            record.source_run_id = UUID(run_id)
            record.source_node_key = node_id
        await session.commit()


def _memory_value(value: object) -> dict[str, object]:
    if isinstance(value, dict):
        return {str(key): item for key, item in value.items()}
    return {"value": value}


def _approval_result(node: WorkflowNodeInput, state: RuntimeExecutionState) -> AgentResult:
    output = {
        "approved": True,
        "mode": "operator-resumed",
        "reason": "The workflow was resumed after the approval gate paused execution.",
        "memory": state.memory.snapshot(),
    }
    return AgentResult(
        output=output,
        summary=f"{node.label} approved by operator resume.",
        logs=["Human approval gate resumed by operator action."],
    )


def _payment_result(node: WorkflowNodeInput, state: RuntimeExecutionState) -> AgentResult:
    transaction_hash = state.payment_confirmations.get(node.id)
    if not transaction_hash:
        raise LookupError("Payment node requires a confirmed Casper transaction hash before continuing.")
    amount_motes = node.configuration.get("amount_motes")
    recipient = node.configuration.get("recipient_public_key")
    output = {
        "transaction_hash": transaction_hash,
        "recipient_public_key": recipient,
        "amount_motes": amount_motes,
        "network": "casper-test",
    }
    return AgentResult(
        output=output,
        summary=f"Casper payment confirmed · {transaction_hash}",
        logs=["Wallet-signed Casper transfer confirmed before workflow continuation."],
    )


def _output_result(state: RuntimeExecutionState) -> AgentResult:
    output = {"final_memory": state.memory.snapshot()}
    return AgentResult(
        output=output,
        summary="Workflow outputs consolidated.",
        logs=["Output artifact assembled from workflow memory"],
        memory_mb=_estimate_object_memory(output),
    )


async def _request_with_retries(
    *,
    method: str,
    url: str,
    headers: Mapping[str, str],
    params: Mapping[str, str | int | float | bool],
    json_body: object | None,
    timeout_seconds: float,
    retry_count: int,
) -> httpx.Response:
    last_error: Exception | None = None
    for attempt in range(retry_count + 1):
        try:
            async with httpx.AsyncClient(timeout=timeout_seconds, follow_redirects=True) as client:
                response = await client.request(
                    method,
                    url,
                    headers=dict(headers),
                    params=dict(params),
                    json=json_body,
                )
                response.raise_for_status()
                return response
        except httpx.HTTPError as exc:
            last_error = exc
            if attempt >= retry_count:
                raise RuntimeError(f"HTTP request failed: {exc}") from exc
            await asyncio.sleep(min(2**attempt, 8))
    raise RuntimeError(f"HTTP request failed: {last_error}")


def _response_payload(response: httpx.Response) -> dict[str, object]:
    content_type = response.headers.get("content-type", "")
    body: object
    if "application/json" in content_type:
        body = response.json()
    else:
        text = response.text
        body = text[:20_000]
    return {
        "status_code": response.status_code,
        "headers": _safe_headers(response.headers),
        "body": body,
    }


def _safe_headers(headers: httpx.Headers) -> dict[str, str]:
    redacted = {"authorization", "cookie", "set-cookie", "x-api-key"}
    return {
        key: "***REDACTED***" if key.lower() in redacted else value
        for key, value in headers.items()
    }


def _parse_config[T: BaseModel](
    model: type[T],
    configuration: dict[str, object],
    node_name: str,
) -> T:
    try:
        return model.model_validate(configuration)
    except ValidationError as exc:
        raise ValueError(f"{node_name} node configuration is invalid: {exc.errors()}") from exc


def _lookup_json_path(value: object, path: str) -> object:
    parts = path[2:].split(".") if path.startswith("$.") else path.split(".")
    current: object = value
    for part in parts:
        if isinstance(current, dict):
            current = current.get(part)
        elif isinstance(current, list) and part.isdigit():
            current = current[int(part)]
        else:
            return None
    return current


def _evaluate(left: object, operator: str, right: object) -> bool:
    if operator == "exists":
        return left is not None
    if operator == "equals":
        return left == right
    if operator == "not_equals":
        return left != right
    if operator == "contains":
        return str(right) in str(left)
    if operator in {"gt", "gte", "lt", "lte"}:
        left_number = _to_float(left)
        right_number = _to_float(right)
        if operator == "gt":
            return left_number > right_number
        if operator == "gte":
            return left_number >= right_number
        if operator == "lt":
            return left_number < right_number
        return left_number <= right_number
    raise ValueError(f"Unsupported condition operator: {operator}")


def _to_float(value: object) -> float:
    if isinstance(value, int | float):
        return float(value)
    if isinstance(value, str):
        return float(value)
    raise ValueError(f"Value {value!r} is not numeric.")


def _redact_url(url: str) -> str:
    parsed = urlparse(url)
    return parsed._replace(query="").geturl()


def _estimate_object_memory(value: object) -> int:
    return max(32, min(512, 32 + len(json.dumps(value, default=str)) // 256))
