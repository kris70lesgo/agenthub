# ADR-0004: Store AgentHub trust hashes in one minimal Odra registry

## Status

Accepted

## Context

Phase 6 turns the Phase 5 prepared Casper trust records into a permanent smart
contract interface while keeping the frontend and runtime experience stable.
The contract must remain intentionally small and must not store prompts, model
outputs, logs, emails, slides, or large workflow definitions.

## Decision

Implement a single Odra contract, `AgentHubRegistry`, with mapping-backed
storage for:

- agent publisher, version, and registration flag;
- workflow hash to execution hash, timestamp, and version;
- reputation score;
- execution count and successful execution count.

The TypeScript Casper package now prepares AgentHub Registry contract-call
payloads for `register_agent`, `publish_version`, `record_workflow`,
`update_reputation`, and `record_execution`. If a deployed contract hash is not
configured, payloads are marked as needing deployment while preserving the same
frontend behavior.

## Consequences

- Phase 6 contract storage is compact and audit-friendly.
- The UI remains unchanged because service internals absorb the contract shift.
- Deployment can be completed by setting `AGENT_REGISTRY_CONTRACT_HASH` and
  `NEXT_PUBLIC_AGENT_REGISTRY_CONTRACT_HASH`.
- Future production work can replace prepared wallet-signing payloads with fully
  submitted Casper transactions without changing workflow runtime components.
