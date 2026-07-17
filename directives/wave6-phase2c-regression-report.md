# Wave 6 Phase 2C — Regression Report

**Date:** 2026-07-14  
**Agent:** 4 (Validation — read-only)  
**App:** `telecaller-app/`  
**Related:** `directives/wave6-phase2c-validation-report.md`  
**Verdict context:** Phase 2C exit = **PASS**; items below are residuals / risks, not exit blockers unless noted.

---

## Critical regressions

| ID | Finding | Severity | Action |
| --- | --- | --- | --- |
| — | None found | — | — |

No critical regressions that reverse Phase 2B timeline normalization, break compile/build, or ship intelligence/scoring.

---

## Phase 2B timeline integrity

| Check | Result | Notes |
| --- | --- | --- |
| Automation jobs write timeline? | **No** | FU / SLA / visit jobs notify only |
| `CallLogModal` single emit path | **Intact** | Still `timelineActivity: "call"` |
| Typed publishers redesigned? | **No** | 2C did not touch timeline publisher contracts |
| SLA timeline | **Skipped** | Intentional — no typed `sla_breach` event without AO |

---

## Non-critical / residual findings

| ID | Finding | Severity | Recommended fix (do not implement without auth) |
| --- | --- | --- | --- |
| R1 | `siteVisit.date` index in repo may be undeployed | **High (ops)** | Deploy indexes; wait Ready before visit cron traffic |
| R2 | Legacy `followUpOn`-only leads invisible to FU queries | Medium | Backfill / dual-write `followUpDate` |
| R3 | SLA 14-day lookback + 500 cap | Low–Medium | Product: raise bound or paginate if needed |
| R4 | Visit reminders skip non-`site-visit-confirmed` pipeline rows | Low | Accept migration strictness; or loosen with AO |
| R5 | Manager SLA fan-out loads all `users` + `customRoles` daily | Medium (scale) | Later: cache managerial ids or role query |
| R6 | Notification doc ids for automation are not user-scoped (by design) | Low | Multi-recipient must include userId in key (SLA managers already do) |
| R7 | No-show cron registered but disabled | Low | Harmless; enable only after product approval |
| R8 | Pre-existing lint (`.tmp`, `useAuditLogsStore`) | Low | Hygiene — unchanged by 2C |
| R9 | Vite firebase chunk ~563 kB warning | Hygiene | Pre-existing |
| R10 | Soft carry from 2A/2B: bulk/webhook timeline, broadcast `userId`, scoped listener index deploy | Medium | Unrelated to 2C; still open |

---

## Risk assessment

| Risk | Level | Notes |
| --- | --- | --- |
| Visit cron fails until `siteVisit.date` index builds | **High** until deploy | Index present in `firestore.indexes.json` |
| Overdue FU misses `followUpOn`-only rows | **Medium** | Query field is `followUpDate` |
| Double FCM on cron retry | **Low** | Create-only + skip on exists |
| Timeline noise from automation | **None** | No timeline emits from 2C jobs |
| Intelligence accidentally shipped | **None** | Type stub only; no scorers / UI |
| Cron schedule collisions | **Low** | Staggered 08:00 / 09:00 / 09:15 / 10:00 / 10:15 / 11:30 IST |

---

## Tooling regressions

| Check | Result | Regression vs 2B? |
| --- | --- | --- |
| `npx tsc --noEmit` | PASS | No |
| `npm run build` | PASS | No |
| Contract vitest (18) | PASS | N/A (2C coverage) |
| `npm run lint` | FAIL | Pre-existing only — no new 2C lint errors observed |

---

## Recommended fixes (priority order)

1. **Deploy Firestore indexes** (especially `leads.siteVisit.date`) before production visit reminders.  
2. **Deploy Functions** exports for FU overdue, SLA, and site-visit crons.  
3. Confirm `follow_up_reminder_days` in admin Remote Config.  
4. Optional later: `followUpDate` backfill; managerial query optimization; typed SLA timeline if product wants.  

Do **not** implement Phase 2D Intelligence, stuck-lead jobs, DLS bumps, or task engines until authorized.

---

## STOP

Regression review complete. Await authorization for Phase 2D Intelligence.
