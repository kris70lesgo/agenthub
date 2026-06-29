from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

NodeKind = Literal[
    "planner",
    "research",
    "summarizer",
    "translator",
    "presentation",
    "email",
    "memory",
    "payment",
    "approval",
    "decision",
    "trigger",
    "api",
    "webhook",
    "delay",
    "condition",
    "output",
    "custom",
]


class Position(BaseModel):
    x: float
    y: float


class WorkflowNodeInput(BaseModel):
    id: str = Field(min_length=1, max_length=160)
    kind: NodeKind
    label: str = Field(min_length=1, max_length=200)
    position: Position
    configuration: dict[str, object] = {}
    disabled: bool = False


class WorkflowEdgeInput(BaseModel):
    id: str = Field(min_length=1, max_length=200)
    source: str
    target: str
    source_handle: str | None = None
    target_handle: str | None = None


class WorkflowCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = ""
    version: str = "1.0.0"
    nodes: list[WorkflowNodeInput] = Field(min_length=1)
    edges: list[WorkflowEdgeInput]


class WorkflowNodeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    node_key: str
    kind: str
    label: str
    position_index: int
    position: dict[str, object]
    configuration: dict[str, object]
    disabled: bool


class WorkflowResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str
    version: str
    definition: dict[str, object]
    created_at: datetime
    updated_at: datetime
    nodes: list[WorkflowNodeResponse]
