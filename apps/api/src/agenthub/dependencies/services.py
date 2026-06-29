from typing import Annotated

from fastapi import Depends

from agenthub.dependencies.database import DatabaseSession
from agenthub.repositories.sqlalchemy import AgentRepository, RunRepository, WorkflowRepository
from agenthub.services.workflows import WorkflowService


def get_agent_repository(session: DatabaseSession) -> AgentRepository:
    return AgentRepository(session)


def get_workflow_service(session: DatabaseSession) -> WorkflowService:
    return WorkflowService(WorkflowRepository(session))


def get_run_repository(session: DatabaseSession) -> RunRepository:
    return RunRepository(session)


AgentRepositoryDependency = Annotated[AgentRepository, Depends(get_agent_repository)]
WorkflowServiceDependency = Annotated[WorkflowService, Depends(get_workflow_service)]
RunRepositoryDependency = Annotated[RunRepository, Depends(get_run_repository)]
