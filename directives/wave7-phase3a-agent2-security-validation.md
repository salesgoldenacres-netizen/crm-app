# Wave 7 Phase 3A - Agent 2 Security Validation

**Date:** 2026-07-14  
**Scope:** Re-validation after remediation work from Agents 0 and 1  
**Repository:** `telecaller-app/`  
**Result:** **FAIL**

---

## Executive summary

This re-validation remains **FAIL**.

I first performed the required bounded recheck for Phase 3A remediation artifacts. The upstream Phase 3A directive files were still absent during the recheck window, but the relevant code changes were present in `src/shared/ai/` and `src/features/leads/copilot/`, so the audit proceeded against the post-fix code state.

The original critical backend trust-boundary blocker is **not resolved**. The callable AI edge in `functions/ai/complete.js` still behaves as an authenticated generic LLM proxy and still trusts caller-supplied `system`, `messages`, `responseFormat`, `maxTokens`, and `model` inputs instead of deriving a server-enforced Wave 7 contract.

Separately, the new confirm-to-write path is materially safer than before: proposals stay `PENDING_CONFIRMATION`, the UI requires explicit review/confirm, the executor rejects `confirmed: false`, AI is still disabled by default, and no direct Firestore writes were found in the reviewed Wave 7 AI/copilot product path. However, proposal acceptance is still not fully safe because assignment proposals accept arbitrary `assignedTo` values and follow-up proposals accept malformed future-looking date strings.

---

## PASS / FAIL

**FAIL**

---

## Findings ordered by severity

### 1. Critical: original backend trust-boundary blocker remains open

**Status:** Unresolved  
**Severity:** Critical

The prior critical finding from `directives/wave7-agent2-security-review.md` is still present in the current code.

Evidence in the current post-fix state:

- `functions/index.js` still exports `aiComplete` as a callable Wave 7 AI entrypoint.
- `functions/ai/complete.js` still:
  - checks only authentication, `capabilityId`, and non-empty `messages`
  - accepts caller-supplied `system`
  - accepts caller-supplied `messages`
  - accepts caller-supplied `responseFormat`
  - accepts caller-supplied `maxTokens`
  - accepts caller-supplied `model`
  - forwards those values to Gemini
- No server-side capability allowlist, prompt-contract derivation, role gate, prompt validation/redaction, executable-command rejection, or proposal-inert enforcement was found at the callable boundary.

Why this still fails:

- The actual trust boundary is the server callable, not the client orchestrator.
- An authenticated caller can still bypass `src/shared/ai/AiOrchestrator.ts`, `src/shared/ai/SafetyGuard.ts`, and `src/shared/ai/safetyUtils.ts` by invoking `aiComplete` directly.
- That means the backend still exposes generic paid-provider access instead of an enforced Wave 7 capability boundary.

Validation outcome for the original blocker:

- **FAIL**
- **Original trust-boundary blocker resolved? No**

### 2. Medium: assignment proposals still trust arbitrary AI-supplied assignee ids

**Status:** Open  
**Severity:** Medium

The new confirm-to-write execution layer does not verify that `RECOMMEND_ASSIGNMENT` targets an allowlisted assignee.

Evidence:

- `src/shared/ai/execution/proposalExecution.ts` only validates that `assignedTo` is non-empty and different from the current owner.
- The same file then writes that `assignedTo` value through `updateLead(...)` during execution.
- `src/features/leads/copilot/SalesCopilotDrawer.tsx` uses `resolveAssigneeName` only for display; it is not an authorization or allowlist check.

Why this matters:

- The AI controls a principal identifier that crosses into a write path after human confirmation.
- A proposal can target an arbitrary user id or stale/non-existent assignee id and still pass validation.
- This is an unsafe proposal-acceptance gap even though the UI confirmation step exists.

### 3. Medium: follow-up proposals still accept malformed date strings

**Status:** Open  
**Severity:** Medium

The follow-up validation checks only that the value is non-empty and lexically not before today.

Evidence:

- `src/shared/ai/contracts/confirmWriteContracts.ts` defines `followUpDate` as any non-empty string.
- `src/shared/ai/execution/proposalExecution.ts` compares `followUpDate` against today's `YYYY-MM-DD` string, but does not validate that the proposal value is itself a real date in the required format.

Why this matters:

- Strings like `"tomorrow"` or other malformed future-looking values can pass the current check.
- That allows bad AI payloads to cross into the shared CRM write path after confirmation.
- This is an unsafe proposal-acceptance issue, not a direct autonomous-write issue.

---

## Validation against requested checkpoints

### No trust-boundary bypass

**FAIL**

The backend callable still allows authenticated callers to bypass the intended Wave 7 capability and prompt boundary by supplying raw provider inputs directly.

### No execution forgery

**PASS on the reviewed product flow**

Evidence reviewed:

- `src/shared/ai/contracts/confirmWriteContracts.ts` locks proposals to `PENDING_CONFIRMATION`.
- `src/shared/ai/execution/proposalExecution.ts` rejects execution when `confirmed` is false.
- `src/features/leads/copilot/SalesCopilotDrawer.tsx` only calls the executor after explicit dialog confirmation.
- The reviewed UI path does not contain a direct autonomous execution path.

Important caveat:

- This is still primarily a client/workflow control, not a separate backend-issued approval primitive.

### No unsafe proposal acceptance

**FAIL**

Assignment proposals accept arbitrary assignee ids, and follow-up proposals accept malformed future-looking date strings.

### Safety gates intact

**PASS**

Evidence reviewed:

- `src/shared/ai/SafetyGuard.ts` still rejects CRM patch keys and executable command keys.
- `src/shared/ai/AiOrchestrator.ts` still allowlists capabilities, enforces write-policy safety, and applies response safety checks before and after parsing.
- `src/features/leads/copilot/secureCopilotOutput.ts` still re-validates and redacts before rendering.

### AI still READ_ONLY until confirmation

**PASS**

Evidence reviewed:

- `src/shared/ai/safetyUtils.ts` still exposes `AI_SAFETY_POSTURE = "READ_ONLY"`.
- `allowWriteIntent()` still always denies.
- `blockUnsafeWrite()` still always blocks.
- `src/shared/ai/types.ts` still keeps `AI_ENABLED = false`.
- `src/shared/ai/PromptRegistry.ts` still keeps `lead-brief-v1` at `writePolicy: "propose"`.
- Confirm-to-write actions remain pending until explicit human confirmation in the drawer flow.

### No direct Firestore writes

**PASS for the reviewed Wave 7 AI/copilot path**

Evidence reviewed:

- No direct Firestore client writes were found in `src/shared/ai/` or `src/features/leads/copilot/`.
- `SalesCopilotDrawer` routes confirmed actions through injected shared APIs (`updateLead`, `logCall`) rather than importing Firestore write APIs directly.
- `functions/ai/complete.js` does not persist prompts or AI output to Firestore.

---

## Tooling and validation evidence

Commands run during this re-validation:

- `npm test -- src/shared/ai/ src/features/leads/copilot/` -> **FAIL**
  - one failing assertion in `src/shared/ai/ProviderFactory.test.ts`
  - one unhandled timeout error reported from `src/shared/ai/aiPlatform.test.ts`
- `npm run lint` -> **FAIL**
  - includes a lint error in `src/features/leads/copilot/SalesCopilotDrawer.tsx`
  - also includes unrelated existing repo lint issues outside this security scope
- `npm run build` -> **PASS**
- `python execution/find_theme_mismatches.py` -> **PASS** (non-security audit output still reports existing theme mismatches)

These results do not change the security verdict. The critical blocker is the unresolved backend trust boundary.

---

## Residual risks

- The client-side normal flow is safer, but server-side provider access still trusts the caller too much.
- Confirmation is a strong workflow guard, but it is not a substitute for backend trust-boundary enforcement.
- Future callers could still bypass the intended client orchestrator boundary unless the callable itself is hardened.
- Proposal validation remains weaker than required for fields that carry identifiers or date values into the write path.

---

## Blockers

1. `functions/ai/complete.js` still does not enforce the Wave 7 backend capability/safety boundary.
2. Assignment proposals still accept arbitrary assignee ids.
3. Follow-up proposals still accept malformed future-looking date strings.

---

## Recommendation

**NO-GO**

Do not treat Wave 7 Phase 3A security as complete.

Required next actions before this can pass:

1. Harden `aiComplete` so the server derives and enforces the capability contract instead of trusting raw caller-supplied prompt/provider fields.
2. Add execution-side allowlist validation for assignment targets.
3. Add strict date-format validation for follow-up proposals.
4. Re-run this security validation after those fixes land.
