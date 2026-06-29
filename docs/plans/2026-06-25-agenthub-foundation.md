# AgentHub Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a production-ready AgentHub monorepo foundation without implementing product business logic.

**Architecture:** Use pnpm workspaces for Next.js and shared TypeScript packages, a standalone uv-managed FastAPI service, and a minimal Cargo/Odra contract crate. Enforce one-way package dependencies and represent future AI, workflow, authentication, and Casper behavior through typed interfaces.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, HeroUI, FastAPI, Python 3.12, SQLAlchemy, Alembic, PostgreSQL, Redis, Casper JS SDK, Rust/Odra, Docker.

---

### Task 1: Workspace and conventions

**Files:** root package manifests, TypeScript/ESLint/Prettier configuration, Git hooks, CI, Docker Compose, environment examples.

1. Create pnpm workspace and Turborepo task graph.
2. Add formatting, linting, type checking, commit linting, and staged-file scripts.
3. Add documented environment variables and container orchestration.
4. Verify package manifests and Compose configuration parse.

### Task 2: Shared TypeScript packages

**Files:** `packages/*`

1. Create types, config, agents, Casper, UI, hooks, and API client boundaries.
2. Export each package through explicit entrypoints.
3. Add aliases through package names and application-local `@/*`.
4. Verify all packages type-check.

### Task 3: Next.js application shell

**Files:** `apps/web/*`

1. Configure App Router, Tailwind, providers, and route boundaries.
2. Create landing and dashboard route groups.
3. Add reusable navigation, data-display, overlay, workflow, chart, and code primitives.
4. Verify lint, type checks, and production build.

### Task 4: FastAPI service

**Files:** `apps/api/*`

1. Configure settings, logging, OpenAPI, middleware, database sessions, and Alembic.
2. Add health endpoint and placeholder router.
3. Add repository, agent, workflow, and Casper protocols.
4. Verify Ruff, mypy, pytest, and a health request.

### Task 5: Contract and documentation

**Files:** `contracts/*`, `docs/*`, root `README.md`.

1. Create a minimal Odra-compatible contract surface with placeholder methods.
2. Document architecture, folders, setup, development, deployment, and environment variables.
3. Run the complete repository verification suite.
