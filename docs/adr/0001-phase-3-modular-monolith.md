# ADR-0001: Use an Async Modular Monolith with PostgreSQL and SSE

## Status

Accepted

## Context

Phase 3 needs real persistence, execution orchestration, and live event delivery without implementing distributed agents, AI providers, or blockchain infrastructure. The system must remain easy to run locally while preserving clean boundaries for future workers and external event infrastructure.

## Decision

Use one async FastAPI application organized into routers, services, repositories, models, schemas, agents, runtime, events, memory, database, middleware, and core modules. PostgreSQL is the durable source of truth. Server-Sent Events deliver live runtime updates through an in-process broker, while every event is also persisted.

## Consequences

### Positive

- Simple deployment and local development.
- Transactional persistence for workflows and execution history.
- One-way SSE matches the runtime event use case.
- Repository and service boundaries support later extraction.

### Negative

- The in-process broker does not span multiple API replicas.
- Active runs are interrupted by process restarts.

### Neutral

- Redis remains configured but is not required for Phase 3 execution.

## Alternatives Considered

- WebSockets: rejected because runtime commands work cleanly over REST.
- Redis Streams: deferred until multiple API workers are required.
- Microservices: rejected as premature operational complexity.
