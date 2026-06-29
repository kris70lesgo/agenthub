from uuid import UUID

from fastapi import APIRouter, HTTPException

from agenthub.dependencies.services import AgentRepositoryDependency
from agenthub.schemas.agents import AgentResponse

router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("", response_model=list[AgentResponse], summary="List registered agents")
async def list_agents(repository: AgentRepositoryDependency) -> list[AgentResponse]:
    """Return active and inactive agent definitions with version metadata."""
    return [AgentResponse.model_validate(agent) for agent in await repository.list()]


@router.get("/{agent_id}", response_model=AgentResponse, summary="Get an agent")
async def get_agent(agent_id: UUID, repository: AgentRepositoryDependency) -> AgentResponse:
    """Return one agent and its available versions."""
    agent = await repository.get(agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found.")
    return AgentResponse.model_validate(agent)
