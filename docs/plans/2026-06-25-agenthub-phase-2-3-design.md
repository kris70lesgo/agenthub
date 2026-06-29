# AgentHub Phase 2.3 — Runtime Execution Simulator Design

Phase 2.3 adds a frontend-only runtime layer around the existing Phase 2.2 workflow editor. The React Flow workbench, node registry, layout, selection model, sidebar, properties rail, and connection architecture remain intact.

The simulator is event-driven. A typed runtime hook owns playback state, the execution queue, timers, per-node records, aggregate metrics, and recovery commands. It publishes domain events through a small reusable event bus. Timeline and console projections subscribe to those events instead of embedding execution messages inside UI components.

Execution follows the current graph in topological order. Disabled nodes are skipped, each active node transitions through queued and running states, approval and delay nodes briefly enter waiting, and retryable failures can transition through failed and retrying before continuing. Timing uses small randomized ranges scaled by the selected playback speed. Random failures are opt-in so a normal demonstration is predictable; manual fail, retry, skip, resume, stop, and restart remain available for recovery demonstrations.

Node data receives only its current visual status. Detailed runtime records stay in the simulator and are passed to the selected-node inspector. Edges are derived from the existing edge list: completed paths turn green, the active path animates with an energy treatment, and future paths remain muted.

A compact telemetry strip sits above the canvas and a resizable-feeling console panel sits below it. The console provides live Logs, Events, Metrics, Warnings, and Errors tabs alongside a chronological execution timeline. On smaller screens these surfaces stack and scroll without changing the canvas architecture.

All outputs, logs, durations, costs, memory values, and summaries are centralized mock data. No network calls, backend services, LangGraph, AI integration, or persistence are introduced.
