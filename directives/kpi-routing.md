# KPI Provider Routing Engine

Routing sequence policy coordinates access to transactional vs pre-aggregated storage backends.

## Sequence Order

```
[Request Metrics]
        │
        ▼
[Check Local Store (Tier 1)]
        │
        ├── (Succeeds) ──> [Return Data]
        ▼ (Fails)
[Check Pre-aggregated Summary Docs (Tier 2/3)]
        │
        ├── (Succeeds) ──> [Return Data]
        ▼ (Fails)
[Execute count() aggregations (Tier 4)]
        │
        ├── (Succeeds) ──> [Return Data]
        ▼ (Fails)
[Throw PROVIDER_UNAVAILABLE normalized error]
```

This ensures that:
- Transactional Firestore load is minimized.
- Client state is queried before hitting databases.
- Full collections are never downloaded or scanned for counts.
