# AgentHub Foundation Design

## Direction

AgentHub will begin as a pnpm monorepo with independently deployable web and API applications, a minimal Odra contract crate, and small shared TypeScript packages. The foundation favors explicit boundaries over premature abstraction: frontend features live close to their routes, backend domain ports are represented by typed protocols, and blockchain operations remain interfaces until transaction behavior is designed.

The web application uses Next.js 15 App Router and React 19. Server Components remain the default; client boundaries are limited to providers and interactive primitives. A dark, industrial “network operations console” design system gives every placeholder page a coherent product identity without implying finished business functionality.

The API uses FastAPI with a `src` layout, Pydantic settings, async SQLAlchemy, Alembic, repository ports, and dependency injection. PostgreSQL and Redis are development services in Docker Compose. AI agents, workflows, authentication, and Casper operations expose contracts only.

## Data and dependency flow

Applications may import shared packages, but shared packages never import applications. UI depends on types and configuration; hooks may depend on types; the Casper package owns SDK-facing abstractions. The browser talks to the API through the shared API client. The API owns persistence and orchestration boundaries and will eventually call Casper and model providers through injected adapters.

Configuration is validated at process boundaries. The frontend only exposes `NEXT_PUBLIC_*` values. Backend secrets are loaded through Pydantic settings. No SDK client is initialized at module import time.

## Failure handling and verification

Route-level loading, error, and not-found boundaries provide predictable frontend failure states. API exceptions are normalized by middleware and include request IDs. Health checks distinguish process liveness from future dependency readiness.

Verification consists of formatting, ESLint, TypeScript checks, a production Next.js build, Python lint/type/test checks, import validation, and a direct FastAPI health endpoint test. Docker Compose configuration is validated separately.
