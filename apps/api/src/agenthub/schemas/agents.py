from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AgentVersionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    version: str
    configuration: dict[str, object]
    is_current: bool
    created_at: datetime


class AgentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slug: str
    name: str
    description: str
    category: str
    publisher: str
    capabilities: list[str]
    is_active: bool
    versions: list[AgentVersionResponse] = []
