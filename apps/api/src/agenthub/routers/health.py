from fastapi import APIRouter

from agenthub.config.settings import get_settings
from agenthub.schemas.health import HealthResponse

router = APIRouter(tags=["system"])


@router.get("/health", response_model=HealthResponse, summary="Process liveness")
async def health() -> HealthResponse:
    settings = get_settings()
    if settings.agent_registry_contract_hash is None:
        raise RuntimeError("AGENT_REGISTRY_CONTRACT_HASH must be configured.")
    return HealthResponse(
        service="agenthub-api",
        status="ok",
        version="0.1.0",
        casper_network_name=settings.casper_network_name,
        casper_node_url=settings.casper_node_url,
        agent_registry_contract_hash=settings.agent_registry_contract_hash,
    )
