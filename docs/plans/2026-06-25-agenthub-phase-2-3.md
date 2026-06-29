# AgentHub Phase 2.3 Runtime Simulator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a convincing frontend-only live execution environment to the existing AgentHub workflow studio.

**Architecture:** Introduce typed runtime domain models, centralized mock outputs, a reusable event bus, and one simulator hook that projects lightweight status onto existing nodes. Add small playback, telemetry, console, timeline, and inspector components around the preserved React Flow workbench.

**Tech Stack:** React 19, TypeScript, React Flow, Tailwind CSS, Lucide icons.

---

### Task 1: Runtime domain

**Files:**

- Create: `apps/web/src/features/workflows/types/runtime.ts`
- Create: `apps/web/src/features/workflows/data/runtime-mock-data.ts`
- Create: `apps/web/src/features/workflows/lib/runtime-event-bus.ts`

Define strict execution states, events, records, metrics, console entries, mock outputs, and the reusable typed publish/subscribe layer.

### Task 2: Simulator

**Files:**

- Create: `apps/web/src/features/workflows/hooks/use-workflow-simulator.ts`

Build graph ordering, randomized scaled timing, status transitions, event projection, pause/resume/restart/stop, speed control, random and manual failure, retry, and skip.

### Task 3: Runtime surfaces

**Files:**

- Create: `apps/web/src/features/workflows/components/runtime-metrics.tsx`
- Create: `apps/web/src/features/workflows/components/runtime-console.tsx`
- Modify: `apps/web/src/features/workflows/components/workflow-toolbar.tsx`

Add playback controls, progress, telemetry, live timeline, and console tabs.

### Task 4: Canvas and inspector integration

**Files:**

- Modify: `apps/web/src/features/workflows/types/workflow.ts`
- Modify: `apps/web/src/features/workflows/components/workflow-node.tsx`
- Modify: `apps/web/src/features/workflows/components/properties-panel.tsx`
- Modify: `apps/web/src/features/workflows/workflow-studio.tsx`
- Modify: `apps/web/src/app/globals.css`

Project statuses onto nodes, derive animated edge styles, show runtime details and recovery actions for the selected node, and add restrained state animations.

### Task 5: Verification

Run formatting, ESLint, TypeScript, production build, and browser validation for desktop and mobile. Exercise run, pause, resume, restart, stop, timeline, console, selection inspector, and failure recovery.
