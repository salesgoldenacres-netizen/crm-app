# Wave 6 Phase 2C — Agent 0 Notes
## Automation Infrastructure (Architecture Owner)

**Status:** Phase 2C Agent 0 complete — scaffolding APIs landed  
**Date:** 2026-07-14  
**App:** `telecaller-app/` (+ `functions/`)  
**Audience:** Agents 1 (follow-up), 2 (SLA / shared consumers), 3 (site-visit + job logic)  
**DLS:** unchanged (v1.4)  
**Scope:** Unified automation APIs only — **not** overdue FU / SLA / visit feature job logic

---

## What shipped

| Surface | Path | Purpose |
| --- | --- | --- |
| Automation barrel (server) | `functions/automation/index.js` | IST, keys, thresholds, predicates, queries, scheduler, notify |
| IST helpers | `functions/automation/ist.js` + client `src/shared/contracts/automation.ts` | Asia/Kolkata YYYY-MM-DD (no UTC midnight bugs) |
| Idempotency | `functions/automation/idempotency.js` | `leadId + jobType + date` → deterministic notif id |
| Thresholds | `functions/automation/thresholds.js` (+ client mirror) | SLA 24h, stuck 5d, idle 3d, visit day-before |
| Predicates | `functions/automation/leadPredicates.js` | `isSlaBreached`, `isFollowUpOverdue`, `isStuckLead`, … |
| Site visit | `functions/automation/siteVisit.js` + `src/shared/contracts/siteVisit.ts` | Canonical nested status + remindable helper |
| Queries | `functions/automation/leadQueries.js` | FU equality/range, `siteVisit.date` equality |
| Job factory | `functions/automation/createScheduledJob.js` | Thin `onSchedule` wrapper + shared `ctx` |
| Notify once | `functions/automation/publishAutomationNotification.js` | Create-once in-app + FCM |
| `publishNotification` | `functions/notifications/publishNotification.js` | Now supports `idempotencyKey` / create-only |
| Client contracts | `src/shared/contracts/automation.ts`, `siteVisit.ts` | Import from `@/shared/contracts` |
| Index | `firestore.indexes.json` | Added `leads.siteVisit.date` ASC |
| Adoption | CF webhook/bulk/`onLeadCreated` + `useNotificationsStore` | Use shared publish helper |

### Existing cron hardened (not feature expansion)

`scheduledFollowUpReminders` now:
- Uses **IST** `runDateYmd` (was UTC `toISOString`)
- Writes **in-app + FCM** via `publishAutomationNotification`
- Skips terminal statuses via `isTerminalForReminders` (booked/reserved/not-interested + legacy sold)
- Is **idempotent** per `follow_up:{leadId}:{ymd}`

**Still same-day only.** Overdue / N-day-before = Agent feature work.

---

## API summary for Agents 1–3

### 1. Register a cron job

```js
// functions/index.js (or a jobs/*.js required from index)
const {
  createScheduledJob,
  AUTOMATION_JOB_TYPES,
  publishAutomationNotification,
  queryLeadsFollowUpBefore,
  isFollowUpOverdue,
  isSlaBreached,
  queryLeadsBySiteVisitDate,
  isRemindableSiteVisit,
  addIstDays,
} = require("./automation");

exports.scheduledOverdueFollowUps = createScheduledJob({
  name: AUTOMATION_JOB_TYPES.FOLLOW_UP_OVERDUE,
  schedule: "15 9 * * *", // avoid colliding with same-day at :00
  db,
  sendFcm,
  handler: async (ctx) => {
    const snap = await queryLeadsFollowUpBefore(ctx.db, ctx.runDateYmd, 500);
    let notified = 0;
    let skipped = 0;
    for (const doc of snap.docs) {
      const lead = { ...doc.data(), id: doc.id };
      if (!lead.assignedTo || !isFollowUpOverdue(lead, ctx.runDateYmd)) {
        skipped++;
        continue;
      }
      const result = await publishAutomationNotification(ctx.db, ctx.sendFcm, {
        userId: lead.assignedTo,
        leadId: lead.id,
        jobType: AUTOMATION_JOB_TYPES.FOLLOW_UP_OVERDUE,
        dateYmd: ctx.runDateYmd, // key = once per lead per IST day
        title: "Overdue follow-up",
        body: `${lead.name} follow-up is overdue.`,
        message: `Overdue follow-up: ${lead.name}`,
        sendPush: true,
      });
      if (result?.skipped) skipped++;
      else if (result) notified++;
    }
    return { notified, skipped, scanned: snap.size };
  },
});
```

**Rules**
- Always `createScheduledJob` — do not hand-roll `onSchedule` with UTC dates.
- Handler receives `ctx` with `db`, `sendFcm`, `runDateYmd`, helpers, and both publish functions.
- Return `{ notified, skipped, scanned }` for log lines.
- **Do not** build a rules engine / job registry UI.

### 2. Idempotency key strategy

| Piece | Format |
| --- | --- |
| Logical key | `{jobType}:{leadId}:{YYYY-MM-DD}` (IST date of the **run** or visit day — pick one and stick) |
| Notification doc id | `auto_{jobType}_{leadId}_{ymd}` |
| Write semantics | Firestore `create` — already-exists → `{ skipped: true }`, **no second FCM** |

Helpers:

```js
buildAutomationIdempotencyKey({ jobType, leadId, dateYmd })
buildAutomationNotificationId({ jobType, leadId, dateYmd })
// or just:
publishAutomationNotification(db, sendFcm, { userId, leadId, jobType, dateYmd, message, ... })
```

**Recommended `dateYmd`:**
- Follow-up same-day / overdue daily digest → **run date** (`ctx.runDateYmd`) so one alert per lead per day.
- Site-visit reminder → **visit date** (or `visitDate + suffix` if day-before and morning-of both fire — e.g. job types stay one, or use `dateYmd = visitDate` with distinct `jobType` values if product wants both).

No new collections. Idempotency lives on `notifications` doc ids.

### 3. Always use `publishNotification` / `publishAutomationNotification`

**Server**

```js
const { publishNotification } = require("./notifications/publishNotification");
// one-off assign / non-cron:
await publishNotification(db, sendFcm, {
  userId, title, body, message, type, leadId, sendPush: true,
});

// cron / retries:
await publishAutomationNotification(db, sendFcm, {
  userId, leadId, jobType, dateYmd, message, title, body, sendPush: true,
});
```

**Client**

```ts
import { publishNotification } from "@/shared/contracts";
await publishNotification({ userId, message, type: "site_visit", leadId });
```

`useNotificationsStore.addNotification` now wraps `publishNotification` — prefer that or the contract directly. Do **not** call `NotificationsRepository.add` or `db.collection('notifications').set` in feature PRs.

### 4. IST scheduling

```ts
import { getIstDateString, addIstDays, isYmdBefore } from "@/shared/contracts";
const today = getIstDateString();           // Asia/Kolkata
const yesterday = addIstDays(today, -1);
```

Server: `ctx.runDateYmd` or `getIstDateString()` from `functions/automation`.

**Forbidden:** `new Date().toISOString().split('T')[0]` in cron / reminder date math.

### 5. Job type constants

```js
AUTOMATION_JOB_TYPES.FOLLOW_UP            // same-day (existing cron)
AUTOMATION_JOB_TYPES.FOLLOW_UP_OVERDUE    // Agent 1/3
AUTOMATION_JOB_TYPES.SLA_BREACH           // Agent 2/3
AUTOMATION_JOB_TYPES.SITE_VISIT_REMINDER  // Agent 3
AUTOMATION_JOB_TYPES.STUCK_LEAD           // later / 2E
AUTOMATION_JOB_TYPES.LEAD_ASSIGNED
```

Use these as notification `type` values when possible (already on client `NOTIFICATION_TYPES`).

### 6. Shared predicates (do not fork)

| Helper | Meaning |
| --- | --- |
| `isSlaBreached(lead)` | >24h since created + no non-system callLogs |
| `isStuckLead(lead)` | >5d since updatedAt; skips booked/reserved/not-interested |
| `isFollowUpDueToday(lead, today)` | FU date == today; skips terminal |
| `isFollowUpOverdue(lead, today)` | FU date < today; skips terminal |
| `getFollowUpDate(lead)` | Prefer `followUpDate`, dual-read `followUpOn` |
| `isRemindableSiteVisit(lead)` | Has `siteVisit.date`; not cancelled/completed/terminal |
| `getSiteVisitDate(lead)` | Nested date YYYY-MM-DD or null |

Thresholds: `AUTOMATION_THRESHOLDS` (client + server). Phase 2D health **consumes** these — do not invent parallel 24h/5d constants.

### 7. Site-visit status contract

- **Pipeline SoR:** lead `status` = `site-visit-confirmed` / `site-visit-completed` (Agent 1 writers).
- **Nested optional:** `siteVisit.status` ∈ `scheduled | confirmed | completed | cancelled | no_show`.
- Visit reminder jobs: query `siteVisit.date == ymd`, filter with `isRemindableSiteVisit`.

```ts
import {
  SITE_VISIT_STATUSES,
  normalizeSiteVisitStatus,
  isRemindableSiteVisit,
  getSiteVisitDate,
} from "@/shared/contracts";
```

### 8. Queries + indexes

| Query helper | Index |
| --- | --- |
| `queryLeadsByFollowUpDate(db, ymd)` | `followUpDate` (+ existing `followUpDate`+`assignedTo`) |
| `queryLeadsFollowUpBefore(db, today, limit?)` | `followUpDate` ASC |
| `queryLeadsBySiteVisitDate(db, ymd)` | **`siteVisit.date` ASC** (added to `firestore.indexes.json` — deploy before visit cron) |

Deploy indexes: `firebase deploy --only firestore:indexes` (or project CI) before overdue/visit jobs go live.

---

## Migration checklist by agent

### Agent 1 — Follow-up hardening

- [ ] Implement overdue (and optional N-day) job via `createScheduledJob` + `FOLLOW_UP_OVERDUE`.
- [ ] Reuse predicates; do not change same-day export unless coordinating with Agent 0.
- [ ] Prefer `followUpDate` writes; dual-read only via `getFollowUpDate`.
- [ ] Use IST helpers for any client “today” comparisons in FU UI if touching dates.

### Agent 2 — SLA notify

- [ ] Cron: scan recent leads or maintain a bounded query; gate with `isSlaBreached(lead)`.
- [ ] Notify assignee (+ manager if product says so) via `publishAutomationNotification` + `SLA_BREACH`.
- [ ] Optional timeline event — coordinate shape with timeline contract; do not invent notif writers.

### Agent 3 — Site-visit reminder

- [ ] Cron: `queryLeadsBySiteVisitDate` for `addIstDays(today, 0)` and/or `+1` day-before.
- [ ] Filter `isRemindableSiteVisit`; notify assignee/coordinator via `SITE_VISIT_REMINDER`.
- [ ] Confirm `siteVisit.date` index deployed.
- [ ] Consume lead pipeline status; do not force `interested`.

### All feature agents

- [ ] No new notification collections / FCM forks.
- [ ] No lead score, health UI, daily priorities, AI, task engine, auto-assignment, timeline redesign.
- [ ] Escalate contract gaps to Architecture Owner.

---

## Files touched (Agent 0)

**New**
- `functions/automation/*.js` (ist, idempotency, thresholds, leadPredicates, siteVisit, leadQueries, createScheduledJob, publishAutomationNotification, index)
- `src/shared/contracts/automation.ts`
- `src/shared/contracts/siteVisit.ts`
- `src/shared/contracts/automation.test.ts`
- `directives/wave6-phase2c-agent0-notes.md` (this file)

**Updated**
- `functions/notifications/publishNotification.js` (idempotent create)
- `functions/index.js` (helper adoption + FU cron on scaffolding)
- `src/shared/contracts/index.ts`, `queryScopes.ts`
- `src/features/dashboard/hooks/useNotificationsStore.ts`
- `src/features/leads/components/SiteVisitScheduler.tsx` (type `site_visit` + leadId)
- `telecaller-app/firestore.indexes.json`

---

## Validation

From `telecaller-app/`:

```bash
npx tsc --noEmit
npx vitest run src/shared/contracts/automation.test.ts src/shared/contracts/leadStatus.test.ts
npm run build
```

Confirm: **no** overdue/SLA/visit feature job exports beyond same-day FU scaffolding; **no** scoring / DLS / Phase 2D–2E.

---

## STOP

Feature agents implement reminder **logic** on these APIs. Agent 0 owns contract changes only.
