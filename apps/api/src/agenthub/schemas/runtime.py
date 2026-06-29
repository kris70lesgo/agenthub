from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

if TYPE_CHECKING:
    from agenthub.models import ExecutionEvent

RuntimeStatus = Literal[
    "idle",
    "queued",
    "running",
    "waiting",
    "success",
    "failed",
    "retrying",
    "skipped",
    "cancelled",
]
RunStatus = Literal["queued", "running", "paused", "completed", "stopped", "failed"]


class WorkflowRunCreate(BaseModel):
    workflow_id: UUID
    goal: str = Field(default="", max_length=2000)
    language: str = Field(default="English", max_length=80)
    speed: Annotated[float, Field(gt=0, le=5)] = 1
    random_failures: bool = False


class InlineWorkflowRunCreate(BaseModel):
    workflow: object
    speed: Annotated[float, Field(gt=0, le=5)] = 1
    random_failures: bool = False


class WorkflowRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workflow_id: UUID
    status: str
    speed: Decimal
    random_failures: bool
    goal: str
    language: str
    current_node_key: str | None
    progress: int
    started_at: datetime | None
    completed_at: datetime | None
    error: str | None
    created_at: datetime
    updated_at: datetime


class ExecutionEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    run_id: UUID
    sequence: int
    type: str
    timestamp: datetime
    node_id: str | None = None
    agent: str | None
    action: str
    status: str
    level: str
    duration_ms: int | None
    output_summary: str | None
    payload: dict[str, object]

    @classmethod
    def from_event(cls, event: "ExecutionEvent") -> "ExecutionEventResponse":
        return cls(
            id=event.id,
            run_id=event.run_id,
            sequence=event.sequence,
            type=event.event_type,
            timestamp=event.created_at,
            node_id=event.node_key,
            agent=event.agent,
            action=event.action,
            status=event.status,
            level=event.level,
            duration_ms=event.duration_ms,
            output_summary=event.output_summary,
            payload=event.payload,
        )


class ExecutionLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    node_key: str
    node_label: str
    status: str
    duration_ms: int
    output_summary: str | None
    error: str | None
    details: dict[str, object]
    created_at: datetime


class ExecutionDetailResponse(BaseModel):
    run: WorkflowRunResponse
    events: list[ExecutionEventResponse]
    logs: list[ExecutionLogResponse]


class RuntimeCommand(BaseModel):
    reason: str | None = Field(default=None, max_length=500)


class PaymentConfirmationCommand(BaseModel):
    node_id: str = Field(min_length=1, max_length=160)
    transaction_hash: str = Field(min_length=32, max_length=128)
