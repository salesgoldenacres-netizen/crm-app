# Wave 7 Phase 2A — Consolidated Notes (AI Platform Foundation)

**Status:** COMPLETE — PASS  
**Date:** 2026-07-14  
**Auth:** W7-AI-0 / Phase 2A AI Foundation  
**Module:** `telecaller-app/src/shared/ai/`  
**Import:** `@/shared/ai`  
**DLS:** v1.4 (unchanged)  
**Gate:** `AI_ENABLED = false` (default); `isAiEnabled()` / `AiFeatureGate` fail closed

---

## Verdict

Phase 2A delivered a **stub-only, read-only AI platform** under `@/shared/ai`. No Copilot UI, no live providers, no CRM writes, no Firestore AI collections. Wave 6 intelligence / timeline / automation untouched. Ready for Phase 2B (Sales Copilot Foundation) when authorized — no architectural rework required.

---

## What shipped (by agent)

| Agent | Scope | Key artifacts |
| --- | --- | --- |
| **0** | Platform skeleton | `AiProvider`, `StubAiProvider`, `AiOrchestrator`, `PromptRegistry` (`lead-brief-v1` only), `SafetyGuard`, `types`, barrel |
| **1** | Context builders | `context/*` — lead / timeline / automation / intelligence packs + `buildLeadBriefContext` |
| **2** | Feature flags | `featureFlags.ts` — `isAiEnabled`, `AiFeatureGate`, optional non-prod `VITE_AI_ENABLED` |
| **3** | Safety utilities | `safetyUtils.ts` — PII redact, prompt/response validate, write deny (`READ_ONLY`) |
| **4** | Tests | `aiPlatform.test.ts` (47) + `contextBuilders.test.ts` (12) = **59** |
| **5** | Docs | This file + validation + architecture overview + prompt contracts |

Per-agent detail: `wave7-phase2a-agent0-notes.md` … `agent4-notes.md`.

---

## Module map

```
telecaller-app/src/shared/ai/
  types.ts              AI_ENABLED, DTOs, AI_CAPABILITY_IDS
  AiProvider.ts         Provider interface
  StubAiProvider.ts     Fixture responses (no HTTP/SDK/keys)
  PromptRegistry.ts     lead-brief-v1 only
  SafetyGuard.ts        Role / writePolicy / CRM-patch / intelligence strip
  AiOrchestrator.ts     run() pipeline
  featureFlags.ts       isAiEnabled / AiFeatureGate
  safetyUtils.ts        READ_ONLY helpers
  index.ts              Public barrel
  context/
    redact.ts, types.ts
    buildLeadContext.ts
    buildTimelineContext.ts
    buildAutomationContext.ts
    buildIntelligenceContext.ts
    buildLeadBriefContext.ts
    index.ts
  *.test.ts             Platform + context suites
```

---

## Orchestrator flow

```
createAiOrchestrator({ enabled: isAiEnabled() }).run(capabilityId, input)
  1. !enabled → AI_DISABLED
  2. Prompt contract lookup → UNKNOWN_CAPABILITY
  3. Safety pre: role gate + writePolicy + maxContextChars
  4. Render userTemplate slots from input.context
  5. provider.complete(...)
  6. Safety post: no CRM patch + strip intelligence overrides
  7. contract.parseOutput → schema validate
  8. AiCapabilityResult + in-memory AiAuditRecord
```

Callers pass **preloaded** `context` only — the AI module does not query Firestore or subscribe to stores.

---

## Feature flag (default OFF)

| Layer | Behavior |
| --- | --- |
| `AI_ENABLED` | Compile-time constant **`false`** |
| `isAiEnabled()` | Master resolution; optional `VITE_AI_ENABLED` only when `import.meta.env.PROD` is false |
| `AiFeatureGate(id?)` | Master + known capability; unknown IDs fail closed |
| Orchestrator | Defaults `enabled` to `AI_ENABLED`; pass `isAiEnabled()` at call sites |

Until enabled, UI must keep Wave 6 rules `LeadIntelligenceSummary` / next-action.

---

## Safety posture

**`AI_SAFETY_POSTURE = "READ_ONLY"`**

- `allowWriteIntent` always denies; `blockUnsafeWrite` always blocks
- No silent CRM patches; `assertNoCrmPatch` rejects write-shaped keys
- Intelligence score/health/next-action cannot be overridden by model output
- Context builders scrub PII; `redactPII` / `validatePrompt` available for callers

Propose→confirm tools remain **W7-AI-3** (later auth).

---

## Hard rules observed

- No Gemini / OpenAI / Firebase AI SDK in the AI path  
- No API keys; stub provider only  
- No Copilot Drawer / routing / auth changes  
- No DLS bump; no Firestore schema / AI collections  
- No Wave 6 formula fork (score / health / next-action / automation thresholds)  
- Single prompt contract: **`lead-brief-v1`**

---

## How future agents consume

```ts
import {
  isAiEnabled,
  AiFeatureGate,
  AI_CAPABILITY_IDS,
  createAiOrchestrator,
  buildLeadBriefContextSlots,
  LEAD_BRIEF_V1_ID,
} from "@/shared/ai";

if (!AiFeatureGate(AI_CAPABILITY_IDS.LEAD_BRIEF_V1)) {
  // show Wave 6 rules intelligence
}

const slots = buildLeadBriefContextSlots({ lead, timelineEvents, /* … */ });
const result = await createAiOrchestrator({ enabled: isAiEnabled() }).run(
  LEAD_BRIEF_V1_ID,
  { leadId, userId, role, context: slots },
);
```

**Do not** import vendor SDKs from feature folders. **Do not** write CRM from the AI path.

---

## Residuals (non-blocking)

| ID | Item | Owner |
| --- | --- | --- |
| R1 | Remote Config / Functions kill switch behind `isAiEnabled` | W7-AI-2 / flags follow-up |
| R2 | Live provider adapter + key custody | W7-AI-2 |
| R3 | Lead Detail / Copilot UI consuming brief | Phase 2B / SC-1 |
| R4 | Propose→confirm write tools | W7-AI-3 |
| R5 | Persistent AI audit store | Needs schema auth if Firestore |
| R6 | Agent 4 coverage target was aspirational 95%; suite is **59** focused unit/contract tests (green) | Acceptable for 2A exit |

---

## Companion docs

| Doc | Role |
| --- | --- |
| [`wave7-phase2a-validation.md`](wave7-phase2a-validation.md) | Acceptance PASS/FAIL + tooling |
| [`ai-architecture-overview.md`](ai-architecture-overview.md) | How the platform works for future agents |
| [`prompt-contracts.md`](prompt-contracts.md) | `lead-brief-v1` contract |
| [`wave7-execution-plan.md`](wave7-execution-plan.md) | Program board (updated lightly) |

---

## STOP

Phase 2A complete. Do **not** start Copilot Drawer, live providers, or Phase 2B without explicit authorization.
