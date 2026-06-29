# AgentHub Phase 2.1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver a stable, responsive, professional React Flow workbench foundation.

**Architecture:** Split the existing monolithic studio into typed models, a memoized node component, toolbar, sidebar, properties panel, resizable workbench, and canvas. Keep all state local and mock-only.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, React Flow.

---

### Task 1: Typed canvas foundation

- Create workflow node types and stable initial graph data.
- Create a memoized custom node renderer.
- Verify strict TypeScript.

### Task 2: Editor chrome

- Create reusable toolbar, sidebar, and properties panel.
- Add responsive visibility controls.
- Verify accessibility labels and linting.

### Task 3: Resizable canvas workbench

- Add bounded pointer resizing for desktop rails.
- Configure React Flow grid, snapping, controls, MiniMap, validation, and selection.
- Verify layout and production build.

### Task 4: Browser verification

- Inspect desktop and mobile layouts.
- Resize rails and select nodes.
- Confirm no console errors.
