# Provider Architecture — Wave 7 Phase 2C

**Status:** Active architecture for the Wave 7 AI surface  
**Date:** 2026-07-14  
**App:** `telecaller-app/`  
**Scope:** Stub or Gemini selection, key custody, callable proxy, runtime boundaries

---

## Purpose

Wave 7 AI features must consume a **single shared provider abstraction**. Feature code never imports vendor SDKs, never owns API keys, and never bypasses the orchestrator. Phase 2C introduces the live Gemini path while preserving the same `@/shared/ai` interface used in earlier phases.

---

## Components

| Layer | File | Responsibility |
| --- | --- | --- |
| Feature | `src/features/leads/copilot/SalesCopilotDrawer.tsx` | Calls `createAiRuntime()` only |
| Runtime | `src/shared/ai/AiRuntime.ts` | Builds orchestrator from flags + provider factory |
| Factory | `src/shared/ai/ProviderFactory.ts` | Chooses `stub` or `gemini` |
| Provider | `src/shared/ai/GeminiProvider.ts` | Client adapter; invokes Firebase callable |
| Orchestrator | `src/shared/ai/AiOrchestrator.ts` | Prompt routing + shared safety + parse pipeline |
| Server proxy | `functions/ai/complete.js` | Calls Gemini REST with server-side key |
| Functions entrypoint | `functions/index.js` | Exports `aiComplete` callable |

---

## Selection rules

```
createAiRuntime()
  ↓
createAiProvider({ kind?, forceStub?, aiEnabled? })

1. forceStub === true                      → stub
2. explicit kind set to gemini/stub        → that provider
3. aiEnabled === false                     → stub
4. VITE_AI_PROVIDER in { gemini, live }    → gemini
5. else                                    → stub
```

| Condition | Provider | Notes |
| --- | --- | --- |
| AI disabled | stub | Product still fails closed |
| AI enabled, env unset | stub | Safe default |
| AI enabled, `VITE_AI_PROVIDER=stub` | stub | Explicit dev stub |
| AI enabled, `VITE_AI_PROVIDER=gemini` | gemini | Live callable-backed path |
| AI enabled, `VITE_AI_PROVIDER=live` | gemini | Alias for live Gemini |

---

## Key custody

| Surface | Allowed | Forbidden |
| --- | --- | --- |
| Client app | Callable invocation only | Vendor SDK secrets, browser API keys |
| Firebase Functions | `GEMINI_API_KEY` or `GOOGLE_AI_API_KEY` | Returning raw secret data to client |
| Feature folders | `@/shared/ai` imports | Direct callable/vendor integration |

**Rule:** keys stay server-side only.

---

## Request flow

```
Feature UI
  ↓
createAiRuntime()
  ↓
ProviderFactory
  ↓
GeminiProvider.complete(...)
  ↓
httpsCallable(functions, "aiComplete")
  ↓
functions/ai/complete.js
  ↓
Gemini REST API
  ↓
structured response
  ↓
AiOrchestrator parse + safety + audit
```

The stub path uses the same orchestrator route, just with `StubAiProvider` instead of `GeminiProvider`.

---

## Env reference

| Variable | Location | Purpose |
| --- | --- | --- |
| `AI_ENABLED` | client compile-time | Master default; remains `false` |
| `VITE_AI_ENABLED` | client env | Non-prod enablement override |
| `VITE_AI_PROVIDER` | client env | `stub`, `gemini`, or `live` |
| `GEMINI_API_KEY` | Functions env | Gemini server-side key |
| `GOOGLE_AI_API_KEY` | Functions env | Alternate Gemini server-side key |

---

## Failure behavior

| Failure | Result |
| --- | --- |
| Missing server key | Callable throws failed-precondition; provider maps to safe unavailable error |
| Unauthenticated caller | Callable rejects |
| Provider timeout | Mapped to `PROVIDER_TIMEOUT` |
| Retryable transient error | Wrapped by provider retry policy |
| Invalid / empty model output | Orchestrator returns `INVALID_OUTPUT` |

All failures are expected to **fail closed** and preserve the Wave 6 rules fallback path in Copilot.

---

## Non-goals

- No vendor SDK in product feature folders
- No client-side Gemini key path
- No CRM execution inside provider or proxy
- No prompt/response persistence in Firestore
- No parallel AI runtime architecture outside `@/shared/ai`

---

## STOP

Use this architecture for Wave 7 AI runtime work only. Do not introduce proposal execution, confirm/apply UI, or any alternate provider path without explicit authorization.
