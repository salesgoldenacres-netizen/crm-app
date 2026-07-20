# Phase C — Call logs extraction + idempotent productivity

## Canonical model

```
callLogs/{callLogId}          ← event SoT (top-level collection)
leads/{leadId}                ← denormalized summaries only:
  callCount, lastCallAt, lastCallOutcome, lastCallAgent,
  lastAgentId, lastCallNote, hasAgentCall
productivityEvents/{callLogId} ← create-once marker (same txn as productivity)
```

No permanent dual-write. Embedded `lead.callLogs[]` is read-only fallback during migration.

## Write path

- Client: `LeadsRepository.logCall` → `CallLogsRepository.create`
- Functions: `appendCallLog` → `helpers/callLogsRepository.createCallLog`
- New leads do **not** seed embedded arrays

## Dual-read / rollback flag

| Flag | Default | Meaning |
|------|---------|---------|
| `VITE_CALL_LOGS_EMBEDDED_FALLBACK` | `true` | Lead history merges top-level + embedded |
| Set to `false` / `0` | — | Collection only (after backfill) |

Legacy Cloud Function `onLeadCallLogUpdated` is a no-op. Productivity runs on `onCallLogCreated`.

## Backfill

```bash
# Dry-run (default)
python execution/backfill_call_logs.py

# Apply (idempotent stable ids)
python execution/backfill_call_logs.py --apply --confirm BACKFILL

# Optional: clear embedded arrays after verifying dual-read
python execution/backfill_call_logs.py --apply --confirm BACKFILL --strip-embedded

# Post-apply gate: confirm stable ids exist before flag flip
python execution/backfill_call_logs.py --verify
```

Migrated docs set `migratedFromEmbedded: true` + `skipProductivity: true` so historical rows do not re-aggregate.

## Deploy notes

1. Deploy `firestore.indexes.json` (callLogs: leadId + date) before heavy dual-read traffic
2. Deploy `firestore.rules` (callLogs + productivityEvents)
3. Deploy functions (`onCallLogCreated`)
4. Ship client
5. Run backfill dry-run → apply
6. Set `VITE_CALL_LOGS_EMBEDDED_FALLBACK=false` after validation

## Verify

```bash
cd telecaller-app && npm run typecheck
cd telecaller-app && npx vitest run src/shared/services/firebase/callLogIds.test.ts
cd telecaller-app/functions && npm test
```

## Remaining debt

- Admin/dashboard widgets that still scan `lead.callLogs` in memory (CallQualityTab, CallLogsWidget, etc.) — not list-critical; prefer summaries / collection queries later
- Client `updateAgentProductivity` still increments on logCall in parallel with CF (pre-existing); CF path is now retry-safe
- Phase D bulk import batching — see `directives/phase-d-bulk-counters.md`
