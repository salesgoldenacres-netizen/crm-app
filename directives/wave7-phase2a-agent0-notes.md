# Wave 7 Phase 2A — Agent 0 Notes (AI Platform Foundation)

**Status:** Implemented — stub platform only  
**Date:** 2026-07-14  
**Module:** `telecaller-app/src/shared/ai/`  
**Import:** `@/shared/ai`  
**Gate:** `AI_ENABLED = false` (default). Live providers, Copilot UI, context builders, and CRM writes are **out of scope** for Agent 0.

---

## What shipped

| File | Role |
| --- | --- |
| `types.ts` | DTOs + `AI_ENABLED` + `AI_CAPABILITY_IDS` |
| `AiProvider.ts` | Provider interface only |
| `StubAiProvider.ts` | Fixture responses — no HTTP / SDK / keys |
| `PromptRegistry.ts` | Versioned contracts; **`lead-brief-v1` only** |
| `SafetyGuard.ts` | Role gate, writePolicy check, context size, no CRM patch, strip intelligence overrides |
| `AiOrchestrator.ts` | `run()` pipeline |
| `index.ts` | Barrel |

---

## How to import (Agents 1–3)

```ts
import {
  AI_ENABLED,
  AI_CAPABILITY_IDS,
  LEAD_BRIEF_V1_ID,
  createAiOrchestrator,
  // types
  type AiCapabilityResult,
  type AiRunInput,
  type LeadBriefV1Output,
} from "@/shared/ai";
```

**Do not** import vendor SDKs in feature folders. **Do not** call Firestore from the AI path.

---

## Feature flag

```ts
export const AI_ENABLED = false;
```

- Orchestrator defaults `enabled` to `AI_ENABLED`.
- Agent 2: wrap this flag (Remote Config / env) and pass `createAiOrchestrator({ enabled: resolvedFlag })`.
- Until enabled, `run()` returns `{ ok: false, error: { code: "AI_DISABLED" } }` — UI should fall back to Wave 6 rules intelligence.

---

## `orchestrator.run` flow

```
run(capabilityId, input)
  1. If !enabled → AI_DISABLED
  2. Lookup prompt contract (unknown → UNKNOWN_CAPABILITY)
  3. Safety pre: authorizeCapability(role) + assertWritePolicySafe + maxContextChars
  4. Render userTemplate with input.context slots ({{key}})
  5. provider.complete(...)
  6. safetyPostCheck (assertNoCrmPatch + stripForbiddenIntelligenceFields)
  7. contract.parseOutput → schema validate
  8. Return AiCapabilityResult + AiAuditRecord (in-memory metadata only)
```

### Input (`AiRunInput`)

| Field | Notes |
| --- | --- |
| `leadId` / `userId` / `role` | Audit + role gate |
| `context` | **Agent 1** fills via context builders — plain object of template slots |
| `metadata` | Optional string map forwarded to provider |

Agent 0 does **not** fetch CRM. Pass preloaded `context` only.

### Example (tests / later UI)

```ts
const orch = createAiOrchestrator({ enabled: true }); // tests only until Agent 2 gates on

const result = await orch.run(LEAD_BRIEF_V1_ID, {
  leadId: "abc",
  userId: "u1",
  role: "telecaller",
  context: {
    statusLabel: "Interested",
    scoreBand: "warm",
    health: "watch",
    nextActionType: "call",
    nextActionReason: "Follow-up due",
    timelineSummary: "…",
    facts: "…",
  },
});

if (result.ok) {
  const data = result.data as LeadBriefV1Output;
  // data.brief, data.bullets?
} else if (result.error.code === "AI_DISABLED") {
  // show rules LeadIntelligenceSummary
}
```

---

## Prompt contract: `lead-brief-v1`

- **id:** `lead-brief-v1` (`LEAD_BRIEF_V1_ID` / `AI_CAPABILITY_IDS.LEAD_BRIEF_V1`)
- **writePolicy:** `none`
- **allowedTools:** `[]`
- **output:** `{ brief: string; bullets?: string[] }`
- **slots:** `statusLabel`, `scoreBand`, `health`, `nextActionType`, `nextActionReason`, `timelineSummary`, `facts`

Register new capabilities by adding contracts in `PromptRegistry.ts` (bump versions; do not silently edit `-v1` behavior).

---

## Safety surface (extend, don’t fork)

| Helper | Use |
| --- | --- |
| `assertNoCrmPatch` | Reject `leadPatch` / Firestore-like keys |
| `stripForbiddenIntelligenceFields` | Drop `score` / `health` / `nextAction` / `priority` / … |
| `authorizeCapability` | Optional `allowedRoles` on contract |
| `hashContext` | Audit metadata (not crypto) |

No CRM writes from this module. Propose/confirm tools are **W7-AI-3**.

---

## Ownership split (do not cross)

| Agent | Scope |
| --- | --- |
| **0 (done)** | Platform skeleton above |
| **1** | Context builders (`buildLeadBriefContext`, redaction) + read-only brief wiring using `run` |
| **2** | Feature gate / live provider behind `AiProvider` + key custody — wrap `AI_ENABLED` |
| **3** | Tools / propose flows — not this module’s write path |
| **4** | Broader test coverage |

**Hard rules still in force:** no Gemini/OpenAI SDK here, no HTTP, no Firestore AI collections, no Copilot Drawer/routing, no Wave 6 intelligence/timeline/automation edits, no CRM writes from AI.

---

## Validation

- Unit tests: `telecaller-app/src/shared/ai/aiPlatform.test.ts`
- Run: `npm test -- src/shared/ai/aiPlatform.test.ts` (from `telecaller-app/`)
