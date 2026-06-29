# Architecture

AgentHub is a modular monorepo with three deployment units:

1. **Web** — Next.js App Router application deployed to Vercel.
2. **API** — FastAPI control plane deployed to Railway.
3. **Contracts** — separately built and deployed Odra smart contracts on Casper.

PostgreSQL is the source of truth for application data; Redis is reserved for caching, queues, scheduling, and ephemeral coordination. Casper stores compact trust artifacts rather than complete application records.

## Dependency rule

```text
apps/web ─┐
          ├──> packages/*
apps/api ─┘

apps/api ──> PostgreSQL / Redis / model providers / Casper adapters
```

Shared packages never import applications. HTTP routers depend on services, services depend on repository and infrastructure protocols, and concrete adapters satisfy those protocols.

## Frontend

Routes are Server Components by default. Client Components are limited to providers and genuinely interactive UI. React Query owns server state; Zustand owns small ephemeral browser state. Feature modules compose reusable components without embedding product logic in route files.

## Backend

The API follows clean-architecture boundaries:

- routers translate HTTP;
- schemas define contracts;
- services implement use cases;
- repositories abstract persistence;
- agents, workflows, and Casper expose ports;
- core and middleware own cross-cutting behavior.

## Trust boundary

Wallet connection, Casper SDK transaction payloads, AgentHub Registry contract-call
preparation, workflow attestations, and reputation calculations are implemented.
Production signing and submission use the configured Casper wallet and
`AGENT_REGISTRY_CONTRACT_HASH`.
