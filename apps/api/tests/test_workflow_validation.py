import pytest

from agenthub.runtime.validation import WorkflowValidationError, validate_and_order
from agenthub.schemas.workflows import (
    Position,
    WorkflowCreate,
    WorkflowEdgeInput,
    WorkflowNodeInput,
)


def node(node_id: str, kind: str) -> WorkflowNodeInput:
    return WorkflowNodeInput.model_validate(
        {
            "id": node_id,
            "kind": kind,
            "label": node_id.title(),
            "position": Position(x=0, y=0),
        }
    )


def test_validation_returns_topological_order() -> None:
    workflow = WorkflowCreate(
        name="Valid workflow",
        nodes=[node("trigger", "trigger"), node("planner", "planner"), node("output", "output")],
        edges=[
            WorkflowEdgeInput(id="one", source="trigger", target="planner"),
            WorkflowEdgeInput(id="two", source="planner", target="output"),
        ],
    )

    assert validate_and_order(workflow) == ["trigger", "planner", "output"]


def test_validation_rejects_missing_trigger() -> None:
    workflow = WorkflowCreate(
        name="Missing trigger",
        nodes=[node("planner", "planner"), node("output", "output")],
        edges=[WorkflowEdgeInput(id="one", source="planner", target="output")],
    )

    with pytest.raises(WorkflowValidationError, match="trigger"):
        validate_and_order(workflow)


def test_validation_rejects_cycles() -> None:
    workflow = WorkflowCreate(
        name="Circular workflow",
        nodes=[node("trigger", "trigger"), node("planner", "planner")],
        edges=[
            WorkflowEdgeInput(id="one", source="trigger", target="planner"),
            WorkflowEdgeInput(id="two", source="planner", target="trigger"),
        ],
    )

    with pytest.raises(WorkflowValidationError):
        validate_and_order(workflow)
