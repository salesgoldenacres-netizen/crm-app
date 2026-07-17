# Wave 6 Phase 2C — Agent 1 Notes
## Follow-up Automation (Overdue + Same-day Hardening)

**Status:** Complete  
**Date:** 2026-07-14  
**App:** `telecaller-app/` (`functions/`)  
**Depends on:** Agent 0 automation scaffolding (`functions/automation/*`)  
**DLS:** unchanged  
**Out of scope (honored):** task generation, SLA, site-visit jobs, AI, Agent 0 API edits

---

## What shipped

| Surface | Path | Purpose |
| --- | --- | --- |
| FU job handlers | `functions/jobs/followUpReminders.js` | Same-day + N-day-before + overdue logic |
| Same-day cron (extended) | `functions/index.js` → `scheduledFollowUpReminders` | IST, predicates, RC window, in-app + FCM |
| Overdue cron (new) | `functions/index.js` → `scheduledOverdueFollowUps` | Daily overdue digest |

**Agent 0 APIs:** consumed only — no changes to predicates, queries, thresholds, idempotency, or `publishAutomationNotification`.

---

## Crons

| Export | Job type | Schedule (Asia/Kolkata) | Query |
| --- | --- | --- | --- |
| `scheduledFollowUpReminders` | `follow_up` | `0 9 * * *` (09:00) | `followUpDate == today` **and** `followUpDate == today+1..N` |
| `scheduledOverdueFollowUps` | `follow_up_overdue` | `15 9 * * *` (09:15) | `followUpDate < today` (limit 500) |

Both use `createScheduledJob` → `ctx.runDateYmd` (IST). No UTC `toISOString().split('T')[0]`.

---

## Idempotency

| Job | Key | Notification doc id |
| --- | --- | --- |
| Same-day / advance | `follow_up:{leadId}:{runDateYmd}` | `auto_follow_up_{leadId}_{ymd}` |
| Overdue | `follow_up_overdue:{leadId}:{runDateYmd}` | `auto_follow_up_overdue_{leadId}_{ymd}` |

- **`dateYmd` = IST run date** for both (one alert per lead per calendar day).
- Writes via `publishAutomationNotification` → Firestore `create` only → retry-safe, no double FCM.
- Advance + same-day share `FOLLOW_UP` type but different run dates → day-before and day-of both can fire.

---

## Configurable reminder window

Agent 0 `AUTOMATION_THRESHOLDS` has **no** `FOLLOW_UP_REMINDER_DAYS_BEFORE` key (only site-visit has days-before).

**Wired instead to existing product setting** (was dead for cron per Phase 1 audit):

- Source: `settings/remoteConfig.follow_up_reminder_days` (admin Integrations UI → Remote Config sync)
- Default: `1` (also remind leads whose FU is tomorrow)
- Clamp: `0..14` (`0` = same-day only)
- Same-day always runs; `N` adds equality scans for `today+1 … today+N`

**Escalate to Agent 0 if desired:** mirror this into `AUTOMATION_THRESHOLDS` for Phase 2D health parity. Not blocked for Agent 1.

---

## Predicates / gates (no forks)

| Check | Helper |
| --- | --- |
| Same-day eligible | `isFollowUpDueToday(lead, runDateYmd)` |
| Advance eligible | `!isTerminalForReminders` + `getFollowUpDate === targetYmd` |
| Overdue eligible | `isFollowUpOverdue(lead, runDateYmd)` + `assignedTo` |
| Dual-read FU field | `getFollowUpDate` (prefer `followUpDate`; legacy `followUpOn`) |

Query surface remains `followUpDate` equality/range (Agent 0). Leads with **only** `followUpOn` and no `followUpDate` are not returned by Firestore queries — known Agent 0 query gap; dual-read applies after fetch only.

---

## Notify path

All alerts: `ctx.publishAutomationNotification` → in-app `notifications` doc + FCM (`sendPush: true`).

Types: `follow_up` / `follow_up_overdue` (already on client `NOTIFICATION_TYPES`).

---

## Files touched

**New**
- `telecaller-app/functions/jobs/followUpReminders.js`
- `directives/wave6-phase2c-agent1-notes.md` (this file)

**Updated**
- `telecaller-app/functions/index.js` — same-day handler swap + `scheduledOverdueFollowUps` export

**Not modified (Agent 0)**
- `functions/automation/*` contracts / thresholds / predicates / queries

---

## Validation

From `telecaller-app/`:

```bash
npx tsc --noEmit          # pass (exit 0)
npx vitest run src/shared/contracts/automation.test.ts src/shared/contracts/leadStatus.test.ts  # 18 passed
npm run build             # pass
node -e "require('./functions/jobs/followUpReminders')"  # loads
```

---

## Deploy notes

1. Deploy functions including new `scheduledOverdueFollowUps`.
2. Overdue range on `followUpDate` typically uses single-field index (auto); if console prompts, deploy indexes.
3. Confirm admin `follow_up_reminder_days` value before go-live (default 1).

---

## STOP

No tasks, SLA, site-visit, scoring, or Agent 0 contract changes in this PR surface.
