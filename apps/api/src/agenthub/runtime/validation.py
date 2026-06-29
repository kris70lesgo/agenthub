from collections import deque

from agenthub.schemas.workflows import WorkflowCreate


class WorkflowValidationError(ValueError):
    def __init__(self, errors: list[str]) -> None:
        super().__init__("; ".join(errors))
        self.errors = errors


def validate_and_order(workflow: WorkflowCreate) -> list[str]:
    active_nodes = [node for node in workflow.nodes if not node.disabled]
    node_by_id = {node.id: node for node in active_nodes}
    errors: list[str] = []
    triggers = [node for node in active_nodes if node.kind == "trigger"]
    if not triggers:
        errors.append("Workflow must contain one active trigger node.")
    elif len(triggers) > 1:
        errors.append("Workflow must contain exactly one active trigger node.")

    indegree = {node.id: 0 for node in active_nodes}
    outgoing: dict[str, list[str]] = {node.id: [] for node in active_nodes}
    connected: set[str] = set()
    for edge in workflow.edges:
        if edge.source not in node_by_id or edge.target not in node_by_id:
            errors.append(f"Edge {edge.id} references a missing or disabled node.")
            continue
        source = node_by_id[edge.source]
        target = node_by_id[edge.target]
        if source.kind == "output":
            errors.append(f"Output node {source.label} cannot connect to another node.")
        if target.kind == "trigger":
            errors.append(f"Trigger node {target.label} cannot receive connections.")
        outgoing[edge.source].append(edge.target)
        indegree[edge.target] += 1
        connected.update((edge.source, edge.target))

    disconnected = [node.label for node in active_nodes if node.id not in connected and len(active_nodes) > 1]
    if disconnected:
        errors.append(f"Disconnected nodes: {', '.join(disconnected)}.")
    if errors:
        raise WorkflowValidationError(errors)

    queue = deque(node_id for node_id, degree in indegree.items() if degree == 0)
    ordered: list[str] = []
    while queue:
        node_id = queue.popleft()
        ordered.append(node_id)
        for target_id in outgoing[node_id]:
            indegree[target_id] -= 1
            if indegree[target_id] == 0:
                queue.append(target_id)
    if len(ordered) != len(active_nodes):
        raise WorkflowValidationError(["Workflow contains a circular dependency."])
    if triggers and ordered[0] != triggers[0].id:
        raise WorkflowValidationError(["The trigger must be the first executable node."])
    return ordered
