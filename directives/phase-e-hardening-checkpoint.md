# Phase E — Production Hardening debt checkpoint

End-of-wave verification for the approved Production Hardening blueprint (Phases A–E).  
Date: 2026-07-18.

## Checklist

### [x] Pagination used or obsolete unused pagination code removed/justified

**Verdict: USED (canonical) + legacy module JUSTIFIED**

| Stack | Role |
|-------|------|
| `src/shared/services/performance/pagination/*` + `PaginationService` | **Production path** — wired by `LeadQueryService` |
| `src/shared/services/performance/paginationService.ts` | Older Wave 8 helper still imported by `leadCache`, `queryOptimizer`, `QueryPlanner`, tests — **not deleted** (still referenced; migrate later) |

**Grep evidence:**

```
LeadQueryService.ts: import { PaginationService } from ".../pagination/PaginationService"
LeadQueryService.ts: private readonly navigation = new PaginationService()
useLeadQuery.ts / LeadsWorkspace.tsx: LeadQueryService consumers
paginationService.ts: still imported by leadCache / queryOptimizer / QueryPlanner (not LeadQueryService)
```

No clearly-dead pagination package found that is safe to delete without a follow-up migration.

---

### [x] No remaining 500-document assumptions on lead lists

**Verdict: PASS**

```
rg 'limit\s*[:=]\s*500|\.limit\(500\)' telecaller-app/src telecaller-app/functions
→ (no matches)
```

List SoT is cursor pagination via `LeadQueryService` / `FirestorePaginationProvider`.  
`queryScopes` documents `omitLimit` to avoid a hidden 500 cliff.  
Agent convenience snapshot (if any) uses `AGENT_OPEN_LEADS_REALTIME_BOUND` (100), not 500.

---

### [x] Embedded callLogs dual-write stopped; compat flag documented

**Verdict: PASS**

- Client: `LeadsRepository.logCall` → `CallLogsRepository.create` — comment: “no dual-write”.
- Functions: `helpers/callLogsRepository.createCallLog` — never appends `lead.callLogs[]`.
- Dual-**read** only: `VITE_CALL_LOGS_EMBEDDED_FALLBACK` (default `true`) — documented in `callLogIds.ts`, `CallLogsRepository.ts`, `directives/phase-c-call-logs-migration.md`, `CONTRIBUTING.md`.
- Legacy CF `onLeadCallLogUpdated` is an intentional no-op.

```
rg 'VITE_CALL_LOGS_EMBEDDED_FALLBACK' telecaller-app
→ callLogIds.ts, CallLogsRepository.ts, CONTRIBUTING.md, functions/index.js (comment)
rg 'no dual-write' telecaller-app/src/shared/services/firebase
→ repositories.ts
```

---

### [x] Old global lead-loading path retired / rollback flags documented

**Verdict: PASS (with documented rollback)**

- Default: no company-wide leads listener; list SoT = `LeadQueryService`.
- Rollback: `VITE_LEGACY_LEADS_SNAPSHOT=true` → pre–Phase B role-scoped snapshot (`leadQueryConstants.ts`, `DatabaseContext.tsx`, `directives/phase-b-lead-query-migration.md`).

```
rg 'VITE_LEGACY_LEADS_SNAPSHOT' telecaller-app
→ leadQueryConstants.ts, DatabaseContext.tsx, CONTRIBUTING.md
```

Remaining debt (non-blocking): some admin/dashboard widgets still consume `useLeadsStore().leads` for analytics — not list SoT.

---

### [x] Critical domains ESLint (leads) clean

**Verdict: PASS (0 errors)**

```
npx eslint "src/features/leads/**/*.{ts,tsx}"
→ 0 errors, 1 warning (react-hooks/exhaustive-deps in LeadInteractionHistory.tsx)
```

`features/leads` has `no-restricted-imports` error-level ban on direct `firebase/firestore` imports.

---

## Phase E deliverables (this wave)

| Item | Status |
|------|--------|
| E1 Sentry (`@sentry/react` + `@sentry/node`) behind DSN | Done |
| E2 Structured ops logs (meta, bulk, productivity, counter contention) | Done — filled `productivity_aggregate` gap |
| E3 Targeted tests + coverage include list | Done |
| E4 `CONTRIBUTING.md` + `directives/incident-runbook.md` | Done |
| E5 This checkpoint | Done |
| E6 typecheck / lint leads / tests | See verify section below |

## Remaining known debt (post-wave)

1. Migrate or delete legacy `paginationService.ts` after re-homing `leadCache` / query optimizer imports onto `pagination/` contracts.
2. Admin/dashboard widgets still scanning in-memory / store leads (not LeadQueryService).
3. Client `updateAgentProductivity` may still increment in parallel with CF (pre-existing); CF path is retry-safe via markers.
4. Dual-read embedded fallback until backfill + `VITE_CALL_LOGS_EMBEDDED_FALLBACK=false`.
5. Leads ESLint warning in `LeadInteractionHistory.tsx` (hooks deps) — non-blocking.

## How to set Sentry DSNs

| Surface | Variable | Notes |
|---------|----------|--------|
| Web | `VITE_SENTRY_DSN` in `telecaller-app/.env` | Rebuild/redeploy hosting/OTA after change |
| Functions | `SENTRY_DSN` in Functions env | e.g. Firebase params / runtime env; redeploy functions |

Missing DSN → warning only (`Sentry` logger warn / `sentry_disabled` JSON). **Not a deploy blocker.**
