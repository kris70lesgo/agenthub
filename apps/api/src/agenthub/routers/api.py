from fastapi import APIRouter

from agenthub.routers.agents import router as agents_router
from agenthub.routers.runtime import router as runtime_router
from agenthub.routers.webhooks import router as webhooks_router
from agenthub.routers.workflows import router as workflows_router
from agenthub.schemas.common import ApiMessage

api_router = APIRouter()
api_router.include_router(agents_router)
api_router.include_router(workflows_router)
api_router.include_router(runtime_router)
api_router.include_router(webhooks_router)


@api_router.get("/", response_model=ApiMessage, tags=["system"])
async def api_index() -> ApiMessage:
    return ApiMessage(message="AgentHub API foundation is ready.")
