import asyncio
import json
from collections.abc import AsyncIterator, Mapping
from typing import Protocol, TypeVar

import httpx
from pydantic import BaseModel, ValidationError

from agenthub.config.settings import Settings

TOutput = TypeVar("TOutput", bound=BaseModel)


class LLMError(RuntimeError):
    def __init__(self, message: str, *, recoverable: bool = True) -> None:
        super().__init__(message)
        self.recoverable = recoverable


class LLMRequest(BaseModel):
    system_prompt: str
    developer_prompt: str
    user_prompt: str
    temperature: float = 0.3
    timeout_seconds: int = 45
    metadata: dict[str, str] = {}


class LLMResponse(BaseModel):
    output: BaseModel
    raw_text: str
    provider: str
    model: str
    latency_ms: int
    input_tokens: int
    output_tokens: int
    cost_estimate: float


class LLMStreamChunk(BaseModel):
    text: str
    index: int
    is_final: bool = False


class LLMProvider(Protocol):
    async def generate(self, request: LLMRequest) -> str: ...

    def stream(self, request: LLMRequest) -> AsyncIterator[LLMStreamChunk]: ...

    async def structured(self, request: LLMRequest, output_model: type[TOutput]) -> LLMResponse: ...

    async def generate_structured(self, request: LLMRequest, output_model: type[TOutput]) -> LLMResponse: ...

    async def health(self) -> str: ...


class NvidiaProvider:
    def __init__(self, settings: Settings) -> None:
        if not settings.nvidia_api_key:
            raise LLMError("NVIDIA_API_KEY is not configured.", recoverable=False)
        self._api_key = settings.nvidia_api_key
        self._model = settings.nvidia_model
        self._base_url = settings.nvidia_base_url.rstrip("/")

    async def generate(self, request: LLMRequest) -> str:
        body, _ = await self._chat_completion(request, output_model=None)
        return _extract_openai_message_content(body)

    async def structured(self, request: LLMRequest, output_model: type[TOutput]) -> LLMResponse:
        started = asyncio.get_running_loop().time()
        body, raw_text = await self._chat_completion(request, output_model=output_model)
        latency_ms = int((asyncio.get_running_loop().time() - started) * 1000)
        parsed = _try_parse_structured_output(raw_text, output_model)
        if parsed is None:
            raw_text = await self._repair_structured_output(
                request=request,
                raw_text=raw_text,
                output_model=output_model,
            )
            parsed = _parse_structured_output(raw_text, output_model, provider_name="NVIDIA")
        usage = body.get("usage") if isinstance(body, dict) else None
        input_tokens = _int_from_mapping(usage, "prompt_tokens")
        output_tokens = _int_from_mapping(usage, "completion_tokens")
        return LLMResponse(
            output=parsed,
            raw_text=raw_text,
            provider="nvidia",
            model=self._model,
            latency_ms=latency_ms,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost_estimate=0,
        )

    async def generate_structured(self, request: LLMRequest, output_model: type[TOutput]) -> LLMResponse:
        return await self.structured(request, output_model)

    async def stream(self, request: LLMRequest) -> AsyncIterator[LLMStreamChunk]:
        text = await self.generate(request)
        yield LLMStreamChunk(text=text, index=0, is_final=True)

    async def health(self) -> str:
        return "configured"

    async def _chat_completion(
        self, request: LLMRequest, output_model: type[BaseModel] | None
    ) -> tuple[dict[str, object], str]:
        schema = output_model.model_json_schema() if output_model is not None else {}
        system_content = "\n\n".join(
            [
                request.system_prompt,
                f"Developer instructions:\n{request.developer_prompt}",
                (
                    "Return only valid JSON matching the provided schema."
                    if output_model is not None
                    else "Return a concise, useful response."
                ),
            ]
        )
        user_content = "\n\n".join(
            [
                f"Runtime metadata:\n{_format_metadata(request.metadata)}",
                f"User/request payload:\n{request.user_prompt}",
            ]
        )
        payload: dict[str, object] = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": system_content},
                {"role": "user", "content": user_content},
            ],
            "temperature": request.temperature,
            "max_tokens": 4096,
        }
        if output_model is not None:
            payload["response_format"] = {
                "type": "json_schema",
                "json_schema": {
                    "name": output_model.__name__,
                    "schema": schema,
                    "strict": True,
                },
            }
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
        response = await self._post_with_retries(
            payload=payload,
            headers=headers,
            timeout_seconds=request.timeout_seconds,
        )
        if response.status_code >= 400 and response.status_code < 500:
            fallback_payload: dict[str, object] = {
                "model": self._model,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            system_content
                            + "\n\nYou must respond with raw JSON only. Do not wrap it in markdown."
                        ),
                    },
                    {"role": "user", "content": user_content},
                ],
                "temperature": request.temperature,
                "max_tokens": 4096,
            }
            response = await self._post_with_retries(
                payload=fallback_payload,
                headers=headers,
                timeout_seconds=request.timeout_seconds,
            )
        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            detail = _response_error_detail(exc.response)
            raise LLMError(f"NVIDIA request failed ({exc.response.status_code}): {detail}") from exc

        body = _cast_response_body(response.json())
        raw_text = _extract_openai_message_content(body)
        return body, raw_text

    async def _post_with_retries(
        self,
        *,
        payload: dict[str, object],
        headers: dict[str, str],
        timeout_seconds: int,
        attempts: int = 2,
    ) -> httpx.Response:
        last_error: httpx.HTTPError | TimeoutError | None = None
        for attempt in range(attempts):
            try:
                async with httpx.AsyncClient(timeout=timeout_seconds) as client:
                    return await client.post(
                        f"{self._base_url}/chat/completions",
                        headers=headers,
                        json=payload,
                    )
            except TimeoutError as exc:
                last_error = exc
            except httpx.TimeoutException as exc:
                last_error = exc
            except httpx.TransportError as exc:
                last_error = exc
            if attempt < attempts - 1:
                await asyncio.sleep(0.75 * (attempt + 1))
        if isinstance(last_error, httpx.TimeoutException | TimeoutError):
            raise LLMError(f"NVIDIA request timed out after {timeout_seconds}s.") from last_error
        if isinstance(last_error, httpx.HTTPError):
            detail = str(last_error) or last_error.__class__.__name__
            raise LLMError(f"NVIDIA request failed: {detail}") from last_error
        raise LLMError("NVIDIA request failed before a response was returned.")

    async def _repair_structured_output(
        self,
        *,
        request: LLMRequest,
        raw_text: str,
        output_model: type[TOutput],
    ) -> str:
        schema = json.dumps(output_model.model_json_schema(), indent=2)
        repair_request = LLMRequest(
            system_prompt=(
                "You are a strict JSON repair service. Convert the supplied model "
                "output into one valid JSON object matching the supplied schema."
            ),
            developer_prompt=(
                "Return raw JSON only. Do not use markdown. Do not explain. "
                "If a required field is missing, infer the safest value from the "
                "original output and request context."
            ),
            user_prompt=json.dumps(
                {
                    "schema": schema,
                    "original_request": request.user_prompt,
                    "invalid_output": raw_text,
                },
                indent=2,
            ),
            temperature=0,
            timeout_seconds=request.timeout_seconds,
            metadata={**request.metadata, "repair": "structured_output"},
        )
        _, repaired_text = await self._chat_completion(repair_request, output_model=None)
        return repaired_text


def _format_metadata(metadata: Mapping[str, str]) -> str:
    if not metadata:
        return "No additional metadata."
    return "\n".join(f"- {key}: {value}" for key, value in sorted(metadata.items()))


def _extract_openai_message_content(body: object) -> str:
    if not isinstance(body, dict):
        raise LLMError("NVIDIA returned a non-object response.")
    choices = body.get("choices")
    if not isinstance(choices, list) or not choices:
        raise LLMError("NVIDIA response did not include choices.")
    first = choices[0]
    if not isinstance(first, dict):
        raise LLMError("NVIDIA response choice was malformed.")
    message = first.get("message")
    if not isinstance(message, dict):
        raise LLMError("NVIDIA response did not include a message.")
    content = message.get("content")
    if not isinstance(content, str) or not content.strip():
        raise LLMError("NVIDIA response message was empty.")
    return content


def _parse_structured_output[TParsedOutput: BaseModel](
    raw_text: str, output_model: type[TParsedOutput], *, provider_name: str
) -> TParsedOutput:
    parsed = _try_parse_structured_output(raw_text, output_model)
    if parsed is not None:
        return parsed
    raise LLMError(f"{provider_name} returned invalid structured output.")


def _try_parse_structured_output[TParsedOutput: BaseModel](
    raw_text: str, output_model: type[TParsedOutput]
) -> TParsedOutput | None:
    candidates = [raw_text, _strip_markdown_json(raw_text), *_extract_json_candidates(raw_text)]
    for candidate in candidates:
        try:
            return output_model.model_validate_json(candidate)
        except ValidationError:
            try:
                return output_model.model_validate(json.loads(candidate))
            except (json.JSONDecodeError, ValidationError):
                continue
    return None


def _extract_json_candidates(raw_text: str) -> list[str]:
    stripped = _strip_markdown_json(raw_text)
    candidates: list[str] = []
    for opening, closing in [("{", "}"), ("[", "]")]:
        start = stripped.find(opening)
        end = stripped.rfind(closing)
        if start >= 0 and end > start:
            candidates.append(stripped[start : end + 1])
    return candidates


def _strip_markdown_json(raw_text: str) -> str:
    stripped = raw_text.strip()
    if not stripped.startswith("```"):
        return stripped
    lines = stripped.splitlines()
    if lines and lines[0].startswith("```"):
        lines = lines[1:]
    if lines and lines[-1].startswith("```"):
        lines = lines[:-1]
    return "\n".join(lines).strip()


def _response_error_detail(response: httpx.Response) -> str:
    try:
        body = response.json()
    except ValueError:
        return response.text[:500]
    if isinstance(body, dict):
        error = body.get("error")
        if isinstance(error, dict):
            message = error.get("message")
            if isinstance(message, str):
                return message
        detail = body.get("detail")
        if isinstance(detail, str):
            return detail
    return str(body)[:500]


def _int_from_mapping(mapping: object, key: str) -> int:
    if isinstance(mapping, dict):
        value = mapping.get(key)
        if isinstance(value, int):
            return value
    return 0


def _cast_response_body(body: object) -> dict[str, object]:
    if not isinstance(body, dict):
        raise LLMError("Provider returned a non-object response.")
    return {str(key): value for key, value in body.items()}
