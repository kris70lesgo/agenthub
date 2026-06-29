# AgentHub Phase 2.1 — Core Workflow Canvas Design

Phase 2.1 rebuilds the Workflow Studio as a reusable visual workbench while intentionally excluding node operations, templates, persistence, and execution simulation.

The desktop layout is a three-pane editor: a searchable node sidebar, the React Flow canvas, and a selected-node properties panel. The left and right rails are pointer-resizable within safe minimum and maximum widths. The center canvas remains the dominant surface and React Flow receives resize notifications whenever panel dimensions change.

At tablet and mobile breakpoints, the workbench becomes a canvas-first stacked layout. Toolbar buttons control the visibility of the sidebar and properties panel so the canvas remains usable without introducing modal complexity.

The canvas uses typed `AgentHubWorkflowNode` data, memoized custom nodes, stable node-type and edge-type registries, snap-to-grid behavior, smooth connection lines, connection validation, MiniMap, controls, and a subtle dot grid. Phase 2.1 exposes connection and selection foundations only; copy, paste, delete, drag-from-palette, templates, versioning, and execution are deferred to later milestones.

The visual direction extends the existing AgentHub design system with flatter editor chrome, compact command controls, rounded node cards, visible selection states, and clear information hierarchy. All controls are keyboard-focusable and carry accessible labels.
