# Wave 6 Phase 2C — Agent 2 Notes
## First-touch SLA Automation

**Status:** Phase 2C Agent 2 complete  
**Date:** 2026-07-14  
**App:** `telecaller-app/functions`  
**DLS:** unchanged (v1.4)  
**Scope:** First-touch SLA notify + manager escalation only — **no** scoring, overdue FU, site-visit, stuck, or AI

---

## What shipped

| Surface | Path | Purpose |
| --- | --- | --- |
| SLA job module | `functions/automation/slaBreachJobs.js` | Bounded scan, `isSlaBreached` gate, assignee + manager notify |
| Barrel export | `functions/automation/index.js` | `registerSlaBreachJobs`, `handleSlaBreachNotify`, `SLA_SCAN_LOOKBACK_DAYS` |
| Cron registration | `functions/index.js` | `exports.scheduledSlaBreachNotify` via `registerSlaBreachJobs` |

### Cron

| Export | Schedule (IST) | Job type |
| --- | --- | --- |
| `scheduledSlaBreachNotify` | `15 10 * * *` (10:15) | `AUTOMATION_JOB_TYPES.SLA_BREACH` (`sla_breach`) |

Placed after same-day FU (09:00), overdue FU (09:15), and site-visit day-before (10:00).

---

## Behavior

1. **Bounded query** on `leads.createdAt`:
   - Lower: now − **14 days** (`SLA_SCAN_LOOKBACK_DAYS` — scan bound only, not a product threshold)
   - Upper: now − `AUTOMATION_THRESHOLDS.SLA_FIRST_TOUCH_HOURS` (24h)
   - `orderBy createdAt asc`, `limit 500`
2. **Gate** each doc with shared `isSlaBreached(lead)` (no forked 24h math).
3. **Skip** terminal statuses via `isTerminalForReminders` (booked / reserved / not-interested / legacy sold / converted).
4. **Assignee notify** — `publishAutomationNotification` with `jobType: sla_breach`, `dateYmd: ctx.runDateYmd` (once per lead per IST day).
5. **Manager escalation** — load `users` + `customRoles`, filter managerial (mirrors client `roleUtils` presets + `isManagerial` flag). Notify each via shared `publishNotification` with create-only idempotency key:
   - `sla_breach:{leadId}:mgr:{userId}:{ymd}`
   - Skips the assignee if they are also managerial (no double ping).
6. **Unassigned breached leads** still escalate to managers.

### Idempotency

| Recipient | Mechanism | Key / doc id |
| --- | --- | --- |
| Assignee | `publishAutomationNotification` | `sla_breach:{leadId}:{runDate}` → `auto_sla_breach_{leadId}_{ymd}` |
| Manager | `publishNotification` + `idempotencyKey` / `createOnly` | `sla_breach:{leadId}:mgr:{userId}:{ymd}` |

Manager keys **must** include `userId` because automation notification doc ids are not user-scoped (same lead+job+date would collide across recipients).

---

## Timeline (optional — skipped)

No `sla_breach` (or equivalent) `TimelineEventType` / typed publisher exists. Per Agent 0: *optional timeline only if contracts support without redesign*.

**Escalated to Architecture Owner:** add typed `publishSlaBreached` (or reuse an agreed system type) before emitting timeline from this job.

---

## APIs consumed (not forked)

- `createScheduledJob`
- `isSlaBreached` / `isTerminalForReminders`
- `AUTOMATION_THRESHOLDS.SLA_FIRST_TOUCH_HOURS`
- `AUTOMATION_JOB_TYPES.SLA_BREACH`
- `publishAutomationNotification` / `publishNotification`

---

## Explicit non-goals (this agent)

- Overdue / N-day follow-up jobs (Agent 1)
- Site-visit reminder / no-show (Agent 3)
- Stuck-lead escalation (later / 2E)
- Lead score, health UI, Daily Priorities, AI
- Auto-reassign on SLA
- New notification collections / FCM forks
- Timeline redesign / new event types

---

## Files touched

**New**
- `functions/automation/slaBreachJobs.js`
- `directives/wave6-phase2c-agent2-notes.md` (this file)

**Updated**
- `functions/automation/index.js` — export register/handle + lookback constant
- `functions/index.js` — import + `registerSlaBreachJobs({ db, sendFcm, exports })`

---

## Deploy / validation notes

- Single-field `createdAt` range + orderBy typically needs no composite index; if deploy warns, add ASC on `leads.createdAt`.
- Legacy rows with only `createdTime` (no `createdAt`) are **not** in the query window; predicate still dual-reads both fields when a doc is scanned.
- After deploy Functions: confirm log line  
  `[automation:sla_breach] done notified=… skipped=… scanned=…`

Suggested smoke (manual / emulator):

```bash
# From telecaller-app/
node -e "require('./functions/automation').registerSlaBreachJobs"
```

---

## STOP

Do not extend this job into stuck-lead, scoring, or timeline invent. Contract gaps → Architecture Owner.
