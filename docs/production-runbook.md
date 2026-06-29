# Production runbook

## Frontend: Vercel

1. Import the repository.
2. Set root package manager to `pnpm`.
3. Build command: `pnpm --filter @agenthub/web build`.
4. Output: Next.js managed output.
5. Configure:
   - `NEXT_PUBLIC_API_URL`
   - `NEXT_PUBLIC_CASPER_NETWORK`
   - `NEXT_PUBLIC_CASPER_NODE_URL`
   - `NEXT_PUBLIC_CSPR_CLOUD_URL`
   - `NEXT_PUBLIC_AGENT_REGISTRY_CONTRACT_HASH`

## Backend: Railway

1. Deploy `apps/api`.
2. Start command:
   `uv run uvicorn agenthub.main:app --host 0.0.0.0 --port $PORT`.
3. Configure:
   - `DATABASE_URL`
   - `NVIDIA_API_KEY`
   - `NVIDIA_BASE_URL`
   - `NVIDIA_MODEL`
   - `BACKEND_CORS_ORIGINS`
   - `AGENT_REGISTRY_CONTRACT_HASH`

## Database: Supabase

1. Create a Postgres project.
2. Use the pooled connection string for `DATABASE_URL`.
3. Run Alembic migrations before demo traffic.

## Casper Testnet

1. Build the Odra contract in `contracts/agenthub-registry`.
2. Deploy the contract to Casper Testnet.
3. Set the resulting contract hash in backend and frontend env vars.
4. Verify `register_agent`, `record_workflow`, `record_execution`, and
   `update_reputation` through explorer records.
