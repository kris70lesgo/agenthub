# AgentHub Registry Contract

Minimal Odra contract for Casper. It stores compact trust records only: agent
identity metadata, workflow hashes, execution hashes, timestamps, reputation
score, and execution counts.

Odra 2.8.1 requires the Rust nightly toolchain; `rust-toolchain.toml` pins that requirement for this crate.

## Entrypoints

- `register_agent(agent_id, publisher, version)`
- `publish_version(agent_id, version)`
- `record_workflow(workflow_hash, execution_hash, timestamp, version)`
- `update_reputation(agent_id, reputation)`
- `record_execution(agent_id, successful)`
- `get_agent(agent_id)`
- `get_workflow(workflow_hash)`
- `get_reputation(agent_id)`

The contract intentionally does not store prompts, AI outputs, logs, or large
workflow documents.

## Deployment

Build and deploy from the repository root:

```bash
pnpm contract:build
pnpm contract:deploy:testnet
```

The deploy script uses `cargo odra build` to generate the installer WASM, then
uses the official Odra/Casper `casper-client put-transaction session` flow. It
does not change contract logic. See
[`docs/odra-casper-deployment.md`](../../docs/odra-casper-deployment.md) for
required environment variables and hash retrieval instructions.
