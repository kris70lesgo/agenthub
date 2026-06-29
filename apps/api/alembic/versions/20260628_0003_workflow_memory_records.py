"""workflow memory records

Revision ID: 20260628_0003
Revises: 20260625_0002
Create Date: 2026-06-28 00:03:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260628_0003"
down_revision: str | None = "20260625_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "workflow_memory_records",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("namespace", sa.String(length=160), nullable=False),
        sa.Column("memory_key", sa.String(length=240), nullable=False),
        sa.Column("value", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("source_run_id", sa.UUID(), nullable=True),
        sa.Column("source_node_key", sa.String(length=160), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["source_run_id"], ["workflow_runs.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("namespace", "memory_key", name="uq_workflow_memory_namespace_key"),
    )
    op.create_index(
        "ix_workflow_memory_namespace_updated",
        "workflow_memory_records",
        ["namespace", "updated_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_workflow_memory_records_source_run_id"),
        "workflow_memory_records",
        ["source_run_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_workflow_memory_records_source_run_id"), table_name="workflow_memory_records")
    op.drop_index("ix_workflow_memory_namespace_updated", table_name="workflow_memory_records")
    op.drop_table("workflow_memory_records")
