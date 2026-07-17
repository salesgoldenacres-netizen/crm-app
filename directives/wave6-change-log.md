# Wave 6 — Change Log (Chronological)

**Wave:** CRM Intelligence & Workflow Automation  
**Closed:** 2026-07-14  
**App:** `telecaller-app/`  
**DLS:** v1.4 throughout (no bump)

Immutable phase references: [`wave6-archive-index.md`](wave6-archive-index.md).

---

## 2026-07-13 — Phase 1 (Audits only)

**Verdict:** COMPLETE (planning / docs only — no app code)

| Deliverable | Path |
| --- | --- |
| Execution plan | `directives/wave6-execution-plan.md` |
| Agent 1 Workflow audit | `directives/wave6-agent1-workflow-audit.md` |
| Agent 2 Timeline audit | `directives/wave6-agent2-timeline-audit.md` |
| Agent 3 Automation audit | `directives/wave6-agent3-automation-audit.md` |
| Agent 4 Intelligence audit | `directives/wave6-agent4-intelligence-audit.md` |
| Agent 5 Performance audit | `directives/wave6-agent5-performance-audit.md` |
| Agent 0 Architecture review | `directives/wave6-agent0-architecture-review.md` |
| Executive consolidation | `directives/wave6-phase1-executive-report.md` |

**Key outcome:** Ranked P0–P2 roadmap; Agent 0 shared APIs before feature work; extend-crons + deterministic score preferred over BPM/LLM.

---

## 2026-07-14 — Phase 2A (Shared contracts + query scoping)

**Verdict:** PASS

| Area | Key paths |
| --- | --- |
| Contracts | `src/shared/contracts/{leadStatus,statusTransition,timelinePublisher,notifications,queryScopes,leadIntelligence,taskContract,index}.ts` |
| Server notify | `functions/notifications/publishNotification.js` |
| Bleed-stops | `LeadsRepository.logCall` (no notes overwrite); `useLeadsStore` typed publishers |
| Site visit | `SiteVisitScheduler.tsx` → `site-visit-confirmed` |
| Scoping | `DatabaseContext`, `useNotificationsStore`, `useAttendanceStore`, `useAuditLogsStore` + `firestore.indexes.json` |
| Docs | `wave6-phase2a-{validation-report,regression-report,merge-summary,agent0–3-notes}.md` |

---

## 2026-07-14 — Phase 2B (Timeline normalization)

**Verdict:** PASS

| Area | Key paths / changes |
| --- | --- |
| Single emit | `CallLogModal` — no double status/FU via `updateLead` |
| Explicit activity | `logCall` + `timelineActivity: "call" \| "none"` on CallLog / Detail / Map / dialer |
| WA discipline | `WhatsAppAssistant` deep-link only |
| Idempotency | sourceId/keys on calls, site visit, discount, campaign, merge |
| Merge | `suppressTimeline` — no double note+merge |
| Docs | `wave6-phase2b-{notes,validation}.md` |

---

## 2026-07-14 — Phase 2C (Automation)

**Verdict:** PASS

| Area | Key paths |
| --- | --- |
| Scaffolding | `functions/automation/*`, client automation contracts |
| Follow-up | `functions/jobs/followUpReminders.js` — same-day + overdue |
| SLA | `functions/automation/slaBreachJobs.js` |
| Site visit | `functions/automation/siteVisitJobs.js` — D-1 / D-0; no-show off |
| Wiring | `functions/index.js` scheduled exports |
| Index | `leads.siteVisit.date` in `firestore.indexes.json` |
| Docs | `wave6-phase2c-{notes,validation-report,regression-report,agent0–3-notes}.md` |

---

## 2026-07-14 — Phase 2D (Intelligence v1)

**Verdict:** PASS

| Area | Key paths |
| --- | --- |
| Contract | `src/shared/contracts/leadIntelligence.ts` (helpers + thresholds) |
| Compute | `src/features/leads/intelligence/*` (`leadScore`, `leadHealth`, `nextAction`, `dailyPriorities`, `duplicateRisk`, tests) |
| UI | `LeadIntelligenceStrip`, list chips, `DailyPrioritiesStrip`, Power Dialer rank |
| Docs | `wave6-phase2d-{notes,validation}.md` |

---

## 2026-07-14 — Phase 2E (Performance polish)

**Verdict:** PASS

| Area | Key paths |
| --- | --- |
| Query harden | `queryScopes.ts` — notifications limit 100; archived/tasks/leave helpers |
| Stores | `useArchivedLeadsStore`, `useTasksStore`, `useLeaveRequestsStore` |
| Dashboard | `Dashboard.tsx` lazy widget/training subscribe |
| Evolution | `functions/messaging/providers/evolution.js`; `functions/messaging/store.js` |
| Bundle | `vite.config.js` `manualChunks` firebase |
| Indexes | `tasks`, `leaveRequests` composites in `firestore.indexes.json` |
| Docs | `wave6-phase2e-{notes,validation}.md`; draft → official `wave6-complete.md` |

---

## 2026-07-14 — Formal close + Wave 7 baseline (docs only)

| Deliverable | Path |
| --- | --- |
| Official close | `directives/wave6-complete.md` |
| Final summary | `directives/wave6-final-summary.md` |
| This change log | `directives/wave6-change-log.md` |
| Archive index | `directives/wave6-archive-index.md` |
| Wave 7 plan (PLAN ONLY) | `directives/wave7-execution-plan.md` |
| Session memory | `memory.md` |
| Skill locked state | `.agents/skills/crm-design-context/SKILL.md` |
