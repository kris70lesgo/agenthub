"""phase 4 ai run context

Revision ID: 20260625_0002
Revises: 20260625_0001
Create Date: 2026-06-25 00:02:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260625_0002"
down_revision: str | None = "20260625_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("workflow_runs", sa.Column("goal", sa.Text(), nullable=False, server_default=""))
    op.add_column(
        "workflow_runs",
        sa.Column("language", sa.String(length=80), nullable=False, server_default="English"),
    )
    op.alter_column("workflow_runs", "goal", server_default=None)
    op.alter_column("workflow_runs", "language", server_default=None)


def downgrade() -> None:
    op.drop_column("workflow_runs", "language")
    op.drop_column("workflow_runs", "goal")
