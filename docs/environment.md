# Environment Variables

Copy `.env.example` to `.env`. The example is the canonical variable inventory.

| Group    | Variables                                                             |
| -------- | --------------------------------------------------------------------- |
| Web      | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`, Casper public endpoints |
| API      | `APP_ENV`, `API_V1_PREFIX`, `SECRET_KEY`, CORS and log settings       |
| Database | `DATABASE_URL`, Supabase URL and keys                                 |
| Redis    | `REDIS_URL`                                                           |
| Models   | `NVIDIA_API_KEY`, `NVIDIA_MODEL`, `NVIDIA_BASE_URL`                   |
| Casper   | Network, node, CSPR.cloud, and registry contract values               |
| Auth     | Workspace/session configuration                                       |

Never use `NEXT_PUBLIC_` for secrets. Production secrets belong in Vercel, Railway, or the relevant managed provider secret store.
