from typing import Literal, Protocol

from pydantic import BaseModel


class AuthIdentity(BaseModel):
    subject: str
    method: Literal["wallet", "jwt", "oauth"]


class AuthenticationService(Protocol):
    async def authenticate(self, credential: str) -> AuthIdentity | None: ...
