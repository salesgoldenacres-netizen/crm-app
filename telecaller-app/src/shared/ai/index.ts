/**
 * Wave 7 AI platform barrel.
 * Feature UI: import orchestrator + types from `@/shared/ai` only.
 */

export { AI_ENABLED, AI_CAPABILITY_IDS } from "./types";
export {
  isAiEnabled,
  AiFeatureGate,
  parseAiEnabledEnvValue,
} from "./featureFlags";
export type {
  AiAuditRecord,
  AiCapabilityId,
  AiCapabilityResult,
  AiCompletionRequest,
  AiCompletionResult,
  AiError,
  AiErrorCode,
  AiMessage,
  AiMessageRole,
  AiResponseFormat,
  AiResultSource,
  AiRunInput,
  AiTokenUsage,
  AiWritePolicy,
  LeadBriefV1Output,
} from "./types";

export type { AiProvider, AiProviderCallOptions } from "./AiProvider";
export {
  StubAiProvider,
  STUB_PROVIDER_ID,
  STUB_MODEL_ID,
} from "./StubAiProvider";
export {
  GeminiProvider,
  GEMINI_PROVIDER_ID,
  GEMINI_DEFAULT_MODEL,
  AI_COMPLETE_CALLABLE,
  type GeminiProviderOptions,
  type GeminiProxyRequest,
  type GeminiInvokeFn,
} from "./GeminiProvider";
export {
  createAiProvider,
  resolveAiProviderKind,
  parseAiProviderEnvValue,
  isLiveAiProviderConfigured,
  type AiProviderKind,
  type CreateAiProviderOptions,
} from "./ProviderFactory";
export {
  createAiRuntime,
  type AiRuntimeOptions,
} from "./AiRuntime";
export {
  AiOrchestrator,
  createAiOrchestrator,
  type AiOrchestratorOptions,
} from "./AiOrchestrator";
export {
  LEAD_BRIEF_V1_ID,
  leadBriefV1Contract,
  getPromptContract,
  listPromptContracts,
  hasPromptContract,
  renderUserTemplate,
  type PromptContract,
} from "./PromptRegistry";
export {
  CRM_PATCH_KEYS,
  EXECUTABLE_CRM_COMMAND_KEYS,
  FORBIDDEN_INTELLIGENCE_KEYS,
  DEFAULT_PROVIDER_TIMEOUT_MS,
  DEFAULT_PROVIDER_MAX_ATTEMPTS,
  DEFAULT_PROVIDER_RETRY_DELAY_MS,
  DEFAULT_MAX_OUTPUT_TOKENS,
  DEFAULT_MAX_PROMPT_CHARS,
  CHARS_PER_TOKEN_ESTIMATE,
  authorizeCapability,
  assertWritePolicySafe,
  assertContextWithinLimit,
  assertPromptSize,
  assertTokenLimit,
  assertOutputTokenUsage,
  assertAllowedCapability,
  assertJsonSchemaShape,
  assertNoCrmPatch,
  assertNoExecutableCrmCommands,
  stripForbiddenIntelligenceFields,
  safetyPostCheck,
  estimateTokenCount,
  hashContext,
  makeAiError,
} from "./SafetyGuard";

/** Agent 1 — read-only context builders for prompt slots. */
export {
  buildLeadContext,
  buildTimelineContext,
  buildAutomationContext,
  buildIntelligenceContext,
  buildLeadBriefContext,
  buildLeadBriefContextSlots,
  digitsOnly,
  phoneLast4,
  redactPhone,
  redactEmail,
  scrubPiiFromText,
} from "./context";
export type {
  LeadContextSource,
  TimelineContextEvent,
  BuildLeadContextOptions,
  LeadContextPack,
  BuildTimelineContextOptions,
  TimelineContextPack,
  BuildAutomationContextOptions,
  AutomationContextPack,
  BuildIntelligenceContextOptions,
  IntelligenceContextPack,
  LeadBriefV1ContextSlots,
  BuildLeadBriefContextInput,
  LeadBriefContextPack,
} from "./context";
export {
  AI_SAFETY_POSTURE,
  AI_PROPOSAL_REQUIRED_STATUS,
  PII_FIELD_KEYS,
  redactPII,
  validatePrompt,
  validateResponse,
  validatePromptSize,
  validateTokenLimits,
  validateJsonSchema,
  validateAllowedCapability,
  listAllowedCapabilityIds,
  validateAiActionProposal,
  rejectUnknownAction,
  isAllowedProposalType,
  ensureProposalInert,
  allowWriteIntent,
  blockUnsafeWrite,
  getDefaultProviderSafetyPolicy,
  isAbortError,
  withProviderTimeout,
  withProviderRetry,
  invokeProviderSafely,
  mapProviderEdgeError,
  type AiSafetyPosture,
  type SafetyValidationOk,
  type SafetyValidationFail,
  type SafetyValidationResult,
  type WriteIntentDecision,
  type BlockWriteResult,
  type ProviderSafetyPolicy,
  type ProposalValidationOk,
  type ProposalValidationResult,
} from "./safetyUtils";

/** Phase 2C Agent 1 — confirm-to-write contracts (proposals only; no execution). */
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
} from "./contracts";
export type {
  AiActionType,
  AiActionStatus,
  AiActionProposalErrorCode,
  AiActionProposalError,
  LeadPriorityValue,
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
} from "./contracts";

/** W7-AI-3 — human-confirmed proposal execution layer (no direct Firestore in AI). */
export {
  PROPOSAL_EXECUTION_RESULTS,
  createProposalExecutor,
  createProposalIdempotencyKey,
  getProposalExecutionHandler,
  validateProposalForExecution,
} from "./execution/proposalExecution";
export type {
  ProposalExecutionErrorCode,
  ProposalExecutionError,
  ProposalExecutionAudit,
  ProposalExecutionResultStatus,
  ProposalExecutionResult,
  ProposalValidationOptions,
  ProposalExecutionActor,
  ProposalExecutionContext,
  ProposalExecutionDependencies,
  AssignmentValidationResult,
} from "./execution/proposalExecution";
