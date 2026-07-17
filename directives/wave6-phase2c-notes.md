# Wave 6 Phase 2C — Consolidated Notes
## Automation Slice (Follow-up / SLA / Site Visit)

**Status:** Complete — validation **PASS**  
**Date:** 2026-07-14  
**App:** `telecaller-app/` (`functions/` + shared contracts)  
**DLS:** unchanged (v1.4)  
**Authorization:** Phase 2B PASS + Phase 2C agents 0–3  
**Next:** Do **not** begin Phase 2D Intelligence without authorization

---

## Goal

Ship deterministic reminder / SLA / site-visit crons on Agent 0 automation scaffolding: IST dates, shared predicates/queries, create-once notifications, no scoring / AI / task engine.

---

## What shipped (by agent)

| Agent | Scope | Key surfaces |
| --- | --- | --- |
| **0** | Automation infrastructure | `functions/automation/*`, client `automation.ts` / `siteVisit.ts`, idempotent `publishNotification`, `siteVisit.date` index |
| **1** | Follow-up | `jobs/followUpReminders.js` — same-day + N-day-before + overdue |
| **2** | First-touch SLA | `automation/slaBreachJobs.js` — assignee + manager escalate |
| **3** | Site visit | `automation/siteVisitJobs.js` — D-1 + D-0 enabled; no-show scaffold **off** |

---

## Cron map (Asia/Kolkata)

| Export | Schedule | Job type | Query / gate |
| --- | --- | --- | --- |
| `scheduledSiteVisitSameDayReminders` | `0 8 * * *` | `site_visit_reminder_same_day` | `siteVisit.date == today` + `site-visit-confirmed` |
| `scheduledFollowUpReminders` | `0 9 * * *` | `follow_up` | `followUpDate == today` (+ today+1…N via RC) |
| `scheduledOverdueFollowUps` | `15 9 * * *` | `follow_up_overdue` | `followUpDate < today` (limit 500) |
| `scheduledSiteVisitDayBeforeReminders` | `0 10 * * *` | `site_visit_reminder_day_before` | `siteVisit.date == tomorrow` + confirmed |
| `scheduledSlaBreachNotify` | `15 10 * * *` | `sla_breach` | `createdAt` window + `isSlaBreached` |
| `scheduledSiteVisitNoShowReminders` | `30 11 * * *` | `site_visit_no_show` | Scaffold only — **disabled** |

All use `createScheduledJob` → `ctx.runDateYmd` (IST). No UTC `toISOString().split('T')[0]` date math.

---

## Shared contracts consumed

- **IST:** `getIstDateString` / `addIstDays`
- **Notify:** `publishAutomationNotification` → `publishNotification` (create-only + FCM)
- **Predicates:** `isFollowUpDueToday`, `isFollowUpOverdue`, `isSlaBreached`, `isTerminalForReminders`, `isRemindableSiteVisit`
- **Queries:** `queryLeadsByFollowUpDate`, `queryLeadsFollowUpBefore`, `queryLeadsBySiteVisitDate`
- **Thresholds:** `SLA_FIRST_TOUCH_HOURS` (24), `SITE_VISIT_REMINDER_DAYS_BEFORE` (1); FU advance days from `settings/remoteConfig.follow_up_reminder_days` (default 1, clamp 0–14)

---

## Idempotency

| Job | Key strategy | Doc id pattern |
| --- | --- | --- |
| Same-day / advance FU | `follow_up:{leadId}:{runDate}` | `auto_follow_up_{leadId}_{ymd}` |
| Overdue FU | `follow_up_overdue:{leadId}:{runDate}` | `auto_follow_up_overdue_…` |
| SLA assignee | `sla_breach:{leadId}:{runDate}` | `auto_sla_breach_…` |
| SLA manager | `sla_breach:{leadId}:mgr:{userId}:{ymd}` | derived from key (user-scoped) |
| Visit D-1 / D-0 | distinct jobTypes + **visit date** as `dateYmd` | both can fire for one visit |

Retries / re-runs skip FCM when Firestore `create` hits already-exists.

---

## Explicit non-goals (honored)

- No lead score / health UI / Daily Priorities / AI
- No stuck-lead cron (predicate + constant only)
- No task engine / auto-reassign / BPM
- No timeline redesign; SLA timeline emit skipped (no typed event)
- No-show product behavior off; framework present
- DLS unchanged

---

## Known residuals (non-blocking)

| ID | Note |
| --- | --- |
| C1 | Leads with only legacy `followUpOn` (no `followUpDate`) miss Firestore FU queries |
| C2 | SLA scan lookback 14d — older never-touched leads outside window |
| C3 | Visit reminders require `status === site-visit-confirmed` (stricter than shared `isRemindableSiteVisit`) |
| C4 | Coordinator is free-text — assignee-only notify |
| C5 | `siteVisit.date` index must be **deployed** before visit crons go live |
| C6 | Pre-existing lint: `.tmp/*.cjs` + `useAuditLogsStore` setState-in-effect |

---

## Deploy checklist

```bash
# From telecaller-app/
firebase deploy --only firestore:indexes
firebase deploy --only functions:scheduledFollowUpReminders,functions:scheduledOverdueFollowUps,functions:scheduledSiteVisitSameDayReminders,functions:scheduledSiteVisitDayBeforeReminders,functions:scheduledSiteVisitNoShowReminders,functions:scheduledSlaBreachNotify
```

Confirm admin `follow_up_reminder_days` before go-live. Wait for `siteVisit.date` index **Ready** before relying on visit jobs.

---

## Validation artifacts

- `directives/wave6-phase2c-validation-report.md`
- `directives/wave6-phase2c-regression-report.md`
- Agent notes: `wave6-phase2c-agent0-notes.md` … `agent3-notes.md`

---

## STOP

Phase 2C complete. **Await authorization** for Phase 2D Intelligence.
