# ADR-0003: Use Casper SDK prepared attestations before smart contracts

## Status

Accepted

## Context

Phase 5 needs AgentHub workflow executions to become verifiable on Casper
Testnet without introducing Odra contracts yet. The app already streams real AI
execution results from the backend and the frontend runtime receives completion
events.

## Decision

Use `casper-js-sdk` in the TypeScript `@agenthub/casper` package to provide
typed wallet, transaction, attestation, agent registry, workflow registry, and
reputation services. On workflow completion, the frontend prepares deterministic
workflow and execution hashes, stores a prepared transaction payload, and updates
agent reputation locally for live demonstration.

Smart-contract IDs were promoted in Phase 6 to the AgentHub Registry contract
hash and Odra contract-call payloads.

## Consequences

- The existing runtime UI remains unchanged while completed runs now generate
  verifiable hashes.
- Casper wallet, network, balance, transaction history, attestations, and
  reputation have one shared typed service boundary.
- No large AI output, prompt, or private data is intended for chain storage;
  Phase 5 stores hashes and metadata only.
- Phase 6 can keep the frontend unchanged by replacing service internals with
  contract calls.
