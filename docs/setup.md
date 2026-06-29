# Setup

## Local toolchain

- Node.js 22 and pnpm 10
- Python 3.12 and uv
- Rust stable and Cargo
- Docker Desktop or compatible Docker Engine

## Install

```bash
cp .env.example .env
pnpm install
uv sync --project apps/api
```

## Run applications

```bash
pnpm --filter @agenthub/web dev
uv run --project apps/api uvicorn agenthub.main:app --reload
```

Or run the full local topology:

```bash
docker compose up --build
```

## Database migrations

From `apps/api`:

```bash
uv run alembic revision --autogenerate -m "describe change"
uv run alembic upgrade head
```

Review every generated migration before applying it.
