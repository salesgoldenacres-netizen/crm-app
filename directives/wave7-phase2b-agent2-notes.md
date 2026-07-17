# Wave 7 Phase 2B — Agent 2 Notes (Context Integration)

**Status:** Implemented — Copilot ↔ Wave 6 context / intelligence wiring  
**Date:** 2026-07-14  
**Role:** Agent 2 only (SC-1 context integration)  
**App:** `telecaller-app/`  
**DLS:** v1.4 unchanged  

---

## What shipped

| Path | Role |
| --- | --- |
| `src/features/leads/copilot/buildCopilotContext.ts` | Pure packer: `buildLeadBriefContext` + Wave 6 `computeLeadIntelligence` → drawer props |
| `src/features/leads/copilot/SalesCopilotDrawer.tsx` | Passes real `contextSlots` into `run(lead-brief-v1)`; rules fallback → same cards |
| `src/features/leads/copilot/LeadBriefCard.tsx` | Renders AI or Wave 6 rules brief (`usedRulesFallback`) |
| `src/features/leads/copilot/NextActionCard.tsx` | Wired display (empty-state copy updated) |
| `src/features/leads/copilot/ReadinessCard.tsx` | Wired display (empty-state copy updated) |
| `src/features/leads/copilot/TimelineHighlights.tsx` | Wired display (empty-state copy updated) |
| `src/features/leads/copilot/index.ts` | Exports `buildCopilotContext` |
| `src/features/leads/pages/LeadDetailsPage.tsx` | Host: intelligence + timeline → drawer props |

**Not modified:** `shared/ai` platform core (orchestrator / provider / registry / SafetyGuard). Context builders **used only**.

---

## Wiring flow

```
LeadDetailsPage
  computeLeadIntelligence(lead)     ← Wave 6 only (once, memoized)
  useTimelineEvents(leadId)         ← host preload when drawer open
  buildCopilotContext({ lead, events, intelligence })
       ├─ buildLeadBriefContext → contextSlots
       ├─ nextAction from intel.nextAction
       ├─ readiness from intel.bookingProbability + signal gaps
       ├─ timeline from buildTimelineContext.recent
       └─ rulesBrief from intel.summary (+ bullets)
  SalesCopilotDrawer
       ├─ AI on  → orchestrator.run(lead-brief-v1, { context: slots })
       └─ AI off / fail → rulesBrief in LeadBriefCard (source: rules)
```

---

## Fallback behavior

| Condition | Lead Brief card | NBA / Readiness / Timeline |
| --- | --- | --- |
| `isAiEnabled() === false` | Wave 6 rules brief (`Rules (AI off)`) | Same props from `buildCopilotContext` |
| Orchestrator error / AI_DISABLED | Rules brief if available; else error/disabled | Unchanged (still Wave 6) |
| AI success | Stub/LLM brief | Unchanged (still Wave 6) |

NBA / readiness / timeline **never** depend on the LLM — always Wave 6 / context builders.

---

## Hard rules respected

- No Firestore inside Copilot module (host uses `useTimelineEvents`)
- No CRM writes
- No new score / next-action engine — `intelligence` snapshot preferred; `computeLeadIntelligence` only when host has no snapshot
- No DLS / Lead Detail redesign beyond prop wiring + Copilot button (Agent 1)
- Hooks left for Agent 3 (UX polish) and Agent 4 (`safetyNotice` / role)

---

## Extension points left for Agents 3–4

| Agent | Hook |
| --- | --- |
| **3** | Card polish, loading skeletons, denser layout — cards already data-complete |
| **4** | `safetyNotice` prop; role already passed; no safety pipeline in this slice |

---

## Explicit non-goals (this agent)

- UX polish beyond fallback messaging (Agent 3)
- Safety / redaction pipeline (Agent 4)
- Confirm → write CTAs
- Live provider / `AI_ENABLED` default on
- Rewriting Wave 6 intelligence or `shared/ai` context builders

---

## Validation

From `telecaller-app/` on 2026-07-14:

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | **PASS** (exit 0) |

---

## STOP

Agent 2 complete. Hand off to Agent 3 (UX states) / Agent 4 (safety). Do not implement Agents 3–5 in this slice.
