import type { Lead } from "@/shared/types";
import { getIstDateString, planStatusTransition } from "@/shared/contracts";
import { validateYmdDate } from "@/shared/contracts/dateValidation";
import {
  AI_ACTION_TYPES,
  LEAD_PRIORITY_VALUES,
  parseAiActionProposal,
  type AiActionProposal,
  type AiActionType,
  type LeadPriorityValue,
} from "../contracts";

export const PROPOSAL_EXECUTION_RESULTS = {
  PENDING_CONFIRMATION: "PENDING_CONFIRMATION",
  EXECUTED: "EXECUTED",
  REJECTED: "REJECTED",
  FAILED: "FAILED",
  DUPLICATE_CONFIRMATION: "DUPLICATE_CONFIRMATION",
  DUPLICATE_EXECUTION: "DUPLICATE_EXECUTION",
} as const;

export type ProposalExecutionResultStatus =
  (typeof PROPOSAL_EXECUTION_RESULTS)[keyof typeof PROPOSAL_EXECUTION_RESULTS];

export type ProposalExecutionErrorCode =
  | "INVALID_PROPOSAL"
  | "UNSUPPORTED_PROPOSAL_TYPE"
  | "INVALID_LEAD_ID"
  | "DUPLICATE_PROPOSAL"
  | "DUPLICATE_CONFIRMATION"
  | "DUPLICATE_EXECUTION"
  | "EXPIRED_PROPOSAL"
  | "ILLEGAL_STATUS_TRANSITION"
  | "INVALID_PRIORITY"
  | "EMPTY_NOTE"
  | "ASSIGNMENT_SAME_OWNER"
  | "CONFIRMATION_REQUIRED"
  | "EXECUTION_HANDLER_NOT_FOUND"
  | "EXECUTION_FAILED"
  | "INVALID_DATE_FORMAT"
  | "INVALID_CALENDAR_DATE"
  | "DATE_IN_PAST"
  | "INVALID_ASSIGNMENT";

export interface ProposalExecutionError {
  code: ProposalExecutionErrorCode;
  message: string;
  details?: unknown;
}

export interface ProposalExecutionAudit {
  proposalId: string;
  proposalType: AiActionType;
  leadId: string;
  createdAt: string;
  confirmedAt?: string;
  confirmedBy?: string;
  executionResult: ProposalExecutionResultStatus;
  executionDurationMs: number;
  idempotencyKey: string;
}

export type ProposalValidationResult =
  | {
      ok: true;
      value: AiActionProposal;
    }
  | {
      ok: false;
      error: ProposalExecutionError;
    };

export type ProposalExecutionResult =
  | {
      ok: true;
      status: typeof PROPOSAL_EXECUTION_RESULTS.EXECUTED;
      audit: ProposalExecutionAudit;
      proposal: AiActionProposal;
    }
  | {
      ok: false;
      status:
        | typeof PROPOSAL_EXECUTION_RESULTS.PENDING_CONFIRMATION
        | typeof PROPOSAL_EXECUTION_RESULTS.REJECTED
        | typeof PROPOSAL_EXECUTION_RESULTS.FAILED
        | typeof PROPOSAL_EXECUTION_RESULTS.DUPLICATE_CONFIRMATION
        | typeof PROPOSAL_EXECUTION_RESULTS.DUPLICATE_EXECUTION;
      audit: ProposalExecutionAudit;
      proposal: AiActionProposal;
      error: ProposalExecutionError;
    };

export type AssignmentValidationResult =
  | { valid: true }
  | {
      valid: false;
      code: "USER_NOT_FOUND" | "USER_INACTIVE" | "USER_NOT_ASSIGNABLE";
      reason: string;
    };

export interface ProposalValidationOptions {
  lead: Lead;
  nowIso?: string;
  seenProposalIds?: ReadonlySet<string>;
  executedProposalIds?: ReadonlySet<string>;
  validateAssignment?: (userId: string) => AssignmentValidationResult;
}

export interface ProposalExecutionActor {
  userId: string;
  username: string;
}

export interface ProposalExecutionContext {
  proposal: AiActionProposal;
  lead: Lead;
  confirmed: boolean;
  actor: ProposalExecutionActor;
  confirmingProposalIds?: Set<string>;
  executedProposalIds?: Set<string>;
  nowIso?: string;
}

export interface ProposalExecutionDependencies {
  updateLead: (leadId: string, patch: Partial<Lead>) => Promise<void>;
  logCall: (
    leadId: string,
    payload: {
      note: string;
      status: string;
      followUpDate?: string;
      agent?: string;
      duration?: number;
      callType?: "incoming" | "outgoing";
      picked?: boolean;
      timelineActivity?: "call" | "note" | "none";
    },
  ) => Promise<void>;
  resolveAssigneeName?: (userId: string) => string | undefined;
  validateAssignment?: (userId: string) => AssignmentValidationResult;
}

type ProposalExecutionHandler = (input: {
  proposal: AiActionProposal;
  lead: Lead;
  actor: ProposalExecutionActor;
  idempotencyKey: string;
  deps: ProposalExecutionDependencies;
}) => Promise<void>;

const PROPOSAL_EXECUTION_REGISTRY: Record<
  AiActionType,
  ProposalExecutionHandler
> = {
  [AI_ACTION_TYPES.STATUS_CHANGE]: executeStatusProposal,
  [AI_ACTION_TYPES.PRIORITY_CHANGE]: executePriorityProposal,
  [AI_ACTION_TYPES.FOLLOW_UP]: executeFollowUpProposal,
  [AI_ACTION_TYPES.ADD_NOTE]: executeNoteProposal,
  [AI_ACTION_TYPES.RECOMMEND_ASSIGNMENT]: executeAssignmentProposal,
};

export function createProposalIdempotencyKey(
  proposal: Pick<AiActionProposal, "id" | "type" | "leadId">,
): string {
  return `proposal_${proposal.leadId}_${proposal.type}_${proposal.id}`;
}

export function getProposalExecutionHandler(
  type: AiActionType,
): ProposalExecutionHandler | undefined {
  return PROPOSAL_EXECUTION_REGISTRY[type];
}

export function validateProposalForExecution(
  raw: unknown,
  options: ProposalValidationOptions,
): ProposalValidationResult {
  if (isPlainObject(raw)) {
    const type = raw.type;
    if (typeof type === "string" && !(type in PROPOSAL_EXECUTION_REGISTRY)) {
      return failValidation(
        "UNSUPPORTED_PROPOSAL_TYPE",
        `Unsupported proposal type "${type}"`,
      );
    }

    if (type === AI_ACTION_TYPES.ADD_NOTE && isPlainObject(raw.payload)) {
      const noteText = raw.payload.noteText;
      if (typeof noteText === "string" && !noteText.trim()) {
        return failValidation("EMPTY_NOTE", "Proposal note text is empty");
      }
    }
  }

  const proposal = parseAiActionProposal(raw);
  if (!proposal) {
    return failValidation("INVALID_PROPOSAL", "Proposal failed schema validation");
  }

  if (proposal.leadId !== options.lead.id) {
    return failValidation(
      "INVALID_LEAD_ID",
      `Proposal leadId "${proposal.leadId}" does not match active lead "${options.lead.id}"`,
    );
  }

  if (options.seenProposalIds?.has(proposal.id)) {
    return failValidation(
      "DUPLICATE_PROPOSAL",
      `Duplicate proposal id "${proposal.id}" detected`,
    );
  }

  if (options.executedProposalIds?.has(proposal.id)) {
    return failValidation(
      "DUPLICATE_EXECUTION",
      `Proposal "${proposal.id}" already executed`,
    );
  }

  if (proposal.expiresAt) {
    const expiresAtMs = Date.parse(proposal.expiresAt);
    const nowMs = Date.parse(options.nowIso ?? new Date().toISOString());
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= nowMs) {
      return failValidation(
        "EXPIRED_PROPOSAL",
        `Proposal "${proposal.id}" is expired`,
        { expiresAt: proposal.expiresAt },
      );
    }
  }

  switch (proposal.type) {
    case AI_ACTION_TYPES.STATUS_CHANGE: {
      const plan = planStatusTransition({
        from: proposal.payload.fromStatus ?? options.lead.status,
        to: proposal.payload.toStatus,
        reason: "pipeline",
      });
      if (!plan.ok) {
        return failValidation(
          "ILLEGAL_STATUS_TRANSITION",
          plan.error || "Status transition blocked",
          { from: options.lead.status, to: proposal.payload.toStatus },
        );
      }
      return { ok: true, value: proposal };
    }

    case AI_ACTION_TYPES.PRIORITY_CHANGE: {
      const toPriority = normalizePriority(proposal.payload.toPriority);
      const currentPriority = normalizePriority(options.lead.priority);
      if (!toPriority) {
        return failValidation(
          "INVALID_PRIORITY",
          `Unsupported priority "${proposal.payload.toPriority}"`,
        );
      }
      if (toPriority === currentPriority) {
        return failValidation(
          "INVALID_PRIORITY",
          `Priority is already "${toPriority}"`,
        );
      }
      return { ok: true, value: proposal };
    }

    case AI_ACTION_TYPES.FOLLOW_UP: {
      const followUpDate = String(proposal.payload.followUpDate || "").trim();
      const todayYmd = getIstDateString(options.nowIso);
      const dateCheck = validateYmdDate(followUpDate, { todayYmd });
      if (!dateCheck.valid) {
        let errorCode: ProposalExecutionErrorCode = "INVALID_DATE_FORMAT";
        if (dateCheck.code === "INVALID_CALENDAR_DATE") {
          errorCode = "INVALID_CALENDAR_DATE";
        } else if (dateCheck.code === "DATE_IN_PAST") {
          errorCode = "DATE_IN_PAST";
        }
        return failValidation(
          errorCode,
          dateCheck.reason,
          { followUpDate }
        );
      }
      return { ok: true, value: proposal };
    }

    case AI_ACTION_TYPES.ADD_NOTE: {
      if (!String(proposal.payload.noteText || "").trim()) {
        return failValidation(
          "EMPTY_NOTE",
          "Proposal note text is empty",
        );
      }
      return { ok: true, value: proposal };
    }

    case AI_ACTION_TYPES.RECOMMEND_ASSIGNMENT: {
      const nextAssignee = String(proposal.payload.assignedTo || "").trim();
      if (!nextAssignee) {
        return failValidation(
          "INVALID_PROPOSAL",
          "Assignment proposal is missing assignedTo",
        );
      }
      if (nextAssignee === String(options.lead.assignedTo || "").trim()) {
        return failValidation(
          "ASSIGNMENT_SAME_OWNER",
          "Lead is already assigned to this owner",
          { assignedTo: nextAssignee },
        );
      }
      if (options.validateAssignment) {
        const check = options.validateAssignment(nextAssignee);
        if (!check.valid) {
          return failValidation(
            "INVALID_ASSIGNMENT",
            check.reason,
            { assignedTo: nextAssignee, validationCode: check.code }
          );
        }
      }
      return { ok: true, value: proposal };
    }

    default:
      return failValidation(
        "UNSUPPORTED_PROPOSAL_TYPE",
        `Unsupported proposal type "${String((proposal as { type?: unknown }).type)}"`,
      );
  }
}

export function createProposalExecutor(deps: ProposalExecutionDependencies) {
  return {
    async execute(
      input: ProposalExecutionContext,
    ): Promise<ProposalExecutionResult> {
      const startedAt = Date.now();
      const idempotencyKey = createProposalIdempotencyKey(input.proposal);
      const confirmedAt = input.confirmed
        ? input.nowIso ?? new Date().toISOString()
        : undefined;

      if (!input.confirmed) {
        return failExecution(
          input.proposal,
          "PENDING_CONFIRMATION",
          {
            code: "CONFIRMATION_REQUIRED",
            message:
              "Proposal requires explicit human confirmation before execution",
          },
          startedAt,
          idempotencyKey,
        );
      }

      if (input.confirmingProposalIds?.has(input.proposal.id)) {
        return failExecution(
          input.proposal,
          "DUPLICATE_CONFIRMATION",
          {
            code: "DUPLICATE_CONFIRMATION",
            message: `Proposal "${input.proposal.id}" is already being confirmed`,
          },
          startedAt,
          idempotencyKey,
          confirmedAt,
          input.actor.userId,
        );
      }

      if (input.executedProposalIds?.has(input.proposal.id)) {
        return failExecution(
          input.proposal,
          "DUPLICATE_EXECUTION",
          {
            code: "DUPLICATE_EXECUTION",
            message: `Proposal "${input.proposal.id}" already executed`,
          },
          startedAt,
          idempotencyKey,
          confirmedAt,
          input.actor.userId,
        );
      }

      const validated = validateProposalForExecution(input.proposal, {
        lead: input.lead,
        nowIso: input.nowIso,
        executedProposalIds: input.executedProposalIds,
        validateAssignment: deps.validateAssignment,
      });
      if (!validated.ok) {
        return failExecution(
          input.proposal,
          "REJECTED",
          validated.error,
          startedAt,
          idempotencyKey,
          confirmedAt,
          input.actor.userId,
        );
      }

      const handler = getProposalExecutionHandler(validated.value.type);
      if (!handler) {
        return failExecution(
          validated.value,
          "FAILED",
          {
            code: "EXECUTION_HANDLER_NOT_FOUND",
            message: `No execution handler registered for "${validated.value.type}"`,
          },
          startedAt,
          idempotencyKey,
          confirmedAt,
          input.actor.userId,
        );
      }

      input.confirmingProposalIds?.add(validated.value.id);
      try {
        await handler({
          proposal: validated.value,
          lead: input.lead,
          actor: input.actor,
          idempotencyKey,
          deps,
        });
        input.executedProposalIds?.add(validated.value.id);
        return {
          ok: true,
          status: PROPOSAL_EXECUTION_RESULTS.EXECUTED,
          proposal: validated.value,
          audit: {
            proposalId: validated.value.id,
            proposalType: validated.value.type,
            leadId: validated.value.leadId,
            createdAt: validated.value.createdAt,
            confirmedAt,
            confirmedBy: input.actor.userId,
            executionResult: PROPOSAL_EXECUTION_RESULTS.EXECUTED,
            executionDurationMs: Date.now() - startedAt,
            idempotencyKey,
          },
        };
      } catch (error) {
        return failExecution(
          validated.value,
          "FAILED",
          {
            code: "EXECUTION_FAILED",
            message:
              error instanceof Error
                ? error.message
                : "Proposal execution failed",
          },
          startedAt,
          idempotencyKey,
          confirmedAt,
          input.actor.userId,
        );
      } finally {
        input.confirmingProposalIds?.delete(validated.value.id);
      }
    },
  };
}

function normalizePriority(value: unknown): LeadPriorityValue | null {
  const normalized = String(value || "warm").trim().toLowerCase();
  return (LEAD_PRIORITY_VALUES as readonly string[]).includes(normalized)
    ? (normalized as LeadPriorityValue)
    : null;
}

function failValidation(
  code: ProposalExecutionErrorCode,
  message: string,
  details?: unknown,
): ProposalValidationResult {
  return { ok: false, error: { code, message, details } };
}

function failExecution(
  proposal: AiActionProposal,
  status:
    | typeof PROPOSAL_EXECUTION_RESULTS.PENDING_CONFIRMATION
    | typeof PROPOSAL_EXECUTION_RESULTS.REJECTED
    | typeof PROPOSAL_EXECUTION_RESULTS.FAILED
    | typeof PROPOSAL_EXECUTION_RESULTS.DUPLICATE_CONFIRMATION
    | typeof PROPOSAL_EXECUTION_RESULTS.DUPLICATE_EXECUTION,
  error: ProposalExecutionError,
  startedAt: number,
  idempotencyKey: string,
  confirmedAt?: string,
  confirmedBy?: string,
): ProposalExecutionResult {
  return {
    ok: false,
    status,
    proposal,
    error,
    audit: {
      proposalId: proposal.id,
      proposalType: proposal.type,
      leadId: proposal.leadId,
      createdAt: proposal.createdAt,
      confirmedAt,
      confirmedBy,
      executionResult: status,
      executionDurationMs: Date.now() - startedAt,
      idempotencyKey,
    },
  };
}

async function executeStatusProposal(input: {
  proposal: AiActionProposal;
  lead: Lead;
  actor: ProposalExecutionActor;
  idempotencyKey: string;
  deps: ProposalExecutionDependencies;
}): Promise<void> {
  if (input.proposal.type !== AI_ACTION_TYPES.STATUS_CHANGE) return;
  const plan = planStatusTransition({
    from: input.proposal.payload.fromStatus ?? input.lead.status,
    to: input.proposal.payload.toStatus,
    reason: "pipeline",
  });
  if (!plan.ok) {
    throw new Error(plan.error || "Status transition blocked");
  }
  await input.deps.updateLead(input.lead.id, plan.leadPatch);
}

async function executePriorityProposal(input: {
  proposal: AiActionProposal;
  lead: Lead;
  actor: ProposalExecutionActor;
  idempotencyKey: string;
  deps: ProposalExecutionDependencies;
}): Promise<void> {
  if (input.proposal.type !== AI_ACTION_TYPES.PRIORITY_CHANGE) return;
  await input.deps.updateLead(input.lead.id, {
    priority: input.proposal.payload.toPriority,
  });
}

async function executeFollowUpProposal(input: {
  proposal: AiActionProposal;
  lead: Lead;
  actor: ProposalExecutionActor;
  idempotencyKey: string;
  deps: ProposalExecutionDependencies;
}): Promise<void> {
  if (input.proposal.type !== AI_ACTION_TYPES.FOLLOW_UP) return;
  const followUpDate = input.proposal.payload.followUpDate;
  await input.deps.updateLead(input.lead.id, {
    followUpDate,
    followUpOn: followUpDate,
  });
}

async function executeNoteProposal(input: {
  proposal: AiActionProposal;
  lead: Lead;
  actor: ProposalExecutionActor;
  idempotencyKey: string;
  deps: ProposalExecutionDependencies;
}): Promise<void> {
  if (input.proposal.type !== AI_ACTION_TYPES.ADD_NOTE) return;
  await input.deps.logCall(input.lead.id, {
    note: input.proposal.payload.noteText,
    status: input.lead.status || "new",
    followUpDate:
      input.lead.followUpDate ?? input.lead.followUpOn ?? "",
    agent: input.actor.username,
    timelineActivity: "note",
  });
}

async function executeAssignmentProposal(input: {
  proposal: AiActionProposal;
  lead: Lead;
  actor: ProposalExecutionActor;
  idempotencyKey: string;
  deps: ProposalExecutionDependencies;
}): Promise<void> {
  if (input.proposal.type !== AI_ACTION_TYPES.RECOMMEND_ASSIGNMENT) return;
  const assignedTo = input.proposal.payload.assignedTo;
  const assignedToName =
    input.proposal.payload.assignedToName ||
    input.deps.resolveAssigneeName?.(assignedTo) ||
    "Unassigned";
  await input.deps.updateLead(input.lead.id, {
    assignedTo,
    assignedToName,
  });
}

function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}
