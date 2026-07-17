# Confirm-to-Write Contract — Wave 7 Phase 2C

**Status:** Active contract surface  
**Date:** 2026-07-14  
**Module:** `telecaller-app/src/shared/ai/contracts/confirmWriteContracts.ts`  
**Scope:** Proposal-only AI action contracts; no execution

---

## Purpose

Phase 2C allows AI to describe **possible CRM-shaped actions** without permitting the AI layer to execute them. The contract layer defines what a proposal looks like, how it is validated, and how the system keeps every proposal **inert** until a future, separately authorized commit path exists.

---

## Core rule

Every AI write proposal in Phase 2C is locked to:

`PENDING_CONFIRMATION`

There is no executed, committed, or auto-applied state in this phase.

---

## Main types

| Type | Purpose |
| --- | --- |
| `AiActionProposal` | Typed AI suggestion with payload and `PENDING_CONFIRMATION` status |
| `AiConfirmationRequest` | Human-facing confirmation envelope around a proposal |
| `PendingAiAction` | Queue-shaped wrapper holding proposal + confirmation |
| `AiActionResult` | Validation/proposal result; success is still pending only |

---

## Supported proposal types

| Type | Required payload |
| --- | --- |
| `UPDATE_STATUS` | `toStatus` |
| `SCHEDULE_FOLLOW_UP` | `followUpDate` |
| `ADD_NOTE` | `noteText` |
| `DRAFT_WHATSAPP` | `messageBody` |
| `DRAFT_EMAIL` | `subject`, `body` |

Optional metadata such as `fromStatus`, `followUpTime`, `rationale`, `templateId`, and `leadId` may also be carried depending on the proposal type.

---

## Lifecycle guarantees

| Guarantee | Enforced by |
| --- | --- |
| Only supported action types are accepted | `isSupportedAiActionType`, schema discrimination |
| Status is always pending | `AI_ACTION_STATUS`, `createAiActionProposal`, schema literal |
| Non-pending proposals are rejected | `parseAiActionProposal`, validation helpers |
| Proposals can be wrapped for confirmation UI later | `createAiConfirmationRequest`, `createPendingAiAction` |
| Execution is forbidden | `forbidAiActionExecution` |

---

## Exported helpers

| Helper | Role |
| --- | --- |
| `createAiActionProposal` | Build a typed proposal locked to pending |
| `parseAiActionProposal` | Validate raw proposal payload |
| `createAiConfirmationRequest` | Build confirmation envelope |
| `createPendingAiAction` | Wrap proposal plus confirmation |
| `proposeAiActionResult` | Return successful pending result |
| `rejectAiActionProposal` | Return structured failure |
| `forbidAiActionExecution` | Explicit hard-stop for execution |

These helpers are re-exported via `@/shared/ai`.

---

## Safety relationship

This contract works with the Phase 2C safety layer:

- `validateAiActionProposal(...)` ensures the shape is allowed
- `ensureProposalInert(...)` preserves the read-only posture
- `allowWriteIntent(...)` and `blockUnsafeWrite(...)` deny execution attempts

Together, the contract and safety layers ensure that a proposal can be **shown** and **validated**, but not **committed**.

---

## Non-goals

- No CRM writer integration
- No Firestore persistence requirement
- No confirm dialog UI
- No status transition execution
- No WhatsApp or email send path
- No auto-apply behavior

---

## Validation

Fresh Phase 2C validation covered:

- `src/shared/ai/contracts/confirmWriteContracts.test.ts`
- targeted AI suite run with `aiPlatform.test.ts` and `ProviderFactory.test.ts`
- `npx tsc --noEmit`
- `npm run build`

Result: **PASS** on 2026-07-14.

---

## STOP

This contract is proposal-only. Do not add execution states, commit helpers, or CRM apply behavior without explicit authorization for the next Wave 7 gate.
