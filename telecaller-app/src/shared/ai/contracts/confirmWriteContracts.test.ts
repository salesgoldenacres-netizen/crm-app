/**
 * W7-AI-3 confirm-to-write contract schema tests.
 * No CRM / Firestore / execution coverage by design.
 */

import { describe, expect, it } from "vitest";
import {
  AI_ACTION_STATUS,
  AI_ACTION_TYPES,
  createAiActionProposal,
  createPendingAiAction,
  forbidAiActionExecution,
  isPendingConfirmation,
  isSupportedAiActionType,
  parseAiActionProposal,
  proposeAiActionResult,
  rejectAiActionProposal,
} from "./confirmWriteContracts";

const baseMeta = {
  id: "prop-1",
  title: "Update lead status",
  createdAt: "2026-07-14T01:00:00.000Z",
  leadId: "lead-1",
};

describe("confirm-to-write contracts", () => {
  it("lists supported action types", () => {
    expect(isSupportedAiActionType(AI_ACTION_TYPES.STATUS_CHANGE)).toBe(
      true,
    );
    expect(isSupportedAiActionType(AI_ACTION_TYPES.RECOMMEND_ASSIGNMENT)).toBe(
      true,
    );
    expect(isSupportedAiActionType("DELETE_LEAD")).toBe(false);
  });

  it("createAiActionProposal locks status to PENDING_CONFIRMATION", () => {
    const proposal = createAiActionProposal({
      ...baseMeta,
      type: AI_ACTION_TYPES.STATUS_CHANGE,
      payload: { fromStatus: "new", toStatus: "contacted" },
    });
    expect(proposal).not.toBeNull();
    expect(proposal?.status).toBe(AI_ACTION_STATUS.PENDING_CONFIRMATION);
    expect(isPendingConfirmation(proposal?.status)).toBe(true);
  });

  it("rejects unknown types and empty payloads", () => {
    expect(
      parseAiActionProposal({
        ...baseMeta,
        type: "DELETE_LEAD",
        status: AI_ACTION_STATUS.PENDING_CONFIRMATION,
        payload: {},
      }),
    ).toBeNull();

    expect(
      createAiActionProposal({
        ...baseMeta,
        type: AI_ACTION_TYPES.ADD_NOTE,
        payload: { noteText: "" },
      }),
    ).toBeNull();
  });

  it("rejects non-pending status on parse", () => {
    expect(
      parseAiActionProposal({
        ...baseMeta,
        type: AI_ACTION_TYPES.ADD_NOTE,
        status: "EXECUTED",
        payload: { noteText: "Called; left voicemail" },
      }),
    ).toBeNull();
  });

  it("validates all five W7-AI-3 proposal payload shapes", () => {
    const cases = [
      createAiActionProposal({
        ...baseMeta,
        id: "p-status",
        type: AI_ACTION_TYPES.STATUS_CHANGE,
        payload: { toStatus: "interested" },
      }),
      createAiActionProposal({
        ...baseMeta,
        id: "p-priority",
        type: AI_ACTION_TYPES.PRIORITY_CHANGE,
        payload: { toPriority: "hot" },
      }),
      createAiActionProposal({
        ...baseMeta,
        id: "p-fu",
        type: AI_ACTION_TYPES.FOLLOW_UP,
        payload: { followUpDate: "2026-07-15" },
      }),
      createAiActionProposal({
        ...baseMeta,
        id: "p-note",
        type: AI_ACTION_TYPES.ADD_NOTE,
        payload: { noteText: "Interested in east plot" },
      }),
      createAiActionProposal({
        ...baseMeta,
        id: "p-assign",
        type: AI_ACTION_TYPES.RECOMMEND_ASSIGNMENT,
        payload: {
          assignedTo: "user-2",
          assignedToName: "Priya",
        },
      }),
    ];

    for (const proposal of cases) {
      expect(proposal).not.toBeNull();
      expect(proposal?.status).toBe(AI_ACTION_STATUS.PENDING_CONFIRMATION);
    }
  });

  it("createPendingAiAction wraps confirmation without executing", () => {
    const proposal = createAiActionProposal({
      ...baseMeta,
      type: AI_ACTION_TYPES.FOLLOW_UP,
      payload: { followUpDate: "2026-07-16", rationale: "NBA follow-up" },
    });
    expect(proposal).not.toBeNull();
    if (!proposal) return;

    const pending = createPendingAiAction({
      proposal,
      requestedAt: "2026-07-14T01:05:00.000Z",
      requestedByUserId: "user-1",
    });
    expect(pending).not.toBeNull();
    expect(pending?.status).toBe(AI_ACTION_STATUS.PENDING_CONFIRMATION);
    expect(pending?.confirmation.proposalId).toBe(proposal.id);
    expect(pending?.confirmation.proposal.status).toBe(
      AI_ACTION_STATUS.PENDING_CONFIRMATION,
    );
  });

  it("proposeAiActionResult stays pending; forbid blocks execution", () => {
    const proposal = createAiActionProposal({
      ...baseMeta,
      type: AI_ACTION_TYPES.RECOMMEND_ASSIGNMENT,
      payload: { assignedTo: "user-2", assignedToName: "Priya" },
    });
    expect(proposal).not.toBeNull();
    if (!proposal) return;

    const result = proposeAiActionResult(proposal);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status).toBe(AI_ACTION_STATUS.PENDING_CONFIRMATION);
    }

    const blocked = forbidAiActionExecution(proposal.id);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.error.code).toBe("EXECUTION_FORBIDDEN");
    }

    const rejected = rejectAiActionProposal(
      { code: "UNSUPPORTED_ACTION", message: "unknown" },
      "x",
    );
    expect(rejected.ok).toBe(false);
  });
});
