from typing import Protocol, TypeVar
from uuid import UUID

EntityT = TypeVar("EntityT")


class Repository(Protocol[EntityT]):
    async def get(self, entity_id: UUID) -> EntityT | None: ...

    async def add(self, entity: EntityT) -> EntityT: ...

    async def list(self, *, offset: int = 0, limit: int = 20) -> list[EntityT]: ...
