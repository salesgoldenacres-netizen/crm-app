# Wave 7 Phase 3A - Agent 1 Provider Remediation

**Status:** PASS  
**Date:** 2026-07-14  
**Scope:** Live-provider reliability/performance remediation only (`timeout`, `retry`, graceful degradation, cancellation/supersession, related tests/docs)

---

## Summary

Phase 3's live-provider blocker is resolved within the current client/runtime scope.

The previous degraded path could leave the drawer loading for about **50.25s** because provider timeouts were retried. The provider safety policy now fails over after a single **8s** timeout, keeps retry only for explicitly transient non-timeout failures, uses exponential backoff, and propagates cancellation/supersession signals through the orchestrator/provider boundary so closed or superseded drawer requests do not continue updating UI state.

---

## What Changed

### 1. Timeout policy

- Reduced the default provider timeout from `25_000ms` to `8_000ms`.
- Stopped retrying timeout failures.
- Preserved graceful fallback behavior so provider failures still degrade to the safe rules brief without leaking provider details.

### 2. Retry policy

- Kept retry support for transient provider failures such as rate-limit / temporary availability issues.
- Switched retry delay behavior to exponential backoff from the configured base delay.
- Prevented retries after abort/cancellation.

### 3. Cancellation and supersession

- Added optional `AbortSignal` plumbing to:
  - `AiRunInput`
  - `AiProvider.complete(...)`
  - `GeminiProvider` invoke path
  - `invokeProviderSafely()`, `withProviderTimeout()`, and `withProviderRetry()`
- Updated `SalesCopilotDrawer` to:
  - abort any in-flight request when the drawer closes
  - abort the previous request before a new retry/open cycle starts
  - ignore stale completions using request token + controller checks

### 4. Test updates

- Updated provider tests for the current backend-facing `GeminiProvider` invoke payload shape.
- Added focused tests for:
  - exponential backoff
  - no retry after timeout
  - retry-sleep cancellation
  - orchestrator abort propagation
  - drawer abort signal wiring
  - drawer close-time cancellation

---

## Files Changed

- `telecaller-app/src/shared/ai/AiProvider.ts`
- `telecaller-app/src/shared/ai/AiOrchestrator.ts`
- `telecaller-app/src/shared/ai/GeminiProvider.ts`
- `telecaller-app/src/shared/ai/SafetyGuard.ts`
- `telecaller-app/src/shared/ai/ProviderFactory.test.ts`
- `telecaller-app/src/shared/ai/aiPlatform.test.ts`
- `telecaller-app/src/shared/ai/safetyUtils.ts`
- `telecaller-app/src/shared/ai/types.ts`
- `telecaller-app/src/features/leads/copilot/SalesCopilotDrawer.tsx`
- `telecaller-app/src/features/leads/copilot/SalesCopilotDrawer.test.tsx`
- `directives/wave7-phase3a-agent1-provider.md`

---

## Validation Run

Executed from `telecaller-app/`:

1. `npx tsc --noEmit` -> PASS
2. `npm test -- src/shared/ai/aiPlatform.test.ts src/shared/ai/ProviderFactory.test.ts src/features/leads/copilot/SalesCopilotDrawer.test.tsx` -> PASS (`90/90`)
3. `npx eslint src/shared/ai/AiProvider.ts src/shared/ai/GeminiProvider.ts src/shared/ai/AiOrchestrator.ts src/shared/ai/safetyUtils.ts src/shared/ai/types.ts src/shared/ai/aiPlatform.test.ts src/shared/ai/ProviderFactory.test.ts src/features/leads/copilot/SalesCopilotDrawer.tsx src/features/leads/copilot/SalesCopilotDrawer.test.tsx` -> PASS
4. `npm run build` -> PASS

Notes:

- npm still prints the existing `Unknown env config "devdir"` warning.
- Build still reports the existing chunk-size warning; this is not part of the live-provider blocker.

---

## Live-Provider Blocker Status

### Blocking issue 1: ~50.25s degraded-path wait

**Resolved**

- Previous behavior: `25s` timeout x `2` attempts + retry delay kept the drawer loading for about `50.25s`.
- Current behavior: timeout falls back after a single `8s` timeout, with no timeout retry stacking.

### Blocking issue 2: overlapping uncancelled timed-out work

**Resolved within current scope**

- Timeout failures no longer trigger a second attempt, removing the documented timeout-overlap retry pattern.
- Drawer close/retry/open supersession now aborts the prior request path and suppresses stale completions.

---

## Residuals

- Firebase callable transport still does not provide a guaranteed hard transport abort from this browser-side path, so cancellation is best-effort at the runtime/UI boundary. This is no longer a blocker for the Phase 3 live-provider wait/overlap issue because:
  - timeout paths no longer retry
  - superseded requests are aborted/ignored before they can win the UI race
- Full backend trust-boundary enforcement remains owned by Agent 0 and is intentionally untouched here beyond compatibility with the landed invoke signature/context forwarding.

---

## Blockers

- None remaining in this provider reliability/performance slice.

---

## PASS / FAIL

**PASS**

The documented Phase 3 live-provider reliability/performance blocker is remediated for the current provider/runtime path without redesigning the provider abstraction or broadening scope.
