# Wave 6 — Final Summary

**Status:** CLOSED — PASS (2026-07-14)  
**Wave:** CRM Intelligence & Workflow Automation  
**DLS:** **v1.4** (unchanged)  
**Companion:** [`wave6-complete.md`](wave6-complete.md) · [`wave6-change-log.md`](wave6-change-log.md) · [`wave6-archive-index.md`](wave6-archive-index.md)

---

## Accomplishments

Wave 6 shifted the CRM from a human-operated UI tool (Waves 1–5 Design Language) into a **contracted business-capability** system: canonical status/timeline, scheduled reminders, explainable lead intelligence, and scoped Firestore listeners — without a DLS bump, LLM, BPM engine, or schema redesign.

| Track | Outcome |
| --- | --- |
| **Foundation (2A)** | Frozen `@/shared/contracts` (status, transitions, timeline publishers, notifications, query scopes); site visit → `site-visit-confirmed`; `logCall` no longer overwrites `Lead.notes` |
| **Timeline (2B)** | One user intent → one primary emit; explicit `timelineActivity` on `logCall`; WA deep-link never writes callLogs; sourceId/idempotency on high-traffic paths |
| **Automation (2C)** | Overdue + same-day FU, first-touch SLA notify, site-visit D-1/D-0 reminders; IST + create-only idempotent notify |
| **Intelligence (2D)** | Deterministic `lead-score-v1` / health / next-action / daily priorities (compute-on-read); Lead Detail strip + list chips + ranked Power Dialer |
| **Performance (2E)** | Hardened scoped queries; archived/tasks/leave bounds; Dashboard lazy store subscribe; Evolution phone equality; vite `manualChunks`; indexes |

---

## Architecture delivered

### Shared contracts (`telecaller-app/src/shared/contracts/`)

- **Status:** `leadStatus.ts`, `statusTransition.ts` — canonical enum + planners  
- **Timeline:** `timelinePublisher.ts` — typed helpers; feature UI does not call `recordTimelineEvent` raw  
- **Notifications:** client `notifications.ts` + server `functions/notifications/publishNotification.js`  
- **Query scopes:** `queryScopes.ts` — role-scoped leads, user notifications, attendance range, audit opt-in list  
- **Automation thresholds / predicates:** shared IST helpers, FU/SLA/visit predicates  
- **Intelligence:** `leadIntelligence.ts` — score/health/next-action shapes + thresholds aligned to automation idle days  

### Automation (Cloud Functions)

| Cron (IST) | Purpose |
| --- | --- |
| 08:00 | Site-visit same-day reminders |
| 09:00 | Same-day (+ advance) follow-up reminders |
| 09:15 | Overdue follow-up reminders |
| 10:00 | Site-visit day-before reminders |
| 10:15 | First-touch SLA breach notify |
| 11:30 | Site-visit no-show scaffold (**disabled**) |

All via `createScheduledJob` + IST `runDateYmd` + `publishAutomationNotification` (create-only → no duplicate FCM).

### Intelligence surfaces

- Lead Detail: `LeadIntelligenceStrip` (score, health, next action, factors, dup banner)  
- Leads list: score chip + health badge  
- Workspace: `DailyPrioritiesStrip`  
- Power Dialer: `rankPowerDialerQueue`  
- Manual `priority` retained; leaderboard formula untouched; **no LLM**

### Performance contracts

- Agents: role-scoped leads (not full collection)  
- Notifications: `userId` + limit 100  
- Attendance: 90-day range  
- Audit: write-only on Dashboard; list opt-in  
- Archived ≤200; tasks by `userId`; leave ≤200  
- Dashboard widgets lazy-subscribe when mounted  
- Evolution: phone equality first; fallback scan reduced  

---

## Metrics (from phase notes / validation)

| Metric | Value | Source |
| --- | --- | --- |
| Phase 2A tooling | `tsc` PASS; build ~2.3s | 2A validation |
| Phase 2B tooling | `tsc` PASS; build ~1.9s | 2B validation |
| Phase 2C tests | 18 vitest (automation + leadStatus) PASS | 2C validation |
| Phase 2D tests | 30 vitest (intelligence + contracts) PASS | 2D validation |
| Phase 2E contracts tests | 18 vitest PASS; build ~2.2s | 2E validation |
| Manager leads cap | 500 (hard) | 2E residual E1 |
| Notifications default limit | 100 | 2E |
| Archived / leave bounds | 200 each | 2E |
| Evolution fallback scan | 100 (was 500) | 2E |
| Conversation phone fallback | 50 (was 200) | 2E |
| Firebase chunk | `manualChunks` split (~562 kB firebase chunk) | 2E |
| SLA scan | 14d lookback / 500 limit | 2C |
| Overdue FU query | limit 500 | 2C |
| Intelligence idle threshold | 3 days (= `AUTOMATION_THRESHOLDS.LEAD_IDLE_DAYS`) | 2D |
| SLA first-touch | 24 hours | 2C |

Lint: pre-existing `.tmp` / audit-store failures — not introduced as Wave 6 blockers.

---

## Operational items (ops — not Wave 6 reopen)

1. **Deploy indexes** (if not live):

```bash
cd telecaller-app
npx firebase deploy --only firestore:indexes
```

Includes prior 2A/2C composites (`siteVisit.date`, leads/notifications/attendance) plus 2E `tasks` / `leaveRequests` composites.

2. **Deploy scheduled functions** for 2C crons if not live (`functions` exports listed in `wave6-phase2c-notes.md`).

3. Until indexes build, scoped listeners may fail with “requires an index.”

---

## Lessons learned

1. **Agent 0 contracts first** — status, timeline publishers, notify helper, and query scopes unblocked every later slice and prevented forks.  
2. **Extend crons, don’t invent BPM** — same-day FU already existed; overdue/SLA/visit were additive on shared scaffolding.  
3. **One health / idle contract** — automation thresholds must feed intelligence (and vice versa) to avoid magic-number drift.  
4. **Compute-on-read for intelligence v1** — explainable ranking without schema cache or LLM; manual priority override preserves agent trust.  
5. **Perf is gated with data paths** — scoping early (2A) then polishing leftovers (2E) beat a late greenfield scale rewrite.  
6. **Ops is a separate gate** — code PASS ≠ production readiness until indexes + functions are deployed.  
7. **Explicit non-goals protect the wave** — no LLM, no bulk callLogs migration, no DLS bump, no automation slice 2 in 2E kept scope honest.

---

## Wave 7 prerequisites

| Prerequisite | Status |
| --- | --- |
| Wave 6 formally CLOSED | **Done** — this closeout |
| DLS baseline | **v1.4** — stay unless authorized |
| Architectural baseline | Shared contracts + automation + intelligence + scoped listeners |
| Ops deploy (indexes + 2C functions) | **Recommended before relying on new crons/listeners in prod** |
| Wave 7 Phase 1 authorization | **Awaiting user** — see [`wave7-execution-plan.md`](wave7-execution-plan.md) |

**Do not implement Wave 7 until authorized.**
