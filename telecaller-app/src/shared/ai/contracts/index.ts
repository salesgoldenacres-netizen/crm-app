/**
 * Wave 7 Phase 2C — confirm-to-write contract barrel.
 * Schema / types only — no CRM execution.
 */

export {
  AI_ACTION_TYPES,
  AI_ACTION_TYPE_VALUES,
  AI_ACTION_STATUS,
  AI_ACTION_PENDING_STATUS,
  LEAD_PRIORITY_VALUES,
  aiActionPayloadByTypeSchema,
  aiActionProposalSchema,
  aiConfirmationRequestSchema,
  pendingAiActionSchema,
  aiActionResultSchema,
  isSupportedAiActionType,
  isPendingConfirmation,
  makeAiActionProposalError,
  parseAiActionProposal,
  parseAiConfirmationRequest,
  parsePendingAiAction,
  parseAiActionResult,
  createAiActionProposal,
  createAiConfirmationRequest,
  createPendingAiAction,
  proposeAiActionResult,
  rejectAiActionProposal,
  forbidAiActionExecution,
} from "./confirmWriteContracts";

export type {
  AiActionType,
  AiActionStatus,
  LeadPriorityValue,
  AiActionProposalErrorCode,
  AiActionProposalError,
  StatusChangePayload,
  PriorityChangePayload,
  FollowUpPayload,
  AddNotePayload,
  RecommendAssignmentPayload,
  AiActionPayload,
  AiActionProposal,
  AiConfirmationRequest,
  PendingAiAction,
  AiActionResult,
  CreateAiActionProposalInput,
} from "./confirmWriteContracts";
