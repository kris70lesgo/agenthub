from uuid import uuid4

from fastapi.testclient import TestClient

from agenthub.main import app


def test_incoming_webhook_triggers_workflow_and_rejects_replay() -> None:
    with TestClient(app) as client:
        workflow_response = client.post(
            "/api/v1/workflows",
            json={
                "name": f"Webhook smoke {uuid4()}",
                "nodes": [
                    {
                        "id": "trigger-1",
                        "kind": "trigger",
                        "label": "Trigger",
                        "position": {"x": 0, "y": 0},
                        "configuration": {},
                        "disabled": False,
                    },
                    {
                        "id": "output-1",
                        "kind": "output",
                        "label": "Output",
                        "position": {"x": 200, "y": 0},
                        "configuration": {},
                        "disabled": False,
                    },
                ],
                "edges": [{"id": "e1", "source": "trigger-1", "target": "output-1"}],
            },
        )
        assert workflow_response.status_code == 201
        workflow_id = workflow_response.json()["id"]
        event_id = f"evt-{uuid4()}"

        run_response = client.post(
            f"/api/v1/webhooks/workflows/{workflow_id}",
            headers={"X-AgentHub-Event-Id": event_id},
            json={"type": "github.push", "goal": "Process a GitHub push event.", "language": "English"},
        )

        assert run_response.status_code == 202
        assert run_response.json()["workflow_id"] == workflow_id
        assert run_response.json()["goal"] == "Process a GitHub push event."

        replay_response = client.post(
            f"/api/v1/webhooks/workflows/{workflow_id}",
            headers={"X-AgentHub-Event-Id": event_id},
            json={"type": "github.push"},
        )

        assert replay_response.status_code == 409
