# Deployment

## Web → Vercel

Set the root directory to `apps/web` only if the deployment system understands pnpm workspaces; otherwise build from the repository root with `pnpm --filter @agenthub/web build`. Configure all `NEXT_PUBLIC_*` variables at build time.

## API → Railway

Deploy `apps/api/Dockerfile`, expose port `8000`, and use `/health` for liveness. Run Alembic migrations as a release command before shifting traffic.

## PostgreSQL → Supabase

Use the pooled async connection string for application traffic and a direct connection for migrations when required. Enable SSL in production and keep service-role credentials server-side.

## Contracts → Casper Testnet

Build `contracts/agenthub-registry`, deploy the AgentHub Registry to Casper
Testnet, then set `AGENT_REGISTRY_CONTRACT_HASH` and
`NEXT_PUBLIC_AGENT_REGISTRY_CONTRACT_HASH`. The app stores compact hashes and
reputation metadata only.

Use the reproducible workflow in
[odra-casper-deployment.md](odra-casper-deployment.md).

See [production-runbook.md](production-runbook.md) for the release sequence.
