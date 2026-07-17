# AI Architecture Overview (Wave 7)

**Status:** Implementation baseline after Phase 2A  
**Module:** `telecaller-app/src/shared/ai/` (`@/shared/ai`)  
**Audience:** Future agents (Copilot, Manager Intelligence, Predictive, Knowledge, W7-AI-2+)  
**Companion plans:** [`wave7-ai-architecture.md`](wave7-ai-architecture.md) (master plan) · [`wave7-phase2a-notes.md`](wave7-phase2a-notes.md)

---

## Premise

AI sits **on top of** Wave 6 CRM capability. CRM remains source of truth. Deterministic intelligence (`computeLeadIntelligence`, daily priorities, automation thresholds) stays authoritative for score, health, next-action, and SLA signals. AI never silently writes.

```
Wave 6 contracts + intelligence + timeline
              ↑ consume (read-only context)
         @/shared/ai platform
              ↑ import orchestrator + types only
         Feature UI (future — not in 2A)
```

---

## Public surface

Feature code imports **only** from `@/shared/ai`. Never import vendor SDKs from feature folders.

| Concern | Entry points |
| --- | --- |
| Run a capability | `createAiOrchestrator`, `AiOrchestrator.run` |
| Flags | `AI_ENABLED`, `isAiEnabled`, `AiFeatureGate` |
| Contracts | `LEAD_BRIEF_V1_ID`, `getPromptContract`, `listPromptContracts` |
| Context packs | `buildLeadBriefContext` / `buildLeadBriefContextSlots` (+ individual builders) |
| Safety | `SafetyGuard` helpers + `safetyUtils` (`redactPII`, `validatePrompt`, …) |
| Types | `AiRunInput`, `AiCapabilityResult`, `LeadBriefV1Output`, … |

---

## Layers

| Layer | Responsibility | Phase 2A state |
| --- | --- | --- |
| **Flags** | Master + capability kill switches | Off by default; optional non-prod `VITE_AI_ENABLED` |
| **Orchestrator** | Lookup → safety → provider → parse → post-check | Operational with stub |
| **Prompt registry** | Versioned contracts | `lead-brief-v1` only |
| **Provider** | `AiProvider.complete` | `StubAiProvider` only (no HTTP/SDK/keys) |
| **Context** | CRM snapshot → template slots | Read-only builders; no queries inside AI |
| **Safety** | Role, writePolicy, CRM-patch, PII, intelligence strip | `READ_ONLY` posture hard-coded |

---

## `run()` contract

```ts
const orch = createAiOrchestrator({ enabled: isAiEnabled() });
const result = await orch.run("lead-brief-v1", {
  leadId, userId, role,
  context: { /* slots from builders */ },
  metadata?: { /* string map */ },
});
```

**Success:** `{ ok: true, data, text?, source: "stub"|"llm"|"rules", audit }`  
**Failure:** `{ ok: false, error: { code, message }, audit? }`

Common codes: `AI_DISABLED`, `UNKNOWN_CAPABILITY`, `UNAUTHORIZED`, `SAFETY_VIOLATION`, `INVALID_OUTPUT`, `PROVIDER_ERROR`, `CONTEXT_TOO_LARGE`.

Until the flag is on, treat `AI_DISABLED` as normal and show Wave 6 rules UI.

---

## Context builders (read-only)

Pass **already-loaded** lead + timeline (+ optional precomputed intelligence). Builders do not subscribe or query Firestore.

| Builder | Role |
| --- | --- |
| `buildLeadContext` | Allowlisted facts; no name/email/full phone/address by default |
| `buildTimelineContext` | Bounded recent digest (default 8) |
| `buildAutomationContext` | Overdue / idle / stuck via shared thresholds |
| `buildIntelligenceContext` | Wraps Wave 6 `computeLeadIntelligence` (or snapshot) |
| `buildLeadBriefContext` | Composes → `lead-brief-v1` slots |

**Hard rule:** never fork score / next-action formulas.

---

## Safety rules for implementers

1. **No silent writes** — Phase 2A `allowWriteIntent` always denies.  
2. **No CRM patch keys** in model output (`leadPatch`, Firestore-like shapes).  
3. **No intelligence overrides** — strip `score` / `health` / `nextAction` / `priority` from outputs.  
4. **Minimize PII** — scrub before templating; prefer last-4 phone only when needed.  
5. **Version prompts** — add `*-v2` contracts; do not silently change `*-v1` behavior.  
6. **Gate every UI surface** with `AiFeatureGate(capabilityId)`.

Write tools (propose → user confirm → shared APIs) are **W7-AI-3**, not a freestyle patch path.

---

## Adding a new capability (future)

1. Define versioned contract in `PromptRegistry.ts` (`writePolicy`, slots, `parseOutput`).  
2. Add id to `AI_CAPABILITY_IDS` if it is a product capability.  
3. Add context builder(s) under `context/` if needed.  
4. Register tests (flag off, happy path stub, safety rejects).  
5. Wire UI only behind `AiFeatureGate` — still no vendor SDK in UI.

---

## Live providers (not yet)

W7-AI-2 will add an `AiProvider` implementation + key custody (prefer Functions / proxy). Call sites keep using `createAiOrchestrator({ provider, enabled: isAiEnabled() })`. Stub remains for CI.

---

## Explicit non-goals (still gated)

- Copilot Drawer / Sales Copilot UI (Phase 2B)  
- Manager narrative AI, Predictive LLM, Knowledge search  
- Firestore AI collections / prompt storage  
- Agent tool execution / CRM write actions without confirm  
- DLS bump  

---

## See also

- [`prompt-contracts.md`](prompt-contracts.md) — `lead-brief-v1`  
- [`wave7-phase2a-validation.md`](wave7-phase2a-validation.md) — Phase 2A PASS  
- [`wave7-execution-plan.md`](wave7-execution-plan.md) — slice board  
