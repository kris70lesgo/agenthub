# AgentHub

> The Operating System for the Agent Economy.

AgentHub is a production-shaped platform for publishing, discovering,
composing, executing, and verifying autonomous AI agent work. It runs real
multi-agent workflows through NVIDIA NIM with Kimi K2.6, streams execution over
FastAPI SSE, and prepares Casper Testnet trust records through a minimal Odra
AgentHub Registry contract.

## Repository map

```text
apps/
  web/                         Next.js 15 + React 19 product shell
  api/                         FastAPI control plane
contracts/
  agenthub-registry/           Minimal Odra contract surface
packages/
  agents/                      Agent manifests and ports
  casper/                      Casper client contracts
  config/                      Config, validation, API client, logger
  hooks/                       Shared React hooks
  types/                       Serializable domain contracts
  ui/                          Design-system helpers
docs/                          Architecture and operating guides
scripts/                       Repository automation
```

## Quick start

Requirements: Node.js 22, pnpm 10, Python 3.12, uv, Rust, and Docker.

```bash
cp .env.example .env
pnpm install
uv sync --project apps/api
pnpm dev
```

The web app runs at `http://localhost:3000`; the API runs at `http://localhost:8000` when started with:

```bash
uv run --project apps/api uvicorn agenthub.main:app --reload
```

Infrastructure can be started with `docker compose up --build`.

## Judge demo

Use the Workflow Studio prompt:

> Research NVIDIA's latest AI announcements, summarize them, translate them
> into Hindi, generate a presentation outline, and draft an email.

Expected flow:

1. Planner builds the execution plan.
2. Research, Summarizer, Translator, Presentation, and Email agents produce
   structured outputs through NVIDIA NIM.
3. Runtime SSE updates animate the workflow canvas and console.
4. AgentHub computes workflow/execution hashes.
5. Casper trust services prepare AgentHub Registry contract-call payloads for
   workflow, execution, agent identity, and reputation records.

See [docs/judge-guide.md](docs/judge-guide.md) for the two-minute walkthrough.

## Quality commands

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check
```

See [docs/setup.md](docs/setup.md), [docs/architecture.md](docs/architecture.md),
[docs/development.md](docs/development.md), [docs/judge-guide.md](docs/judge-guide.md),
[docs/demo-script.md](docs/demo-script.md), and
[docs/odra-casper-deployment.md](docs/odra-casper-deployment.md).
