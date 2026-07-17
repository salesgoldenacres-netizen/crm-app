# Wave 6 Phase 2A — Regression Report

**Date:** 2026-07-14  
**Agent:** 4 (Validation — read-only)  
**App:** `telecaller-app/`  
**Related:** `directives/wave6-phase2a-validation-report.md`  
**Verdict context:** Phase 2A exit = **PASS**; items below are residuals / risks, not exit blockers unless noted.

---

## Critical regressions

| ID | Finding | Severity | Action |
| --- | --- | --- | --- |
| — | None found | — | — |

No critical regressions that reverse Phase 2A contracts or break compile/build.

---

## Non-critical / residual findings

| ID | Finding | Severity | Recommended fix (do not implement without auth) |
| --- | --- | --- | --- |
| R1 | Feature notification writes still go through `useNotificationsStore.addNotification` → `NotificationsRepository.add`, bypassing `publishNotification` / `publishInAppNotification` | Medium (contract adoption gap) | Route new writes through `@/shared/contracts` `publishNotification`; optionally make store `addNotification` a thin wrapper |
| R2 | Hardcoded status `<option>` lists remain in `BulkActionsPanel`, `AdvancedFiltersPanel`, `LeadsFilterPanel`, parts of `LeadBinWorkspace` (not all sourced from `LEAD_STATUS_OPTIONS`) | Low | Replace with `LEAD_STATUS_FILTER_OPTIONS` / shared select config to avoid drift |
| R3 | Firestore composites are in `firestore.indexes.json` but may be undeployed in prod | High *(ops)* | `npx firebase deploy --only firestore:indexes` before relying on agent leads / user notification listeners |
| R4 | Broadcast notifications gap: scoped query is `userId == uid`; legacy docs with **missing** `userId` no longer appear; `userId == ""` does not match missing field | Medium (product) | Normalize writers to `userId: ""` for broadcasts, or authorize a contract strategy for field-missing broadcasts (no full-collection scan) |
| R5 | Manager leads listener hard-capped at **500** | Medium (product scale) | Cursor pagination (Phase 2E per plan); document UX for large tenants |
| R6 | Site-visit schedule emits dual timeline when status advances (`publishLeadStatusChanged` via `updateLead` + `publishSiteVisitScheduled`) | Low (intentional) | Accept; or later collapse to single primary domain event if product prefers |
| R7 | Site-visit cancel clears `siteVisit` only — status may remain `site-visit-confirmed` | Low | Product decision: optional status rollback or leave pipeline manual |
| R8 | Legacy `[WhatsApp Sent]` **readers** still scrape `callLogs` (`LeadInteractionHistory`, `CallsTab`, widgets) | Low | Phase 2B / messaging SoR; keep for historical rows only (no new writers — confirmed) |
| R9 | `useAuditLogsStore` lint: synchronous `setState` in effect when `subscribeToList` is false | Low (lint / React purity) | Derive empty state without effect setState, or reset via keying / render-phase pattern |
| R10 | `npm run lint` fails on `.tmp/*.cjs` scratch scripts | Low (tooling) | Exclude `.tmp` from ESLint or delete scratch files |
| R11 | Query helpers omit Firestore converters — consumers manually `{ id, ...data() }` | Low | Optional Agent 0 improvement: converter-typed query builders |
| R12 | Attendance list still all-users within 90-day window | Low (by design for admin board) | Later agent-only scoping via helper `userId` option if needed |
| R13 | Vite chunk-size warning (~563 kB firebase) | Hygiene | Pre-existing; unrelated to 2A |

---

## Risk assessment

| Risk | Level | Notes |
| --- | --- | --- |
| Agent / notification listeners fail until indexes build | **High** until deploy | Indexes present in repo; deploy + wait for ready |
| Agents cannot see peers' leads (scoped) | **Expected** | Verify role matrix with QA; managerial still see capped full set |
| Dual timeline noise on site visit | **Low** | Intentional per Agent 1 notes |
| Notification contract under-adopted | **Medium** | Helper exists; store still direct-writes |
| Status option UI drift | **Low** | Filter config canonical; some panels hardcoded |
| Pre-existing Functions crons mistaken for 2A automation | **N/A** | Out of 2A scope; do not expand without auth |
| Intelligence / scoring accidentally shipped | **None observed** | Type-only contract |

---

## Tooling regressions

| Check | Result | Regression? |
| --- | --- | --- |
| `npx tsc --noEmit` | PASS | No |
| `npm run build` | PASS | No |
| `npm run lint` | FAIL | Pre-existing `.tmp`; **new residual** Agent 3 `useAuditLogsStore` setState-in-effect |

---

## Recommended fixes (priority order)

1. **Deploy Firestore indexes** (R3) before production traffic depends on scoped listeners.  
2. **Adopt `publishNotification`** in store / feature writers (R1).  
3. **Resolve broadcast unread** strategy (R4) with Architecture Owner.  
4. **Unify status option sources** in remaining panels (R2).  
5. **Lint hygiene**: `.tmp` ignore + audit store setState pattern (R9–R10).

Do **not** implement Phase 2B Timeline Normalization, DLS updates, scoring, or new automation until authorized.

---

## STOP

Validation complete. Await authorization for Timeline Normalization (Phase 2B).
