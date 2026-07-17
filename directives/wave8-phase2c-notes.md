# Wave 8 Phase 2C Notes

This document contains key implementation details and architectural learnings for the Analytics Service & KPI Foundation slice.

## Key Decisions Deployed

1. **Decoupled Architecture**: Abstracted widgets away from direct store references or raw reductions into `AnalyticsService`.
2. **Four-Tier Routing Engine**: Designed a service that checks in-memory client store data, falls back to summary document reads, and terminates on native server `count()` queries.
3. **Structured Cache Rules**: Defined Realtime (15s), Summary (5m), and Count (30s) TTL scopes to maximize responsiveness while preventing server overload.
4. **Scoping and Authorization Gates**: Integrated with `ProjectScopeContext` and `AuthorizationContext` to enforce boundary rules before any data is fetched.
5. **Concurrent Deduplication**: Collapsed overlapping identical queries to resolve concurrently within the same promise context.
