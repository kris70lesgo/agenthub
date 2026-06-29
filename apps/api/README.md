# AgentHub API

FastAPI control plane organized around clean boundaries and dependency injection.

```bash
uv sync
uv run uvicorn agenthub.main:app --reload
```

OpenAPI is available at `http://localhost:8000/docs`; liveness is `GET /health`.
