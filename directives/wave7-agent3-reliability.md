# Wave 7 Agent 3 — Reliability & Failure Testing

**Date:** 2026-07-14  
**App:** `telecaller-app/`  
**Scope:** Wave 7 AI reliability and failure handling only  
**Agent:** Agent 3  
**Branch context:** Current Wave 7 branch  

---

## Executive summary

**PASS** — The current Wave 7 AI stack shows solid fail-closed behavior for the reviewed provider, proposal, and UI fallback paths. All required validation commands passed from `telecaller-app`, and the requested failure scenarios are covered by existing code and/or tests without requiring architecture changes.

The branch is reliable enough to continue Wave 7 work, but a few residuals remain around breadth of explicit scenario testing: duplicate proposal rejection is enforced in code but not directly unit-tested, double-click protection relies on both button disabling and duplicate-confirmation guards but lacks a dedicated UI race test, and true provider-side abort/cancellation is still a known residual rather than a fully implemented transport-level cancel.

---

## PASS / FAIL

**PASS**

No critical architectural or reliability blocker was found during this review. The required command suite completed successfully, and the failure paths that do exist generally degrade safely to rules-based UI or reject execution cleanly.

---

## Tooling results

Executed from `telecaller-app/` in PowerShell:

| Command | Outcome | Notes |
| --- | --- | --- |
| `npx tsc --noEmit` | **PASS** | Exit `0`; npm emitted `Unknown env config "devdir"` warning only |
| `npm test` | **PASS** | Exit `0`; Vitest: `16` files passed, `181` tests passed |
| `npm run build` | **PASS** | Exit `0`; Vite production build completed in ~`2.41s`; existing chunk-size warning only |

Non-blocking command-line noise observed on all three commands:

- `npm warn Unknown env config "devdir". This will stop working in the next major version of npm.`

Non-blocking build warning observed:

- Vite chunk-size warning for large production chunks, especially `dist/assets/firebase-*.js`

---

## Reliability scenario results

| Scenario | Result | Evidence | Assessment |
| --- | --- | --- | --- |
| provider timeout | **PASS** | `src/shared/ai/safetyUtils.ts`, `src/shared/ai/AiOrchestrator.ts`, `src/shared/ai/aiPlatform.test.ts` | `withProviderTimeout()` raises `ProviderTimeoutError`, `mapProviderEdgeError()` maps it to `PROVIDER_TIMEOUT`, and orchestrator wiring passes `timeoutMs` through the provider request. |
| network failure | **PASS** | `src/shared/ai/GeminiProvider.ts`, `src/shared/ai/safetyUtils.ts`, `src/shared/ai/ProviderFactory.test.ts`, `src/features/leads/copilot/SalesCopilotDrawer.test.tsx` | Live-provider proxy failures fail closed with sanitized errors; retry logic treats `network`, `ECONNRESET`, `429`, `503`, and `504` as transient; UI falls back safely on provider failure. |
| malformed AI response | **PASS** | `src/shared/ai/AiOrchestrator.ts`, `src/shared/ai/aiPlatform.test.ts`, `src/features/leads/copilot/SalesCopilotDrawer.test.tsx` | Empty output, schema-invalid output, and unsafe output all reject as `INVALID_OUTPUT` or `SAFETY_VIOLATION`, and the UI withholds raw payloads. |
| duplicate proposal | **PASS** | `src/shared/ai/execution/proposalExecution.ts`, `src/features/leads/copilot/SalesCopilotDrawer.tsx` | Duplicate proposal IDs are filtered by `seenProposalIds` during proposal validation before rendering/execution. This is code-covered, though not directly unit-tested. |
| double-click confirm | **PASS** | `src/shared/components/ui/Dialog.tsx`, `src/shared/ai/execution/proposalExecution.ts`, `src/shared/ai/execution/proposalExecution.test.ts` | Confirm button disables while loading, and execution also rejects concurrent confirmation with `DUPLICATE_CONFIRMATION`, providing both UI and execution-layer protection. |
| shared API failure | **PASS** | `src/shared/ai/execution/proposalExecution.test.ts` | A failed shared CRM API call returns `EXECUTION_FAILED` and does **not** mark the proposal executed. |
| offline mode | **PASS** | `src/features/leads/copilot/useOnlineStatus.ts`, `src/features/leads/copilot/useOnlineStatus.test.ts`, `src/features/leads/copilot/SalesCopilotDrawer.test.tsx`, `src/features/leads/copilot/LeadBriefCard.test.tsx` | Offline state skips AI invocation and falls back to Wave 6 rules with explicit offline UI copy. |
| cancelled execution | **PASS** | `src/features/leads/copilot/ConfirmActionDialog.tsx`, `src/features/leads/copilot/SalesCopilotDrawer.test.tsx`, `src/features/leads/copilot/SalesCopilotDrawer.tsx` | User cancel in confirm flow prevents execution; drawer async loading also uses cancellation guards to avoid stale state updates after close/unmount. |
| expired proposal | **PASS** | `src/shared/ai/execution/proposalExecution.ts`, `src/shared/ai/execution/proposalExecution.test.ts` | Expired proposals are rejected with `EXPIRED_PROPOSAL` before execution. |
| feature flag off | **PASS** | `src/shared/ai/featureFlags.ts`, `src/shared/ai/aiPlatform.test.ts`, `src/features/leads/copilot/SalesCopilotDrawer.test.tsx`, `src/features/leads/copilot/LeadBriefCard.test.tsx` | AI is fail-closed by default, unknown capabilities stay off, and UI cleanly falls back to rules-only states when the flag is off. |

---

## Failures or flaky areas

No failing tooling or flaky test behavior was observed in this run.

The weaker areas are coverage depth rather than present failures:

- Duplicate proposal handling is enforced in code, but there is no dedicated unit test asserting `DUPLICATE_PROPOSAL`.
- Double-click confirm protection is strong in implementation, but there is no dedicated UI test that simulates rapid repeated confirm clicks end-to-end.
- Network retry behavior is implemented generically and partially evidenced via transient retry tests, but there is no explicit `"network"`/`ECONNRESET` named test case.

---

## Residuals

- True transport-level provider cancellation is still not fully implemented. Current code cancels UI state updates on close/unmount, but does not propagate an `AbortSignal` into the live provider transport.
- Build remains green, but the Vite chunk-size warning indicates bundle pressure that could affect future reliability/performance work if allowed to grow.
- npm emits the `devdir` config warning on every required command. It did not block this validation, but it should be cleaned up before the next npm major upgrade.

---

## Blockers

**None for this validation pass.**

No critical-stop condition was triggered. I did not find a critical architectural reliability defect requiring immediate halt before additional Wave 7 work.

---

## Recommendation

Proceed with Wave 7 from an Agent 3 reliability perspective.

Recommended follow-up, but not a blocker for this pass:

1. Add a direct unit test for `DUPLICATE_PROPOSAL`.
2. Add an explicit UI test for rapid repeated confirm clicks.
3. Implement true provider abort support when the live transport layer is ready, so cancellation covers the provider call itself and not only UI state suppression.
