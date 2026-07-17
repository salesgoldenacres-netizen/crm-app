# Wave 6 Phase 2C — Agent 3 Notes
## Site Visit Automation

**Status:** Phase 2C Agent 3 complete — site-visit reminder jobs landed  
**Date:** 2026-07-14  
**App:** `telecaller-app/functions` (+ client contract mirrors)  
**Depends on:** Agent 0 scaffolding (`queryLeadsBySiteVisitDate`, `isRemindableSiteVisit`, `createScheduledJob`, `publishAutomationNotification`)  
**DLS:** unchanged  
**Scope:** Day-before + same-day visit reminders; no-show framework **disabled**; no new workflow states; no SLA/FU jobs; no AI

---

## What shipped

| Surface | Path | Purpose |
| --- | --- | --- |
| Visit reminder jobs | `functions/automation/siteVisitJobs.js` | D-1 / D-0 handlers + disabled no-show scaffold + eligibility gate |
| Job registration | `functions/index.js` via `registerSiteVisitJobs` | Exports three scheduled functions |
| Job type keys | `functions/automation/idempotency.js` + client `automation.ts` | Distinct idempotency types for D-1 / D-0 / no-show |
| Notification types | `src/shared/contracts/notifications.ts` | Added `site_visit_reminder`, `site_visit_no_show` |

### Cron exports

| Export | Schedule (IST) | Behavior |
| --- | --- | --- |
| `scheduledSiteVisitDayBeforeReminders` | `0 10 * * *` | Query `siteVisit.date == tomorrow`; notify assignee |
| `scheduledSiteVisitSameDayReminders` | `0 8 * * *` | Query `siteVisit.date == today`; notify assignee |
| `scheduledSiteVisitNoShowReminders` | `30 11 * * *` | Scaffold only — **no-ops** while flag is off |

### Feature switches (`SITE_VISIT_AUTOMATION`)

```js
{
  DAY_BEFORE_ENABLED: true,
  SAME_DAY_ENABLED: true,
  NO_SHOW_ENABLED: false, // product not approved — leave off
}
```

Flip `NO_SHOW_ENABLED` to `true` in `siteVisitJobs.js` only after product approval. Until then the 11:30 cron logs disabled and returns `{ disabled: true }`.

---

## Eligibility rules (Agent 3)

A lead is reminded only when **all** of:

1. `assignedTo` present
2. `isRemindableSiteVisit(lead)` (has `siteVisit.date`; nested status not cancelled/completed/no_show; not terminal won/lost)
3. **Canonical pipeline status only:** `lead.status === "site-visit-confirmed"`

Legacy `interested` + `siteVisit.date` rows are **not** reminded (stricter than Agent 0’s shared predicate, which still allows migration leftovers).

Coordinator field is free-text today → **assignee only** receives FCM / in-app. Body may mention visit time; coordinator name is not a notify target.

---

## Idempotency

| Kind | `jobType` (key) | `dateYmd` | Notification `type` |
| --- | --- | --- | --- |
| Day-before | `site_visit_reminder_day_before` | **visit date** | `site_visit_reminder` |
| Same-day | `site_visit_reminder_same_day` | **visit date** | `site_visit_reminder` |
| No-show (off) | `site_visit_no_show` | **visit date** (yesterday) | `site_visit_reminder` |

Distinct `jobType` values let D-1 and D-0 both fire for the same visit without colliding. Keys still use create-only notification docs via `publishAutomationNotification`.

---

## Index prerequisite

`leads.siteVisit.date` ASC is already in `telecaller-app/firestore.indexes.json` (Agent 0).

**Deploy before go-live:**

```bash
firebase deploy --only firestore:indexes
# then functions:
firebase deploy --only functions:scheduledSiteVisitDayBeforeReminders,functions:scheduledSiteVisitSameDayReminders,functions:scheduledSiteVisitNoShowReminders
```

(No-show export can be omitted from deploy if preferred; registered cron is harmless while disabled.)

---

## Explicitly out of scope

- No new lead statuses / nested workflow states
- No auto-advance to `site-visit-completed` or nested `no_show`
- No SLA / overdue FU / stuck-lead jobs
- No WhatsApp auto-confirm, no AI, no task engine
- No coordinator userId resolution (field is name string)

---

## Files touched

**New**
- `telecaller-app/functions/automation/siteVisitJobs.js`
- `directives/wave6-phase2c-agent3-notes.md` (this file)

**Updated**
- `telecaller-app/functions/automation/idempotency.js` — D-1 / D-0 / no-show job types
- `telecaller-app/functions/automation/index.js` — re-exports + `registerSiteVisitJobs`
- `telecaller-app/functions/index.js` — registers visit crons after FU reminder
- `telecaller-app/src/shared/contracts/automation.ts` — mirrored job types
- `telecaller-app/src/shared/contracts/notifications.ts` — type allowlist
- `telecaller-app/src/shared/contracts/automation.test.ts` — job type assertions

---

## Validation

From `telecaller-app/`:

```bash
npx vitest run src/shared/contracts/automation.test.ts
node -e "require('./functions/automation/siteVisitJobs'); console.log('ok')"
```

Confirm:

- [x] Day-before + same-day jobs use `queryLeadsBySiteVisitDate` + IST helpers
- [x] Gate consumes `site-visit-confirmed` only
- [x] No-show framework present and **disabled by default**
- [x] No new workflow states / SLA / AI

---

## STOP

Further visit outcome UX (`site-visit-completed` / mark no-show) remains Agent 1 / product. Agent 3 only notifies; it does not mutate lead status.
