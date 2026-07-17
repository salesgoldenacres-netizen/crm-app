# Wave 6 Phase 2A — Agent 1 Notes
## Workflow Foundation

**Status:** Phase 2A Agent 1 complete  
**Date:** 2026-07-13  
**App:** `telecaller-app/`  
**Contracts:** adopted from `@/shared/contracts` (Agent 0 frozen) — **no** edits to `src/shared/contracts/*`

---

## What shipped

### 1. Site visit → canonical `site-visit-confirmed`

`SiteVisitScheduler` no longer forces `interested` via `logCall`.

On schedule:

1. `planSiteVisitConfirmedTransition(activeLead.status)`
2. Block when transition fails (except `"Status unchanged"` — reschedule allowed)
3. `updateLead` with `siteVisit` + `followUpDate` + `plan.leadPatch` when status advances
4. `publishSiteVisitScheduled(...)` (typed timeline)

On cancel:

1. `updateLead({ siteVisit: null })`
2. `publishSiteVisitCancelled(...)` — no `logCall`

`logCall` prop removed from `SiteVisitScheduler`.

### 2. Lead.notes overwrite — verified clear in scope

- Agent 0: `LeadsRepository.logCall` does **not** write `Lead.notes` (confirmed).
- `SiteVisitScheduler` does **not** touch `notes` or use `logCall`.
- Call logging on `LeadDetailsPage` still uses `logCall` for real calls only (`note` → `callLogs`); profile notes only via `updateLead`.

### 3. Feature status writes → shared helpers

| Surface | Change |
| --- | --- |
| Lead detail pipeline / not-interested | `planStatusTransition` → `updateLead(plan.leadPatch)`; stopped `logCall` as status bus |
| Call disposition submit | `planStatusTransition` (`reason: "call"`) before `logCall` |
| Kanban drop (`LeadsTab`) | `planStatusTransition` (`reason: "kanban"`) → `updateLead`; no `logCall` |
| Admin stage tracker (`AdminLeadsTab`) | `planStatusTransition` (`reason: "admin"`) → `updateLead`; no `logCall` |
| Bulk status (`BulkActionsPanel`) | `normalizeLeadStatus` + per-lead `planStatusTransition` (`reason: "bulk"`); skip blocked |

---

## Files changed

| File | Change |
| --- | --- |
| `src/features/leads/components/SiteVisitScheduler.tsx` | Canonical site-visit status + typed publishers |
| `src/features/leads/pages/LeadDetailsPage.tsx` | Pipeline / call status via planner; drop `logCall` prop to scheduler |
| `src/features/leads/components/LeadsTab.tsx` | Kanban via `planStatusTransition` |
| `src/features/admin/components/AdminLeadsTab.tsx` | Admin chips via `planStatusTransition` |
| `src/features/leads/components/BulkActionsPanel.tsx` | Bulk status via normalize + plan |
| `directives/wave6-phase2a-agent1-notes.md` | This report |

**Not modified:** `src/shared/contracts/*`, automation/AI/cron, timeline UI redesign.

---

## APIs used (from `@/shared/contracts`)

- `planSiteVisitConfirmedTransition`
- `planStatusTransition`
- `normalizeLeadStatus`
- `publishSiteVisitScheduled`
- `publishSiteVisitCancelled`

Status changes applied through `updateLead` continue to emit `publishLeadStatusChanged` inside `useLeadsStore` (Agent 0). Site-visit schedule therefore yields **status timeline + `site_visit_scheduled`** when status actually advances.

---

## Validation

Run from `telecaller-app/`:

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | **PASS** (exit 0) |
| `npx eslint` on Agent 1 files | **PASS** (exit 0) |
| Full `npm run lint` | Pre-existing failures outside scope (`.tmp/*.cjs`, `useAuditLogsStore` setState-in-effect, etc.) — not introduced by Agent 1 |

---

## Risks / dual-write notes

| Risk | Notes |
| --- | --- |
| Dual timeline on schedule | `updateLead` status publish + `publishSiteVisitScheduled` — intentional per checklist; primary domain event is site visit |
| Cancel leaves status | Cancel clears `siteVisit` only; status may remain `site-visit-confirmed` until user moves pipeline |
| Won → site-visit blocked | Booked/reserved cannot schedule without `force` (correct per transition graph) |
| Bulk partial apply | Some selected leads may be skipped when transition blocked; toast reports counts |
| Admin feedback dialog title | Shared alert dialog title generalized to "Unable to complete" (was export-only wording) |

---

## Explicitly NOT done (other agents)

- Timeline UI redesign / callLogs collapse (Agent 2 / Phase 2B)
- WhatsAppAssistant → callLogs retirement (Agent 2 — already in progress elsewhere)
- Discount/campaign `logCall` bus retirement beyond what peer agents already landed
- Notifications scoped listeners / crons (Agent 3)
- Intelligence scoring (Agent 4)

---

## STOP

Workflow status writes in Agent 1 scope go through `@/shared/contracts`. Escalate contract gaps to Architecture Owner (Agent 0).
