# Wave 7 Phase 3A — Agent 0 Backend Trust-Boundary Remediation

**Date:** 2026-07-14  
**Agent:** Agent 0  
**Status:** **PASS**  
**Scope:** Phase 3 backend trust-boundary blocker only (`aiComplete` hardening, related client transport narrowing, focused tests/docs)  
**Out of scope retained:** new AI features, Copilot redesign, DLS changes, Wave 6 rules/intelligence changes, new proposal types, Manager AI, Memory, Knowledge Search, performance retry/cancellation redesign, production telemetry persistence/runbooks

---

## Verdict

**PASS** — the documented Phase 3 backend trust-boundary production blocker was remediated within scope.

`telecaller-app/functions/ai/complete.js` no longer behaves like a generic authenticated LLM proxy. The callable now accepts only a registered capability plus structured context, derives the prompt/model/response contract on the server, resolves caller role from trusted server-side identity data, enforces server-side ceilings, and validates returned proposals so they stay inert at the callable boundary.

This closes the Phase 3 backend blocker called out by:

- `directives/wave7-phase3-executive-report.md`
- `directives/wave7-agent2-security-review.md`
- `directives/wave7-agent5-production-readiness.md`

---

## Files Changed

| File | Purpose |
| --- | --- |
| `telecaller-app/functions/ai/complete.js` | Replaced generic proxy behavior with server-owned capability boundary, auth/role resolution, prompt construction, request validation, and proposal/output validation |
| `telecaller-app/functions/ai/complete.test.js` | Added focused backend unit tests for callable boundary enforcement |
| `telecaller-app/src/shared/ai/types.ts` | Added optional structured `context` on provider requests |
| `telecaller-app/src/shared/ai/AiOrchestrator.ts` | Passes structured context through to provider layer |
| `telecaller-app/src/shared/ai/GeminiProvider.ts` | Stops sending client-controlled prompt/model/transport knobs to the callable; sends capability + structured context only |
| `telecaller-app/src/shared/ai/ProviderFactory.test.ts` | Updated live-provider transport expectations to match hardened callable contract |
| `directives/wave7-phase3a-agent0-backend.md` | This deliverable |

---

## What Changed

### 1. Server-side authorization moved to the callable boundary

- `aiComplete` still requires authentication.
- The callable now resolves role from trusted server-side sources:
  - `userRoles/{uid}` first
  - `users` lookup by `uid`, then server-known email/username fallbacks
- Inactive users are rejected.
- Capability access is now authorized from server-side identity context rather than trusting any client-declared role.

### 2. The callable is no longer a generic authenticated LLM proxy

- Request payload is narrowed to:
  - `capabilityId`
  - `context`
  - optional `leadId`
- Caller-supplied transport/prompt fields are rejected:
  - `system`
  - `messages`
  - `responseFormat`
  - `jsonSchema`
  - `maxTokens`
  - `temperature`
  - `model`
- Unknown top-level request fields are rejected.

### 3. Prompt contract is server-issued

- Backend now owns a capability registry for the approved Wave 7 scope.
- Only `lead-brief-v1` is allowed.
- The server:
  - checks allowed context field names
  - rejects unsafe/write-like context keys
  - redacts PII server-side
  - renders the user prompt from the registered server template
  - fixes response mode to JSON
  - fixes model to the approved allowlisted model
  - fixes output token ceiling and temperature server-side

### 4. Server-side input ceilings are enforced

- Capability context char ceiling enforced server-side
- Absolute prompt char ceiling enforced server-side
- Approximate input token ceiling enforced server-side

### 5. Proposal / executor trust boundary is enforced at the callable edge

- Provider output is validated server-side before returning to the client.
- Forbidden CRM patch / executable command keys are rejected.
- Intelligence override fields are stripped before output leaves the callable.
- Proposals are validated to remain:
  - one of the approved proposal types only
  - `PENDING_CONFIRMATION` only
  - non-executable / inert
- Proposal `capabilityId` is bound to the active server capability.
- Proposal `source` is normalized to `llm`.
- Proposal `leadId` is bound to the trusted request lead context when provided, preventing provider-side cross-target assumptions.

### 6. Client transport was narrowed to match the backend contract

- Live Gemini client transport no longer sends prompt text, model choice, response mode, or other provider controls to the callable.
- It now sends only the capability plus structured context needed for the backend to build the prompt itself.

---

## Backend Blocker Status

| Required remediation theme | Status | Notes |
| --- | --- | --- |
| server-side authorization | **PASS** | Callable now resolves trusted role server-side before capability use |
| proposal/capability validation on callable | **PASS** | Only registered capability allowed; proposal shapes validated server-side |
| executor trust boundary | **PASS** | Executable/write payload assumptions rejected; proposals remain inert |
| client cannot forge execution payload assumptions at provider boundary | **PASS** | Client transport controls are rejected; backend owns prompt/model/output contract |
| confirm-to-write verified server-side where applicable to callable boundary | **PASS** | Proposal status/type/output gates are re-validated server-side before return |
| proposal integrity / server-issued trust of prompts and capability scope | **PASS** | Prompt rendered from server registry; capability/lead binding normalized server-side |
| authenticated execution only | **PASS** | Auth remains required; unauthorized/inactive users rejected |

**Exact backend blocker status:** **Closed in scope.** `functions/ai/complete.js` no longer operates as a generic authenticated LLM proxy.

---

## Validation Run

From `telecaller-app/`:

| Command | Result |
| --- | --- |
| `npm test -- src/shared/ai/ProviderFactory.test.ts src/shared/ai/aiPlatform.test.ts` | **PASS** — 73/73 |
| `node --test functions/ai/complete.test.js` | **PASS** — 6/6 |
| `npm run build` | **PASS** |
| `npx eslint src/shared/ai/GeminiProvider.ts src/shared/ai/ProviderFactory.test.ts src/shared/ai/AiOrchestrator.ts src/shared/ai/types.ts` | **PASS** |

Additional note:

- Full-repo `npm run lint` still reports **pre-existing unrelated failures** outside this remediation scope (for example `.tmp/*`, `useAuditLogsStore.ts`, `LeadIntelligenceStrip.tsx`, and existing `SalesCopilotDrawer.tsx` hook-rule findings). No new lint errors remain in the files changed for this remediation.

---

## Residuals

These remain outside this backend-blocker remediation slice:

- The Phase 3 timeout/retry/cancellation blocker from Agent 4 is still separate work.
- Durable AI telemetry / alerting / production runbook gaps from Agent 5 are still separate work.
- This remediation does not redesign lead/role access rules or add a new server-issued approval token system; it hardens the existing approved callable boundary and proposal workflow instead.

---

## Blockers

### Backend trust-boundary blockers

None remaining within this scoped remediation.

### Overall Wave 7 Phase 3 blockers still outside this scope

- Live timeout / overlapping retry cancellation path
- Durable AI observability / alerting readiness

Those items do **not** reopen the backend trust-boundary finding, but they still matter for overall Phase 3 go/no-go.

---

## Deliverable Check

| Requirement | Result |
| --- | --- |
| Remediate documented backend trust-boundary blocker | **PASS** |
| Keep scope focused to backend callable / backend AI enforcement / related tests | **PASS** |
| Avoid new AI features / proposal types / Copilot redesign | **PASS** |
| Add/update focused tests | **PASS** |
| Run focused validation | **PASS** |
| Create `directives/wave7-phase3a-agent0-backend.md` | **PASS** |

