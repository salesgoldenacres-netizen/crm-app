# Memory — CRM Production Cleanup Pass

Last updated: 2026-07-10

See root `../memory.md` for full session handoff.

## Cleanup summary

- Dead code removed (verified): TelecallerMetricsWidget, useErrorHandler, boilerplate SVGs, empty folders.
- Repositories wired for Custom Roles & Teams; `uploadFile` shared helper added.
- Canonical plot proximity/competitor types used in ProjectFormModal.
- Kept: design-system primitives, Smart Lists (dormant), WidgetGrid telecallerMetrics bug (backlog).

## Validation

tsc / eslint / production build: passing at end of Phase 6.
