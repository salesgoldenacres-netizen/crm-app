# Wave 6 Phase 2A — Validation Report

**Date:** 2026-07-14  
**Agent:** 4 (Validation — read-only)  
**App:** `telecaller-app/`  
**Scope:** Agents 0–3 Phase 2A foundation (contracts, workflow, timeline adoption, query scoping)  
**Method:** Code + docs review; `tsc --noEmit`; lint; production build  
**DLS:** unchanged (do not update)  
**Next phase:** Do **not** start Phase 2B / Timeline Normalization without authorization

---

## Verdict

**PASS** — Phase 2A exit criteria are met. No critical blockers.

Residuals (notification write-path leftovers, hardcoded status option lists, undeployed indexes, broadcast-query gap, pre-existing lint) are documented in `directives/wave6-phase2a-regression-report.md` and do **not** fail Phase 2A.

---

## Exit criteria matrix

| # | Criterion | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Canonical status contract exists | **PASS** | `src/shared/contracts/leadStatus.ts` — `LEAD_STATUSES`, labels, aliases, `normalizeLeadStatus`; `statusTransition.ts` — `planStatusTransition` / `planSiteVisitConfirmedTransition`; barrel `index.ts` |
| 2 | Shared timeline publisher exists | **PASS** | `src/shared/contracts/timelinePublisher.ts` — typed helpers wrapping `recordTimelineEvent`; feature UI does not call `recordTimelineEvent(` directly |
| 3 | Notification helper exists | **PASS** | Client: `src/shared/contracts/notifications.ts` (`publishInAppNotification` / `publishNotification`); Server: `functions/notifications/publishNotification.js` |
| 4 | Query scoping implemented | **PASS** | Helpers in `queryScopes.ts`; wired: `DatabaseContext` (leads), `useNotificationsStore`, `useAttendanceStore` (90d range), `useAuditLogsStore` (opt-in list). Indexes declared in `firestore.indexes.json` |
| 5 | Site visit → `site-visit-confirmed` | **PASS** | `SiteVisitScheduler` uses `planSiteVisitConfirmedTransition` + `updateLead(plan.leadPatch)` + `publishSiteVisitScheduled`; no longer forces `interested` / `logCall` |
| 6 | `Lead.notes` overwrite eliminated | **PASS** | `LeadsRepository.logCall` patches `status` / `callLogs` / `followUpDate` only — comment + code confirm no `notes` write |
| 7 | Timeline uses shared publisher (feature paths) | **PASS** | Store: `useLeadsStore` publishes via typed helpers; features: site visit, discount, merge, campaign → contract publishers. Only `timelinePublisher.ts` and `recordTimelineEvent.ts` invoke the recorder |
| 8 | No duplicated enums / notification / timeline writers (flag leftovers) | **PASS** *(leftovers flagged)* | Canonical enum + filter options sourced from `LEAD_STATUS_FILTER_OPTIONS`. Timeline writers consolidated. **Leftovers:** `useNotificationsStore.addNotification` still uses `NotificationsRepository.add` (not contract helper); some UIs hardcode status `<option>` lists; legacy `[WhatsApp Sent]` **readers** remain |
| 9 | No automation / intelligence implemented | **PASS** | `leadIntelligence.ts` is type-only (no scorer). No new SLA/cron/Daily Priorities UI in 2A. Existing Functions crons (`scheduledFollowUpReminders`, etc.) are pre-existing — not Phase 2A automation delivery |
| 10 | Tooling: `tsc` / lint / build | **PASS** / **FAIL (pre-existing)** / **PASS** | See tooling table below |

---

## Tooling

| Check | Result | Notes |
| --- | --- | --- |
| `npx tsc --noEmit` | **PASS** (exit 0) | Clean |
| `npm run lint` | **FAIL** (exit 1) | Pre-existing `.tmp/*.cjs` (10 errors) + `useAuditLogsStore` `setState`-in-effect (1 error, Agent 3 opt-in path). Not introduced as compile breakers for 2A exit |
| `npm run build` | **PASS** (exit 0) | Vite build ~2.3s; chunk-size warning on firebase bundle (pre-existing hygiene) |

---

## Spot-check summary

| Area | Status | Notes |
| --- | --- | --- |
| Shared contracts barrel | OK | All 7 modules exported from `@/shared/contracts` |
| `SiteVisitScheduler` | OK | Canonical transition + typed publish; cancel clears `siteVisit` only |
| `useLeadsStore` | OK | Typed publishers; follow-up diff-only; legacy bracket tags no longer → `note_added` |
| `LeadsRepository.logCall` | OK | No `Lead.notes` overwrite |
| Query listeners | OK | Role-scoped leads; user notifications; attendance range; audit list opt-in |
| `WhatsAppAssistant` | OK | Deep-link only; no `logCall` / callLogs write |
| Feature status writes | OK | Pipeline, kanban, admin chips, bulk, call disposition use `planStatusTransition` |

---

## Agent notes cross-check

| Agent | Claimed delivery | Validation |
| --- | --- | --- |
| 0 | Frozen contracts + logCall notes bleed-stop | Confirmed |
| 1 | Site-visit status + status planners on workflow surfaces | Confirmed |
| 2 | Typed publishers; WA assistant retirement; heuristic bleed-stop | Confirmed |
| 3 | Scoped listeners + indexes in repo | Confirmed (deploy indexes before prod reliance) |

---

## Blockers

**None** for Phase 2A exit.

Do **not** begin Phase 2B / Timeline Normalization / DLS updates until authorized.

---

## Deliverables produced

1. `directives/wave6-phase2a-validation-report.md` (this file)
2. `directives/wave6-phase2a-regression-report.md`
3. `directives/wave6-phase2a-merge-summary.md`
