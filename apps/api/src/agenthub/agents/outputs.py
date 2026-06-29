from pydantic import BaseModel, Field


class AgentError(BaseModel):
    code: str
    message: str
    recoverable: bool = True


class PlanStep(BaseModel):
    order: int
    title: str
    agent: str
    objective: str
    expected_output: str


class PlannerOutput(BaseModel):
    goal: str
    plan_summary: str
    steps: list[PlanStep] = Field(min_length=1)
    selected_agents: list[str] = Field(min_length=1)
    workflow_state: dict[str, str] = Field(default_factory=dict)
    risks: list[str] = Field(default_factory=list)
    success_criteria: list[str] = Field(default_factory=list)


class ResearchFinding(BaseModel):
    claim: str
    reasoning: str
    confidence: float = Field(ge=0, le=1)


class ResearchOutput(BaseModel):
    topic: str
    research_summary: str
    findings: list[ResearchFinding] = Field(min_length=1)
    references: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    opportunities: list[str] = Field(default_factory=list)
    open_questions: list[str] = Field(default_factory=list)
    source_strategy: list[str] = Field(default_factory=list)


class SummaryOutput(BaseModel):
    summary: str
    highlights: list[str] = Field(default_factory=list)
    key_points: list[str] = Field(min_length=1)
    action_items: list[str] = Field(default_factory=list)
    decisions: list[str] = Field(default_factory=list)
    confidence_score: float = Field(default=0.8, ge=0, le=1)


class TranslationOutput(BaseModel):
    source_language: str
    target_language: str
    translated_summary: str
    translated_key_points: list[str] = Field(default_factory=list)
    terminology_notes: list[str] = Field(default_factory=list)


class PresentationSlide(BaseModel):
    title: str
    bullets: list[str] = Field(min_length=1)
    speaker_notes: str


class PresentationOutput(BaseModel):
    title: str
    audience: str
    agenda: list[str] = Field(default_factory=list)
    sections: list[str] = Field(min_length=1)
    slides: list[PresentationSlide] = Field(min_length=1)
    narrative_arc: str
    conclusion: str = ""


class EmailOutput(BaseModel):
    recipient: str
    subject: str
    body: str
    summary: str
    attachments: list[str] = Field(default_factory=list)


StructuredAgentOutput = (
    PlannerOutput | ResearchOutput | SummaryOutput | TranslationOutput | PresentationOutput | EmailOutput
)
