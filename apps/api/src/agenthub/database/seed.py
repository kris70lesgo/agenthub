from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from agenthub.agents.ai import AGENT_DEFINITIONS, AIAgent
from agenthub.llm.factory import active_provider_name
from agenthub.models import Agent, AgentVersion


async def seed_agents(session: AsyncSession) -> None:
    for definition in AGENT_DEFINITIONS.values():
        implementation = AIAgent(definition)
        metadata = implementation.metadata()
        agent = await session.scalar(select(Agent).where(Agent.slug == metadata.slug))
        if agent is None:
            agent = Agent(
                slug=metadata.slug,
                name=metadata.name,
                description=metadata.description,
                category="Agents",
                publisher=metadata.publisher,
                capabilities=implementation.capabilities(),
                is_active=True,
            )
            session.add(agent)
            await session.flush()
        else:
            agent.name = metadata.name
            agent.description = metadata.description
            agent.category = "Agents"
            agent.publisher = metadata.publisher
            agent.capabilities = implementation.capabilities()
            agent.is_active = True

        current_version = await session.scalar(
            select(AgentVersion).where(
                AgentVersion.agent_id == agent.id,
                AgentVersion.version == metadata.version,
            )
        )
        if current_version is None:
            current_version = AgentVersion(
                agent_id=agent.id,
                version=metadata.version,
                is_current=True,
            )
            session.add(current_version)
        current_version.configuration = {
            "executor": active_provider_name(),
            "provider": active_provider_name(),
            "health": implementation.health().model_dump(),
        }
        current_version.is_current = True
        previous_versions = await session.scalars(
            select(AgentVersion).where(
                AgentVersion.agent_id == agent.id,
                AgentVersion.version != metadata.version,
            )
        )
        for previous_version in previous_versions:
            previous_version.is_current = False
    await session.commit()
