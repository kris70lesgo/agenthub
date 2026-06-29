from datetime import datetime
from typing import Protocol

from pydantic import BaseModel


class WorkflowDefinition(BaseModel):
    workflow_id: str
    version: str
    nodes: list[dict[str, object]]


class Execution(BaseModel):
    execution_id: str
    workflow_id: str
    status: str


class WorkflowEngine(Protocol):
    async def execute(self, workflow: WorkflowDefinition, payload: object) -> Execution: ...


class Scheduler(Protocol):
    async def schedule(self, workflow_id: str, run_at: datetime) -> str: ...


class MemoryStore(Protocol):
    async def get(self, namespace: str, key: str) -> object | None: ...

    async def set(self, namespace: str, key: str, value: object) -> None: ...


class EventPublisher(Protocol):
    async def publish(self, topic: str, payload: dict[str, object]) -> None: ...


class ExecutionLogger(Protocol):
    async def record(self, execution_id: str, event: dict[str, object]) -> None: ...
