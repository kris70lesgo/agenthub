# ADR-0002: Use NVIDIA NIM and LangGraph for Phase 4 orchestration

## Status

Accepted

## Context

Phase 4 replaces backend-generated mock execution outputs with real AI-powered
agent execution while preserving the existing FastAPI, SSE, database, and
frontend runtime experience.

The system needs:

- Independent Planner, Research, Summarizer, Translator, Presentation, and Email agents.
- Structured Pydantic outputs instead of plain text.
- A provider abstraction for NVIDIA NIM with room for future providers.
- Shared workflow memory across agents.
- Existing SSE events, runtime logs, and UI animations to continue working.

## Decision

Use the `LLMProvider` protocol while making NVIDIA NIM the active runtime
provider through its OpenAI-compatible chat completions API. AgentHub currently
targets `moonshotai/kimi-k2.6`. Use LangGraph `StateGraph` inside the
existing `ExecutionCoordinator` to maintain workflow state and pass shared
`WorkflowMemory` across nodes.

Prompts live in per-agent markdown files under `apps/api/src/agenthub/prompts`.
Agent outputs are defined as Pydantic models in `agenthub.agents.outputs`.

## Consequences

### Positive

- The UI contract remains stable because the coordinator still emits the same SSE event types.
- Agents can be tested deterministically with fake providers while production uses the configured provider.
- Prompt changes do not require editing Python runtime logic.
- Runtime observability now stores prompt, provider, latency, token, cost, and output details.

### Negative

- Live execution requires `NVIDIA_API_KEY`; without it, runs fail honestly instead of falling back to fake output.
- LangGraph’s dynamic node typing needs one localized mypy ignore because its overloads are stricter than async closure inference.

### Neutral

- Existing databases seeded during Phase 3 are updated on startup to configured provider-backed agent metadata.
- Non-AI runtime nodes such as trigger/output remain deterministic control nodes.

## Alternatives Considered

**Keep the custom loop and call a provider directly**

- Rejected because Phase 4 explicitly requires LangGraph and future branching support.

**Use LangChain chat models**

- Rejected for this phase to keep provider abstraction smaller and avoid coupling agent output parsing to a specific orchestration library.

**Silent mock fallback when the provider is unavailable**

- Rejected because it would violate the “no fake outputs” requirement.
