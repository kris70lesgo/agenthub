from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel


class PromptBundle(BaseModel):
    system: str
    developer: str
    version: str = "1.0.0"


PROMPT_ROOT = Path(__file__).resolve().parents[1] / "prompts"


@lru_cache
def load_prompt_bundle(agent_slug: str) -> PromptBundle:
    prompt_dir = PROMPT_ROOT / agent_slug
    return PromptBundle(
        system=(prompt_dir / "system.md").read_text(encoding="utf-8").strip(),
        developer=(prompt_dir / "developer.md").read_text(encoding="utf-8").strip(),
    )
