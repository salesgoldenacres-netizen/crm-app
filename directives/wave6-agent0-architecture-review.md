# Wave 6 Phase 1 — Agent 0: Architecture Review (Light)

**Status:** Review only — **no shared API implementation**  
**Date:** 2026-07-13  
**Role:** Architecture Owner (locked systems)  
**Inputs:** Agents 1–5 audits; `directives/wave6-execution-plan.md`  
**Companion:** `directives/wave6-phase1-executive-report.md`

---

## Purpose

Freeze the **shared surface** Wave 6 feature work will consume so parallel agents do not fork timeline shapes, status transitions, notification paths, or Firestore query patterns.

This document specifies **what must exist before Phase 2 feature work** and **what remains locked**. It does **not** implement anything.

---

## Shared APIs needed before feature work

### 1. Timeline publish API

| Concern | Decision |
| --- | --- |
| Contract | Keep `TimelineEvent` / types in `timelineTypes.ts` (+ Functions mirror field-compatible) |
| Surface | Typed helpers only — UI never passes raw `type` strings to `recordTimelineEvent` |
| Required helpers | `recordLeadCreated`, `recordLeadStatusChanged`, `recordLeadAssigned` / `Reassigned`, `recordFollowUpCreated` / `Completed`, `recordNoteAdded`, `recordCallCompleted`, site-visit + discount + merge helpers as contracted |
| WhatsApp | Server `writeMessage` remains sole WA timeline publisher |
| Rules | One user intent → one primary event; `sourceId` when available; summary ≤ 200 chars; no note-text classification |
| Idempotency | Document optional `idempotencyKey` / deterministic id before bulk publishers |
| Failure | Keep or revise fire-and-forget policy explicitly before high-volume jobs |

**Depends on:** Freeze `lead_booked` vs unused `lead_converted` (recommend keep `lead_booked`, alias/remove `lead_converted`).

### 2. Activity intent / status transition API

| Concern | Decision |
| --- | --- |
| Problem | Fragmented status writes (pipeline, kanban, admin chip, call forms, site visit, bulk) |
| API | Canonical status enum + allowed transitions + single write helper (updates lead + emits typed timeline) |
| Non-call actions | Must **not** go through `logCall` as generic event bus |
| `logCall` | Call persistence only; explicit `recordCallCompleted`; **must not overwrite** `Lead.notes` |
| Follow-up | Write `followUpDate` only; read alias `followUpOn` OK temporarily |
| Site visit | Scheduler must write `site-visit-confirmed` (workflow P0) via transition API |

### 3. Query scoping (data access patterns)

| Concern | Decision |
| --- | --- |
| Problem | Full-collection `onSnapshot` on `leads`, `notifications`, `auditLogs`, `attendance`, etc. |
| Leads | Agents: `assignedTo == uid` (+ order/limit); managers: broader but bounded / paginated |
| Notifications | `where('userId','==', uid)` (+ shared announcements if needed) |
| Audit | Split **write** helper from **list** subscription; subscribe only on Audit UI |
| Attendance | Date-range / today for dashboard; not full history |
| Indexes | Add composites **with** query changes — messaging/timeline indexes already good |
| Phone match | Evolution path must use equality on normalized phone (align with `functions/index.js`) |

### 4. Notification helper

| Concern | Decision |
| --- | --- |
| Problem | Each feature hand-writes notifs; FU cron often FCM-only; assign paths write both |
| API | Single server helper: optional FCM + `notifications` doc; typed `type` enum over time |
| Ownership | **Agent 0 only** — feature agents call helper, do not fork |

### 5. Intelligence & task shapes (contract only until authorized)

| Shape | Guidance |
| --- | --- |
| `LeadIntelligence` | Versioned; prefer **computed-on-read** v1; Agent 0 owns persistence if caching later |
| AI interface | Optional S1 LLM behind Architecture Owner abstraction; never auto-write CRM fields |
| `TaskItem` | Extend (`leadId`, `dueAt`, `source`, `type`) only when auto-tasks authorized |

### 6. Automation job surface (thin — not a BPM engine)

| Concern | Decision |
| --- | --- |
| Approach | **Extend** existing crons / `sendFcm` / `determineAllocation` |
| Thresholds | Centralize with Agent 4 health/stale — no fourth “needs attention” definition |
| Non-goal | Full rules/BPM engine unless product expands scope |

---

## What stays locked

Per `wave6-execution-plan.md`, feature agents must **not** modify:

- Timeline Engine core  
- Shared automation engine / job registry  
- Firestore collections, rules, indexes (except via Agent 0)  
- Shared repositories / services  
- Notification infrastructure  
- AI service interfaces  
- Existing routing & authentication  
- Shared types  
- DLS documentation (`ui-registry` / DLS version)  
- Architecture documentation (except approved living directives)

Agent 0 also owns **merge conflict resolution** on shared files (`useLeadsStore.ts`, `functions/index.js`, `repositories.ts`, `timelineTypes.ts`, etc.).

---

## Conflict notes

| Conflict | Parties | Resolution |
| --- | --- | --- |
| Heuristic timeline vs typed publishers | A2 vs current `logCall` | Typed helpers win; heuristics removed in Phase 2B |
| Site visit writes `interested` | A1 vs filters/KPIs | Transition API + scheduler fix is P0 |
| Four “stale” notions (3d / 5d / 24h / FU) | A1 / A3 / A4 | One health contract; automations consume |
| Full leads listener vs scored queues | A5 vs A4 | Scope listeners first; compute on scoped set |
| WA deep-link logs vs messaging SoT | A1 / A2 | Messaging canonical; stop new WA `callLogs` |
| Same-day FU FCM vs “no reminders” | A1 vs A3 | A3 wins: same-day exists; build overdue/parity |
| New cron queries vs missing indexes | A3 vs A5 | Indexes before job deploy |
| Manual priority vs system score band | A4 UX | Show both; manual remains override |
| Booking without plot lock | A1 map vs detail | Atomic booking helper under Agent 0 / plot service |
| Feature PRs touching `DatabaseContext` | All vs A0 | Agent 0 serializes listener changes |

---

## Recommended Agent 0 Phase 2A checklist (post-auth only)

1. [ ] Publish status enum + transition helper API doc + stub/tests.  
2. [ ] Publish typed timeline helper signatures; align Functions icon/fields.  
3. [ ] Fix `logCall` notes overwrite + follow-up diff emission.  
4. [ ] Notification helper (FCM + doc).  
5. [ ] Role-scoped leads + notifications query + audit split + attendance range + indexes.  
6. [ ] Hand off frozen contracts to timeline / automation / intelligence tracks.

---

## STOP

No Phase 2 shared-API implementation until the user authorizes Wave 6 Phase 2.  
DLS remains **v1.4**. Do not modify telecaller-app code in Phase 1.
