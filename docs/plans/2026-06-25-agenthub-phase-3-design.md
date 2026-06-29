# AgentHub Phase 3 — Backend Foundation Design

## Requirements

AgentHub needs a production-structured FastAPI control plane that persists workflows and execution history, validates workflow graphs, exposes documented REST APIs, streams backend-generated execution events, and supports typed mock agents. The Phase 2 runtime experience must remain visually unchanged while its source of truth moves from browser timers to the backend.

Non-functional priorities are strict typing, testability, clear dependency boundaries, durable execution history, reconnectable event streams, and a low-complexity local development path. Authentication, distributed workers, AI providers, LangGraph, Casper, Odra, x402, and blockchain execution remain outside this milestone.

## Architecture

```text
React / React Query
        |
        | REST + SSE
        v
FastAPI routers
        |
        v
Application services ─── Agent registry
        |                     |
        |                     v
        |                 Mock agents
        v
Repository protocols / SQLAlchemy repositories
        |
        v
PostgreSQL

Execution service ── publishes ──> in-process SSE broker
        |
        └── persists every event and log to PostgreSQL
```

The backend is an async modular monolith. Routers translate HTTP contracts, services own use cases, repositories own persistence, SQLAlchemy models define storage, and Pydantic schemas define external contracts. The execution service validates and topologically orders a workflow, creates a run, invokes typed mock agents sequentially, persists state transitions, and publishes the same events to an in-process SSE broker.

The broker is delivery infrastructure, not the source of truth. Execution events remain persisted. This gives a clean upgrade path to Redis Streams or a task queue without changing API schemas or frontend event handling.

## Data Model

- `users`: placeholder ownership identity.
- `agents`: stable agent identities and metadata.
- `agent_versions`: versioned capabilities and configuration.
- `workflows`: workflow metadata and definition.
- `workflow_nodes`: typed nodes, positions, configuration, and runtime estimates.
- `workflow_runs`: lifecycle, timing, progress, speed, and failure mode.
- `execution_events`: ordered domain events for SSE replay and audit.
- `execution_logs`: node-level duration, state, summary, and errors.

UUID primary keys, timezone-aware timestamps, JSONB configuration, explicit foreign keys, and indexes on run/event lookup paths are used.

## Validation and Failure Handling

Workflow validation rejects missing triggers, multiple triggers, disconnected active nodes, cycles, edges referencing unknown nodes, edges targeting triggers, and invalid ordering around terminal output nodes. Errors are returned as structured `422` responses.

Runtime failures are represented as domain events. Manual fail pauses a run, retry resumes the same node, skip advances, stop cancels pending work, and restart creates a new run from the same workflow definition. SSE sends heartbeats and terminates after a terminal run event.

## Security and Operations

CORS is configured from typed settings. Request IDs are emitted on every response. API errors do not expose internals. Structured JSON logging is retained. Database clients are lazily initialized. The initial deployment is a single API process; because the broker is in-process, horizontal scaling requires a future shared event transport.

## Alternatives Considered

- WebSockets: unnecessary bidirectional complexity; recovery commands remain ordinary REST calls.
- Redis Streams now: useful for multi-process delivery, but premature for a single-process backend simulation.
- Background task queue: deferred until agent execution becomes long-running or externally distributed.
- SQLite fallback: rejected because PostgreSQL behavior and migration correctness are explicit requirements.
