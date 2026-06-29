from typing import Literal

from pydantic import BaseModel


class HealthResponse(BaseModel):
    service: str
    status: Literal["ok"]
    version: str
    casper_network_name: str
    casper_node_url: str
    agent_registry_contract_hash: str
