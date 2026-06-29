import json
from collections.abc import AsyncIterator, Awaitable, Callable
from uuid import UUID

from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.responses import StreamingResponse

from agenthub.database.session import get_session_factory
from agenthub.dependencies.services import RunRepositoryDependency
from agenthub.events.broker import event_broker
from agenthub.repositories.sqlalchemy import ExecutionRepository
from agenthub.runtime.execution import execution_coordinator
from agenthub.schemas.runtime import (
    ExecutionDetailResponse,
    ExecutionEventResponse,
    ExecutionLogResponse,
    PaymentConfirmationCommand,
    RuntimeCommand,
    WorkflowRunCreate,
    WorkflowRunResponse,
)

router = APIRouter(tags=["runtime"])


@router.get("/workflow-runs", response_model=list[WorkflowRunResponse], summary="List workflow runs")
async def list_runs(repository: RunRepositoryDependency) -> list[WorkflowRunResponse]:
    """Return the latest workflow execution records."""
    return [WorkflowRunResponse.model_validate(run) for run in await repository.list()]


@router.post(
    "/workflow-runs",
    response_model=WorkflowRunResponse,
    status_code=201,
    summary="Start a workflow run",
)
async def create_run(request: WorkflowRunCreate) -> WorkflowRunResponse:
    """Validate a persisted workflow and start backend-driven execution."""
    try:
        run = await execution_coordinator.start(
            request.workflow_id,
            float(request.speed),
            request.random_failures,
            goal=request.goal,
            language=request.language,
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return WorkflowRunResponse.model_validate(run)


@router.get(
    "/execution/{run_id}",
    response_model=ExecutionDetailResponse,
    summary="Inspect an execution",
)
async def get_execution(run_id: UUID, repository: RunRepositoryDependency) -> ExecutionDetailResponse:
    """Return a workflow run with its persisted timeline and execution logs."""
    run = await repository.get(run_id, details=True)
    if run is None:
        raise HTTPException(status_code=404, detail="Workflow run not found.")
    return ExecutionDetailResponse(
        run=WorkflowRunResponse.model_validate(run),
        events=[ExecutionEventResponse.from_event(event) for event in run.events],
        logs=[ExecutionLogResponse.model_validate(log) for log in run.logs],
    )


@router.get("/workflow-runs/{run_id}/events", summary="Stream workflow execution events")
async def stream_events(
    run_id: UUID,
    request: Request,
    last_event_id: int = Header(default=0, alias="Last-Event-ID"),
) -> StreamingResponse:
    """Stream persisted and live execution events as Server-Sent Events."""

    async def event_stream() -> AsyncIterator[str]:
        last_sequence = last_event_id
        session_factory = get_session_factory()
        async with session_factory() as session:
            persisted = await ExecutionRepository(session).list_events(run_id, last_event_id)
        for persisted_event in persisted:
            response = ExecutionEventResponse.from_event(persisted_event)
            last_sequence = max(last_sequence, response.sequence)
            yield format_sse(response)
            if response.type in {"run.completed", "run.stopped"}:
                return
        async for live_event in event_broker.subscribe(run_id):
            if await request.is_disconnected():
                return
            if live_event.sequence <= last_sequence:
                continue
            last_sequence = live_event.sequence
            yield format_sse(live_event)
            if live_event.type in {"run.completed", "run.stopped"}:
                return

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/workflow-runs/{run_id}/pause", status_code=204, summary="Pause a run")
async def pause_run(run_id: UUID) -> None:
    await run_command(execution_coordinator.pause, run_id)


@router.post("/workflow-runs/{run_id}/resume", status_code=204, summary="Resume a run")
async def resume_run(run_id: UUID) -> None:
    await run_command(execution_coordinator.resume, run_id)


@router.post("/workflow-runs/{run_id}/stop", status_code=204, summary="Stop a run")
async def stop_run(run_id: UUID) -> None:
    await run_command(execution_coordinator.stop, run_id)


@router.post("/workflow-runs/{run_id}/retry", status_code=204, summary="Retry a failed node")
async def retry_run(run_id: UUID) -> None:
    await run_command(execution_coordinator.retry, run_id)


@router.post("/workflow-runs/{run_id}/skip", status_code=204, summary="Skip the current node")
async def skip_node(run_id: UUID) -> None:
    await run_command(execution_coordinator.skip, run_id)


@router.post("/workflow-runs/{run_id}/fail", status_code=204, summary="Fail the current node")
async def fail_node(run_id: UUID, command: RuntimeCommand) -> None:
    try:
        await execution_coordinator.fail(run_id, command.reason)
    except LookupError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post(
    "/workflow-runs/{run_id}/payment-confirmed",
    status_code=204,
    summary="Confirm a wallet-signed payment node transaction",
)
async def confirm_payment(run_id: UUID, command: PaymentConfirmationCommand) -> None:
    try:
        await execution_coordinator.confirm_payment(
            run_id,
            command.node_id,
            command.transaction_hash,
        )
    except LookupError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post(
    "/workflow-runs/{run_id}/restart",
    response_model=WorkflowRunResponse,
    status_code=201,
    summary="Restart a workflow run",
)
async def restart_run(run_id: UUID) -> WorkflowRunResponse:
    try:
        run = await execution_coordinator.restart(run_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return WorkflowRunResponse.model_validate(run)


async def run_command(command: Callable[[UUID], Awaitable[None]], run_id: UUID) -> None:
    try:
        await command(run_id)
    except LookupError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


def format_sse(event: ExecutionEventResponse) -> str:
    data = json.dumps(event.model_dump(mode="json"), separators=(",", ":"))
    return f"id: {event.sequence}\ndata: {data}\n\n"
