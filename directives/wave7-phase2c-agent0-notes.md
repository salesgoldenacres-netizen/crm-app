# Wave 7 Phase 2C — Agent 0 Notes (Live Provider Integration)

**Status:** Implemented — stub + Gemini-via-Cloud-Function  
**Date:** 2026-07-14  
**Agent:** Agent 0 (Architecture Owner — shared AI only)  
**Module:** `telecaller-app/src/shared/ai/`  
**Import:** `@/shared/ai`  
**Gate:** `AI_ENABLED = false` (unchanged). Live path is opt-in via env + factory.

**STOP (not done here):** confirm-to-write (Agent 1), Copilot UI (Agent 2), safety extensions (Agent 3), docs Agent 5.

---

## What shipped

| File | Role |
| --- | --- |
| `GeminiProvider.ts` | `AiProvider` adapter — calls callable `aiComplete` (no vendor SDK, no client keys) |
| `ProviderFactory.ts` | Selects stub vs gemini from flags/env |
| `AiRuntime.ts` | `createAiRuntime()` — `isAiEnabled()` + factory → orchestrator |
| `AiOrchestrator.ts` | Default provider now via `createAiProvider()` (injected provider still wins) |
| `functions/ai/complete.js` | Server Gemini REST proxy; fail-closed without `GEMINI_API_KEY` |
| `functions/index.js` | Exports `aiComplete` callable |
| `ProviderFactory.test.ts` | Factory + Gemini invoke + runtime wiring tests |

**Unchanged for other agents:** orchestrator `run()` contract, prompt registry, safety posture, Copilot feature code, Timeline, Wave 6 intelligence, DLS, routing, auth.

---

## Factory selection rules

```
createAiProvider({ kind?, forceStub?, aiEnabled?, gemini? })

1. forceStub === true           → StubAiProvider
2. kind explicitly set          → that kind (stub | gemini)
3. aiEnabled === false
   (default: isAiEnabled())     → StubAiProvider
4. VITE_AI_PROVIDER in
   { gemini, live }             → GeminiProvider
5. else                         → StubAiProvider  (safe default)
```

| Condition | Provider | Orchestrator `source` on success |
| --- | --- | --- |
| AI off | stub | (run returns `AI_DISABLED`) |
| AI on, env unset / `stub` | stub | `stub` |
| AI on, `VITE_AI_PROVIDER=gemini` or `live` | gemini | `llm` |
| Tests inject `provider` | injected | `stub` if id=`stub`, else `llm` |

Helpers: `resolveAiProviderKind`, `parseAiProviderEnvValue`, `isLiveAiProviderConfigured`.

---

## How Agents 1–3 should call AI

**Preferred (product):**

```ts
import {
  createAiRuntime,
  LEAD_BRIEF_V1_ID,
  isAiEnabled,
} from "@/shared/ai";

const orch = createAiRuntime(); // enabled: isAiEnabled(), provider: factory
const result = await orch.run(LEAD_BRIEF_V1_ID, { leadId, role, context });
```

**Compatible (existing Copilot):**

```ts
createAiOrchestrator({ enabled: isAiEnabled() })
```

Still valid. With no `provider` arg, factory selects stub vs gemini the same way (using the `enabled` value you pass).

**Do not:** import Gemini SDK, put API keys in Vite env, call `aiComplete` from feature folders, or bypass the orchestrator.

---

## Key-handling approach

| Layer | Keys |
| --- | --- |
| Client (`GeminiProvider`) | **None.** Invokes Firebase callable `aiComplete` only |
| Server (`functions/ai/complete.js`) | `process.env.GEMINI_API_KEY` or `GOOGLE_AI_API_KEY` |
| Missing server key | Callable throws `failed-precondition` → provider Error → orchestrator `PROVIDER_ERROR` (fail closed) |
| Persistence | **None** — proxy does not write prompts/responses/Firestore AI collections |

### Ops (before live use)

1. Set Functions secret/env: `GEMINI_API_KEY=<server key>`  
2. Deploy functions (`aiComplete`)  
3. Non-prod client: `VITE_AI_ENABLED=true` and `VITE_AI_PROVIDER=gemini`  
4. Keep `AI_ENABLED=false` in code until product authorizes production on

**Residual:** There is no client-key path in this slice. If someone later adds a direct browser Gemini call, that must be rejected before prod — keys stay server-side only.

---

## Flow (Stub → Factory → Live → Structured Output)

```
isAiEnabled / createAiRuntime
        ↓
ProviderFactory (stub | gemini)
        ↓
AiOrchestrator.run(capabilityId, input)
        ↓
prompt + safety pre-check
        ↓
provider.complete  →  stub fixture  OR  aiComplete → Gemini REST
        ↓
safety post-check + contract.parseOutput
        ↓
AiCapabilityResult { source: "stub" | "llm", data }
```

---

## Env reference

| Variable | Where | Purpose |
| --- | --- | --- |
| `AI_ENABLED` | `types.ts` | Compile-time master (still `false`) |
| `VITE_AI_ENABLED` | client (non-prod only) | Dev override for `isAiEnabled()` |
| `VITE_AI_PROVIDER` | client | `stub` (default) \| `gemini` \| `live` |
| `GEMINI_API_KEY` | Cloud Functions only | Server Gemini key |

---

## What Agent 2 (Copilot) can rely on

- No Copilot file changes required for this slice.  
- Existing `createAiOrchestrator({ enabled: isAiEnabled() })` picks live automatically when AI on + `VITE_AI_PROVIDER=gemini` and `aiComplete` is deployed.  
- Optional later: switch call sites to `createAiRuntime()` for clearer intent.  
- On provider failure, orchestrator still returns `PROVIDER_ERROR` — keep rules fallback.

---

## What Agent 1 / 3 should not change

- Do not put write tools inside `GeminiProvider` / `aiComplete`.  
- Do not store AI audit payloads in Firestore from the proxy.  
- Confirm-to-write and deeper safety stay in their agent scopes.

---

## Validation (Agent 0)

From `telecaller-app/`:

- `npx tsc --noEmit`
- `npm test -- src/shared/ai/`

Expect existing platform tests + new factory/provider tests green.
