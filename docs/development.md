# Development Guide

Use conventional commits (`feat:`, `fix:`, `chore:`, `docs:`). Pre-commit hooks format and lint staged files; commit messages are checked by commitlint.

Before opening a pull request, run:

```bash
pnpm check
```

## Boundaries

- Do not place data fetching in generic UI components.
- Do not initialize databases, Redis, or SDK clients at module import time.
- Do not expose non-`NEXT_PUBLIC_*` variables to browser code.
- Do not add blockchain writes outside the AgentHub Registry service boundary.
- Do not put domain logic in FastAPI routers or SQLAlchemy models.

## Adding a feature

Start with shared request/response contracts, then define service and repository ports, implement API behavior, and finally compose the frontend feature. Add tests at the narrowest useful boundary.
