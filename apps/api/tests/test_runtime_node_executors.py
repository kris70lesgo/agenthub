from uuid import uuid4

import pytest

from agenthub.memory.workflow import WorkflowMemory
from agenthub.runtime.node_executors import RuntimeExecutionState, execute_runtime_node
from agenthub.schemas.workflows import Position, WorkflowNodeInput


def runtime_state() -> RuntimeExecutionState:
    return RuntimeExecutionState(
        run_id=str(uuid4()),
        goal="Run the integration",
        language="English",
        memory=WorkflowMemory(
            goal="Run the integration",
            language="English",
            workflow_context={},
            shared_metadata={},
        ),
    )


def workflow_node(
    kind: str,
    configuration: dict[str, object] | None = None,
) -> WorkflowNodeInput:
    return WorkflowNodeInput.model_validate(
        {
            "id": f"{kind}-1",
            "kind": kind,
            "label": kind.title(),
            "position": Position(x=0, y=0),
            "configuration": configuration or {},
        }
    )


async def test_condition_node_evaluates_json_path() -> None:
    result = await execute_runtime_node(
        workflow_node(
            "condition",
            {"left": "$.goal", "operator": "contains", "right": "integration"},
        ),
        runtime_state(),
    )

    assert result.summary == "Condition evaluated to true."
    assert isinstance(result.output, dict)
    assert result.output["matched"] is True
    assert result.output["branch"] == "true"


async def test_api_node_requires_absolute_url() -> None:
    with pytest.raises(ValueError, match="API node configuration is invalid"):
        await execute_runtime_node(
            workflow_node("api", {"method": "GET", "url": "/relative"}),
            runtime_state(),
        )


async def test_payment_node_requires_confirmed_transaction_hash() -> None:
    node = workflow_node(
        "payment",
        {
            "recipient_public_key": "0203",
            "amount_motes": "100000000",
        },
    )
    with pytest.raises(LookupError, match="confirmed Casper transaction hash"):
        await execute_runtime_node(node, runtime_state())

    state = runtime_state()
    state.payment_confirmations[node.id] = "abc123confirmedhashabc123confirmedhash"
    result = await execute_runtime_node(node, state)

    assert result.summary.startswith("Casper payment confirmed")
    assert isinstance(result.output, dict)
    assert result.output["transaction_hash"] == "abc123confirmedhashabc123confirmedhash"


def test_condition_routing_prefers_matching_source_handle() -> None:
    from langgraph.graph import END

    from agenthub.runtime.execution import _condition_next_node
    from agenthub.schemas.workflows import WorkflowEdgeInput

    state = {
        "run_id": "run-1",
        "goal": "Route",
        "language": "English",
        "completed_count": 1,
        "total_count": 3,
        "order": ["condition-1", "yes-1", "no-1"],
        "memory": runtime_state().memory.with_entry(
            node_id="condition-1",
            agent="condition",
            summary="Condition true.",
            output={"matched": True},
        ),
    }

    assert (
        _condition_next_node(
            "condition-1",
            [
                WorkflowEdgeInput(id="no", source="condition-1", source_handle="else", target="no-1"),
                WorkflowEdgeInput(id="yes", source="condition-1", source_handle="match", target="yes-1"),
            ],
            state,
        )
        == "yes-1"
    )
    assert _condition_next_node("condition-1", [], state) == END
