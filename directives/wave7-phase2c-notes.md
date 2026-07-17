# Wave 7 Phase 2C — Live Provider + Confirm-to-Write Notes

**Status:** COMPLETE — PASS  
**Date:** 2026-07-14  
**App:** `telecaller-app/`  
**DLS:** v1.4 unchanged  
**AI flag:** `AI_ENABLED=false` remains the default

---

## Summary

Phase 2C delivered the **live-provider runtime path**, **proposal-only confirm-to-write contracts**, and the **safety/governance layer** needed to move beyond the Phase 2B stub-only Copilot foundation without opening CRM writes. Sales Copilot now resolves its AI path through `createAiRuntime()` and `ProviderFactory`; Gemini access is proxied through Firebase Functions with server-side key custody only; confirm-to-write stays schema-only and **inert** at `PENDING_CONFIRMATION`.

This phase does **not** ship CRM write buttons, confirm dialogs, or commit execution. Phase 2C remains read-only at the product boundary.

---

## What shipped

| Track | Outcome | Key paths |
| --- | --- | --- |
| **Agent 0** | Live provider plumbing (stub or Gemini) | `src/shared/ai/GeminiProvider.ts`, `ProviderFactory.ts`, `AiRuntime.ts`, `functions/ai/complete.js`, `functions/index.js` |
| **Agent 1** | Confirm-to-write contracts (proposal only) | `src/shared/ai/contracts/confirmWriteContracts.ts`, `src/shared/ai/contracts/index.ts` |
| **Agent 2** | Copilot runtime integration + AI badge | `src/features/leads/copilot/SalesCopilotDrawer.tsx`, `LeadBriefCard.tsx` |
| **Agent 3** | Safety / governance / timeout / retry | `src/shared/ai/SafetyGuard.ts`, `src/shared/ai/safetyUtils.ts`, `src/shared/ai/AiOrchestrator.ts` |
| **Agent 5** | Validation + closeout docs | This file, `wave7-phase2c-validation.md`, `provider-architecture.md`, `confirm-write-contract.md` |

---

## Runtime flow

```
Lead Detail Copilot
  ├─ offline / AI off        → Wave 6 rules brief
  └─ AI on                   → createAiRuntime()
                                 ↓
                           ProviderFactory
                           ├─ stub   → source "stub"
                           └─ gemini → Firebase callable aiComplete
                                            ↓
                                      Gemini REST (server-side key only)
                                            ↓
                           orchestrator safety + schema validation
                                            ↓
                           Lead Brief UI ("AI Generated")

Confirm-to-write side path
  raw proposal → validateAiActionProposal(...)
              → status locked to PENDING_CONFIRMATION
              → forbidAiActionExecution(...) / ensureProposalInert(...)
              → no CRM commit path in Phase 2C
```

---

## Key behaviors

### Provider selection

| Condition | Provider | Result |
| --- | --- | --- |
| AI disabled | stub | Orchestrator returns `AI_DISABLED`; Copilot falls back to rules |
| AI enabled + env unset | stub | Safe default |
| AI enabled + `VITE_AI_PROVIDER=gemini` or `live` | gemini | Callable-backed live provider path |
| `forceStub=true` | stub | Explicit override |

### Confirm-to-write contract posture

| Item | Phase 2C behavior |
| --- | --- |
| Proposal types | `UPDATE_STATUS`, `SCHEDULE_FOLLOW_UP`, `ADD_NOTE`, `DRAFT_WHATSAPP`, `DRAFT_EMAIL` |
| Proposal status | Always `PENDING_CONFIRMATION` |
| Execution | Explicitly forbidden |
| Firestore / CRM writes | Not present in contract layer |
| Copilot write CTAs / dialogs | Not shipped |

### Safety posture

- Prompt and response validation remain **READ_ONLY**
- Unknown capabilities and malformed proposal types fail closed
- Prompt size, token usage, timeout, and retry are governed centrally
- CRM patch shapes and executable command keys are rejected
- PII is redacted before user-facing display paths

---

## Fresh validation

From `telecaller-app/` on 2026-07-14:

- `npx tsc --noEmit` → **PASS**
- `npm test -- src/shared/ai/aiPlatform.test.ts src/shared/ai/ProviderFactory.test.ts src/shared/ai/contracts/confirmWriteContracts.test.ts --run` → **PASS** (**75** tests)
- `npm run build` → **PASS** (Vite build complete; existing large Firebase chunk warning remains)

---

## Residuals

| ID | Item | Notes |
| --- | --- | --- |
| R1 | Confirm dialog + CRM commit path | Deferred to later authorization; not shipped in Phase 2C |
| R2 | AI proposals are contract-only | No write CTA or apply flow yet |
| R3 | Live provider requires deployed callable + server key | `GEMINI_API_KEY` / `GOOGLE_AI_API_KEY` must be present server-side |
| R4 | AI remains disabled by default | `AI_ENABLED=false` still the safe baseline |
| R5 | Build chunk warning | Existing Firebase chunk-size warning is non-blocking |

---

## Hard rules respected

- No vendor SDK or client-side Gemini API key in feature code
- No CRM writes or Firestore AI persistence added for this phase
- No Timeline or Wave 6 intelligence formula changes
- No DLS bump; `ui-registry.md` remains v1.4
- No Phase 2D or W7-AI-3 work started

---

## STOP

Phase 2C closeout is complete. Await explicit authorization before any work on **W7-AI-3** (proposal execution / confirm UI / commit path) or **Phase 2D** and later Wave 7 tracks.
