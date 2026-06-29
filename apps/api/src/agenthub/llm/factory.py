from agenthub.config.settings import get_settings
from agenthub.llm.providers import LLMProvider, NvidiaProvider


def create_llm_provider() -> LLMProvider:
    settings = get_settings()
    provider = active_provider_name()
    if provider == "nvidia":
        return NvidiaProvider(settings)
    raise ValueError("Unsupported AI provider. AgentHub is configured for NVIDIA NIM only.")


def active_provider_name() -> str:
    settings = get_settings()
    return settings.ai_provider.lower()
