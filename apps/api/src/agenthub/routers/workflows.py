from fastapi import APIRouter, HTTPException

from agenthub.dependencies.services import WorkflowServiceDependency
from agenthub.runtime.validation import WorkflowValidationError
from agenthub.schemas.workflows import WorkflowCreate, WorkflowResponse
from agenthub.services.workflows import serialize_workflow

router = APIRouter(prefix="/workflows", tags=["workflows"])


@router.get("", response_model=list[WorkflowResponse], summary="List workflows")
async def list_workflows(service: WorkflowServiceDependency) -> list[WorkflowResponse]:
    """Return persisted workflow definitions ordered by most recently updated."""
    return [serialize_workflow(workflow) for workflow in await service.list()]


@router.post("", response_model=WorkflowResponse, status_code=201, summary="Create a workflow")
async def create_workflow(request: WorkflowCreate, service: WorkflowServiceDependency) -> WorkflowResponse:
    """Validate and persist a typed workflow graph."""
    try:
        return serialize_workflow(await service.create(request))
    except WorkflowValidationError as exc:
        raise HTTPException(
            status_code=422,
            detail={"message": "Workflow validation failed.", "errors": exc.errors},
        ) from exc
