from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from agenthub.database.base import Base, TimestampMixin


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    email: Mapped[str | None] = mapped_column(String(320), unique=True)
    display_name: Mapped[str] = mapped_column(String(160), default="Demo User")


class Agent(TimestampMixin, Base):
    __tablename__ = "agents"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(80))
    publisher: Mapped[str] = mapped_column(String(160))
    capabilities: Mapped[list[str]] = mapped_column(JSONB, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    versions: Mapped[list["AgentVersion"]] = relationship(
        back_populates="agent", cascade="all, delete-orphan"
    )


class AgentVersion(TimestampMixin, Base):
    __tablename__ = "agent_versions"
    __table_args__ = (UniqueConstraint("agent_id", "version", name="uq_agent_version"),)

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    agent_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), index=True
    )
    version: Mapped[str] = mapped_column(String(40))
    configuration: Mapped[dict[str, object]] = mapped_column(JSONB, default=dict)
    is_current: Mapped[bool] = mapped_column(Boolean, default=True)
    agent: Mapped[Agent] = relationship(back_populates="versions")


class Workflow(TimestampMixin, Base):
    __tablename__ = "workflows"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    owner_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    version: Mapped[str] = mapped_column(String(40), default="1.0.0")
    definition: Mapped[dict[str, object]] = mapped_column(JSONB, default=dict)
    nodes: Mapped[list["WorkflowNode"]] = relationship(
        back_populates="workflow", cascade="all, delete-orphan", order_by="WorkflowNode.position_index"
    )
    runs: Mapped[list["WorkflowRun"]] = relationship(back_populates="workflow")


class WorkflowNode(TimestampMixin, Base):
    __tablename__ = "workflow_nodes"
    __table_args__ = (
        UniqueConstraint("workflow_id", "node_key", name="uq_workflow_node_key"),
        Index("ix_workflow_nodes_workflow_position", "workflow_id", "position_index"),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    workflow_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("workflows.id", ondelete="CASCADE")
    )
    node_key: Mapped[str] = mapped_column(String(160))
    kind: Mapped[str] = mapped_column(String(80))
    label: Mapped[str] = mapped_column(String(200))
    position_index: Mapped[int] = mapped_column(Integer)
    position: Mapped[dict[str, object]] = mapped_column(JSONB, default=dict)
    configuration: Mapped[dict[str, object]] = mapped_column(JSONB, default=dict)
    disabled: Mapped[bool] = mapped_column(Boolean, default=False)
    workflow: Mapped[Workflow] = relationship(back_populates="nodes")


class WorkflowRun(TimestampMixin, Base):
    __tablename__ = "workflow_runs"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    workflow_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("workflows.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[str] = mapped_column(String(40), default="queued", index=True)
    speed: Mapped[Decimal] = mapped_column(Numeric(4, 2), default=Decimal("1.0"))
    random_failures: Mapped[bool] = mapped_column(Boolean, default=False)
    goal: Mapped[str] = mapped_column(Text, default="")
    language: Mapped[str] = mapped_column(String(80), default="English")
    current_node_key: Mapped[str | None] = mapped_column(String(160))
    progress: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error: Mapped[str | None] = mapped_column(Text)
    workflow: Mapped[Workflow] = relationship(back_populates="runs")
    events: Mapped[list["ExecutionEvent"]] = relationship(
        back_populates="run", cascade="all, delete-orphan", order_by="ExecutionEvent.sequence"
    )
    logs: Mapped[list["ExecutionLog"]] = relationship(back_populates="run", cascade="all, delete-orphan")


class ExecutionEvent(Base):
    __tablename__ = "execution_events"
    __table_args__ = (
        UniqueConstraint("run_id", "sequence", name="uq_execution_event_sequence"),
        Index("ix_execution_events_run_created", "run_id", "created_at"),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    run_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("workflow_runs.id", ondelete="CASCADE")
    )
    sequence: Mapped[int] = mapped_column(Integer)
    event_type: Mapped[str] = mapped_column(String(80))
    node_key: Mapped[str | None] = mapped_column(String(160))
    agent: Mapped[str | None] = mapped_column(String(200))
    action: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(40))
    level: Mapped[str] = mapped_column(String(20))
    duration_ms: Mapped[int | None] = mapped_column(Integer)
    output_summary: Mapped[str | None] = mapped_column(Text)
    payload: Mapped[dict[str, object]] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    run: Mapped[WorkflowRun] = relationship(back_populates="events")


class ExecutionLog(Base):
    __tablename__ = "execution_logs"
    __table_args__ = (Index("ix_execution_logs_run_node", "run_id", "node_key"),)

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    run_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("workflow_runs.id", ondelete="CASCADE")
    )
    node_key: Mapped[str] = mapped_column(String(160))
    node_label: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(40))
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)
    output_summary: Mapped[str | None] = mapped_column(Text)
    error: Mapped[str | None] = mapped_column(Text)
    details: Mapped[dict[str, object]] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    run: Mapped[WorkflowRun] = relationship(back_populates="logs")


class WorkflowMemoryRecord(TimestampMixin, Base):
    __tablename__ = "workflow_memory_records"
    __table_args__ = (
        UniqueConstraint("namespace", "memory_key", name="uq_workflow_memory_namespace_key"),
        Index("ix_workflow_memory_namespace_updated", "namespace", "updated_at"),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    namespace: Mapped[str] = mapped_column(String(160), default="default")
    memory_key: Mapped[str] = mapped_column(String(240))
    value: Mapped[dict[str, object]] = mapped_column(JSONB, default=dict)
    source_run_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("workflow_runs.id", ondelete="SET NULL"), index=True
    )
    source_node_key: Mapped[str | None] = mapped_column(String(160))
