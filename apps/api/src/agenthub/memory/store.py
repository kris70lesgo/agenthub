class InMemoryExecutionContext:
    def __init__(self) -> None:
        self._values: dict[str, object] = {}

    def set(self, node_id: str, value: object) -> None:
        self._values[node_id] = value

    def snapshot(self) -> dict[str, object]:
        return dict(self._values)
