# Wave 7 Phase 2C — Agent 3 Notes (Safety & Governance)

**Status:** Implemented — prompt/token/capability/proposal gates + provider timeout/retry  
**Date:** 2026-07-14  
**Agent:** Agent 3 (Safety & Governance)  
**Module:** `telecaller-app/src/shared/ai/` (`SafetyGuard.ts`, `safetyUtils.ts`, orchestrator edge)  
**Import:** `@/shared/ai`  
**Depends on:** Agent 0 live provider (`wave7-phase2c-agent0-notes.md`), Agent 1 contracts (`wave7-phase2c-agent1-notes.md`)

**STOP (not done here):** Copilot UI (Agent 2), CRM commit path, Timeline/Wave 6 intelligence, DLS.

---

## What shipped

| File | Role |
| --- | --- |
| `SafetyGuard.ts` | Prompt size, token limits, capability allowlist, JSON schema shape, executable CRM command rejection, provider policy defaults |
| `safetyUtils.ts` | Proposal validation (Agent 1 types), inert `PENDING_CONFIRMATION` gate, timeout/retry wrappers, posture helpers |
| `AiOrchestrator.ts` | Additive edge: allowlist + prompt budget + `invokeProviderSafely` + output token check + schema shape pre-parse |
| `types.ts` | `PROVIDER_TIMEOUT`, `TOKEN_LIMIT_EXCEEDED` error codes |
| `index.ts` | Re-exports new safety APIs |
| `aiPlatform.test.ts` | Phase 2C governance coverage |

**Not modified:** Stub/Gemini/Factory implementations (only request fields `maxTokens` / `timeoutMs` passed through), Copilot UI, Timeline, Wave 6 intelligence, DLS, Agent 1 contract schemas.

---

## Validates

| Check | API | Failure code |
| --- | --- | --- |
| Prompt size | `assertPromptSize` / `validatePromptSize` | `CONTEXT_TOO_LARGE` |
| Token limits | `assertTokenLimit` / `assertOutputTokenUsage` / `validateTokenLimits` | `TOKEN_LIMIT_EXCEEDED` |
| Allowed capabilities | `assertAllowedCapability` / `validateAllowedCapability` | `UNKNOWN_CAPABILITY` |
| Allowed proposal types | `validateAiActionProposal` / `isAllowedProposalType` (Agent 1 `AI_ACTION_TYPES`) | `SAFETY_VIOLATION` / `INVALID_OUTPUT` |
| JSON schema shape | `assertJsonSchemaShape` / `validateJsonSchema` | `INVALID_OUTPUT` |
| Provider timeout | `withProviderTimeout` → `mapProviderEdgeError` | `PROVIDER_TIMEOUT` |
| Retry policy | `withProviderRetry` / `invokeProviderSafely` (default 2 attempts, 250ms backoff) | last error → `PROVIDER_ERROR` / `PROVIDER_TIMEOUT` |

Defaults (`getDefaultProviderSafetyPolicy`):

| Constant | Value |
| --- | --- |
| `DEFAULT_PROVIDER_TIMEOUT_MS` | 25_000 |
| `DEFAULT_PROVIDER_MAX_ATTEMPTS` | 2 |
| `DEFAULT_PROVIDER_RETRY_DELAY_MS` | 250 |
| `DEFAULT_MAX_OUTPUT_TOKENS` | 2048 |
| `DEFAULT_MAX_PROMPT_CHARS` | 16_000 |

---

## Rejection paths

| Path | Trigger | Result |
| --- | --- | --- |
| Malformed response | Empty / missing required schema fields / failed contract `parseOutput` | `INVALID_OUTPUT` |
| Unknown action | Proposal `type` not in Agent 1 `AI_ACTION_TYPES` | `rejectUnknownAction` → `SAFETY_VIOLATION` |
| Executable CRM commands | Keys like `execute`, `autoApply`, `crmCommand`, patch keys | `assertNoExecutableCrmCommands` → `SAFETY_VIOLATION` |
| CRM patch shapes | Existing `leadPatch` / `firestorePatch` / … | `assertNoCrmPatch` → `SAFETY_VIOLATION` |
| Non-pending proposal | Status ≠ `PENDING_CONFIRMATION` | `SAFETY_VIOLATION` |
| Any execution attempt | `ensureProposalInert` / `allowWriteIntent` / `blockUnsafeWrite` / Agent 1 `forbidAiActionExecution` | Always blocked (`READ_ONLY`) |

Every validated proposal stays **inert**: `AI_PROPOSAL_REQUIRED_STATUS === PENDING_CONFIRMATION`. There is no commit path in this slice.

---

## Orchestrator edge (additive)

```
run(capabilityId, input)
  … existing contract lookup …
  validateAllowedCapability
  authorizeCapability + assertWritePolicySafe
  assertContextWithinLimit (contract)
  validatePromptSize / assertPromptSize (absolute ceiling)
  invokeProviderSafely(provider.complete)  ← timeout + retry
    request.maxTokens / request.timeoutMs set from policy
  assertOutputTokenUsage
  safetyPostCheck (patch + executable cmds + strip intelligence)
  assertJsonSchemaShape (when completion.json present)
  contract.parseOutput + safetyPostCheck again
```

Stub / Gemini / Factory unchanged — they still implement `AiProvider.complete`; the safety layer wraps the call at the orchestrator.

---

## How to use (proposals)

```ts
import {
  validateAiActionProposal,
  ensureProposalInert,
  AI_ACTION_TYPES,
  AI_ACTION_STATUS,
} from "@/shared/ai";

const gated = validateAiActionProposal(raw);
if (!gated.ok) {
  // unknown type / malformed / executable command / non-pending
}

// Never execute:
ensureProposalInert(gated.value.id); // always blocked
```

---

## Validation (Agent 3)

From `telecaller-app/`:

- `npx tsc --noEmit`
- `npm test -- src/shared/ai/aiPlatform.test.ts --run`

---

## Residuals

| ID | Note | Owner |
| --- | --- | --- |
| R1 | AbortSignal cancellation inside Gemini callable (true cancel) | Future / Agent 0 |
| R2 | Full AJV JSON Schema (beyond required/type shape) | Agent 4 optional |
| R3 | Confirm Dialog + CRM writers — still forbidden | Future auth |
| R4 | Copilot display of proposal rejections | Agent 2 |

---

## Out of scope

- CRM execution / Firestore writers  
- Timeline / Wave 6 intelligence formula changes  
- DLS / `ui-registry.md`  
- Changing StubAiProvider / GeminiProvider / ProviderFactory selection logic  
