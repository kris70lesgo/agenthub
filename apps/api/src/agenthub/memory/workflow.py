from datetime import UTC, datetime

from pydantic import BaseModel, Field


class MemoryEntry(BaseModel):
    node_id: str
    agent: str
    summary: str
    output: dict[str, object]
    timestamp: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())


class WorkflowMemory(BaseModel):
    goal: str
    language: str
    workflow_context: dict[str, object] = Field(default_factory=dict)
    shared_metadata: dict[str, object] = Field(default_factory=dict)
    execution_history: list[MemoryEntry] = Field(default_factory=list)
    outputs: dict[str, dict[str, object]] = Field(default_factory=dict)

    def remember(self, node_id: str, agent: str, summary: str, output: dict[str, object]) -> None:
        self.outputs[node_id] = output
        self.execution_history.append(
            MemoryEntry(node_id=node_id, agent=agent, summary=summary, output=output)
        )

    def with_entry(
        self, node_id: str, agent: str, summary: str, output: dict[str, object]
    ) -> "WorkflowMemory":
        next_memory = self.model_copy(deep=True)
        next_memory.remember(node_id=node_id, agent=agent, summary=summary, output=output)
        return next_memory

    def snapshot(self) -> dict[str, object]:
        return self.model_dump(mode="json")
