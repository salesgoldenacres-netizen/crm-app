# Wave 7 Phase 3A — Agent 3 Performance Validation

**Date:** 2026-07-14  
**Agent:** Agent 3  
**Scope:** Post-remediation re-test of provider latency, timeout handling, retries, render performance, bundle impact, and drawer responsiveness for the current Wave 7 branch  
**Constraints observed:** Validation-only; no rewrites, no new features, no DLS changes, no Wave 6 architecture changes

---

## Executive Summary

The original Phase 3 degraded-path performance blocker is **resolved in code**. During a bounded recheck loop, Agent 0/1 deliverable docs were not yet present, but the shared AI implementation updated underneath the branch: provider timeout defaults dropped from `25_000ms` to `8_000ms`, timeout failures are no longer retried, `AbortSignal` is now threaded through `AiOrchestrator` to `GeminiProvider`, and the live path now has an abort-aware transport surface.

However, this validation pass is still **FAIL** overall because the post-fix evidence is not fully green. The focused shared-AI test run still fails on one stale `ProviderFactory` expectation and also reports an unhandled `ProviderTimeoutError` from the new timeout path test, which means the remediation is directionally correct but not yet fully validated as reliable.

---

## PASS / FAIL

**FAIL**

Why:

- The primary performance blocker from Phase 3 is removed.
- Fresh production build and typecheck pass.
- But focused shared-AI tests do **not** pass cleanly after remediation.
- The new timeout/cancellation path still shows an unhandled rejection during test execution.

---

## Measurements / Validation Results

### 1. Remediation presence check

Bounded recheck outcome:

- `directives/wave7-phase3a-agent0*.md`: not present during validation
- `directives/wave7-phase3a-agent1*.md`: not present during validation
- Shared AI code **did** update during the bounded loop and was validated in the landed state

Observed landed changes:

- `SafetyGuard.ts`
  - `DEFAULT_PROVIDER_TIMEOUT_MS = 8_000`
  - `DEFAULT_PROVIDER_MAX_ATTEMPTS = 2`
  - `DEFAULT_PROVIDER_RETRY_DELAY_MS = 400`
- `safetyUtils.ts`
  - timeout path now creates/uses an `AbortController`
  - timeout errors are **not** considered retryable
  - abort errors are **not** considered retryable
  - retry backoff is exponential (`400ms`, then doubles per attempt)
- `AiProvider.ts`
  - provider interface now accepts `AiProviderCallOptions` with `signal?: AbortSignal`
- `GeminiProvider.ts`
  - forwards and checks `AbortSignal`
- `AiOrchestrator.ts`
  - passes `signal` into provider completion and rethrows aborts

### 2. Provider latency / degraded-path wait

Previous blocker state from Phase 3:

- `25_000ms` timeout
- `2` attempts
- `250ms` retry delay
- worst-case visible degraded-path wait: about **50.25s**

Current state:

- `8_000ms` timeout
- timeouts are **not retried**
- retry policy still allows `2` attempts for retryable non-timeout transient failures

Validation conclusion:

- The specific degraded timeout path that previously held the drawer for about **50.25s** is no longer present.
- Worst-case timeout-driven wait is now about **8s**, not **50.25s**.

### 3. Timeout handling

Validated via code inspection and focused tests:

- `withProviderTimeout()` now aborts a controller when the timeout fires.
- `invokeProviderSafely()` threads signal state through timeout and retry helpers.
- `AiOrchestrator.run()` passes `input.signal` down to the provider call.
- `GeminiProvider.complete()` checks abort state before invoke and after invoke.

Evidence:

- `npx tsc --noEmit` → **PASS**
- `npm test -- src/shared/ai/aiPlatform.test.ts src/shared/ai/ProviderFactory.test.ts` → **FAIL**

Important nuance:

- The timeout path is architecturally improved.
- But the focused test run still reports an unhandled `ProviderTimeoutError`, so timeout cleanup behavior is not yet fully validated as stable.

### 4. Retries

Current retry behavior from code inspection:

- `isRetryableProviderError()` returns `false` for:
  - timeout errors
  - abort errors
- transient retry still applies to:
  - rate-limit / unavailable / temporary / network / `429` / `503` / `504` style errors
- retry delay is now exponential:
  - attempt 1 retry delay = `400ms`
  - subsequent retries double from there

Validation conclusion:

- The prior timeout-stacking behavior is removed.
- Retry policy is safer than the old path.
- Reliability evidence remains incomplete until the unhandled timeout rejection is fixed and the focused suite is green.

### 5. Render performance

Code-path observations:

- `LeadDetailsPage` still subscribes to timeline events only when the Copilot drawer is open.
- Timeline preload remains capped at `50` events.
- Copilot context still reuses precomputed intelligence where available.
- `SalesCopilotDrawer` keeps offline / AI-off short-circuit paths, so those paths avoid provider work entirely.

Validation evidence:

- `npm test -- src/features/leads/copilot/SalesCopilotDrawer.test.tsx` passed inside the earlier combined targeted run
- No new heavy local render loop or unbounded in-drawer accumulation was found in this validation pass

Assessment:

- Render-path behavior remains acceptable.
- No new render-performance blocker was identified.

### 6. Bundle impact

Fresh production build:

- `npm run build` → **PASS**
- Build time: **2.86s**

Relevant output:

- `LeadDetailsPage-B1Fw9_Zi.js`: **133.95 kB** minified / **36.84 kB gzip**
- `index-D8pe9p2O.js`: **381.67 kB** minified / **117.09 kB gzip**
- `firebase-CwsC6LhM.js`: **561.88 kB** minified / **169.57 kB gzip**

Comparison to prior Phase 3 performance report:

- `LeadDetailsPage` route chunk was previously **132.37 kB** / **36.36 kB gzip**
- Current route chunk is slightly larger, not smaller

Assessment:

- Bundle impact did **not** improve in this pass.
- This remains a residual optimization area, not the original blocking issue.

### 7. Drawer responsiveness

Observed state:

- Offline and AI-off paths still avoid provider calls and fall back to rules quickly.
- The major degraded-path loading blocker is reduced from about `50.25s` to about `8s`.
- `LeadDetailsPage` still statically imports `SalesCopilotDrawer`; no lazy split was added.

Assessment:

- Degraded-path drawer responsiveness is materially improved.
- First-load route payload responsiveness is not improved because the drawer is still not lazy-loaded.

---

## Whether the ~50.25s Degraded-Path Blocker Is Resolved

**Yes.**

The exact Phase 3 blocker is resolved:

- timeout default reduced from `25_000ms` to `8_000ms`
- timeout failures are no longer retried
- provider calls now receive abort signals

The drawer should no longer remain in loading for about **50.25s** on timeout-driven degradation.

---

## Residuals

- `LeadDetailsPage` still statically imports the Copilot drawer, so route bundle pressure remains.
- `LeadDetailsPage` route chunk is slightly larger than in the prior performance report.
- The validation pass did not add browser-side microbenchmarks or direct open-to-ready telemetry.
- `npm run lint` is not green overall; several pre-existing workspace issues remain, and `GeminiProvider.ts` now also reports a `preserve-caught-error` lint failure.

---

## Blockers

- **Validation blocker:** `npm test -- src/shared/ai/aiPlatform.test.ts src/shared/ai/ProviderFactory.test.ts` is still failing.
- **Reliability blocker:** the focused test run reports an unhandled `ProviderTimeoutError` from the new timeout path.
- **Test maintenance blocker:** `ProviderFactory.test.ts` still expects the old live invoke signature and fails after the new optional `options` argument was added.

---

## Recommendation

Keep the original Phase 3 performance blocker marked as **resolved**, but do **not** mark this Phase 3A validation slice complete yet.

Recommended next action:

1. Fix the remaining timeout-path unhandled rejection in the shared-AI tests.
2. Update stale `ProviderFactory` expectations for the new provider call signature.
3. Re-run the focused shared-AI tests and keep the build/typecheck evidence.
4. Treat lazy-loading of the Copilot drawer as a non-blocking follow-up optimization, not as part of the original blocker closure.

---

## Command Evidence

From `telecaller-app/` during this validation pass:

- `npx tsc --noEmit` → **PASS** (rerun after landed remediation)
- `npm run build` → **PASS** in **2.86s**
- `npm test -- src/shared/ai/aiPlatform.test.ts src/shared/ai/ProviderFactory.test.ts src/features/leads/copilot/SalesCopilotDrawer.test.tsx` → **FAIL** (`89/90` tests passed; `ProviderFactory.test.ts` failure + timeout-path unhandled rejection)
- `npm test -- src/shared/ai/aiPlatform.test.ts src/shared/ai/ProviderFactory.test.ts` → **FAIL** (`72/73` tests passed; same remaining issues)
- `npm run lint` → **FAIL** (pre-existing workspace lint debt plus `GeminiProvider.ts` caught-error lint issue)
