from pydantic import BaseModel

from agenthub.agents.ai import AGENT_DEFINITIONS, AIAgent
from agenthub.agents.base import AgentInvocation
from agenthub.agents.outputs import (
    EmailOutput,
    PlannerOutput,
    PlanStep,
    PresentationOutput,
    PresentationSlide,
    ResearchFinding,
    ResearchOutput,
    SummaryOutput,
    TranslationOutput,
)
from agenthub.llm import LLMRequest, LLMResponse
from agenthub.llm.providers import LLMStreamChunk


class FakeProvider:
    async def generate(self, request: LLMRequest) -> str:
        return request.user_prompt

    async def stream(self, request: LLMRequest):
        yield LLMStreamChunk(text=await self.generate(request), index=0, is_final=True)

    async def structured(self, request: LLMRequest, output_model: type[BaseModel]) -> LLMResponse:
        return await self.generate_structured(request, output_model)

    async def generate_structured(self, request: LLMRequest, output_model: type[BaseModel]) -> LLMResponse:
        output = fake_output(output_model)
        return LLMResponse(
            output=output,
            raw_text=output.model_dump_json(),
            provider="fake",
            model="fake-model",
            latency_ms=1,
            input_tokens=10,
            output_tokens=20,
            cost_estimate=0.001,
        )

    async def health(self) -> str:
        return "configured"


def fake_output(output_model: type[BaseModel]) -> BaseModel:
    if output_model is PlannerOutput:
        return PlannerOutput(
            goal="Verify the interface",
            plan_summary="Plan created.",
            steps=[
                PlanStep(
                    order=1,
                    title="Research",
                    agent="research",
                    objective="Collect context.",
                    expected_output="Notes",
                )
            ],
            selected_agents=["research"],
        )
    if output_model is ResearchOutput:
        return ResearchOutput(
            topic="AgentHub",
            research_summary="Research complete.",
            findings=[ResearchFinding(claim="Works", reasoning="Typed output returned.", confidence=0.9)],
        )
    if output_model is SummaryOutput:
        return SummaryOutput(summary="Summary complete.", key_points=["Typed output"])
    if output_model is TranslationOutput:
        return TranslationOutput(
            source_language="English",
            target_language="Spanish",
            translated_summary="Resumen completo.",
        )
    if output_model is PresentationOutput:
        return PresentationOutput(
            title="AgentHub Brief",
            audience="Operators",
            sections=["Overview"],
            slides=[PresentationSlide(title="Overview", bullets=["Typed output"], speaker_notes="Discuss.")],
            narrative_arc="Problem to solution.",
        )
    if output_model is EmailOutput:
        return EmailOutput(
            recipient="team@example.com",
            subject="AgentHub update",
            body="The workflow completed.",
            summary="Email drafted.",
        )
    raise AssertionError(f"Unhandled output model: {output_model}")


async def test_all_required_agents_expose_the_common_interface() -> None:
    assert set(AGENT_DEFINITIONS) == {
        "planner",
        "research",
        "summarizer",
        "translator",
        "presentation",
        "email",
    }
    provider = FakeProvider()
    for slug, definition in AGENT_DEFINITIONS.items():
        agent = AIAgent(definition, provider)
        result = await agent.execute(
            AgentInvocation(
                execution_id="test-run",
                node_id=f"{slug}-1",
                input={"goal": "Verify the interface"},
            )
        )
        assert agent.metadata().slug == slug
        assert agent.capabilities()
        assert result.summary
        assert result.logs
        assert result.telemetry["provider"] == "fake"
