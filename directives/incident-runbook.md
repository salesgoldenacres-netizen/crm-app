# Incident runbook — Golden Acres CRM

Operational checklist for common production issues. Missing Sentry DSN is **not** a deploy failure; use Cloud Logging structured JSON when Sentry is off.

---

## 1. Webhook failures (Meta / API / Google)

### Symptoms
- Leads missing from Meta Lead Ads or API ingest
- HTTP 401/500 from webhook endpoints
- Structured log `meta_ingest` with elevated `failed`

### Check
1. Cloud Functions logs — filter `event":"meta_ingest"` or `meta_ingest_entry_failed`.
2. Integration settings: Meta access token / API webhook key configured (fail-closed).
3. `ingestEvents/{eventId}` — idempotent skips look like duplicates, not failures.
4. Sentry (if `SENTRY_DSN` set) — handler tag `meta_ingest`.

### Mitigate
- Re-deliver Meta webhook from Meta/Business tools after fixing auth/token.
- For single-entry failures (bad phone), fix source data; do not replay whole batch blindly.
- Confirm Graph API leadgen fetch still authorized.

### Escalate when
- All entries fail after token refresh, or create path writes nothing while Graph returns 200.

---

## 2. Sentry

### Enable (optional)
| Surface | Env var | Where |
|---------|---------|--------|
| Web app | `VITE_SENTRY_DSN` | `telecaller-app/.env` (Vite build) |
| Cloud Functions | `SENTRY_DSN` | Functions runtime env / secrets |

Missing DSN → startup **warning** only (`sentry_disabled` / logger warn). Deploy proceeds.

### When alerting
- Prefer Sentry issues for uncaught render errors (`ErrorBoundary`) and functions `captureException` on Meta / bulk / productivity.
- Cross-check Cloud Logging JSON events: `meta_ingest`, `bulk_import`, `productivity_aggregate`, `firestore_transaction_contention`.

### Disable / reduce noise
- Remove or unset DSN; redeploy/rebuild. No code change required.

---

## 3. Bulk import

### Symptoms
- Partial import; clients see `failures[]` with index + phone
- Log `bulk_import` with high `failed` or long `durationMs`
- `bulk_import_failed` / Sentry `handler: bulk_import`

### Check
1. Response payload: `created`, `duplicates`, `failed`, `failures`, `chunkSize`, `chunks`.
2. Retry **only** `failures` rows — do not re-post the full successful set.
3. Counter contention: logs `firestore_transaction_contention` / `firestore_transaction_retry_ok` around leadNumber / round-robin.

### Mitigate
- Lower `chunkSize` (100–500 clamp) if timeouts.
- Fix phone validation / permissions, then retry failed indices.
- If counters exhaust retries, pause large imports and inspect `settings/counters` contention.

---

## 4. Productivity discrepancies

### Symptoms
- Agent daily totals disagree with call history
- Double-count suspicion after retries

### Model
- SoT events: `callLogs/{callLogId}`
- Idempotency: `productivityEvents/{callLogId}` create-once in the **same** transaction as `agentProductivity` updates
- Migrated/historical: `skipProductivity` / `migratedFromEmbedded` → skipped

### Check
1. Logs: `event":"productivity_aggregate"` — `applied`, `reason` (`already_processed`, `skipped_call_log`, …).
2. For a suspect call: does `productivityEvents/{callLogId}` exist?
3. Confirm client is not double-writing embedded `lead.callLogs[]` (Phase C stopped dual-write).
4. Dual-read flag `VITE_CALL_LOGS_EMBEDDED_FALLBACK` — history merge only; does not re-aggregate.

### Mitigate
- Do **not** manually increment productivity without a matching marker.
- Re-process only if marker missing **and** call log is real (manual ops / support script — not in this wave).
- After backfill, set `VITE_CALL_LOGS_EMBEDDED_FALLBACK=false`.

---

## 5. Lead list / pagination issues

### Symptoms
- Truncated lists, “stuck” filters, missing pages

### Check
- UI path is `LeadQueryService` (not a global 500 snapshot).
- Legacy snapshot rollback (`VITE_LEGACY_LEADS_SNAPSHOT`) was removed in Phase F — fix via `LeadQueryService` / indexes.
- See `directives/phase-b-lead-query-migration.md` and `directives/phase-f-completion-convergence.md`.

---

## Quick links

- Phase C call logs: `directives/phase-c-call-logs-migration.md`
- Phase D bulk/counters: `directives/phase-d-bulk-counters.md`
- Hardening checkpoint: `directives/phase-e-hardening-checkpoint.md`
- Contributing: `telecaller-app/CONTRIBUTING.md`
