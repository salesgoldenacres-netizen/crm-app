# Proposal Execution Architecture

**Scope:** Wave 7 Phase 2D / W7-AI-3  
**App:** `telecaller-app/`  
**Status:** ACTIVE ARCHITECTURE  
**Constraint:** AI never writes directly to Firestore

---

## Goal

Convert approved AI proposals into **human-confirmed CRM mutations** using the existing Wave 6 shared APIs only.

This layer is intentionally thin. It does not own business rules already captured elsewhere in the CRM. It validates proposals, enforces confirmation/idempotency, and routes execution to the already-approved mutation surfaces.

---

## Layers

### 1. Proposal contract layer

Location:

- `src/shared/ai/contracts/confirmWriteContracts.ts`

Responsibilities:

- define the allowed W7-AI-3 proposal types
- lock proposal payloads to `PENDING_CONFIRMATION`
- parse proposal payloads safely
- stay inert at the AI boundary

This layer contains **no CRM write logic**.

### 2. Prompt/runtime layer

Locations:

- `src/shared/ai/PromptRegistry.ts`
- `src/shared/ai/types.ts`

Responsibilities:

- allow `lead-brief-v1` to return optional `proposals`
- keep the provider contract structured and versioned
- preserve the AI-off default and provider abstraction

### 3. Execution layer

Location:

- `src/shared/ai/execution/proposalExecution.ts`

Responsibilities:

- validate proposal shape against the active lead
- reject unsupported, expired, duplicate, empty, illegal, or stale proposals
- require explicit human confirmation
- apply idempotency
- look up the correct execution handler from a registry
- return structured audit metadata

This is the only W7-AI-3 layer that may trigger CRM mutations, and it does so **only through existing shared APIs**.

### 4. Presentation layer

Locations:

- `src/features/leads/copilot/ProposalRenderer.tsx`
- `src/features/leads/copilot/ConfirmActionDialog.tsx`
- `src/features/leads/copilot/SalesCopilotDrawer.tsx`

Responsibilities:

- show reviewable proposal summaries
- collect human confirmation
- display execution outcomes
- never mutate CRM state directly

---

## Approved proposal set

Only these five types execute in W7-AI-3:

- `STATUS_CHANGE`
- `PRIORITY_CHANGE`
- `FOLLOW_UP`
- `ADD_NOTE`
- `RECOMMEND_ASSIGNMENT`

Everything else is out of scope and rejected.

---

## Execution registry

The executor does not hardcode a growing UI-side switch. It resolves handlers from a tiny registry:

```text
STATUS_CHANGE         -> executeStatusProposal()
PRIORITY_CHANGE       -> executePriorityProposal()
FOLLOW_UP             -> executeFollowUpProposal()
ADD_NOTE              -> executeNoteProposal()
RECOMMEND_ASSIGNMENT  -> executeAssignmentProposal()
```

Benefits:

- handler logic stays isolated
- tests can target one proposal type at a time
- future proposal types are additive rather than invasive
- the structure aligns with existing registry patterns already used in the AI surface

---

## Shared API routing

### `STATUS_CHANGE`

Route:

`planStatusTransition(...)` -> `updateLead(...)`

Reason:

- Wave 6 already owns legal status transitions
- status timeline behavior remains centralized

### `PRIORITY_CHANGE`

Route:

`updateLead({ priority })`

Reason:

- manual priority is already a lead-level field
- no new priority architecture is introduced

### `FOLLOW_UP`

Route:

`updateLead({ followUpDate, followUpOn })`

Reason:

- existing shared lead update path already handles follow-up field behavior

### `ADD_NOTE`

Route:

`logCall(... timelineActivity: "note")`

Reason:

- keeps note creation on the existing call log / timeline path
- avoids mutating the lead's freeform `notes` field

### `RECOMMEND_ASSIGNMENT`

Route:

`updateLead({ assignedTo, assignedToName })`

Reason:

- reuses the existing reassignment path
- does not invent a new assignment workflow

---

## Validation rules

Execution-side validation enforces:

- proposal schema must parse
- proposal `leadId` must match the active lead
- proposal id must not already appear in the current execution state
- proposal must not be expired
- status transition must be legal under Wave 6 transition rules
- follow-up date must not be in the past
- note text must not be empty
- assignment must not target the same owner

Failures return structured errors and **no mutation occurs**.

---

## Confirmation and idempotency

### Confirmation

The executor refuses to run when the user has not confirmed the proposal.

Result:

- status: `PENDING_CONFIRMATION`
- no shared API call
- no mutation

### Idempotency

The drawer tracks:

- proposals currently being confirmed
- proposals already executed in the current client session

Duplicate work returns safe outcomes instead of mutating again:

- `DUPLICATE_CONFIRMATION`
- `DUPLICATE_EXECUTION`

This is intentionally memory-only in Phase 2D.

---

## Audit object

`ProposalExecutionAudit` is returned for every executor outcome.

Fields:

- `proposalId`
- `proposalType`
- `leadId`
- `createdAt`
- `confirmedAt`
- `confirmedBy`
- `executionResult`
- `executionDurationMs`
- `idempotencyKey`

The audit object is not persisted in Firestore in this phase.

---

## Explicit non-goals

- no direct Firestore writes from AI code
- no AI-owned timeline publishing
- no autonomous/background/scheduled execution
- no new collections
- no dashboard/manager/predictive/knowledge execution UI
- no WhatsApp/email/task execution
- no DLS/routing/auth changes

---

## Result

W7-AI-3 keeps the AI layer proposal-oriented while allowing a narrowly approved set of CRM mutations to execute safely after human confirmation, through the same shared deterministic APIs the rest of the CRM already relies on.
