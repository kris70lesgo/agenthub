from typing import Protocol


class WalletService(Protocol):
    async def verify_signature(self, public_key: str, message: str, signature: str) -> bool: ...


class AgentRegistryService(Protocol):
    async def prepare_registration(self, agent_id: str) -> dict[str, object]: ...


class ReputationService(Protocol):
    async def prepare_update(self, agent_id: str, score: int) -> dict[str, object]: ...


class WorkflowAttestationService(Protocol):
    async def prepare_attestation(self, workflow_id: str, execution_hash: str) -> dict[str, object]: ...


class TransactionService(Protocol):
    async def submit(self, signed_transaction: str) -> str: ...
