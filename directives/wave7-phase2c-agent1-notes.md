# Wave 7 Phase 2C — Agent 1 Notes (Confirm-to-Write Contracts)

**Status:** Implemented — schema only (no execution)  
**Date:** 2026-07-14  
**Agent:** Agent 1 (Confirm-to-Write Contracts)  
**Module:** `telecaller-app/src/shared/ai/contracts/`  
**Import:** `@/shared/ai` (re-exported from Agent 0 barrel)  
**Depends on:** Agent 0 live provider notes (`wave7-phase2c-agent0-notes.md`)

**STOP (not done here):** Copilot UI (Agent 2), safety extensions (Agent 3), CRM commit path, WhatsApp/email send.

---

## What shipped

| File | Role |
| --- | --- |
| `contracts/confirmWriteContracts.ts` | Types + zod schemas + parse/create helpers |
| `contracts/index.ts` | Contracts barrel |
| `contracts/confirmWriteContracts.test.ts` | Schema / pending-status unit tests |
| `shared/ai/index.ts` | Re-exports contracts only (no provider/orchestrator edits) |

**Not modified:** `GeminiProvider`, `ProviderFactory`, `AiRuntime`, `AiOrchestrator`, PromptRegistry, SafetyGuard logic, Copilot UI, Timeline, Wave 6 intelligence, DLS, routing, auth.

---

## Contracts

| Type | Purpose |
| --- | --- |
| `AiActionProposal` | Discriminated propose-only intent (`type` + `payload`); **status always `PENDING_CONFIRMATION`** |
| `AiConfirmationRequest` | Human-confirm envelope around a proposal (no commit) |
| `PendingAiAction` | Queue item: `{ proposal, confirmation, status: PENDING_CONFIRMATION }` |
| `AiActionResult` | Propose/validate outcome — success still `PENDING_CONFIRMATION`; failures use error codes |

### Supported proposal types

| `AI_ACTION_TYPES` | Payload fields |
| --- | --- |
| `UPDATE_STATUS` | `toStatus` (required), `fromStatus?`, `rationale?` |
| `SCHEDULE_FOLLOW_UP` | `followUpDate` (required), `followUpTime?`, `rationale?` |
| `ADD_NOTE` | `noteText` (required), `noteKind?` |
| `DRAFT_WHATSAPP` | `messageBody` (required), `templateId?` |
| `DRAFT_EMAIL` | `subject` + `body` (required) |

### Lifecycle lock

- `AI_ACTION_STATUS.PENDING_CONFIRMATION` is the **only** allowed proposal status in Phase 2C schemas.
- Parsers reject any other status (e.g. `EXECUTED`).
- `forbidAiActionExecution()` always returns `EXECUTION_FORBIDDEN` — there is no commit helper.

---

## How to use

```ts
import {
  AI_ACTION_TYPES,
  createAiActionProposal,
  createPendingAiAction,
  proposeAiActionResult,
  forbidAiActionExecution,
  parseAiActionProposal,
} from "@/shared/ai";

const proposal = createAiActionProposal({
  id: "prop-1",
  type: AI_ACTION_TYPES.SCHEDULE_FOLLOW_UP,
  title: "Schedule follow-up",
  createdAt: new Date().toISOString(),
  leadId: "lead-123",
  payload: { followUpDate: "2026-07-16" },
});
// proposal.status === "PENDING_CONFIRMATION"

const pending = createPendingAiAction({
  proposal: proposal!,
  requestedAt: new Date().toISOString(),
});

const result = proposeAiActionResult(proposal!);
// result.ok && result.status === "PENDING_CONFIRMATION"

forbidAiActionExecution(proposal!.id);
// always { ok: false, error.code: "EXECUTION_FORBIDDEN" }
```

**Do not:** call CRM writers, Firestore, or messaging send APIs from this module. Agent 2 must not add write buttons yet.

---

## Exports (from `@/shared/ai`)

**Constants:** `AI_ACTION_TYPES`, `AI_ACTION_TYPE_VALUES`, `AI_ACTION_STATUS`, `AI_ACTION_PENDING_STATUS`

**Schemas:** `aiActionProposalSchema`, `aiConfirmationRequestSchema`, `pendingAiActionSchema`, `aiActionResultSchema`, `aiActionPayloadByTypeSchema`

**Helpers:** `parseAiActionProposal`, `parseAiConfirmationRequest`, `parsePendingAiAction`, `parseAiActionResult`, `createAiActionProposal`, `createAiConfirmationRequest`, `createPendingAiAction`, `proposeAiActionResult`, `rejectAiActionProposal`, `forbidAiActionExecution`, `isSupportedAiActionType`, `isPendingConfirmation`, `makeAiActionProposalError`

**Types:** `AiActionProposal`, `AiActionResult`, `AiConfirmationRequest`, `PendingAiAction`, `AiActionType`, `AiActionStatus`, payload types, `CreateAiActionProposalInput`, error types

---

## Validation (Agent 1)

From `telecaller-app/`:

- `npx tsc --noEmit` → **PASS**
- `npm test -- src/shared/ai/contracts/confirmWriteContracts.test.ts --run` → **7 passed**

---

## Residuals (for later agents)

| ID | Note | Owner |
| --- | --- | --- |
| R1 | Agent 3 may gate allowed proposal types via SafetyGuard | Agent 3 |
| R2 | Agent 4 expands proposal schema / safety rejection coverage | Agent 4 |
| R3 | Confirm Dialog + existing CRM writers (commit path) — **not** this phase | Future auth |
| R4 | Status proposals should later run through `planStatusTransition` before Apply | Future commit path |

---

## Out of scope

- Copilot write CTAs / Dialogs  
- Automatic status / FU / note / WA / email execution  
- Firestore AI collections or audit persistence  
- Provider / orchestrator changes  
