# AgentHub Phase 3 Backend Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace browser-owned execution simulation with a PostgreSQL-backed FastAPI runtime and SSE event stream while preserving the Phase 2 UI.

**Architecture:** Implement an async modular monolith with SQLAlchemy repositories, application services, typed mock agents, graph validation, persisted execution events/logs, and an in-process SSE broker. The frontend keeps its runtime state projection but receives events and commands through a typed API client.

**Tech Stack:** Python 3.12, FastAPI, Pydantic, SQLAlchemy asyncio, PostgreSQL, Alembic, pytest, React 19, React Query, TypeScript, SSE.

---

1. Add SQLAlchemy models and an initial Alembic migration for users, agents, agent versions, workflows, workflow nodes, workflow runs, execution events, and execution logs.
2. Add strict Pydantic schemas and SQLAlchemy repositories for agents, workflows, runs, logs, and events.
3. Implement the common agent interface and six mocked agents.
4. Implement graph validation, topological ordering, execution commands, persisted events, and the SSE broker.
5. Add documented REST endpoints and dependency factories.
6. Replace local frontend timing with backend run creation, SSE subscription, and control requests.
7. Run PostgreSQL migrations, tests, API/SSE integration checks, browser verification, formatting, linting, type checks, and builds.
