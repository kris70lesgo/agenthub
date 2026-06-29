from fastapi.testclient import TestClient

from agenthub.main import app


def test_health_endpoint() -> None:
    response = TestClient(app).get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "service": "agenthub-api",
        "status": "ok",
        "version": "0.1.0",
        "casper_network_name": "casper-test",
        "casper_node_url": "https://node.testnet.casper.network/rpc",
        "agent_registry_contract_hash": (
            "contract-6d993cf06bb61847106908026bdf4ec94aef92966bdeef698f5a92a30d15359b"
        ),
    }
    assert response.headers["x-request-id"]
