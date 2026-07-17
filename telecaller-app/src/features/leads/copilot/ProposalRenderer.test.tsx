import { describe, expect, it } from "vitest";
import {
  AI_ACTION_TYPES,
  createAiActionProposal,
} from "@/shared/ai";
import type { Lead } from "@/shared/types";
import { buildProposalRenderModel } from "./ProposalRenderer";

const lead: Lead = {
  id: "lead-1",
  name: "Ada Lovelace",
  phone: "9999999999",
  status: "contacted",
  priority: "warm",
  assignedTo: "user-1",
  assignedToName: "Current Owner",
  followUpDate: "2026-07-20",
};

describe("buildProposalRenderModel", () => {
  it("renders status change details", () => {
    const proposal = createAiActionProposal({
      id: "status-1",
      leadId: lead.id,
      title: "Move to interested",
      createdAt: "2026-07-14T01:00:00.000Z",
      type: AI_ACTION_TYPES.STATUS_CHANGE,
      confidence: 0.82,
      payload: {
        fromStatus: "contacted",
        toStatus: "interested",
        rationale: "Lead asked for pricing details.",
      },
    });
    expect(proposal).not.toBeNull();
    if (!proposal) return;

    expect(buildProposalRenderModel(proposal, lead)).toMatchObject({
      title: "Status change",
      currentValue: "contacted",
      newValue: "interested",
      reason: "Lead asked for pricing details.",
      confidenceLabel: "Confidence 82%",
    });
  });

  it("renders assignment details using assignee lookup", () => {
    const proposal = createAiActionProposal({
      id: "assign-1",
      leadId: lead.id,
      title: "Reassign to Priya",
      createdAt: "2026-07-14T01:00:00.000Z",
      type: AI_ACTION_TYPES.RECOMMEND_ASSIGNMENT,
      payload: {
        assignedTo: "user-2",
      },
    });
    expect(proposal).not.toBeNull();
    if (!proposal) return;

    expect(
      buildProposalRenderModel(
        proposal,
        lead,
        (userId) => (userId === "user-2" ? "Priya" : undefined),
      ),
    ).toMatchObject({
      title: "Assignment change",
      currentValue: "Current Owner",
      newValue: "Priya",
    });
  });

  it("renders note proposals as timeline-only changes", () => {
    const proposal = createAiActionProposal({
      id: "note-1",
      leadId: lead.id,
      title: "Add note",
      createdAt: "2026-07-14T01:00:00.000Z",
      type: AI_ACTION_TYPES.ADD_NOTE,
      payload: {
        noteText: "Customer asked for a site visit brochure.",
      },
    });
    expect(proposal).not.toBeNull();
    if (!proposal) return;

    expect(buildProposalRenderModel(proposal, lead)).toMatchObject({
      title: "Add note",
      currentValue: "Timeline note only",
      newValue: "Customer asked for a site visit brochure.",
    });
  });
});
