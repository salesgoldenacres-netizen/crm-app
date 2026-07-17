# Wave 7 Phase 2C — Agent 2 Notes (Copilot Integration)

**Status:** Implemented — `createAiRuntime()` + AI Generated indicator  
**Date:** 2026-07-14  
**Agent:** Agent 2 (Sales Copilot integration)  
**Module:** `telecaller-app/src/features/leads/copilot/`  
**Depends on:** Agent 0 live provider (`wave7-phase2c-agent0-notes.md`), Agent 1 contracts (`wave7-phase2c-agent1-notes.md`)

**STOP (not done here):** confirm-write CTAs / Dialogs, CRM commits, safety extensions (Agent 3), docs Agent 5.

---

## What shipped

| File | Change |
| --- | --- |
| `SalesCopilotDrawer.tsx` | AI path uses `createAiRuntime()` (flag + ProviderFactory); rules fallback unchanged |
| `LeadBriefCard.tsx` | Badge **AI Generated** when `source` is `stub` or `llm` (not rules) |
| `index.ts` | Barrel comment → Phase 2C / read-only |
| `SalesCopilotDrawer.test.tsx` | Mocks `createAiRuntime`; covers stub + live `llm` badge |
| `LeadBriefCard.test.tsx` | Expects **AI Generated** for stub + llm |

**Not modified:** `shared/ai` providers/orchestrator (consume only), Timeline, Wave 6 intelligence formulas, DLS, Firestore, CRM writers.

---

## How live vs stub is selected

Copilot does **not** pick the provider itself. Selection is entirely via Agent 0:

```
isAiEnabled() === false  →  no createAiRuntime() call → Wave 6 rules brief
isAiEnabled() === true   →  createAiRuntime()
                              ↓
                         ProviderFactory (inside runtime)
                              ↓
              forceStub / kind / VITE_AI_PROVIDER
                              ↓
         stub  → source "stub"     OR     gemini → source "llm"
                              ↓
              on failure (PROVIDER_ERROR, etc.) → rules fallback
```

| Condition | What Copilot shows | Badge |
| --- | --- | --- |
| Offline | Rules brief | Rules (offline) |
| AI flag off | Rules brief | Rules (AI off) |
| AI on + factory stub | Orchestrator stub brief | **AI Generated** |
| AI on + `VITE_AI_PROVIDER=gemini`/`live` + `aiComplete` | Live brief | **AI Generated** |
| AI on + provider/safety failure | Rules brief (safe copy) | Rules + AI unavailable |

**Env (from Agent 0):** `AI_ENABLED` (compile, still false) · `VITE_AI_ENABLED` (non-prod) · `VITE_AI_PROVIDER=stub|gemini|live` · server `GEMINI_API_KEY` only.

---

## Call site

```ts
import { createAiRuntime, LEAD_BRIEF_V1_ID, isAiEnabled } from "@/shared/ai";

if (!isOnline || !isAiEnabled()) {
  // Wave 6 rulesBrief — no runtime
} else {
  const orch = createAiRuntime(); // enabled + factory (stub | gemini)
  const result = await orch.run(LEAD_BRIEF_V1_ID, { leadId, userId, role, context });
  // result.source === "stub" | "llm" → badge "AI Generated"
}
```

**Do not:** import Gemini SDK, call `aiComplete` from Copilot, bypass orchestrator, or write CRM from this panel.

---

## Confirm-to-write (explicit non-ship)

Agent 1 contracts (`AiActionProposal`, `PENDING_CONFIRMATION`, `forbidAiActionExecution`) are available from `@/shared/ai`.  
**This agent did not** add write buttons, Apply/Confirm Dialogs, or proposal execution UI. Proposals may be typed later; CRM commit stays future auth.

---

## Validation (Agent 2)

From `telecaller-app/`:

- `npx tsc --noEmit`
- `npm test -- src/features/leads/copilot/ --run`

---

## Residuals

| ID | Note | Owner |
| --- | --- | --- |
| R1 | Confirm Dialog + CRM writers for FU / note / WA / status | Future SC-2 auth |
| R2 | SafetyGuard extensions for proposal types | Agent 3 |
| R3 | Distinguish stub vs live in badge (optional; both say AI Generated today) | Optional polish |

---

## Out of scope

- Shared AI provider / orchestrator edits  
- Firestore / CRM writes from Copilot  
- Timeline / Wave 6 intelligence formula changes  
- DLS / UI redesign  
- Confirm-write commit path  
