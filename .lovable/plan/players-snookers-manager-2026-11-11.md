# Players & Snookers Manager

Build the existing placeholder into a complete frontend-only lounge-management app that runs in the browser and keeps desktop integration replaceable.

## User-facing work
- Add dashboard, session list and creation, POS billing, services/products/tariffs, expenses, reports, and settings screens in a cohesive sidebar-led app.
- Add live session countdown/overtime, the 10-minute grace window and configurable per-minute rates; provide a 640×640 session detail panel with Overview, Billing, and Controls.
- Support search, filters, quick actions, confirmations, undo where feasible, keyboard shortcuts, XLSX export, and seeded sample data.
- Apply the creamy liquid-glass theme, compact live rows, responsive layout, and recovery boundary.

## Technical approach
- Keep the current TanStack Start stack; add no Electron or native dependencies.
- Define all domain types in `src/types.ts`; make `src/lib/db.ts` the sole storage access point with the requested typed async API and browser localStorage adapter.
- Keep overtime and money calculations pure in `src/lib/billing.ts`, with focused tests for grace/rate rules.
- Use separate TanStack page routes with a shared app shell; give each page unique metadata.
- Update the root README with the complete `db.ts` implementer contract and record the architecture rule in `AGENTS.md`.

## Validation
- Run existing and new billing/data tests, then verify the preview's main workflows and check build diagnostics.
