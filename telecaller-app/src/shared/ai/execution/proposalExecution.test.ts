import { describe, expect, it, vi } from "vitest";
import {
  AI_ACTION_TYPES,
  createAiActionProposal,
  createProposalExecutor,
  PROPOSAL_EXECUTION_RESULTS,
  validateProposalForExecution,
} from "@/shared/ai";
import type { Lead } from "@/shared/types";

const lead: Lead = {
  id: "lead-1",
  name: "Ada Lovelace",
  phone: "9999999999",
  status: "new",
  priority: "warm",
  assignedTo: "user-1",
  assignedToName: "Current Owner",
  followUpDate: "2026-07-20",
};

describe("proposalExecution", () => {
  it("rejects unsupported proposal type", () => {
    const result = validateProposalForExecution(
      {
        id: "bad-1",
        leadId: lead.id,
        title: "Do something unsupported",
        createdAt: "2026-07-14T01:00:00.000Z",
        status: "PENDING_CONFIRMATION",
        type: "DELETE_LEAD",
        payload: {},
      },
      { lead },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNSUPPORTED_PROPOSAL_TYPE");
    }
  });

  it("rejects expired proposal", () => {
    const proposal = createAiActionProposal({
      id: "expired-1",
      leadId: lead.id,
      title: "Expired follow-up",
      createdAt: "2026-07-14T01:00:00.000Z",
      expiresAt: "2026-07-14T01:30:00.000Z",
      type: AI_ACTION_TYPES.FOLLOW_UP,
      payload: { followUpDate: "2026-07-16" },
    });
    expect(proposal).not.toBeNull();
    if (!proposal) return;

    const result = validateProposalForExecution(proposal, {
      lead,
      nowIso: "2026-07-14T02:00:00.000Z",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("EXPIRED_PROPOSAL");
    }
  });

  it("rejects illegal status transition", () => {
    const proposal = createAiActionProposal({
      id: "status-1",
      leadId: lead.id,
      title: "Jump to booked",
      createdAt: "2026-07-14T01:00:00.000Z",
      type: AI_ACTION_TYPES.STATUS_CHANGE,
      payload: { fromStatus: "not-interested", toStatus: "booked" },
    });
    expect(proposal).not.toBeNull();
    if (!proposal) return;

    const result = validateProposalForExecution(proposal, {
      lead: {
        ...lead,
        status: "not-interested",
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ILLEGAL_STATUS_TRANSITION");
    }
  });

  it("rejects assignment to same owner", () => {
    const proposal = createAiActionProposal({
      id: "assign-1",
      leadId: lead.id,
      title: "Reassign to current owner",
      createdAt: "2026-07-14T01:00:00.000Z",
      type: AI_ACTION_TYPES.RECOMMEND_ASSIGNMENT,
      payload: { assignedTo: "user-1", assignedToName: "Current Owner" },
    });
    expect(proposal).not.toBeNull();
    if (!proposal) return;

    const result = validateProposalForExecution(proposal, { lead });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ASSIGNMENT_SAME_OWNER");
    }
  });

  it("rejects empty note", () => {
    const result = validateProposalForExecution(
      {
        id: "note-1",
        leadId: lead.id,
        title: "Empty note",
        createdAt: "2026-07-14T01:00:00.000Z",
        status: "PENDING_CONFIRMATION",
        type: "ADD_NOTE",
        payload: { noteText: "" },
      },
      { lead },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("EMPTY_NOTE");
    }
  });

  it("rejects follow-up dates in the past", () => {
    const proposal = createAiActionProposal({
      id: "fu-1",
      leadId: lead.id,
      title: "Past follow-up",
      createdAt: "2026-07-14T01:00:00.000Z",
      type: AI_ACTION_TYPES.FOLLOW_UP,
      payload: { followUpDate: "2020-01-01" },
    });
    expect(proposal).not.toBeNull();
    if (!proposal) return;

    const result = validateProposalForExecution(proposal, { lead });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("DATE_IN_PAST");
    }
  });

  it("does not mark execution complete when shared API fails", async () => {
    const updateLead = vi.fn().mockRejectedValue(new Error("update failed"));
    const executor = createProposalExecutor({
      updateLead,
      logCall: vi.fn(),
    });
    const executedIds = new Set<string>();
    const proposal = createAiActionProposal({
      id: "priority-1",
      leadId: lead.id,
      title: "Raise priority",
      createdAt: "2026-07-14T01:00:00.000Z",
      type: AI_ACTION_TYPES.PRIORITY_CHANGE,
      payload: { toPriority: "hot" },
    });
    expect(proposal).not.toBeNull();
    if (!proposal) return;

    const result = await executor.execute({
      proposal,
      lead,
      confirmed: true,
      actor: { userId: "user-9", username: "Grace" },
      executedProposalIds: executedIds,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(PROPOSAL_EXECUTION_RESULTS.FAILED);
      expect(result.error.code).toBe("EXECUTION_FAILED");
    }
    expect(executedIds.has(proposal.id)).toBe(false);
  });

  it("rejects duplicate confirmation", async () => {
    const executor = createProposalExecutor({
      updateLead: vi.fn(),
      logCall: vi.fn(),
    });
    const confirmingIds = new Set<string>(["priority-2"]);
    const proposal = createAiActionProposal({
      id: "priority-2",
      leadId: lead.id,
      title: "Raise priority",
      createdAt: "2026-07-14T01:00:00.000Z",
      type: AI_ACTION_TYPES.PRIORITY_CHANGE,
      payload: { toPriority: "hot" },
    });
    expect(proposal).not.toBeNull();
    if (!proposal) return;

    const result = await executor.execute({
      proposal,
      lead,
      confirmed: true,
      actor: { userId: "user-9", username: "Grace" },
      confirmingProposalIds: confirmingIds,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(
        PROPOSAL_EXECUTION_RESULTS.DUPLICATE_CONFIRMATION,
      );
      expect(result.error.code).toBe("DUPLICATE_CONFIRMATION");
    }
  });

  it("rejects duplicate execution", async () => {
    const executor = createProposalExecutor({
      updateLead: vi.fn(),
      logCall: vi.fn(),
    });
    const executedIds = new Set<string>(["priority-3"]);
    const proposal = createAiActionProposal({
      id: "priority-3",
      leadId: lead.id,
      title: "Raise priority",
      createdAt: "2026-07-14T01:00:00.000Z",
      type: AI_ACTION_TYPES.PRIORITY_CHANGE,
      payload: { toPriority: "hot" },
    });
    expect(proposal).not.toBeNull();
    if (!proposal) return;

    const result = await executor.execute({
      proposal,
      lead,
      confirmed: true,
      actor: { userId: "user-9", username: "Grace" },
      executedProposalIds: executedIds,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(
        PROPOSAL_EXECUTION_RESULTS.DUPLICATE_EXECUTION,
      );
      expect(result.error.code).toBe("DUPLICATE_EXECUTION");
    }
  });

  it("returns audit metadata for successful execution", async () => {
    const updateLead = vi.fn().mockResolvedValue(undefined);
    const executor = createProposalExecutor({
      updateLead,
      logCall: vi.fn(),
    });
    const proposal = createAiActionProposal({
      id: "priority-4",
      leadId: lead.id,
      title: "Raise priority",
      createdAt: "2026-07-14T01:00:00.000Z",
      type: AI_ACTION_TYPES.PRIORITY_CHANGE,
      payload: { toPriority: "hot" },
    });
    expect(proposal).not.toBeNull();
    if (!proposal) return;

    const result = await executor.execute({
      proposal,
      lead,
      confirmed: true,
      actor: { userId: "user-9", username: "Grace" },
      nowIso: "2026-07-14T02:00:00.000Z",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.audit).toMatchObject({
        proposalId: "priority-4",
        proposalType: AI_ACTION_TYPES.PRIORITY_CHANGE,
        leadId: lead.id,
        createdAt: "2026-07-14T01:00:00.000Z",
        confirmedAt: "2026-07-14T02:00:00.000Z",
        confirmedBy: "user-9",
        executionResult: PROPOSAL_EXECUTION_RESULTS.EXECUTED,
      });
    }
  });

  describe("regression trust boundaries", () => {
    it("rejects invalid follow-up date formats and never calls updateLead", async () => {
      const updateLead = vi.fn();
      const executor = createProposalExecutor({
        updateLead,
        logCall: vi.fn(),
      });
      const proposal = createAiActionProposal({
        id: "fu-invalid-date",
        leadId: lead.id,
        title: "Follow up tomorrow",
        createdAt: "2026-07-14T01:00:00.000Z",
        type: AI_ACTION_TYPES.FOLLOW_UP,
        payload: { followUpDate: "2026-02-30" }, // Invalid calendar date
      });
      expect(proposal).not.toBeNull();
      if (!proposal) return;

      const result = await executor.execute({
        proposal,
        lead,
        confirmed: true,
        actor: { userId: "user-9", username: "Grace" },
        nowIso: "2026-07-14T02:00:00.000Z",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_CALENDAR_DATE");
      }
      expect(updateLead).not.toHaveBeenCalled();
    });

    it("rejects past follow-up dates and never calls updateLead", async () => {
      const updateLead = vi.fn();
      const executor = createProposalExecutor({
        updateLead,
        logCall: vi.fn(),
      });
      const proposal = createAiActionProposal({
        id: "fu-past-date",
        leadId: lead.id,
        title: "Follow up yesterday",
        createdAt: "2026-07-14T01:00:00.000Z",
        type: AI_ACTION_TYPES.FOLLOW_UP,
        payload: { followUpDate: "2026-07-13" },
      });
      expect(proposal).not.toBeNull();
      if (!proposal) return;

      const result = await executor.execute({
        proposal,
        lead,
        confirmed: true,
        actor: { userId: "user-9", username: "Grace" },
        nowIso: "2026-07-14T02:00:00.000Z",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("DATE_IN_PAST");
      }
      expect(updateLead).not.toHaveBeenCalled();
    });

    it("rejects invalid assignment (USER_NOT_FOUND) and never calls updateLead", async () => {
      const updateLead = vi.fn();
      const validateAssignment = vi.fn().mockReturnValue({
        valid: false,
        code: "USER_NOT_FOUND",
        reason: "User not found",
      });
      const executor = createProposalExecutor({
        updateLead,
        logCall: vi.fn(),
        validateAssignment,
      });
      const proposal = createAiActionProposal({
        id: "assign-invalid-user",
        leadId: lead.id,
        title: "Reassign lead",
        createdAt: "2026-07-14T01:00:00.000Z",
        type: AI_ACTION_TYPES.RECOMMEND_ASSIGNMENT,
        payload: { assignedTo: "user-nonexistent", assignedToName: "Ghost User" },
      });
      expect(proposal).not.toBeNull();
      if (!proposal) return;

      const result = await executor.execute({
        proposal,
        lead,
        confirmed: true,
        actor: { userId: "user-9", username: "Grace" },
        nowIso: "2026-07-14T02:00:00.000Z",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ASSIGNMENT");
        expect(result.error.message).toBe("User not found");
      }
      expect(validateAssignment).toHaveBeenCalledWith("user-nonexistent");
      expect(updateLead).not.toHaveBeenCalled();
    });

    it("rejects inactive assignment (USER_INACTIVE) and never calls updateLead", async () => {
      const updateLead = vi.fn();
      const validateAssignment = vi.fn().mockReturnValue({
        valid: false,
        code: "USER_INACTIVE",
        reason: "User is inactive",
      });
      const executor = createProposalExecutor({
        updateLead,
        logCall: vi.fn(),
        validateAssignment,
      });
      const proposal = createAiActionProposal({
        id: "assign-inactive-user",
        leadId: lead.id,
        title: "Reassign lead",
        createdAt: "2026-07-14T01:00:00.000Z",
        type: AI_ACTION_TYPES.RECOMMEND_ASSIGNMENT,
        payload: { assignedTo: "user-inactive", assignedToName: "Inactive User" },
      });
      expect(proposal).not.toBeNull();
      if (!proposal) return;

      const result = await executor.execute({
        proposal,
        lead,
        confirmed: true,
        actor: { userId: "user-9", username: "Grace" },
        nowIso: "2026-07-14T02:00:00.000Z",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ASSIGNMENT");
        expect(result.error.message).toBe("User is inactive");
      }
      expect(validateAssignment).toHaveBeenCalledWith("user-inactive");
      expect(updateLead).not.toHaveBeenCalled();
    });

    it("executes assignment successfully when validateAssignment passes", async () => {
      const updateLead = vi.fn().mockResolvedValue(undefined);
      const validateAssignment = vi.fn().mockReturnValue({ valid: true });
      const executor = createProposalExecutor({
        updateLead,
        logCall: vi.fn(),
        validateAssignment,
      });
      const proposal = createAiActionProposal({
        id: "assign-valid-user",
        leadId: lead.id,
        title: "Reassign lead",
        createdAt: "2026-07-14T01:00:00.000Z",
        type: AI_ACTION_TYPES.RECOMMEND_ASSIGNMENT,
        payload: { assignedTo: "user-2", assignedToName: "New Owner" },
      });
      expect(proposal).not.toBeNull();
      if (!proposal) return;

      const result = await executor.execute({
        proposal,
        lead,
        confirmed: true,
        actor: { userId: "user-9", username: "Grace" },
        nowIso: "2026-07-14T02:00:00.000Z",
      });

      expect(result.ok).toBe(true);
      expect(validateAssignment).toHaveBeenCalledWith("user-2");
      expect(updateLead).toHaveBeenCalledWith(lead.id, {
        assignedTo: "user-2",
        assignedToName: "New Owner",
      });
    });
  });
});
