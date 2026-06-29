# AgentHub Phase 1 Frontend Design

Phase 1 turns the existing product shell into a believable agent-economy control plane using centralized mock data only. The visual direction remains dark and operational, but becomes more refined: flatter surfaces, stronger whitespace, compact metadata, subtle borders, and acid-lime reserved for status and action.

Server Components own route composition and static mock-data selection. Client Components are limited to marketplace filtering, tabs, charts, animated counters, navigation controls, and the React Flow studio. All mock entities live in one strongly typed feature module and are shared across dashboard, marketplace, details, runtime, analytics, and Casper demonstrations.

The marketplace is the primary discovery surface. It supports text search, category, price, rating, verification, publisher, capability, and sorting without network calls. Agent detail routes resolve the same central dataset and expose overview, performance, versions, dependencies, pricing, reviews, installation, workflow, and documentation sections.

Workflow Studio uses React Flow with custom styled nodes, a palette, properties rail, and mock execution log. Runtime, Analytics, and Casper pages reuse the same cards, badges, tables, timelines, and chart containers. Responsive behavior collapses navigation, converts dense grids to single columns, preserves horizontal table scrolling, and keeps the studio usable at tablet widths.

Verification covers formatting, ESLint, strict TypeScript, production build, route rendering, interactive marketplace controls, desktop/tablet/mobile layouts, and browser console errors.
