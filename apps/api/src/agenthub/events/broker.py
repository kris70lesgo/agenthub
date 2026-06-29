import asyncio
from collections import defaultdict
from collections.abc import AsyncIterator
from uuid import UUID

from agenthub.schemas.runtime import ExecutionEventResponse


class EventBroker:
    def __init__(self) -> None:
        self._subscribers: dict[UUID, set[asyncio.Queue[ExecutionEventResponse]]] = defaultdict(set)

    async def publish(self, run_id: UUID, event: ExecutionEventResponse) -> None:
        for queue in tuple(self._subscribers[run_id]):
            await queue.put(event)

    async def subscribe(self, run_id: UUID) -> AsyncIterator[ExecutionEventResponse]:
        queue: asyncio.Queue[ExecutionEventResponse] = asyncio.Queue(maxsize=100)
        self._subscribers[run_id].add(queue)
        try:
            while True:
                yield await queue.get()
        finally:
            self._subscribers[run_id].discard(queue)


event_broker = EventBroker()
