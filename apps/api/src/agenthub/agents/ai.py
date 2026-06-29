import json
from dataclasses import dataclass

from pydantic import BaseModel

from agenthub.agents.base import AgentHealth, AgentInvocation, AgentResult, BaseAgent
from agenthub.agents.outputs import (
    EmailOutput,
    PlannerOutput,
    PresentationOutput,
    ResearchOutput,
    SummaryOutput,
    TranslationOutput,
)
from agenthub.agents.prompts import load_prompt_bundle
from agenthub.llm import LLMProvider, LLMRequest, create_llm_provider
from agenthub.llm.factory import active_provider_name


@dataclass(frozen=True)
class AgentDefinition:
    slug: str
    name: str
    description: str
    version: str
    publisher: str
    capabilities: list[str]
    output_model: type[BaseModel]
    temperature: float = 0.3


AGENT_DEFINITIONS: dict[str, AgentDefinition] = {
    "planner": AgentDefinition(
        slug="planner",
        name="Planner Agent",
        description="Uses the configured AI provider to decompose goals into executable workflow plans.",
        version="2.0.0",
        publisher="AgentHub Labs",
        capabilities=["Planning", "Decomposition", "Agent routing", "Structured workflow state"],
        output_model=PlannerOutput,
    ),
    "research": AgentDefinition(
        slug="research",
        name="Research Agent",
        description=(
            "Uses the configured AI provider to reason over planner output "
            "and produce structured research notes."
        ),
        version="2.0.0",
        publisher="Northstar Labs",
        capabilities=["Research reasoning", "Confidence scoring", "Open question discovery"],
        output_model=ResearchOutput,
    ),
    "summarizer": AgentDefinition(
        slug="summarizer",
        name="Summarizer Agent",
        description="Uses the configured AI provider to condense workflow memory into actionable summaries.",
        version="2.0.0",
        publisher="Routine AI",
        capabilities=["Summarization", "Key point extraction", "Action item extraction"],
        output_model=SummaryOutput,
    ),
    "translator": AgentDefinition(
        slug="translator",
        name="Translator Agent",
        description="Uses the configured AI provider to translate and localize workflow outputs.",
        version="2.0.0",
        publisher="Polyglot Systems",
        capabilities=["Translation", "Localization", "Terminology preservation"],
        output_model=TranslationOutput,
        temperature=0.2,
    ),
    "presentation": AgentDefinition(
        slug="presentation",
        name="Presentation Agent",
        description="Uses the configured AI provider to generate structured presentation outlines.",
        version="2.0.0",
        publisher="Studio Relay",
        capabilities=["Presentation planning", "Slide structure", "Speaker notes"],
        output_model=PresentationOutput,
    ),
    "email": AgentDefinition(
        slug="email",
        name="Email Agent",
        description="Uses the configured AI provider to compose context-aware workflow emails.",
        version="2.0.0",
        publisher="Routine AI",
        capabilities=["Email drafting", "Executive communication", "Delivery summaries"],
        output_model=EmailOutput,
    ),
}


class AIAgent(BaseAgent):
    def __init__(self, definition: AgentDefinition, provider: LLMProvider | None = None) -> None:
        super().__init__(
            agent_id=definition.slug,
            name=definition.name,
            version=definition.version,
            description=definition.description,
            capabilities=definition.capabilities,
            publisher=definition.publisher,
        )
        self.definition = definition
        self._provider = provider

    async def execute(self, invocation: AgentInvocation) -> AgentResult:
        self.validate_input(invocation)
        provider = self._provider or create_llm_provider()
        bundle = load_prompt_bundle(self.definition.slug)
        response = await provider.structured(
            LLMRequest(
                system_prompt=bundle.system,
                developer_prompt=bundle.developer,
                user_prompt=json.dumps(
                    {
                        "execution_id": invocation.execution_id,
                        "node_id": invocation.node_id,
                        "input": invocation.input,
                        "context": invocation.context,
                    },
                    indent=2,
                    default=str,
                ),
                temperature=self.definition.temperature,
                timeout_seconds=120,
                metadata={
                    "agent": self.definition.slug,
                    "agent_version": self.definition.version,
                    "prompt_version": bundle.version,
                    "output_schema": self.definition.output_model.__name__,
                },
            ),
            self.definition.output_model,
        )
        output = response.output.model_dump(mode="json")
        result = AgentResult(
            output=output,
            summary=_summarize_output(response.output),
            logs=[
                f"Provider: {response.provider}",
                f"Model: {response.model}",
                f"Latency: {response.latency_ms}ms",
                f"Tokens: {response.input_tokens} input / {response.output_tokens} output",
            ],
            cost=response.cost_estimate,
            memory_mb=_estimate_memory_mb(response.raw_text),
            telemetry={
                "provider": response.provider,
                "model": response.model,
                "latency_ms": response.latency_ms,
                "input_tokens": response.input_tokens,
                "output_tokens": response.output_tokens,
                "cost_estimate": response.cost_estimate,
                "prompt": {
                    "system": bundle.system,
                    "developer": bundle.developer,
                    "version": bundle.version,
                },
                "agent_version": self.definition.version,
                "prompt_version": bundle.version,
            },
        )
        self.validate_output(result)
        return result

    def health(self) -> AgentHealth:
        try:
            create_llm_provider()
        except Exception as exc:
            return AgentHealth(status="unhealthy", detail=str(exc))
        return AgentHealth(status="healthy", detail=f"{active_provider_name()} provider configured")


def get_agent(kind: str) -> AIAgent:
    definition = AGENT_DEFINITIONS.get(kind)
    if definition is None:
        raise LookupError(f"No AI agent is registered for node kind '{kind}'.")
    return AIAgent(definition)


def _summarize_output(output: BaseModel) -> str:
    if isinstance(output, PlannerOutput):
        return output.plan_summary
    if isinstance(output, ResearchOutput):
        return output.research_summary
    if isinstance(output, SummaryOutput):
        return output.summary
    if isinstance(output, TranslationOutput):
        return output.translated_summary
    if isinstance(output, PresentationOutput):
        return f"{output.title} · {len(output.slides)} slides"
    if isinstance(output, EmailOutput):
        return output.summary
    return output.model_dump_json()[:240]


def _estimate_memory_mb(raw_text: str) -> int:
    return max(96, min(768, 96 + len(raw_text) // 128))
