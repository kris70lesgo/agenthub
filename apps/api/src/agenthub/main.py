from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from agenthub.config.settings import get_settings
from agenthub.core.logging import configure_logging
from agenthub.database.seed import seed_agents
from agenthub.database.session import get_session_factory
from agenthub.middleware.request_context import RequestContextMiddleware
from agenthub.routers.api import api_router
from agenthub.routers.health import router as health_router


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    configure_logging()
    async with get_session_factory()() as session:
        await seed_agents(session)
    yield


def create_application() -> FastAPI:
    settings = get_settings()
    application = FastAPI(
        title=settings.app_name,
        description="Control-plane API for the AgentHub agent economy platform.",
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.backend_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.add_middleware(RequestContextMiddleware)
    application.include_router(health_router)
    application.include_router(api_router, prefix=settings.api_v1_prefix)
    return application


app = create_application()
