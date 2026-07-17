# Wave 7 Agent 2 Security Review

Date: 2026-07-14
Scope: Wave 7 AI platform security audit only
Result: FAIL

## Executive summary

Wave 7 AI currently fails security review because the server-side `aiComplete` callable is an authenticated generic LLM proxy, not a server-enforced Wave 7 capability boundary. The frontend/client orchestrator contains meaningful safety controls, but those controls are bypassable by any authenticated caller that invokes the callable directly with arbitrary `system`, `messages`, `responseFormat`, `maxTokens`, and `model` inputs.

Critical issue found: `telecaller-app/functions/ai/complete.js` does not enforce the Wave 7 capability registry, role boundaries, prompt validation/redaction, or contract-derived prompt construction on the server. Because of that, the current architecture trusts the client for controls that should exist at the backend trust boundary.

No evidence was found of direct autonomous CRM writes from the reviewed Wave 7 AI path. The critical failure is instead the missing server-side permission and safety boundary around provider access.

## PASS / FAIL

FAIL

## Findings ordered by severity

### 1. Critical: backend `aiComplete` callable bypasses Wave 7 capability and safety boundaries

Severity: Critical

Evidence:

- `telecaller-app/functions/index.js` exports `aiComplete` as a callable function and documents it as the Wave 7 AI completion proxy.
- `telecaller-app/functions/ai/complete.js` only checks:
  - caller is authenticated
  - `capabilityId` exists and is a string
  - `messages` exists and is a non-empty array
- After that, it forwards caller-supplied `system`, `messages`, `responseFormat`, `maxTokens`, `temperature`, and `model` directly to Gemini.

What is missing server-side:

- no allowlist check against registered Wave 7 capabilities
- no server-side prompt contract lookup
- no server-side role/permission enforcement
- no server-side PII minimization
- no server-side prompt safety validation
- no server-side write-key / executable-command rejection
- no server-side restriction that forces proposals to stay inert
- no server-side model allowlist

Why this is critical:

- The intended Wave 7 safety model lives in client-side code such as `telecaller-app/src/shared/ai/AiOrchestrator.ts`, `telecaller-app/src/shared/ai/SafetyGuard.ts`, and `telecaller-app/src/shared/ai/safetyUtils.ts`.
- An authenticated caller can bypass those client-side checks and call the backend proxy directly.
- That means the backend currently exposes a raw paid LLM capability behind auth, rather than a tightly scoped Wave 7 AI contract.
- This breaks the intended permission boundary and makes prompt-contract restrictions unenforceable at the actual trust boundary.
- It also enables arbitrary prompt use, cost abuse, and provider submission of unsanitized data if a caller sends raw lead/customer content.

Exploit shape:

1. Authenticate as any app user.
2. Invoke `aiComplete` directly instead of going through `AiOrchestrator`.
3. Supply arbitrary `system` instructions and arbitrary `messages`.
4. Bypass Wave 7 capability constraints, prompt registry controls, and client-side safety posture.

Impact:

- permission boundary failure
- prompt-contract bypass
- safety-guard bypass at backend edge
- arbitrary provider usage with server key
- potential PII leakage if unsanitized data is sent

Recommended remediation:

- Stop further Wave 7 AI development until the callable enforces server-side capability boundaries.
- Server must derive prompts from a registered capability contract, not accept caller-supplied `system` prompts.
- Server must restrict `capabilityId` to an allowlist.
- Server must apply backend-side prompt validation/redaction before provider invocation.
- Server must reject unsupported models and unsupported response modes.
- Server must enforce role/permission checks at the callable boundary if capability access is role-scoped.

### 2. Medium: input-side prompt safety utilities exist but are not enforced in the main orchestrator path

Severity: Medium

Evidence:

- `telecaller-app/src/shared/ai/safetyUtils.ts` defines `validatePrompt()` and `redactPII()`.
- `telecaller-app/src/shared/ai/aiPlatform.test.ts` tests those functions.
- `telecaller-app/src/shared/ai/AiOrchestrator.ts` does not call `validatePrompt()` before provider invocation.
- `telecaller-app/src/features/leads/copilot/SalesCopilotDrawer.tsx` passes `contextSlots` directly to the orchestrator.

Why this matters:

- The current product call site uses safe builders, which reduces risk.
- But the platform itself does not enforce prompt validation at the orchestrator boundary.
- A future caller could pass unsanitized or instruction-laden context without hitting `validatePrompt()`.

Impact:

- partial prompt-injection hardening gap
- partial PII leakage hardening gap

### 3. Medium: confirm-to-write boundary is strong in UI flow, but it is not a server-enforced security primitive

Severity: Medium

Evidence:

- `telecaller-app/src/shared/ai/contracts/confirmWriteContracts.ts` locks proposals to `PENDING_CONFIRMATION`.
- `telecaller-app/src/shared/ai/execution/proposalExecution.ts` refuses execution when `confirmed` is false.
- `telecaller-app/src/features/leads/copilot/SalesCopilotDrawer.tsx` only calls `proposalExecutor.execute(...)` after dialog confirmation.
- `telecaller-app/src/features/leads/copilot/SalesCopilotDrawer.test.tsx` covers review/cancel/confirm behavior.

Why this is not the critical issue:

- I found no reviewed path where the AI directly writes to Firestore or silently auto-applies a proposal.
- However, the confirmation gate is a client-side/UI execution contract, not a server-issued confirmation token or immutable backend approval artifact.
- That means the boundary is valid for product flow, but it is not a standalone backend security control.

Impact:

- no direct autonomous write found
- confirmation is strong as workflow control, weaker as trust-boundary control

## Threat areas reviewed

- prompt injection resistance
- malformed proposals
- invalid confirmation flow
- PII leakage
- provider failures
- SafetyGuard coverage
- read-only guarantees
- permission boundaries
- confirm-to-write bypass attempts

## Evidence for SafetyGuard / read-only / confirmation boundaries

The following controls are present and materially reduce risk on the normal product path:

### SafetyGuard and response hardening present

- `telecaller-app/src/shared/ai/SafetyGuard.ts`
  - rejects CRM patch keys
  - rejects executable CRM command keys
  - strips forbidden Wave 6 intelligence override fields
- `telecaller-app/src/shared/ai/AiOrchestrator.ts`
  - allowlists capabilities through `PromptRegistry`
  - checks role authorization when contracts require it
  - rejects forbidden write policies
  - enforces context/prompt/token limits
  - runs post-response safety checks before parse and after parse
- `telecaller-app/src/features/leads/copilot/secureCopilotOutput.ts`
  - re-validates output before rendering
  - redacts PII before UI display
  - withholds unsafe output behind a fixed safe notice

### Read-only / propose-only design present

- `telecaller-app/src/shared/ai/PromptRegistry.ts`
  - `lead-brief-v1` uses `writePolicy: "propose"`
  - allowed tools are empty
  - system prompt explicitly forbids CRM patches, Firestore updates, silent writes, and autonomous workflows
- `telecaller-app/src/shared/ai/safetyUtils.ts`
  - `AI_SAFETY_POSTURE` is `READ_ONLY`
  - `allowWriteIntent()` always denies
  - `blockUnsafeWrite()` always blocks
  - `ensureProposalInert()` maps proposals to execution-forbidden posture
- `telecaller-app/src/shared/ai/contracts/confirmWriteContracts.ts`
  - proposals remain schema-locked to `PENDING_CONFIRMATION`
  - direct AI execution is explicitly forbidden

### Confirmation boundary present in product flow

- `telecaller-app/src/features/leads/copilot/SalesCopilotDrawer.tsx`
  - validates proposals before presenting them
  - requires user review and explicit confirm action
  - routes execution through shared existing CRM APIs only
- `telecaller-app/src/shared/ai/execution/proposalExecution.ts`
  - blocks unconfirmed execution
  - validates lead id, type, expiry, duplicate execution, illegal status transitions, invalid priorities, empty notes, follow-up dates, and assignment collisions

## Confirm-to-write bypass analysis

Reviewed result:

- No direct AI-to-Firestore or AI-to-CRM autonomous write path was found in the Wave 7 Sales Copilot flow.
- Proposal objects are inert by contract.
- Executor rejects `confirmed: false`.
- UI requires an explicit human confirmation click before execution.

Important caveat:

- The confirmation boundary is enforced in client/product flow, not as a separate backend cryptographic or tokenized approval boundary.
- That is not the critical finding here, but it means the confirm step should be treated as a workflow control rather than the sole trust boundary.

Conclusion:

- No confirmed direct confirm-to-write bypass found in the reviewed UI path.
- Boundary is present, but backend trust still depends on the existing shared CRM mutation permissions rather than a Wave 7 specific server approval primitive.

## PII leakage analysis

What is good:

- `telecaller-app/src/shared/ai/context/buildLeadContext.ts` allowlists context fields and explicitly omits full phone, email, address, and full name.
- `telecaller-app/src/shared/ai/context/redact.ts` scrubs phone/email patterns from notes and summaries.
- `telecaller-app/src/shared/ai/context/contextBuilders.test.ts` verifies those omissions and scrubbing behaviors.
- `telecaller-app/src/features/leads/copilot/secureCopilotOutput.ts` redacts PII again before UI rendering.

What fails the audit:

- The backend provider proxy does not apply its own PII minimization/redaction.
- The orchestrator path does not currently enforce `validatePrompt()` before provider invocation.
- Therefore PII minimization depends on caller discipline and current call-site usage, not on the backend trust boundary.

Conclusion:

- Normal Wave 7 Sales Copilot path appears PII-minimized.
- Platform-wide PII protection is incomplete because the provider edge does not enforce that minimization itself.

## Residual risks

- Prompt injection remains a residual model risk even with system instructions and output guards.
- `validatePrompt()` exists but is not wired into the orchestrator execution path.
- The backend callable currently trusts client-supplied prompt construction.
- Confirmation is workflow-enforced, not independently server-attested.

## Blockers

- Critical blocker: server-side `aiComplete` must stop acting as a generic authenticated proxy before further Wave 7 AI development proceeds.

## Recommended remediation if any issue is critical

Yes. A critical issue exists.

Recommended remediation before any further Wave 7 AI development:

1. Move capability enforcement to the backend callable.
2. Accept only a registered `capabilityId` plus approved structured context inputs.
3. Derive the server-side system prompt from the capability registry instead of trusting client-supplied `system`.
4. Enforce backend-side prompt validation/redaction and capability-specific limits.
5. Restrict model selection and response format to approved values.
6. Re-run this security audit after the backend boundary is fixed.

## Final audit decision

FAIL

Critical issue exists: missing server-side capability/safety enforcement at the `aiComplete` backend trust boundary.
