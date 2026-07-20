# Contributing — Golden Acres Telecaller CRM

Short guide for day-to-day work on `telecaller-app`. Prefer this over inventing new process.

## Branch model

- **`main` / `master`** — production-tracking; keep green via CI.
- **Feature / fix branches** — branch from latest main; open a PR; squash or rebase as the repo prefers.
- Do **not** commit secrets, service-account JSON, or `.env` files.

## Local checks (same surface as CI)

From `telecaller-app/`:

```bash
npm run lint
npm run typecheck
npm test
npm run test:coverage
cd functions && npm test
```

CI also runs a production Vite build (with placeholder Firebase env vars).

### Scoped lint for leads (critical domain)

```bash
npx eslint "src/features/leads/**/*.{ts,tsx}"
```

Leads list/query code must not import `firebase/firestore` directly — use `LeadQueryService` / repositories.

## Secrets & env

- App secrets live in local `.env` (gitignored). Never paste DSNs or API keys into commits or PRs.
- **Sentry (optional):**
  - App: `VITE_SENTRY_DSN` — missing DSN logs a warning; **not** a deploy blocker.
  - Functions: `SENTRY_DSN` — same rule.
- **Call-log dual-read (Phase 0 Agent A):** `VITE_CALL_LOGS_EMBEDDED_FALLBACK` defaults to **`true`** until backfill apply + verify. Production rollout:
  1. `python execution/backfill_call_logs.py` (dry-run — expect 200 leads / 217 logs in current prod sample)
  2. `python execution/backfill_call_logs.py --apply --confirm BACKFILL` (ops approval required)
  3. `python execution/backfill_call_logs.py --verify` (0 missing top-level docs)
  4. Set `VITE_CALL_LOGS_EMBEDDED_FALLBACK=false` in prod env; rebuild OTA
  5. Remove dual-read merge path in a follow-up patch once stable  
  See `directives/phase-0-audit-convergence.md` and `directives/phase-f-completion-convergence.md`.
- Lead list rollback (`VITE_LEGACY_LEADS_SNAPSHOT`) has been **removed** (Phase F). Lists always use `LeadQueryService`.

See [README.md](./README.md) for Firebase env vars.

## Production hardening notes (Phases A–F)

| Area | Canonical path / rule |
|------|------------------------|
| Lead lists | `LeadQueryService` → cursor pagination (not a global snapshot) |
| Lead mutations | Identity-based `LeadRepository` (by id / findByPhone) |
| Call logs | Top-level `callLogs/{id}`; no embedded dual-write; dual-read until backfill |
| Productivity | Cloud Function + `productivityEvents` only — **no client increments** |
| Bulk import | Chunked batches (100–500); structured `bulk_import` logs |
| Meta ingest | Multi-entry; structured `meta_ingest` logs |
| Observability | Sentry behind DSN only; structured JSON ops logs for critical paths |

Directives: `directives/phase-b-lead-query-migration.md`, `phase-c-call-logs-migration.md`, `phase-d-bulk-counters.md`, `phase-e-hardening-checkpoint.md`, `phase-f-completion-convergence.md`.

Incident response: [../directives/incident-runbook.md](../directives/incident-runbook.md).

## PR expectations

- Keep diffs focused; no drive-by refactors.
- Add or extend **targeted** tests for the production path you touch (Meta helpers, LeadQueryService, productivity markers, call-log ids) — not coverage theater.
- Update the relevant directive when you learn an edge case (self-anneal).
