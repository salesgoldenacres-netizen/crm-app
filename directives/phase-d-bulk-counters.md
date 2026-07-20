# Phase D — Bulk import batching + instrumented counters / RR

## Hard constraints

- **No counter sharding** this wave
- Keep transactional `settings/counters.nextLeadNumber` + `settings/routing.roundRobinCursor`
- Call-log appends stay on `appendCallLog` → `CallLogsRepository` (Phase C)
- Production Hardening only — no security / DLS redesign

## D1 — Bulk import batching

**Entry:** `handlePostBulkLeads` → `leads/bulkImport.runBulkImport`

| Knob | Default | Notes |
|------|---------|--------|
| Chunk size | **200** | Clamped **100–500** |
| Request override | `body.chunkSize` | Optional |
| Env override | `BULK_IMPORT_CHUNK_SIZE` | Optional |
| Lookup concurrency | 15 | Phone duplicate queries |
| Call-log concurrency | 10 | Creates + merges via CallLogsRepository |
| Notify concurrency | 8 | Pre-assigned rows only |

Per chunk:

1. Clean / validate rows  
2. Parallel phone lookups  
3. `writeBatch` create new lead docs  
4. Concurrent `appendCallLog` for creates + merges  
5. Notifications for explicit assignees (RR still owned by `onLeadCreated`)

**Response** includes `failures: [{ index, phone, error, leadId? }]` so clients retry only failed rows. Structured log event: `bulk_import` with `received/created/duplicates/failed/durationMs/chunkSize/chunks`.

## D2 — Instrumented counters / RR

Shared helper: `helpers/retry.runTransactionWithRetry` (bounded exponential backoff, default 5 attempts).

| Path | Label |
|------|--------|
| `onLeadCreated` leadNumber | `settings/counters.nextLeadNumber` |
| `determineAllocation` cursor | `settings/routing.roundRobinCursor` |

Structured log events:

- `firestore_transaction_contention` (each retry)
- `firestore_transaction_retry_ok` (succeeded after retries)
- `firestore_transaction_failed` (exhausted / non-retryable)

Fallback for leadNumber after total failure remains `L-{timestamp}` (pre-existing behavior).

## Verify

```bash
cd telecaller-app/functions && npm test
```

Optional: POST `/leads/bulk` with a small payload and confirm JSON includes `failures`, `chunkSize`, and Cloud Logging shows `bulk_import`.

## Out of scope (Phase E)

Sentry, CONTRIBUTING, runbook, final debt checkpoint — see `directives/phase-e-hardening-checkpoint.md` and `directives/incident-runbook.md`.
