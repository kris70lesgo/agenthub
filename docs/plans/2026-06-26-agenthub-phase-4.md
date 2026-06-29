# AgentHub Phase 4 — Real AI Multi-Agent Orchestration

## Goal

Replace mocked backend execution with real AI-powered agents while preserving the
existing Phase 3 backend architecture and Phase 2 runtime UI.

## Implemented

1. Added a provider-backed `LLMProvider` abstraction using NVIDIA NIM.
2. Added NVIDIA OpenAI-compatible API configuration through environment variables.
3. Added independent Planner, Research, Summarizer, Translator, Presentation, and Email agents.
4. Added Pydantic structured outputs for every AI agent.
5. Moved system/developer prompts into per-agent markdown files.
6. Added reusable workflow memory shared across agent execution.
7. Replaced the internal execution coordinator flow with LangGraph `StateGraph`.
8. Preserved existing SSE events, runtime logs, runtime metrics, retry/skip/stop controls, and frontend UI.
9. Persisted AI observability details in execution logs: prompt, provider, latency, tokens, cost estimate, output, and retry count.
10. Removed the backend mock agent registry and updated seed behavior to upsert configured provider-backed agent metadata.

## Runtime behavior

`POST /api/v1/workflow-runs` now accepts:

- `workflow_id`
- `goal`
- `language`
- `speed`
- `random_failures`

The frontend sends a default goal and language while keeping the UI unchanged.
The backend streams existing runtime events over SSE:

- `run.started`
- `node.queued`
- `node.started`
- `node.succeeded`
- `node.failed`
- `node.retrying`
- `node.skipped`
- `node.cancelled`
- `run.completed`
- `run.stopped`

## Required environment

```env
AI_PROVIDER=nvidia
NVIDIA_API_KEY=
NVIDIA_MODEL=moonshotai/kimi-k2.6
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
```

If the selected provider key is missing, execution fails with a structured error
instead of returning fake output.

## Validation

- Python Ruff passed.
- Strict Python mypy passed.
- Backend tests passed.
- ESLint passed.
- TypeScript passed.
- Production build passed.
- Full `pnpm check` passed.

Live execution requires a valid `NVIDIA_API_KEY` in the local environment.
