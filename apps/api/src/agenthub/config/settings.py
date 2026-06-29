from functools import lru_cache

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "AgentHub API"
    app_env: str = "development"
    api_v1_prefix: str = "/api/v1"
    log_level: str = "INFO"
    secret_key: str = Field(default="development-only-secret-key-change-me", min_length=32)
    backend_cors_origins: list[str] = ["http://localhost:3000"]
    database_url: str = "postgresql+asyncpg://agenthub:agenthub@localhost:5432/agenthub"
    redis_url: str = "redis://localhost:6379/0"
    ai_provider: str = "nvidia"
    nvidia_api_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices("NVIDIA_API_KEY", "NVIDIA_API_TOKEN", "NVIDIA_KEY"),
    )
    nvidia_model: str = Field(
        default="moonshotai/kimi-k2.6",
        validation_alias=AliasChoices("NVIDIA_MODEL", "NVIDIA_API_MODEL", "NVIDIA_NIM_MODEL"),
    )
    nvidia_base_url: str = Field(
        default="https://integrate.api.nvidia.com/v1",
        validation_alias=AliasChoices("NVIDIA_BASE_URL", "NVIDIA_API_BASE_URL", "NVIDIA_API_URL"),
    )
    openrouter_api_key: str | None = None
    casper_network_name: str = "casper-test"
    casper_node_url: str = "https://node.testnet.casper.network/rpc"
    cspr_cloud_api_url: str = "https://api.testnet.cspr.cloud"
    cspr_cloud_api_key: str | None = None
    agent_registry_contract_hash: str | None = None
    webhook_signing_secret: str | None = Field(
        default=None,
        validation_alias=AliasChoices("AGENTHUB_WEBHOOK_SECRET", "WEBHOOK_SIGNING_SECRET"),
    )

    @field_validator("casper_network_name")
    @classmethod
    def validate_casper_network(cls, value: str) -> str:
        if value != "casper-test":
            raise ValueError("CASPER_NETWORK_NAME must be casper-test for the deployed AgentHub Registry.")
        return value

    @field_validator("casper_node_url")
    @classmethod
    def validate_casper_node_url(cls, value: str) -> str:
        if "testnet" not in value and "7777" not in value:
            raise ValueError("CASPER_NODE_URL must point to Casper Testnet.")
        return value

    @field_validator("agent_registry_contract_hash")
    @classmethod
    def validate_registry_contract_hash(cls, value: str | None) -> str:
        if not value:
            raise ValueError("AGENT_REGISTRY_CONTRACT_HASH must be configured.")
        if not value.startswith(("contract-", "hash-")):
            raise ValueError("AGENT_REGISTRY_CONTRACT_HASH must be a Casper contract/hash value.")
        return value

    @field_validator("backend_cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> object:
        if isinstance(value, str) and not value.startswith("["):
            return [origin.strip() for origin in value.split(",")]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
