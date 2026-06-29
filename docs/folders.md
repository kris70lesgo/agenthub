# Folder Guide

| Path                                 | Responsibility                            |
| ------------------------------------ | ----------------------------------------- |
| `apps/web/src/app`                   | Routes, layouts, loading/error boundaries |
| `apps/web/src/features`              | Feature-facing composition                |
| `apps/web/src/components`            | Reusable presentation components          |
| `apps/web/src/providers`             | Theme, query, toast, and UI contexts      |
| `apps/api/src/agenthub/routers`      | HTTP adapters                             |
| `apps/api/src/agenthub/services`     | Application use cases                     |
| `apps/api/src/agenthub/repositories` | Persistence ports/adapters                |
| `apps/api/src/agenthub/agents`       | AI agent contracts/adapters               |
| `apps/api/src/agenthub/workflows`    | Workflow engine ports                     |
| `apps/api/src/agenthub/casper`       | Casper integration ports                  |
| `contracts`                          | Independently released smart contracts    |
| `packages`                           | Stable shared TypeScript contracts        |

Each major directory contains a local README with ownership guidance.
