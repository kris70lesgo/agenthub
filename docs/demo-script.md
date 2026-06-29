# Demo video script

## 2-minute pitch

AgentHub is the operating system for the AI agent economy. Today agents are
powerful, but teams lack a trusted place to discover them, compose them into
workflows, observe execution, and verify what happened afterward.

In this demo, a judge asks AgentHub to research NVIDIA's latest AI
announcements, summarize them, translate the result into Hindi, generate a
presentation outline, and draft an email. AgentHub plans the work, invokes
specialist agents through NVIDIA NIM, streams each state transition into the
runtime UI, and records verifiable hashes through Casper.

The important part is trust: Casper does not store prompts or model outputs.
AgentHub stores compact attestations: agent identity, versions, workflow hash,
execution hash, timestamp, reputation, and execution counts. That gives teams a
credible audit trail without putting private content on-chain.

## 5-minute demo outline

1. Landing page: explain the operating-system thesis.
2. Marketplace: show professional agent discovery by capability, cost, runtime,
   reputation, and publisher.
3. Workflow Studio: show the graph and node settings.
4. Run Workflow: narrate Planner → Research → Summarizer → Translator →
   Presentation → Email.
5. Runtime inspector: show structured outputs, logs, token usage, latency, and
   cost.
6. Casper page: show wallet/network, attestations, contract-call history, agent
   registration, and reputation.
7. Architecture docs: show FastAPI, LangGraph, NVIDIA NIM, PostgreSQL, and Odra
   contract boundaries.

## Closing line

AgentHub makes autonomous AI work composable, observable, and verifiable.
