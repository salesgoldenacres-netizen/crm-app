/**
 * Wave 7 W7-AI-3 — Confirm-to-Write contracts.
 *
 * AI may propose a narrow set of CRM actions. Humans must still confirm before
 * any execution layer may route those proposals through existing shared APIs.
 * This module remains schema-only: no CRM / Firestore execution paths live here.
 */

import { z } from "zod";
import type { AiResultSource } from "../types";

/** Supported proposal kinds for W7-AI-3 execution. */
export const AI_ACTION_TYPES = {
  STATUS_CHANGE: "STATUS_CHANGE",
  PRIORITY_CHANGE: "PRIORITY_CHANGE",
  FOLLOW_UP: "FOLLOW_UP",
  ADD_NOTE: "ADD_NOTE",
  RECOMMEND_ASSIGNMENT: "RECOMMEND_ASSIGNMENT",
} as const;

export type AiActionType =
  (typeof AI_ACTION_TYPES)[keyof typeof AI_ACTION_TYPES];

export const AI_ACTION_TYPE_VALUES = Object.values(
  AI_ACTION_TYPES,
) as readonly AiActionType[];

/**
 * Proposal lifecycle remains inert at the contract layer.
 * Execution state belongs to the W7-AI-3 executor, not the AI payload.
 */
export const AI_ACTION_STATUS = {
  PENDING_CONFIRMATION: "PENDING_CONFIRMATION",
} as const;

export type AiActionStatus =
  (typeof AI_ACTION_STATUS)[keyof typeof AI_ACTION_STATUS];

export const AI_ACTION_PENDING_STATUS =
  AI_ACTION_STATUS.PENDING_CONFIRMATION;

export const LEAD_PRIORITY_VALUES = ["hot", "warm", "cold"] as const;
export type LeadPriorityValue = (typeof LEAD_PRIORITY_VALUES)[number];

export type AiActionProposalErrorCode =
  | "INVALID_PROPOSAL"
  | "UNSUPPORTED_ACTION"
  | "EXECUTION_FORBIDDEN";

export interface AiActionProposalError {
  code: AiActionProposalErrorCode;
  message: string;
  details?: unknown;
}

const prioritySchema = z.enum(LEAD_PRIORITY_VALUES);

// --- Payload shapes (declarative intents only) ---

const statusChangePayloadSchema = z.object({
  fromStatus: z.string().min(1).optional(),
  toStatus: z.string().min(1),
  rationale: z.string().optional(),
});

const priorityChangePayloadSchema = z.object({
  fromPriority: prioritySchema.optional(),
  toPriority: prioritySchema,
  rationale: z.string().optional(),
});

const followUpPayloadSchema = z.object({
  /** Preferred YYYY-MM-DD (IST calendar day). Validation stays execution-side. */
  followUpDate: z.string().min(1),
  followUpTime: z.string().optional(),
  rationale: z.string().optional(),
});

const addNotePayloadSchema = z.object({
  noteText: z.string().min(1),
  noteKind: z.string().optional(),
});

const recommendAssignmentPayloadSchema = z.object({
  assignedTo: z.string().min(1),
  assignedToName: z.string().min(1).optional(),
  rationale: z.string().optional(),
});

export const aiActionPayloadByTypeSchema = {
  [AI_ACTION_TYPES.STATUS_CHANGE]: statusChangePayloadSchema,
  [AI_ACTION_TYPES.PRIORITY_CHANGE]: priorityChangePayloadSchema,
  [AI_ACTION_TYPES.FOLLOW_UP]: followUpPayloadSchema,
  [AI_ACTION_TYPES.ADD_NOTE]: addNotePayloadSchema,
  [AI_ACTION_TYPES.RECOMMEND_ASSIGNMENT]: recommendAssignmentPayloadSchema,
} as const;

export type StatusChangePayload = z.infer<typeof statusChangePayloadSchema>;
export type PriorityChangePayload = z.infer<typeof priorityChangePayloadSchema>;
export type FollowUpPayload = z.infer<typeof followUpPayloadSchema>;
export type AddNotePayload = z.infer<typeof addNotePayloadSchema>;
export type RecommendAssignmentPayload = z.infer<
  typeof recommendAssignmentPayloadSchema
>;

export type AiActionPayload =
  | StatusChangePayload
  | PriorityChangePayload
  | FollowUpPayload
  | AddNotePayload
  | RecommendAssignmentPayload;

const pendingStatusSchema = z.literal(
  AI_ACTION_STATUS.PENDING_CONFIRMATION,
);

const metadataSchema = z.record(z.string(), z.string()).optional();

const proposalBaseFields = {
  id: z.string().min(1),
  leadId: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().optional(),
  rationale: z.string().optional(),
  /** Optional AI confidence (0..1) for human review surfaces. */
  confidence: z.number().min(0).max(1).optional(),
  /** Optional impact summary shown in confirm dialogs. */
  impactSummary: z.string().optional(),
  /** Optional proposal expiry timestamp; execution layer validates staleness. */
  expiresAt: z.string().min(1).optional(),
  /** W7-AI-3 contract layer remains propose-only. */
  status: pendingStatusSchema,
  source: z.enum(["stub", "llm", "rules"]).optional(),
  capabilityId: z.string().optional(),
  createdAt: z.string().min(1),
  metadata: metadataSchema,
};

/**
 * Discriminated proposal schema — status locked to PENDING_CONFIRMATION.
 */
export const aiActionProposalSchema = z.discriminatedUnion("type", [
  z.object({
    ...proposalBaseFields,
    type: z.literal(AI_ACTION_TYPES.STATUS_CHANGE),
    payload: statusChangePayloadSchema,
  }),
  z.object({
    ...proposalBaseFields,
    type: z.literal(AI_ACTION_TYPES.PRIORITY_CHANGE),
    payload: priorityChangePayloadSchema,
  }),
  z.object({
    ...proposalBaseFields,
    type: z.literal(AI_ACTION_TYPES.FOLLOW_UP),
    payload: followUpPayloadSchema,
  }),
  z.object({
    ...proposalBaseFields,
    type: z.literal(AI_ACTION_TYPES.ADD_NOTE),
    payload: addNotePayloadSchema,
  }),
  z.object({
    ...proposalBaseFields,
    type: z.literal(AI_ACTION_TYPES.RECOMMEND_ASSIGNMENT),
    payload: recommendAssignmentPayloadSchema,
  }),
]);

export type AiActionProposal = z.infer<typeof aiActionProposalSchema>;

/**
 * UI / host confirmation envelope around an inert proposal.
 * Does not imply execution — only that a human may later confirm.
 */
export const aiConfirmationRequestSchema = z.object({
  proposalId: z.string().min(1),
  proposal: aiActionProposalSchema,
  requestedAt: z.string().min(1),
  requestedByUserId: z.string().optional(),
  confirmLabel: z.string().optional(),
  cancelLabel: z.string().optional(),
});

export type AiConfirmationRequest = z.infer<
  typeof aiConfirmationRequestSchema
>;

/**
 * Queue item for confirm-to-write UI. Always wraps a PENDING proposal.
 */
export const pendingAiActionSchema = z.object({
  proposal: aiActionProposalSchema,
  confirmation: aiConfirmationRequestSchema,
  /** Echo of proposal.status — always PENDING_CONFIRMATION. */
  status: pendingStatusSchema,
});

export type PendingAiAction = z.infer<typeof pendingAiActionSchema>;

const aiActionProposalErrorSchema = z.object({
  code: z.enum([
    "INVALID_PROPOSAL",
    "UNSUPPORTED_ACTION",
    "EXECUTION_FORBIDDEN",
  ]),
  message: z.string().min(1),
  details: z.unknown().optional(),
});

/**
 * Outcome of proposing / validating an action — never an execution receipt.
 * Success still carries PENDING_CONFIRMATION only.
 */
export const aiActionResultSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    proposalId: z.string().min(1),
    status: pendingStatusSchema,
    proposal: aiActionProposalSchema,
  }),
  z.object({
    ok: z.literal(false),
    proposalId: z.string().min(1).optional(),
    error: aiActionProposalErrorSchema,
  }),
]);

export type AiActionResult = z.infer<typeof aiActionResultSchema>;

// --- Runtime helpers (parse / construct — no CRM I/O) ---

export function isSupportedAiActionType(
  value: unknown,
): value is AiActionType {
  return (
    typeof value === "string" &&
    (AI_ACTION_TYPE_VALUES as readonly string[]).includes(value)
  );
}

export function isPendingConfirmation(
  value: unknown,
): value is typeof AI_ACTION_PENDING_STATUS {
  return value === AI_ACTION_STATUS.PENDING_CONFIRMATION;
}

export function makeAiActionProposalError(
  code: AiActionProposalErrorCode,
  message: string,
  details?: unknown,
): AiActionProposalError {
  return details === undefined
    ? { code, message }
    : { code, message, details };
}

export function parseAiActionProposal(
  raw: unknown,
): AiActionProposal | null {
  const parsed = aiActionProposalSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function parseAiConfirmationRequest(
  raw: unknown,
): AiConfirmationRequest | null {
  const parsed = aiConfirmationRequestSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function parsePendingAiAction(raw: unknown): PendingAiAction | null {
  const parsed = pendingAiActionSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function parseAiActionResult(raw: unknown): AiActionResult | null {
  const parsed = aiActionResultSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

type ProposalMetaInput = {
  id: string;
  title: string;
  createdAt: string;
  leadId: string;
  summary?: string;
  rationale?: string;
  confidence?: number;
  impactSummary?: string;
  expiresAt?: string;
  source?: AiResultSource;
  capabilityId?: string;
  metadata?: Record<string, string>;
};

export type CreateAiActionProposalInput =
  | (ProposalMetaInput & {
      type: typeof AI_ACTION_TYPES.STATUS_CHANGE;
      payload: StatusChangePayload;
    })
  | (ProposalMetaInput & {
      type: typeof AI_ACTION_TYPES.PRIORITY_CHANGE;
      payload: PriorityChangePayload;
    })
  | (ProposalMetaInput & {
      type: typeof AI_ACTION_TYPES.FOLLOW_UP;
      payload: FollowUpPayload;
    })
  | (ProposalMetaInput & {
      type: typeof AI_ACTION_TYPES.ADD_NOTE;
      payload: AddNotePayload;
    })
  | (ProposalMetaInput & {
      type: typeof AI_ACTION_TYPES.RECOMMEND_ASSIGNMENT;
      payload: RecommendAssignmentPayload;
    });

/**
 * Builds a proposal locked to PENDING_CONFIRMATION.
 * Returns null when type/payload fail schema validation.
 */
export function createAiActionProposal(
  input: CreateAiActionProposalInput,
): AiActionProposal | null {
  return parseAiActionProposal({
    ...input,
    status: AI_ACTION_STATUS.PENDING_CONFIRMATION,
  });
}

export function createAiConfirmationRequest(input: {
  proposal: AiActionProposal;
  requestedAt: string;
  requestedByUserId?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}): AiConfirmationRequest | null {
  return parseAiConfirmationRequest({
    proposalId: input.proposal.id,
    proposal: input.proposal,
    requestedAt: input.requestedAt,
    requestedByUserId: input.requestedByUserId,
    confirmLabel: input.confirmLabel,
    cancelLabel: input.cancelLabel,
  });
}

/**
 * Wraps a proposal into a pending queue item + confirmation request.
 * Forces PENDING_CONFIRMATION on both layers.
 */
export function createPendingAiAction(input: {
  proposal: AiActionProposal;
  requestedAt: string;
  requestedByUserId?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}): PendingAiAction | null {
  const proposal = parseAiActionProposal({
    ...input.proposal,
    status: AI_ACTION_STATUS.PENDING_CONFIRMATION,
  });
  if (!proposal) return null;

  const confirmation = createAiConfirmationRequest({
    proposal,
    requestedAt: input.requestedAt,
    requestedByUserId: input.requestedByUserId,
    confirmLabel: input.confirmLabel,
    cancelLabel: input.cancelLabel,
  });
  if (!confirmation) return null;

  return parsePendingAiAction({
    proposal,
    confirmation,
    status: AI_ACTION_STATUS.PENDING_CONFIRMATION,
  });
}

/** Successful propose outcome — still pending human confirmation. */
export function proposeAiActionResult(
  proposal: AiActionProposal,
): AiActionResult {
  const locked = parseAiActionProposal({
    ...proposal,
    status: AI_ACTION_STATUS.PENDING_CONFIRMATION,
  });
  if (!locked) {
    return {
      ok: false,
      proposalId: proposal.id,
      error: makeAiActionProposalError(
        "INVALID_PROPOSAL",
        "Proposal failed schema validation",
      ),
    };
  }
  return {
    ok: true,
    proposalId: locked.id,
    status: AI_ACTION_STATUS.PENDING_CONFIRMATION,
    proposal: locked,
  };
}

export function rejectAiActionProposal(
  error: AiActionProposalError,
  proposalId?: string,
): AiActionResult {
  return proposalId === undefined
    ? { ok: false, error }
    : { ok: false, proposalId, error };
}

/**
 * Hard stop for any attempt to execute / commit an AI action without the
 * explicit W7-AI-3 human confirmation/execution layer.
 */
export function forbidAiActionExecution(
  proposalId?: string,
): AiActionResult {
  return rejectAiActionProposal(
    makeAiActionProposalError(
      "EXECUTION_FORBIDDEN",
      "AI actions cannot execute autonomously — proposals must remain PENDING_CONFIRMATION until a human confirms through the W7-AI-3 execution layer",
    ),
    proposalId,
  );
}
