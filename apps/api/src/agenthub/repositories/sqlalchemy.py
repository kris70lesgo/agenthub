from collections.abc import Sequence
from typing import cast
from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from agenthub.models import Agent, ExecutionEvent, ExecutionLog, Workflow, WorkflowNode, WorkflowRun


class AgentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list(self) -> list[Agent]:
        result = await self.session.scalars(
            select(Agent).options(selectinload(Agent.versions)).order_by(Agent.name)
        )
        return list(result.unique())

    async def get(self, agent_id: UUID) -> Agent | None:
        return cast(
            Agent | None,
            await self.session.scalar(
                select(Agent).options(selectinload(Agent.versions)).where(Agent.id == agent_id)
            ),
        )


class WorkflowRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def _query(self) -> Select[tuple[Workflow]]:
        return select(Workflow).options(selectinload(Workflow.nodes))

    async def list(self) -> list[Workflow]:
        result = await self.session.scalars(self._query().order_by(Workflow.updated_at.desc()))
        return list(result.unique())

    async def get(self, workflow_id: UUID) -> Workflow | None:
        return cast(
            Workflow | None,
            await self.session.scalar(self._query().where(Workflow.id == workflow_id)),
        )

    async def add(self, workflow: Workflow, nodes: Sequence[WorkflowNode]) -> Workflow:
        workflow.nodes.extend(nodes)
        self.session.add(workflow)
        await self.session.commit()
        return await self.get(workflow.id) or workflow


class RunRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list(self) -> list[WorkflowRun]:
        result = await self.session.scalars(
            select(WorkflowRun).order_by(WorkflowRun.created_at.desc()).limit(100)
        )
        return list(result)

    async def get(self, run_id: UUID, *, details: bool = False) -> WorkflowRun | None:
        query = select(WorkflowRun).where(WorkflowRun.id == run_id)
        if details:
            query = query.options(selectinload(WorkflowRun.events), selectinload(WorkflowRun.logs))
        return cast(WorkflowRun | None, await self.session.scalar(query))

    async def add(self, run: WorkflowRun) -> WorkflowRun:
        self.session.add(run)
        await self.session.commit()
        await self.session.refresh(run)
        return run

    async def save(self, run: WorkflowRun) -> None:
        self.session.add(run)
        await self.session.commit()


class ExecutionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def next_sequence(self, run_id: UUID) -> int:
        current = await self.session.scalar(
            select(func.coalesce(func.max(ExecutionEvent.sequence), 0)).where(ExecutionEvent.run_id == run_id)
        )
        return int(current or 0) + 1

    async def add_event(self, event: ExecutionEvent) -> ExecutionEvent:
        self.session.add(event)
        await self.session.commit()
        await self.session.refresh(event)
        return event

    async def add_log(self, log: ExecutionLog) -> ExecutionLog:
        self.session.add(log)
        await self.session.commit()
        await self.session.refresh(log)
        return log

    async def list_events(self, run_id: UUID, after: int = 0) -> list[ExecutionEvent]:
        result = await self.session.scalars(
            select(ExecutionEvent)
            .where(ExecutionEvent.run_id == run_id, ExecutionEvent.sequence > after)
            .order_by(ExecutionEvent.sequence)
        )
        return list(result)
