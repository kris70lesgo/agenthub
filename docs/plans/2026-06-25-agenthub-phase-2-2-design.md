# AgentHub Phase 2.2 — Professional Node System Design

Phase 2.2 extends the Phase 2.1 workbench without changing its layout architecture. A centralized node registry becomes the source of truth for all 17 node types, including category, ports, publisher, capabilities, runtime, cost, reputation, configuration defaults, and visual identity.

Every canvas node uses one strongly typed data model and one memoized renderer. Specialized character comes from registry metadata rather than duplicated components. Editor behavior is separated into focused actions for drag/drop, clipboard, duplication, deletion, disabling, renaming, grouping, selection, arrow movement, and keyboard shortcuts.

Connections are validated by a reusable policy layer. Terminal nodes cannot emit connections, trigger nodes cannot receive them, duplicate/self connections are rejected, and port data types must be compatible. Invalid connection attempts produce visible feedback.

The sidebar adds fuzzy token matching, category filters, pinned/favorite/recent groupings, and native drag payloads. The properties panel expands into mocked General, Inputs, Outputs, Execution, Dependencies, Environment, Publisher, Capabilities, Cost, Runtime, and Logs sections.

Templates, persistence/version history, command palette, and execution simulation remain outside this milestone.
