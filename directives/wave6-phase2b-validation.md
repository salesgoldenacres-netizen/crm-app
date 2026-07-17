# Wave 6 Phase 2B — Validation Report

**Date:** 2026-07-14  
**App:** `telecaller-app/`  
**Scope:** Timeline Normalization only (post–Phase 2A foundation)  
**Method:** Code review of emit paths + `tsc --noEmit` + production build  
**DLS:** unchanged (v1.4)  
**Next phase:** Do **not** start Phase 2C / 2D / Phase 3 without authorization

---

## Verdict

**PASS** — Phase 2B exit criteria met. No critical blockers.

Residuals (bulk/webhook timeline, legacy WA readers, intentional site-visit dual emit, notification helper adoption) are documented below and do **not** fail Phase 2B.

---

## Exit criteria matrix

| # | Criterion | Result | Evidence |
| --- | --- | --- | --- |
| 1 | One intentional emit path for common call + status actions | **PASS** | `CallLogModal` no longer double-writes status/FU via `updateLead`; Lead Detail already priority-only; merge uses `suppressTimeline` |
| 2 | Typed coverage for high-traffic `logCall` leftovers | **PASS** | `timelineActivity: "call"` on CallLogModal / LeadDetails / ProjectMap; dialer initiate `"none"` |
| 3 | WhatsApp deep-link/campaign do not write callLogs-as-WA | **PASS** | Assistant + auto-WA deep-link only; campaign = `publishNoteAdded` audit only |
| 4 | `sourceId` / idempotency where easy | **PASS** | Calls, site visit, discount, campaign, merge keyed |
| 5 | No LeadInteractionHistory redesign | **PASS** | Trivial only: legacy collapse default, system filter correctness, map/tag/merge icons |
| 6 | No bulk callLogs migration / new collections / automation / AI / 2C | **PASS** | Confirmed absent from diff |
| 7 | Tooling: `tsc` / build | **PASS** | See tooling table |

---

## Tooling

| Check | Result | Notes |
| --- | --- | --- |
| `npx tsc --noEmit` | **PASS** (exit 0) | Clean |
| `npm run build` | **PASS** (exit 0) | Vite ~1.9s; pre-existing firebase chunk-size warning |

---

## Spot-check summary

| Area | Status | Notes |
| --- | --- | --- |
| `useLeadsStore.logCall` | OK | Explicit `timelineActivity`; call `sourceId`/`idempotencyKey`; status/FU diff-only |
| `useLeadsStore.updateLead` | OK | Optional `suppressTimeline` for merge |
| `CallLogModal` | OK | Single emit path for call+status+FU |
| Pipeline / kanban status | OK | Still `planStatusTransition` + `updateLead` only (no logCall) |
| Site visit | OK | Typed publishers + keys; dual status+visit accepted |
| Discount / campaign / merge | OK | Typed + keys; merge no longer emits merge-notes as `note_added` |
| WhatsApp | OK | No new `[WhatsApp Sent]` writers |

---

## Residuals (non-blocking)

| ID | Finding | Severity | Recommended next |
| --- | --- | --- | --- |
| B1 | `bulkAddLeads` / `bulkUpdateLeads` / webhook ingest still skip timeline | Medium | Later slice or accept documented exception |
| B2 | Site-visit schedule → status event + `site_visit_scheduled` | Low | Intentional (2A R6) |
| B3 | Legacy `[WhatsApp` readers in CallsTab / widgets / history | Low | Keep for historical rows; messaging SoR for new |
| B4 | Notification writes still bypass `publishNotification` | Medium | Phase 2A R1 — not 2B |
| B5 | Discount idempotency keyed by amount — re-request same amount merges doc | Low | Acceptable without schema; add stamp if product needs multi-request history |
| B6 | Dialer initiate still appends callLogs row (no timeline) | Low | Optional later: skip callLogs for dialer start |

---

## Blockers

**None** for Phase 2B exit.

Do **not** begin Phase 2C (automation), 2D (intelligence), or Phase 3 without authorization.

---

## Deliverables

1. Code changes (timeline normalization) — landed  
2. `directives/wave6-phase2b-notes.md`  
3. `directives/wave6-phase2b-validation.md` (this file)  
4. `memory.md` lightly updated  

---

## STOP

Phase 2B validation complete. Await authorization for next Wave 6 slice.
