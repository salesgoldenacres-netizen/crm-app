# Wave 6 Phase 2C — Validation Report

**Date:** 2026-07-14  
**Agent:** 4 (Validation — read-only + docs)  
**App:** `telecaller-app/`  
**Scope:** Automation slice (overdue FU, same-day FU hardening, SLA notify, site-visit reminders)  
**Method:** Agent 0–3 notes + code review of `functions/automation/*`, `functions/jobs/followUpReminders.js`, cron wiring in `functions/index.js`, shared contracts; `tsc` / vitest / lint / production build  
**DLS:** unchanged (v1.4)  
**Next phase:** Do **not** start Phase 2D Intelligence without authorization

---

## Verdict

**PASS** — Phase 2C exit criteria met. No critical compile/runtime blockers in code review.

Ops gate (non-code): deploy `firestore.indexes` (`siteVisit.date`) **before** site-visit crons are relied on in production. Documented below — does not fail the code exit gate.

---

## Exit criteria matrix

| # | Criterion | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Overdue follow-up reminders work (code + wired) | **PASS** | `runOverdueFollowUpReminders` in `jobs/followUpReminders.js`; `exports.scheduledOverdueFollowUps` at 09:15 IST via `createScheduledJob` + `FOLLOW_UP_OVERDUE` |
| 2 | Same-day reminders functional | **PASS** | `runSameDayFollowUpReminders` — IST today equality + RC `follow_up_reminder_days` advance window; `scheduledFollowUpReminders` at 09:00 |
| 3 | SLA notifications implemented | **PASS** | `slaBreachJobs.js` → `scheduledSlaBreachNotify` (10:15); `isSlaBreached` gate; assignee via `publishAutomationNotification`; managers via create-only `publishNotification` |
| 4 | Site visit reminders (no-show disabled OK) | **PASS** | D-1 (10:00) + D-0 (08:00) enabled; `NO_SHOW_ENABLED: false` — 11:30 cron no-ops with `{ disabled: true }` |
| 5 | Notifications use shared helper | **PASS** | All feature jobs call `publishAutomationNotification` / `publishNotification`; no ad-hoc `notifications` collection writers in 2C jobs |
| 6 | Duplicate notifications prevented | **PASS** | Deterministic keys + Firestore `create` / already-exists → `{ skipped: true }` (no second FCM) |
| 7 | Cron jobs idempotent | **PASS** | `createScheduledJob` + create-only notify; FU/SLA keyed by run date; visit D-1/D-0 distinct jobTypes + visit date |
| 8 | Timeline integrity (no 2B regression) | **PASS** | Automation modules do not emit timeline; `CallLogModal` still `timelineActivity: "call"`; no timeline publisher edits in 2C automation |
| 9 | No intelligence / AI / scoring | **PASS** | No scorers or Daily Priorities; `leadIntelligence.ts` remains type-only stub; stuck-lead is constant/predicate only (no cron) |
| 10 | Tooling: tsc / lint / build | **PASS*** | See tooling table (*lint fail pre-existing) |

---

## Tooling

| Check | Result | Notes |
| --- | --- | --- |
| `npx tsc --noEmit` | **PASS** (exit 0) | Clean |
| `npx vitest run` automation + leadStatus contracts | **PASS** | 18 tests passed |
| Job module load (`followUpReminders`, `siteVisitJobs`, `slaBreachJobs`) | **PASS** | `node -e require(…)` OK |
| `npm run build` | **PASS** (exit 0) | Vite ~2.1s; pre-existing firebase chunk-size warning |
| `npm run lint` | **FAIL** (pre-existing) | `.tmp/*.cjs` (10) + `useAuditLogsStore` setState-in-effect (1) — **not introduced by 2C** |

---

## Spot-check summary

| Area | Status | Notes |
| --- | --- | --- |
| Agent 0 barrel | OK | IST, idempotency, thresholds, predicates, queries, `createScheduledJob`, notify, register helpers |
| FU same-day + overdue | OK | Wired in `functions/index.js`; predicates not forked |
| SLA | OK | Bounded `createdAt` scan (14d lookback / 500 limit); manager keys include `userId` |
| Site visit | OK | `queryLeadsBySiteVisitDate`; gate `site-visit-confirmed` + `isRemindableSiteVisit` |
| Index in repo | OK | `firestore.indexes.json` has `leads.siteVisit.date` ASC |
| Timeline / 2B | OK | No automation → timeline writes |
| Intelligence | OK | Absent from feature jobs |

---

## Residuals (non-blocking)

| ID | Finding | Severity | Recommended next |
| --- | --- | --- | --- |
| C1 | `followUpOn`-only leads not returned by FU Firestore queries | Medium (data) | Migrate writers / backfill `followUpDate` (Agent 0 known gap) |
| C2 | SLA lookback 14 days truncates older breaches | Low (by design) | Accept or raise `SLA_SCAN_LOOKBACK_DAYS` with product |
| C3 | Visit gate stricter than shared `isRemindableSiteVisit` | Low | Intentional; legacy `interested` + date not reminded |
| C4 | Coordinator cannot receive FCM (name string) | Low | Product: store coordinator `userId` later |
| C5 | `siteVisit.date` index may be undeployed in prod | **High (ops)** | `firebase deploy --only firestore:indexes` before visit cron reliance |
| C6 | Pre-existing lint failures | Low | Exclude `.tmp`; fix audit store setState pattern |
| C7 | SLA timeline emit skipped | Low | Add typed publisher only if Architecture Owner authorizes |
| C8 | FU advance days live in RC, not `AUTOMATION_THRESHOLDS` | Low | Optional Agent 0 mirror for 2D health parity |

---

## Blockers

**None** for Phase 2C code exit.

**Deploy reminder (ops):** indexes + Cloud Functions exports listed in `wave6-phase2c-notes.md`.

Do **not** begin Phase 2D (intelligence), stuck-lead escalation, or Phase 3 without authorization.

---

## Deliverables

1. `directives/wave6-phase2c-notes.md`  
2. `directives/wave6-phase2c-validation-report.md` (this file)  
3. `directives/wave6-phase2c-regression-report.md`  
4. `memory.md` lightly updated  

---

## STOP

Phase 2C validation complete. Await authorization for Phase 2D Intelligence.
