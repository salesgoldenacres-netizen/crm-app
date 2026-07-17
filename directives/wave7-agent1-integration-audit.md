# Wave 7 Agent 1 - Integration Audit

## Executive summary

**PASS** - No critical issues found in the current Wave 7 AI integration.

The active product integration stays inside the approved architecture: Lead Detail opens Sales Copilot, Sales Copilot calls `createAiRuntime()`, runtime resolves provider selection through `ProviderFactory`, and confirm-to-write execution routes only through the shared Wave 6 mutation APIs already responsible for timeline side effects. AI remains disabled by default and fails closed when the runtime gate is off, the provider is unavailable, or output fails safety checks.

## PASS / FAIL

**PASS**

## Findings ordered by severity

### Minor

1. Low-level AI constructors remain publicly re-exported from `telecaller-app/src/shared/ai/index.ts`.
   - Current product code does **not** bypass the approved path.
   - The only live UI request path found is `telecaller-app/src/features/leads/copilot/SalesCopilotDrawer.tsx`, which uses `createAiRuntime()`.
   - However, the barrel still exposes `GeminiProvider`, `StubAiProvider`, `createAiProvider`, and `createAiOrchestrator`, so future callers could bypass the preferred product entry point unless review discipline is maintained.

## Architecture trace of the AI request path

### Read path

1. `telecaller-app/src/features/leads/pages/LeadDetailsPage.tsx`
   - Preloads host-owned lead, Wave 6 intelligence, and timeline data.
   - Passes `contextSlots`, `rulesBrief`, `updateLead`, and `logCall` into `SalesCopilotDrawer`.

2. `telecaller-app/src/features/leads/copilot/SalesCopilotDrawer.tsx`
   - Checks `isAiEnabled()` and online status.
   - If AI is on, calls `createAiRuntime()` and then `run(LEAD_BRIEF_V1_ID, ...)`.
   - If AI is off or a safe failure occurs, falls back to `rulesBrief`.

3. `telecaller-app/src/shared/ai/AiRuntime.ts`
   - Resolves `enabled` from `isAiEnabled()`.
   - Resolves provider from `createAiProvider(...)`.
   - Constructs the orchestrator with both values.

4. `telecaller-app/src/shared/ai/ProviderFactory.ts`
   - Fails closed to `stub` when AI is not enabled.
   - Only selects `gemini` when AI is enabled and `VITE_AI_PROVIDER` explicitly requests it.

5. `telecaller-app/src/shared/ai/AiOrchestrator.ts`
   - Looks up the prompt contract.
   - Applies capability, role, write-policy, prompt-size, token, and output safety checks.
   - Calls the provider only after those checks pass.

6. `telecaller-app/src/shared/ai/GeminiProvider.ts`
   - Reaches the live provider only through the Firebase callable `aiComplete`.
   - No client-side API key handling was found.

### Confirm-to-write path

1. `SalesCopilotDrawer.tsx`
   - Filters proposals through `validateProposalForExecution(...)`.
   - Requires explicit user review and confirm dialog interaction before execution.

2. `telecaller-app/src/features/leads/copilot/ConfirmActionDialog.tsx`
   - Provides the human confirmation step; no mutation occurs from the dialog itself.

3. `telecaller-app/src/shared/ai/execution/proposalExecution.ts`
   - Re-validates the proposal.
   - Enforces duplicate-confirmation and duplicate-execution guards.
   - Routes execution through the central registry.

4. Shared Wave 6 APIs
   - `STATUS_CHANGE`, `PRIORITY_CHANGE`, `FOLLOW_UP`, `RECOMMEND_ASSIGNMENT` -> `updateLead(...)`
   - `ADD_NOTE` -> `logCall(..., { timelineActivity: "note" })`

No direct Firestore writes or direct timeline publishing were found in the Copilot feature or shared AI execution layer.

## Reuse of shared APIs

**Verified**

- `LeadDetailsPage.tsx` passes the existing `useLeadsStore()` functions into Copilot instead of introducing new write paths.
- `proposalExecution.ts` reuses `planStatusTransition(...)` for status validation and `updateLead(...)` / `logCall(...)` for all approved proposal types.
- `buildCopilotContext.ts` reuses existing Wave 6 intelligence via `computeLeadIntelligence(...)` and does not introduce a parallel scoring or next-action engine.
- `buildLeadBriefContext.ts` and `buildTimelineContext.ts` are read-only context shapers over existing host-provided data.

Conclusion: shared Wave 6 APIs are reused where required.

## Timeline ownership verification

**Verified**

- Copilot does not query or publish timeline data directly.
- `LeadDetailsPage.tsx` owns timeline loading via `useTimelineEvents(...)` and passes the already-loaded events down.
- `buildTimelineContext.ts` only summarizes supplied events for prompt context.
- Confirmed execution does not call `recordTimelineEvent(...)` directly.
- Timeline side effects remain centralized in `useLeadsStore.ts`, which publishes status, follow-up, assignment, note, and call events through `telecaller-app/src/shared/contracts/timelinePublisher.ts`.

Conclusion: timeline ownership is preserved.

## Feature flag behavior

**Verified**

- `telecaller-app/src/shared/ai/types.ts` keeps `AI_ENABLED = false`.
- `telecaller-app/src/shared/ai/featureFlags.ts` only allows `VITE_AI_ENABLED` to enable AI in non-production builds.
- `ProviderFactory.ts` returns `stub` when AI is not enabled, even if a live provider env is present.
- `SalesCopilotDrawer.tsx` does not call `createAiRuntime()` when AI is disabled; it falls back to Wave 6 rules output instead.
- `AiOrchestrator.ts` returns `AI_DISABLED` immediately when the orchestrator is not enabled.

Conclusion: feature flag behavior fails closed.

## Residuals

1. Public barrel exports in `telecaller-app/src/shared/ai/index.ts` leave room for future architectural drift, even though no current component uses those low-level exports directly.
2. Enforcement that product call sites prefer `createAiRuntime()` is convention- and review-backed, not hard-blocked by module visibility.

## Blockers

None.

## Clear recommendation

Proceed with Wave 7 development on the current branch.

No critical or blocking integration issue was found in this audit. Keep `createAiRuntime()` as the only approved product AI entry point, and preserve the current pattern where all confirmed actions continue to route through `updateLead(...)`, `logCall(...)`, and the shared timeline publishers indirectly through Wave 6 ownership.
