# Wave 7 Phase 2B — Sales Copilot Foundation (SC-1) Notes

**Status:** COMPLETE — PASS  
**Date:** 2026-07-14  
**App:** `telecaller-app/`  
**DLS:** v1.4 unchanged  
**AI platform:** Phase 2A `@/shared/ai` **frozen** (imports only)

---

## Summary

Phase 2B delivered a **read-only Sales Copilot Drawer** on Lead Detail. It consumes `AiOrchestrator.run(lead-brief-v1)` when AI is enabled and online; otherwise it shows the same cards from Wave 6 rules intelligence. No CRM writes, no live provider, no DLS bump.

---

## What shipped (Agents 1–5)

| Agent | Focus | Key paths |
| --- | --- | --- |
| **1** | Drawer shell + Lead Detail open trigger | `copilot/SalesCopilotDrawer.tsx`, cards shell, `LeadDetailsPage` Copilot button |
| **2** | Context / Wave 6 wiring + rules fallback | `copilot/buildCopilotContext.ts`, host props from intelligence + timeline |
| **3** | UX states (loading / empty / error / offline / AI-off) | `CopilotAlert`, `useOnlineStatus`, card presentation |
| **4** | Display safety (`validateResponse` + `redactPII`) | `copilot/secureCopilotOutput.ts` |
| **5** | Tests + validation docs | `copilot/*.test.*`, this file + `wave7-phase2b-validation.md` |

**Module root:** `telecaller-app/src/features/leads/copilot/`

| File | Role |
| --- | --- |
| `SalesCopilotDrawer.tsx` | Shared `Drawer`; orchestrator + fallback + safetyNotice |
| `LeadBriefCard.tsx` | Brief UI (AI or rules) |
| `NextActionCard.tsx` | NBA display (`next-action-v1`) |
| `ReadinessCard.tsx` | Booking readiness (`pBook-v1` + gaps) |
| `TimelineHighlights.tsx` | Recent timeline highlights |
| `buildCopilotContext.ts` | Packs slots + Wave 6 props (no Firestore) |
| `secureCopilotOutput.ts` | Post-orchestrator validate + redact |
| `CopilotAlert.tsx` | Feature-local alert banner |
| `useOnlineStatus.ts` | Offline → rules only |
| `index.ts` | Barrel |

---

## Runtime flow

```
Lead Detail → Copilot button → SalesCopilotDrawer
  host: computeLeadIntelligence + useTimelineEvents + buildCopilotContext
       │
       ├─ offline            → rules brief (no AI call)
       ├─ !isAiEnabled()     → rules brief
       └─ AI on + online     → createAiOrchestrator().run(lead-brief-v1)
                                  ├─ ok → secureLeadBriefOutput → LeadBriefCard
                                  └─ fail / safety → AI summary unavailable + rules fallback
  NBA / readiness / timeline always from Wave 6 pack (never LLM)
```

---

## Behavior matrix

| Condition | Lead Brief | NBA / Readiness / Timeline |
| --- | --- | --- |
| AI flag off (default) | Rules (`Rules (AI off)`) | Wave 6 props |
| Offline | Rules (`Rules (offline)`) | Wave 6 props |
| AI success (stub) | Secured stub brief | Wave 6 props |
| Provider / other AI error | Rules + safe “AI summary unavailable.” | Unchanged |
| Safety / invalid output | Banner + rules / error (no raw dump) | Unchanged |

---

## Hard rules respected

- `@/shared/ai` not modified (except tests importing it)
- No Timeline / Wave 6 intelligence formula changes
- No Firestore from Copilot module; no CRM writes / write CTAs
- No live Gemini/OpenAI provider; `AI_ENABLED` remains default **false**
- No DLS bump; shared `Drawer` only (no overlay fork)
- Phase 2C (live provider + confirm-to-write) **not** started

---

## Tests added

Under `telecaller-app/src/features/leads/copilot/`:

- `SalesCopilotDrawer.test.tsx` — render, flag off, offline, orchestrator path, AI unavailable, safety, retry
- `LeadBriefCard.test.tsx` — loading / disabled / error / fallback kinds
- `buildCopilotContext.test.ts` — packer + PII absence in slots
- `secureCopilotOutput.test.ts` — validate / redact / fail-closed notice
- `copilotCards.test.tsx` — NBA / readiness / timeline / alert
- `useOnlineStatus.test.ts` — online/offline events

Together with Phase 2A `src/shared/ai/` tests: **95** passing in that combined scope.

---

## Residuals (do not block Phase 2B)

| ID | Item | Notes |
| --- | --- | --- |
| R1 | Phase 2C live provider | W7-AI-2 — gated |
| R2 | Confirm → write (FU / note / WA draft) | SC-2 / Phase 2C — gated |
| R3 | Full SC-1 extras (objection / meeting prep panels) | Deferred beyond foundation brief drawer |
| R4 | Remote Config for `AI_ENABLED` | Carry from Phase 2A |
| R5 | Device MANUAL QA (Light/Dark, SR) | Soft — not blocking |
| R6 | Firebase App Check console noise in jsdom | Test env only |

---

## STOP

Phase 2B complete. **Do not** start Phase 2C (live providers / confirm-to-write) without explicit authorization.
