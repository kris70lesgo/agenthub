from abc import ABC, abstractmethod
from typing import Protocol

from pydantic import BaseModel, Field


class AgentInvocation(BaseModel):
    execution_id: str
    node_id: str
    input: object
    context: dict[str, object] = Field(default_factory=dict)


class AgentResult(BaseModel):
    output: object
    summary: str
    logs: list[str] = Field(default_factory=list)
    cost: float = 0
    memory_mb: int = 0
    telemetry: dict[str, object] = Field(default_factory=dict)


class AgentMetadata(BaseModel):
    slug: str
    name: str
    description: str
    version: str
    publisher: str
    capabilities: list[str] = Field(default_factory=list)


class AgentHealth(BaseModel):
    status: str
    detail: str


class Agent(Protocol):
    async def execute(self, invocation: AgentInvocation) -> AgentResult: ...

    def metadata(self) -> AgentMetadata: ...

    def health(self) -> AgentHealth: ...

    def capabilities(self) -> list[str]: ...


class BaseAgent(ABC):
    def __init__(
        self,
        *,
        agent_id: str,
        name: str,
        version: str,
        description: str,
        capabilities: list[str],
        publisher: str,
    ) -> None:
        self.id = agent_id
        self.name = name
        self.version = version
        self.description = description
        self._capabilities = capabilities
        self.publisher = publisher

    @abstractmethod
    async def execute(self, invocation: AgentInvocation) -> AgentResult: ...

    def validate_input(self, invocation: AgentInvocation) -> None:
        if not invocation.execution_id or not invocation.node_id:
            raise ValueError("Agent invocation requires execution_id and node_id.")

    def validate_output(self, result: AgentResult) -> None:
        if not result.summary:
            raise ValueError("Agent result requires a summary.")

    def health(self) -> AgentHealth:
        return AgentHealth(status="healthy", detail="Agent ready")

    def metadata(self) -> AgentMetadata:
        return AgentMetadata(
            slug=self.id,
            name=self.name,
            description=self.description,
            version=self.version,
            publisher=self.publisher,
            capabilities=self._capabilities,
        )

    def capabilities(self) -> list[str]:
        return self._capabilities

    def estimate_cost(self, input_tokens: int, output_tokens: int) -> float:
        return round((input_tokens + output_tokens) / 1_000_000, 6)
