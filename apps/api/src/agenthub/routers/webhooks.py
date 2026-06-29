import hashlib
import hmac
from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Header, HTTPException, Request

from agenthub.config.settings import get_settings
from agenthub.runtime.execution import execution_coordinator
from agenthub.schemas.runtime import WorkflowRunResponse

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

_REPLAY_WINDOW = timedelta(minutes=15)
_seen_event_ids: dict[str, datetime] = {}


@router.post(
    "/workflows/{workflow_id}",
    response_model=WorkflowRunResponse,
    status_code=202,
    summary="Trigger a workflow from an incoming webhook",
)
async def trigger_workflow_webhook(
    workflow_id: UUID,
    request: Request,
    x_agenthub_event_id: str | None = Header(default=None, alias="X-AgentHub-Event-Id"),
    x_agenthub_signature_256: str | None = Header(default=None, alias="X-AgentHub-Signature-256"),
) -> WorkflowRunResponse:
    body = await request.body()
    _validate_signature(body, x_agenthub_signature_256)
    if x_agenthub_event_id:
        _reject_replay(x_agenthub_event_id)
    payload = await request.json()
    if not isinstance(payload, dict):
        raise HTTPException(status_code=422, detail="Webhook payload must be a JSON object.")
    goal = payload.get("goal")
    language = payload.get("language")
    try:
        run = await execution_coordinator.start(
            workflow_id,
            speed=1,
            random_failures=False,
            goal=goal if isinstance(goal, str) and goal else _default_webhook_goal(payload),
            language=language if isinstance(language, str) and language else "English",
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return WorkflowRunResponse.model_validate(run)


def _validate_signature(body: bytes, provided_signature: str | None) -> None:
    secret = get_settings().webhook_signing_secret
    if not secret:
        return
    if not provided_signature:
        raise HTTPException(status_code=401, detail="Missing webhook signature.")
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    normalized = provided_signature.removeprefix("sha256=")
    if not hmac.compare_digest(expected, normalized):
        raise HTTPException(status_code=401, detail="Invalid webhook signature.")


def _reject_replay(event_id: str) -> None:
    now = datetime.now(UTC)
    expired = [key for key, seen_at in _seen_event_ids.items() if now - seen_at > _REPLAY_WINDOW]
    for key in expired:
        del _seen_event_ids[key]
    if event_id in _seen_event_ids:
        raise HTTPException(status_code=409, detail="Webhook event was already processed.")
    _seen_event_ids[event_id] = now


def _default_webhook_goal(payload: dict[str, object]) -> str:
    event_type = payload.get("type") or payload.get("event") or payload.get("action") or "incoming webhook"
    return f"Process {event_type} and execute the connected AgentHub workflow."
