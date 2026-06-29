from agenthub.models import Workflow, WorkflowNode
from agenthub.repositories.sqlalchemy import WorkflowRepository
from agenthub.runtime.validation import validate_and_order
from agenthub.schemas.workflows import WorkflowCreate, WorkflowResponse


class WorkflowService:
    def __init__(self, repository: WorkflowRepository) -> None:
        self.repository = repository

    async def list(self) -> list[Workflow]:
        return await self.repository.list()

    async def create(self, request: WorkflowCreate) -> Workflow:
        order = validate_and_order(request)
        position_by_id = {node_id: index for index, node_id in enumerate(order)}
        workflow = Workflow(
            name=request.name,
            description=request.description,
            version=request.version,
            definition={
                "edges": [edge.model_dump() for edge in request.edges],
                "execution_order": order,
            },
        )
        nodes = [
            WorkflowNode(
                node_key=node.id,
                kind=node.kind,
                label=node.label,
                position_index=position_by_id.get(node.id, len(position_by_id)),
                position=node.position.model_dump(),
                configuration=node.configuration,
                disabled=node.disabled,
            )
            for node in request.nodes
        ]
        return await self.repository.add(workflow, nodes)


def serialize_workflow(workflow: Workflow) -> WorkflowResponse:
    return WorkflowResponse.model_validate(workflow)
