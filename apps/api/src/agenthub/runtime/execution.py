import asyncio
import random
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from time import monotonic
from typing import TYPE_CHECKING, Protocol, TypedDict, cast
from uuid import UUID

from langgraph.graph import END, START, StateGraph

from agenthub.agents.ai import AGENT_DEFINITIONS, get_agent
from agenthub.agents.base import AgentInvocation, AgentResult
from agenthub.database.session import get_session_factory
from agenthub.events.broker import event_broker
from agenthub.memory.workflow import WorkflowMemory
from agenthub.models import ExecutionEvent, ExecutionLog, WorkflowRun
from agenthub.repositories.sqlalchemy import ExecutionRepository, RunRepository, WorkflowRepository
from agenthub.runtime.node_executors import RuntimeExecutionState, execute_runtime_node
from agenthub.runtime.validation import validate_and_order
from agenthub.schemas.runtime import ExecutionEventResponse
from agenthub.schemas.workflows import (
    NodeKind,
    Position,
    WorkflowCreate,
    WorkflowEdgeInput,
    WorkflowNodeInput,
)

if TYPE_CHECKING:
    from agenthub.models import Workflow

TERMINAL_STATUSES = {"completed", "stopped", "failed"}


class ExecutionGraphState(TypedDict):
    run_id: str
    goal: str
    language: str
    completed_count: int
    total_count: int
    order: list[str]
    memory: WorkflowMemory


class CompiledExecutionGraph(Protocol):
    async def ainvoke(self, input: ExecutionGraphState) -> ExecutionGraphState: ...


@dataclass
class RunControl:
    resume_event: asyncio.Event = field(default_factory=asyncio.Event)
    stop_requested: bool = False
    fail_requested: str | None = None
    skip_requested: bool = False
    retries: dict[str, int] = field(default_factory=dict)
    payment_confirmations: dict[str, str] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.resume_event.set()


class ExecutionCoordinator:
    def __init__(self) -> None:
        self._tasks: dict[UUID, asyncio.Task[None]] = {}
        self._controls: dict[UUID, RunControl] = {}
        self._event_locks: dict[UUID, asyncio.Lock] = {}

    async def start(
        self,
        workflow_id: UUID,
        speed: float,
        random_failures: bool,
        *,
        goal: str = "",
        language: str = "English",
    ) -> WorkflowRun:
        session_factory = get_session_factory()
        async with session_factory() as session:
            workflow = await WorkflowRepository(session).get(workflow_id)
            if workflow is None:
                raise LookupError("Workflow not found.")
            definition = workflow_to_request(workflow)
            validate_and_order(definition)
            run = WorkflowRun(
                workflow_id=workflow_id,
                status="queued",
                speed=speed,
                random_failures=random_failures,
                goal=goal or _default_goal(definition),
                language=language or "English",
                progress=0,
            )
            await RunRepository(session).add(run)
        control = RunControl()
        self._controls[run.id] = control
        self._event_locks[run.id] = asyncio.Lock()
        self._tasks[run.id] = asyncio.create_task(self._execute(run.id), name=f"workflow-run-{run.id}")
        return run

    async def pause(self, run_id: UUID) -> None:
        control = self._get_control(run_id)
        control.resume_event.clear()
        await self._set_run_status(run_id, "paused")
        await self._emit(run_id, "run.paused", "Workflow paused", "paused", "warning")

    async def resume(self, run_id: UUID) -> None:
        control = self._get_control(run_id)
        control.resume_event.set()
        await self._set_run_status(run_id, "running")
        await self._emit(run_id, "run.resumed", "Workflow resumed", "running", "info")

    async def stop(self, run_id: UUID) -> None:
        control = self._get_control(run_id)
        control.stop_requested = True
        control.resume_event.set()

    async def fail(self, run_id: UUID, reason: str | None) -> None:
        control = self._get_control(run_id)
        control.fail_requested = reason or "Manual failure triggered by operator"
        control.resume_event.set()

    async def retry(self, run_id: UUID) -> None:
        control = self._get_control(run_id)
        control.fail_requested = None
        control.resume_event.set()
        await self._set_run_status(run_id, "running")

    async def skip(self, run_id: UUID) -> None:
        control = self._get_control(run_id)
        control.skip_requested = True
        control.resume_event.set()

    async def confirm_payment(self, run_id: UUID, node_id: str, transaction_hash: str) -> None:
        control = self._get_control(run_id)
        control.payment_confirmations[node_id] = transaction_hash
        control.resume_event.set()

    async def restart(self, run_id: UUID) -> WorkflowRun:
        session_factory = get_session_factory()
        async with session_factory() as session:
            previous = await RunRepository(session).get(run_id)
            if previous is None:
                raise LookupError("Workflow run not found.")
            return await self.start(
                previous.workflow_id,
                float(previous.speed),
                previous.random_failures,
                goal=previous.goal,
                language=previous.language,
            )

    def _get_control(self, run_id: UUID) -> RunControl:
        control = self._controls.get(run_id)
        if control is None:
            raise LookupError("Workflow run is not active.")
        return control

    async def _execute(self, run_id: UUID) -> None:
        try:
            definition, order, run_goal, language = await self._prepare_run(run_id)
            nodes = {node.id: node for node in definition.nodes if not node.disabled}
            await self._emit(
                run_id,
                "run.started",
                f"Workflow run {run_id} started with {len(order)} nodes",
                "running",
                "info",
                payload={"total_nodes": len(order), "ordered_node_ids": order, "goal": run_goal},
            )
            for node_id in order:
                node = nodes[node_id]
                await self._emit(
                    run_id,
                    "node.queued",
                    f"{node.label} queued",
                    "queued",
                    "info",
                    node_id=node.id,
                    agent=node.label,
                    payload={
                        "kind": node.kind,
                        "input": f"Waiting for workflow memory and upstream outputs for {node.label}",
                        "dependencies": _dependencies_for(node.id, definition.edges),
                        "estimated_duration_ms": _estimated_duration_ms(node.kind),
                        "cost": 0,
                        "memory_mb": 0,
                        "retries": 0,
                    },
                )

            graph = self._build_graph(run_id, definition, order)
            initial_state: ExecutionGraphState = {
                "run_id": str(run_id),
                "goal": run_goal,
                "language": language,
                "completed_count": 0,
                "total_count": len(order),
                "order": order,
                "memory": WorkflowMemory(
                    goal=run_goal,
                    language=language,
                    workflow_context=definition.model_dump(mode="json"),
                    shared_metadata={
                        "workflow_name": definition.name,
                        "workflow_version": definition.version,
                    },
                ),
            }
            await graph.ainvoke(initial_state)
            await self._complete_run(run_id)
        except asyncio.CancelledError:
            await self._cancel_run(run_id, [])
            raise
        except WorkflowStopped:
            return
        except Exception as exc:
            await self._fail_run(run_id, str(exc))
        finally:
            self._tasks.pop(run_id, None)
            self._controls.pop(run_id, None)
            self._event_locks.pop(run_id, None)

    async def _prepare_run(self, run_id: UUID) -> tuple[WorkflowCreate, list[str], str, str]:
        session_factory = get_session_factory()
        async with session_factory() as session:
            run = await RunRepository(session).get(run_id)
            if run is None:
                raise LookupError("Workflow run not found.")
            workflow = await WorkflowRepository(session).get(run.workflow_id)
            if workflow is None:
                raise LookupError("Workflow not found.")
            definition = workflow_to_request(workflow)
            order = validate_and_order(definition)
            run.status = "running"
            run.started_at = datetime.now(UTC)
            await RunRepository(session).save(run)
            return definition, order, run.goal or _default_goal(definition), run.language

    def _build_graph(
        self, run_id: UUID, definition: WorkflowCreate, order: list[str]
    ) -> CompiledExecutionGraph:
        graph = StateGraph(ExecutionGraphState)
        nodes = {node.id: node for node in definition.nodes if not node.disabled}
        for node_id in order:
            node = nodes[node_id]
            graph.add_node(node_id, self._node_runner(run_id, node))  # type: ignore[call-overload]
        if order:
            graph.add_edge(START, order[0])
            outgoing = _outgoing_edges(definition.edges)
            for node_id in order:
                node = nodes[node_id]
                node_edges = outgoing.get(node_id, [])
                if node.kind in {"condition", "decision"}:
                    graph.add_conditional_edges(
                        node_id,
                        lambda state, source_id=node_id: _condition_next_node(
                            source_id, definition.edges, state
                        ),
                    )
                elif node_edges:
                    for edge in node_edges:
                        graph.add_edge(node_id, edge.target)
                else:
                    graph.add_edge(node_id, END)
        return cast(CompiledExecutionGraph, graph.compile())

    def _node_runner(
        self, run_id: UUID, node: WorkflowNodeInput
    ) -> Callable[[ExecutionGraphState], Awaitable[ExecutionGraphState]]:
        async def run_node(state: ExecutionGraphState) -> ExecutionGraphState:
            control = self._get_control(run_id)
            await control.resume_event.wait()
            if control.stop_requested:
                await self._cancel_run(run_id, state["order"][state["completed_count"] :])
                raise WorkflowStopped
            if control.skip_requested:
                control.skip_requested = False
                return await self._skip_node(run_id, node, state)

            await self._update_current_node(run_id, node.id)
            started = monotonic()
            await self._emit(
                run_id,
                "node.started",
                f"{node.label} started",
                "running",
                "info",
                node_id=node.id,
                agent=node.label,
                payload={"input": _node_input_preview(state), "retries": control.retries.get(node.id, 0)},
            )
            if node.kind == "approval":
                await self._await_human_approval(run_id, node, state, control)
                if control.skip_requested:
                    control.skip_requested = False
                    return await self._skip_node(run_id, node, state)
            if node.kind == "payment":
                await self._await_wallet_payment(run_id, node, state, control)
                if control.skip_requested:
                    control.skip_requested = False
                    return await self._skip_node(run_id, node, state)

            try:
                if await self._should_fail(run_id, node.id):
                    raise RuntimeError(control.fail_requested or "Transient AI provider failure")
                result = await self._execute_node_agent(run_id, node, state)
            except Exception as exc:
                recovered = await self._recover_or_raise(run_id, node, state, str(exc))
                if recovered is None:
                    return await self._skip_node(run_id, node, state)
                result = recovered

            duration_ms = int((monotonic() - started) * 1000)
            state["memory"] = state["memory"].with_entry(
                node_id=node.id,
                agent=node.kind,
                summary=result.summary,
                output=_object_to_dict(result.output),
            )
            await self._record_success(
                run_id, node.id, node.label, result, duration_ms, control.retries.get(node.id, 0)
            )
            state["completed_count"] += 1
            await self._update_progress(run_id, state["completed_count"], state["total_count"])
            return state

        return run_node

    async def _await_human_approval(
        self,
        run_id: UUID,
        node: WorkflowNodeInput,
        state: ExecutionGraphState,
        control: RunControl,
    ) -> None:
        control.resume_event.clear()
        await self._set_run_status(run_id, "paused")
        await self._emit(run_id, "run.paused", "Workflow paused for human approval", "paused", "warning")
        await self._emit(
            run_id,
            "node.waiting",
            f"{node.label} waiting for human approval",
            "waiting",
            "warning",
            node_id=node.id,
            agent=node.label,
            payload={"input": _node_input_preview(state), "approval_required": True},
        )
        await control.resume_event.wait()
        if control.stop_requested:
            await self._cancel_run(run_id, state["order"][state["completed_count"] :])
            raise WorkflowStopped
        await self._set_run_status(run_id, "running")

    async def _await_wallet_payment(
        self,
        run_id: UUID,
        node: WorkflowNodeInput,
        state: ExecutionGraphState,
        control: RunControl,
    ) -> None:
        control.resume_event.clear()
        await self._set_run_status(run_id, "paused")
        await self._emit(
            run_id,
            "run.paused",
            "Workflow paused for Casper Wallet payment",
            "paused",
            "warning",
        )
        await self._emit(
            run_id,
            "node.waiting",
            f"{node.label} waiting for Casper Wallet payment",
            "waiting",
            "warning",
            node_id=node.id,
            agent=node.label,
            payload={
                "input": _node_input_preview(state),
                "payment_request": {
                    "node_id": node.id,
                    "recipient_public_key": node.configuration.get("recipient_public_key"),
                    "amount_motes": node.configuration.get("amount_motes"),
                    "memo": node.configuration.get("memo"),
                },
            },
        )
        await control.resume_event.wait()
        if control.stop_requested:
            await self._cancel_run(run_id, state["order"][state["completed_count"] :])
            raise WorkflowStopped
        if node.id not in control.payment_confirmations and not control.skip_requested:
            raise RuntimeError("Payment node resumed without a confirmed Casper transaction hash.")
        await self._set_run_status(run_id, "running")

    async def _execute_node_agent(
        self, run_id: UUID, node: WorkflowNodeInput, state: ExecutionGraphState
    ) -> AgentResult:
        if node.kind in AGENT_DEFINITIONS:
            return await get_agent(node.kind).execute(
                AgentInvocation(
                    execution_id=str(run_id),
                    node_id=node.id,
                    input={
                        "goal": state["goal"],
                        "language": state["language"],
                        "node": node.model_dump(mode="json"),
                    },
                    context=state["memory"].snapshot(),
                )
            )
        if node.kind not in AGENT_DEFINITIONS:
            return await execute_runtime_node(
                node,
                RuntimeExecutionState(
                    run_id=str(run_id),
                    goal=state["goal"],
                    language=state["language"],
                    memory=state["memory"],
                    payment_confirmations=self._get_control(run_id).payment_confirmations,
                ),
            )
        raise LookupError(f"No executor is registered for node kind '{node.kind}'.")

    async def _recover_or_raise(
        self, run_id: UUID, node: WorkflowNodeInput, state: ExecutionGraphState, reason: str
    ) -> AgentResult | None:
        control = self._get_control(run_id)
        control.resume_event.clear()
        await self._set_run_status(run_id, "paused", error=reason)
        await self._record_error(run_id, node.id, node.label, reason)
        await self._emit(
            run_id,
            "node.failed",
            f"{node.label} failed · {reason}",
            "failed",
            "error",
            node_id=node.id,
            agent=node.label,
            payload={"error": reason, "input": _node_input_preview(state)},
        )
        await control.resume_event.wait()
        if control.stop_requested:
            await self._cancel_run(run_id, state["order"][state["completed_count"] :])
            raise WorkflowStopped
        if control.skip_requested:
            control.skip_requested = False
            return None
        control.retries[node.id] = control.retries.get(node.id, 0) + 1
        control.fail_requested = None
        await self._emit(
            run_id,
            "node.retrying",
            f"{node.label} retry {control.retries[node.id]} scheduled",
            "retrying",
            "warning",
            node_id=node.id,
            agent=node.label,
            payload={"retries": control.retries[node.id]},
        )
        await asyncio.sleep(0.2)
        return await self._execute_node_agent(run_id, node, state)

    async def _skip_node(
        self, run_id: UUID, node: WorkflowNodeInput, state: ExecutionGraphState
    ) -> ExecutionGraphState:
        await self._emit(
            run_id,
            "node.skipped",
            f"{node.label} skipped by operator",
            "skipped",
            "warning",
            node_id=node.id,
            agent=node.label,
        )
        state["completed_count"] += 1
        await self._update_progress(run_id, state["completed_count"], state["total_count"])
        return state

    async def _should_fail(self, run_id: UUID, node_id: str) -> bool:
        control = self._get_control(run_id)
        if control.fail_requested:
            return True
        if not await self._random_failures_enabled(run_id):
            return False
        return control.retries.get(node_id, 0) == 0 and random.random() < 0.015

    async def _record_success(
        self,
        run_id: UUID,
        node_id: str,
        label: str,
        result: AgentResult,
        duration_ms: int,
        retries: int,
    ) -> None:
        output = result.output
        summary = result.summary
        logs = result.logs
        await self._emit(
            run_id,
            "node.succeeded",
            f"{label} completed",
            "success",
            "success",
            node_id=node_id,
            agent=label,
            duration_ms=duration_ms,
            output_summary=summary,
            payload={
                "output": output,
                "logs": logs,
                "cost": result.cost,
                "memory_mb": result.memory_mb,
                "retries": retries,
                "telemetry": result.telemetry,
            },
        )
        session_factory = get_session_factory()
        async with session_factory() as session:
            await ExecutionRepository(session).add_log(
                ExecutionLog(
                    run_id=run_id,
                    node_key=node_id,
                    node_label=label,
                    status="success",
                    duration_ms=duration_ms,
                    output_summary=summary,
                    details={
                        "output": output,
                        "logs": logs,
                        "retries": retries,
                        "observability": result.telemetry,
                    },
                    created_at=datetime.now(UTC),
                )
            )

    async def _record_error(self, run_id: UUID, node_id: str, label: str, error: str) -> None:
        session_factory = get_session_factory()
        async with session_factory() as session:
            await ExecutionRepository(session).add_log(
                ExecutionLog(
                    run_id=run_id,
                    node_key=node_id,
                    node_label=label,
                    status="failed",
                    duration_ms=0,
                    output_summary=None,
                    error=error,
                    details={"error": error},
                    created_at=datetime.now(UTC),
                )
            )

    async def _emit(
        self,
        run_id: UUID,
        event_type: str,
        action: str,
        status: str,
        level: str,
        *,
        node_id: str | None = None,
        agent: str | None = None,
        duration_ms: int | None = None,
        output_summary: str | None = None,
        payload: dict[str, object] | None = None,
    ) -> ExecutionEventResponse:
        session_factory = get_session_factory()
        lock = self._event_locks.setdefault(run_id, asyncio.Lock())
        async with lock, session_factory() as session:
            repository = ExecutionRepository(session)
            event = await repository.add_event(
                ExecutionEvent(
                    run_id=run_id,
                    sequence=await repository.next_sequence(run_id),
                    event_type=event_type,
                    node_key=node_id,
                    agent=agent,
                    action=action,
                    status=status,
                    level=level,
                    duration_ms=duration_ms,
                    output_summary=output_summary,
                    payload=payload or {},
                    created_at=datetime.now(UTC),
                )
            )
        response = ExecutionEventResponse.from_event(event)
        await event_broker.publish(run_id, response)
        return response

    async def _update_current_node(self, run_id: UUID, node_id: str) -> None:
        session_factory = get_session_factory()
        async with session_factory() as session:
            run = await RunRepository(session).get(run_id)
            if run:
                run.current_node_key = node_id
                run.status = "running"
                run.error = None
                await RunRepository(session).save(run)

    async def _update_progress(self, run_id: UUID, completed: int, total: int) -> None:
        session_factory = get_session_factory()
        async with session_factory() as session:
            run = await RunRepository(session).get(run_id)
            if run:
                run.progress = round(completed / total * 100)
                await RunRepository(session).save(run)

    async def _set_run_status(self, run_id: UUID, status: str, error: str | None = None) -> None:
        session_factory = get_session_factory()
        async with session_factory() as session:
            run = await RunRepository(session).get(run_id)
            if run:
                run.status = status
                run.error = error
                await RunRepository(session).save(run)

    async def _complete_run(self, run_id: UUID) -> None:
        session_factory = get_session_factory()
        async with session_factory() as session:
            run = await RunRepository(session).get(run_id)
            if run:
                run.status = "completed"
                run.progress = 100
                run.current_node_key = None
                run.completed_at = datetime.now(UTC)
                await RunRepository(session).save(run)
        await self._emit(
            run_id, "run.completed", f"Workflow run {run_id} completed successfully", "completed", "success"
        )

    async def _cancel_run(self, run_id: UUID, remaining: list[str]) -> None:
        for node_id in remaining:
            await self._emit(
                run_id,
                "node.cancelled",
                f"{node_id} cancelled",
                "cancelled",
                "warning",
                node_id=node_id,
            )
        await self._set_run_status(run_id, "stopped")
        await self._emit(run_id, "run.stopped", "Workflow stopped by operator", "stopped", "warning")

    async def _fail_run(self, run_id: UUID, error: str) -> None:
        await self._set_run_status(run_id, "failed", error)
        await self._emit(run_id, "run.stopped", f"Workflow failed · {error}", "failed", "error")

    async def _random_failures_enabled(self, run_id: UUID) -> bool:
        session_factory = get_session_factory()
        async with session_factory() as session:
            run = await RunRepository(session).get(run_id)
            return bool(run and run.random_failures)


class WorkflowStopped(Exception):
    pass


def workflow_to_request(workflow: "Workflow") -> WorkflowCreate:
    nodes = [
        WorkflowNodeInput(
            id=node.node_key,
            kind=cast(NodeKind, node.kind),
            label=node.label,
            position=Position.model_validate(node.position),
            configuration=node.configuration,
            disabled=node.disabled,
        )
        for node in workflow.nodes
    ]
    edge_values = cast(list[dict[str, object]], workflow.definition.get("edges", []))
    edges = [WorkflowEdgeInput.model_validate(edge) for edge in edge_values]
    return WorkflowCreate(
        name=workflow.name,
        description=workflow.description,
        version=workflow.version,
        nodes=nodes,
        edges=edges,
    )


def _default_goal(definition: WorkflowCreate) -> str:
    return definition.description or f"Execute the {definition.name} workflow and produce useful outputs."


def _estimated_duration_ms(kind: str) -> int:
    if kind in AGENT_DEFINITIONS:
        return 15_000
    return 500


def _dependencies_for(node_id: str, edges: list[WorkflowEdgeInput]) -> list[str]:
    return [edge.source for edge in edges if edge.target == node_id]


def _outgoing_edges(edges: list[WorkflowEdgeInput]) -> dict[str, list[WorkflowEdgeInput]]:
    outgoing: dict[str, list[WorkflowEdgeInput]] = {}
    for edge in edges:
        outgoing.setdefault(edge.source, []).append(edge)
    return outgoing


def _condition_next_node(
    source_id: str,
    edges: list[WorkflowEdgeInput],
    state: ExecutionGraphState,
) -> str:
    outgoing = [edge for edge in edges if edge.source == source_id]
    if not outgoing:
        return END
    source_output = state["memory"].outputs.get(source_id, {})
    matched = source_output.get("matched")
    branch = "true" if matched is True else "false"
    preferred_handles = {"true": {"true", "match", "yes"}, "false": {"false", "else", "no"}}[branch]
    for edge in outgoing:
        if edge.source_handle in preferred_handles:
            return edge.target
    if len(outgoing) == 1:
        return outgoing[0].target
    return outgoing[0].target if branch == "true" else outgoing[-1].target


def _node_input_preview(state: ExecutionGraphState) -> str:
    history = state["memory"].execution_history
    if not history:
        return state["goal"]
    latest = history[-1]
    return f"{latest.agent}: {latest.summary}"


def _object_to_dict(value: object) -> dict[str, object]:
    if isinstance(value, dict):
        return {str(key): item for key, item in value.items()}
    return {"value": value}


execution_coordinator = ExecutionCoordinator()
