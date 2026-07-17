# Wave 6 Phase 2A — Agent 0 Notes
## Frozen Shared Contracts (Architecture Owner)

**Status:** Phase 2A complete — shared contracts landed  
**Date:** 2026-07-13  
**App:** `telecaller-app/`  
**Audience:** Agents 1 (workflow), 2 (timeline), 3 (automation)  
**Import root:** `@/shared/contracts`  
**DLS:** unchanged (v1.4)

---

## What shipped

| Contract | Path | Purpose |
| --- | --- | --- |
| Lead status enum | `src/shared/contracts/leadStatus.ts` | Canonical statuses + labels + normalize/aliases |
| Status transition helper | `src/shared/contracts/statusTransition.ts` | `planStatusTransition` / `canTransitionStatus` / site-visit helper |
| Typed timeline publishers | `src/shared/contracts/timelinePublisher.ts` | Typed helpers wrapping `recordTimelineEvent` |
| Notification helper (client) | `src/shared/contracts/notifications.ts` | `publishInAppNotification` → `notifications` docs |
| Notification helper (server) | `functions/notifications/publishNotification.js` | In-app doc + optional FCM via existing `sendFcm` |
| Query scopes | `src/shared/contracts/queryScopes.ts` | Role-scoped leads, user notifications, attendance range, audit list |
| Intelligence shape | `src/shared/contracts/leadIntelligence.ts` | `LeadIntelligence` type only (no scorer) |
| Task extensions | `src/shared/contracts/taskContract.ts` | Optional `leadId` / `dueAt` / `source` / `type` |
| Barrel | `src/shared/contracts/index.ts` | Re-exports all of the above |

### Bleeding stops (shared write path)

- **`LeadsRepository.logCall` no longer overwrites `Lead.notes`** — profile notes only via `updateLead`.
- **`useLeadsStore`** now publishes via typed helpers; **follow-up timeline is diff-only** (including `logCall`).
- **`LEAD_STATUS_OPTIONS`** sourced from canonical `LEAD_STATUS_FILTER_OPTIONS` (includes `re-engaged`).
- Timeline types + Functions `TIMELINE_ICONS` extended for site visit / discount / merge; optional `idempotencyKey` on recorders.

### Explicitly NOT done (feature agents)

- SiteVisitScheduler → `site-visit-confirmed` write (Agent 1)
- Retire WhatsAppAssistant → `callLogs` WA writes (Agent 2)
- Wire scoped listeners in `DatabaseContext` / stores (Agent 3 + perf)
- Crons, SLA jobs, scoring, Daily Priorities UI, timeline UI redesign

---

## API summary for adopters

### 1. Status

```ts
import {
  LEAD_STATUSES,
  type LeadStatus,
  normalizeLeadStatus,
  isCanonicalLeadStatus,
  planStatusTransition,
  planSiteVisitConfirmedTransition,
  canTransitionStatus,
} from "@/shared/contracts";

// Always plan before writing status:
const plan = planStatusTransition({
  from: lead.status,
  to: "site-visit-confirmed",
  reason: "site_visit",
});
if (!plan.ok) { /* show plan.error */ return; }
await updateLead(lead.id, plan.leadPatch);
await publishLeadStatusChanged({
  leadId: lead.id,
  from: lead.status,
  to: plan.to,
  reason: "site_visit",
});
```

**Site visit P0:** call `planSiteVisitConfirmedTransition(lead.status)` then apply — do **not** force `interested`.

**Transitions:** active statuses may move freely; won (`booked`/`reserved`) reopen only to `new`/`re-engaged` (or booked↔reserved); lost reopen to `new`/`re-engaged`. Use `force: true` for imports/admin overrides.

### 2. Timeline publishers

```ts
import {
  publishLeadCreated,
  publishLeadStatusChanged,
  publishLeadAssigned,
  publishLeadReassigned,
  publishFollowUpDiff,      // preferred — diff-only
  publishFollowUpCreated,
  publishFollowUpCompleted,
  publishNoteAdded,
  publishCallCompleted,
  publishSiteVisitScheduled,
  publishSiteVisitCompleted,
  publishSiteVisitCancelled,
  publishSiteVisitNoShow,
  publishDiscountRequested,
  publishDiscountApproved,
  publishDiscountRejected,
  publishLeadMerged,
} from "@/shared/contracts";
```

**Rules**

- Do **not** call `recordTimelineEvent` with raw `type` strings from UI.
- One user intent → one primary event; set `sourceId` when available.
- Summary ≤ 200 chars (enforced).
- Optional `idempotencyKey` → deterministic doc id `tl_<key>` (client + Functions).
- `lead_converted` is **deprecated**; keep `lead_booked`.
- WhatsApp timeline remains server `writeMessage` only.

### 3. Notifications

**Client (in-app only):**

```ts
import { publishNotification } from "@/shared/contracts";
await publishNotification({
  userId: assigneeId,
  message: "New lead assigned",
  type: "lead_assigned",
  leadId,
});
```

**Server (in-app + optional FCM):**

```js
const { publishNotification } = require("./notifications/publishNotification");
await publishNotification(db, sendFcm, {
  userId,
  title: "Follow-up due",
  body: `${lead.name} is due today`,
  message: `Follow-up due: ${lead.name}`,
  type: "follow_up",
  leadId: lead.id,
  sendPush: true,
});
```

Do not hand-write `notifications` docs or fork FCM send paths in feature PRs.

### 4. Query scopes (Agent 3 wires listeners)

```ts
import {
  buildRoleScopedLeadsQuery,
  buildAgentLeadsQuery,
  buildManagerLeadsQuery,
  buildUserNotificationsQuery,
  buildAttendanceDateRangeQuery,
  buildAuditLogsListQuery,
} from "@/shared/contracts";
```

| Query | Behavior |
| --- | --- |
| Agent leads | `assignedTo == uid` + order + optional limit |
| Manager leads | order + **required** limit (default 500) |
| Notifications | `userId == uid` + `createdAt desc` |
| Attendance | date range (+ optional `userId`) |
| Audit list | `timestamp desc` + limit — **Audit UI only**, never Dashboard mount |

Writes stay on repositories (`AuditLogsRepository.add`, etc.) — list ≠ write.

### 5. Types for later phases

- `LeadIntelligence` + `LEAD_SCORE_VERSION_V1` — Agent 4 implements pure functions; do not persist yet.
- `TaskItemExtensions` — optional fields already on `TaskItem`; auto-task generation still unauthorized.

---

## Required Firestore indexes (document for Agent 3 — deploy before scoped listeners / jobs)

Add to `firestore.indexes.json` when wiring queries (not deployed in 2A):

| Collection | Fields |
| --- | --- |
| `leads` | `assignedTo` ASC, `updatedAt` DESC |
| `leads` | `followUpDate` ASC, `assignedTo` ASC |
| `notifications` | `userId` ASC, `createdAt` DESC |
| `attendance` | `date` ASC |
| `attendance` | `userId` ASC, `date` ASC |
| `auditLogs` | `timestamp` DESC (single-field may suffice; composite if filtered) |

Messaging/timeline indexes already exist.

---

## Migration checklist by agent

### Agent 1 — Workflow

- [ ] `SiteVisitScheduler`: on schedule, `planSiteVisitConfirmedTransition` + `updateLead` + `publishSiteVisitScheduled` (stop writing `interested`).
- [ ] Pipeline / kanban / admin status chips: validate via `planStatusTransition` before write.
- [ ] Stop using `logCall` as generic event bus for discounts / campaigns / non-calls — use typed publishers + `updateLead`.
- [ ] Prefer `followUpDate` writes; treat `followUpOn` as read alias only.
- [ ] Confirm call forms still work: `logCall` no longer clobbers profile notes.

### Agent 2 — Timeline

- [ ] Replace remaining raw `recordTimelineEvent({ type: "..." })` in feature code with typed helpers.
- [ ] Stop WhatsAppAssistant → `callLogs` `[WhatsApp Sent]` writes.
- [ ] Emit `site_visit_*`, `discount_*`, `lead_merged` from domain paths.
- [ ] UI may need icons for `map` / `tag` / `merge` (fallback OK until then).
- [ ] Collapse legacy `callLogs` pane when timeline present (Phase 2B UI — not 2A).

### Agent 3 — Automation

- [ ] Require `publishNotification` (server helper) for all new notify paths.
- [ ] Replace full-collection notification listener with `buildUserNotificationsQuery`.
- [ ] Scope leads listeners via `buildRoleScopedLeadsQuery` (coordinate with Agent 0 on `DatabaseContext` merge).
- [ ] Deploy indexes above before overdue FU / SLA crons.
- [ ] Extend `scheduledFollowUpReminders` — do not invent a BPM engine.
- [ ] Consume future `LeadIntelligence.health` — do not fork stale thresholds.

---

## Risks / dual-read

| Risk | Mitigation |
| --- | --- |
| Existing leads with non-canonical status strings | `normalizeLeadStatus` + `force: true` on legacy write paths |
| Filter list now includes `re-engaged` | Intentional — was used in stage tracker but missing from filters |
| Idempotent timeline `setDoc(merge)` | Safe for retries; not a full dedupe of different keys |
| Manager lead query default limit 500 | Product may need cursor pagination later (Phase 2E) |
| New timeline icons | UI may show generic fallback until Agent 2 maps icons |

---

## Validation (Agent 0)

Run from `telecaller-app/`:

- `npx tsc --noEmit`
- `npm run lint`
- `npm run test`
- `npm run build`

Confirm: **no** automation jobs, scoring, cron, or feature UI redesign in this PR slice.

---

## STOP

Feature agents adopt these contracts. Do not fork status enums, timeline types, notification writers, or query patterns in feature PRs. Escalate contract gaps to Architecture Owner (Agent 0).
