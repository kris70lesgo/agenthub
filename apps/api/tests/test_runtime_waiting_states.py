import asyncio
from types import MethodType
from uuid import uuid4

from agenthub.memory.workflow import WorkflowMemory
from agenthub.runtime.execution import ExecutionCoordinator, ExecutionGraphState, RunControl
from agenthub.schemas.workflows import Position, WorkflowNodeInput


async def test_approval_gate_emits_run_paused_before_node_waiting() -> None:
    coordinator = ExecutionCoordinator()
    run_id = uuid4()
    control = RunControl()
    coordinator._controls[run_id] = control
    emitted: list[tuple[str, str]] = []
    statuses: list[str] = []

    async def fake_set_run_status(self: ExecutionCoordinator, _run_id, status: str, error=None) -> None:
        statuses.append(status)

    async def fake_emit(
        self: ExecutionCoordinator,
        _run_id,
        event_type: str,
        _action: str,
        status: str,
        level: str,
        **kwargs,
    ):
        emitted.append((event_type, status))

    coordinator._set_run_status = MethodType(fake_set_run_status, coordinator)  # type: ignore[method-assign]
    coordinator._emit = MethodType(fake_emit, coordinator)  # type: ignore[method-assign]

    task = asyncio.create_task(
        coordinator._await_human_approval(
            run_id,
            waiting_node("approval-1", "approval"),
            graph_state(str(run_id)),
            control,
        )
    )
    await wait_until(lambda: ("node.waiting", "waiting") in emitted)
    assert statuses[0] == "paused"
    assert emitted[:2] == [
        ("run.paused", "paused"),
        ("node.waiting", "waiting"),
    ]

    control.resume_event.set()
    await task
    assert statuses[-1] == "running"


async def test_payment_gate_emits_run_paused_before_node_waiting() -> None:
    coordinator = ExecutionCoordinator()
    run_id = uuid4()
    control = RunControl()
    control.payment_confirmations["payment-1"] = "abc123confirmedhashabc123confirmedhash"
    coordinator._controls[run_id] = control
    emitted: list[tuple[str, str]] = []

    async def fake_set_run_status(self: ExecutionCoordinator, _run_id, status: str, error=None) -> None:
        return None

    async def fake_emit(
        self: ExecutionCoordinator,
        _run_id,
        event_type: str,
        _action: str,
        status: str,
        level: str,
        **kwargs,
    ):
        emitted.append((event_type, status))

    coordinator._set_run_status = MethodType(fake_set_run_status, coordinator)  # type: ignore[method-assign]
    coordinator._emit = MethodType(fake_emit, coordinator)  # type: ignore[method-assign]

    task = asyncio.create_task(
        coordinator._await_wallet_payment(
            run_id,
            waiting_node("payment-1", "payment"),
            graph_state(str(run_id)),
            control,
        )
    )
    await wait_until(lambda: ("node.waiting", "waiting") in emitted)
    assert emitted[:2] == [
        ("run.paused", "paused"),
        ("node.waiting", "waiting"),
    ]

    control.resume_event.set()
    await task


def waiting_node(node_id: str, kind: str) -> WorkflowNodeInput:
    return WorkflowNodeInput(
        id=node_id,
        kind=kind,  # type: ignore[arg-type]
        label=node_id.title(),
        position=Position(x=0, y=0),
        configuration={},
    )


def graph_state(run_id: str) -> ExecutionGraphState:
    return {
        "run_id": run_id,
        "goal": "Wait for operator",
        "language": "English",
        "completed_count": 1,
        "total_count": 3,
        "order": ["trigger-1", "approval-1", "output-1"],
        "memory": WorkflowMemory(goal="Wait for operator", language="English"),
    }


async def wait_until(predicate, timeout_seconds: float = 1) -> None:
    deadline = asyncio.get_running_loop().time() + timeout_seconds
    while not predicate():
        if asyncio.get_running_loop().time() > deadline:
            raise TimeoutError("Timed out waiting for predicate.")
        await asyncio.sleep(0.01)
