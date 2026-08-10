import { describe, it, expect, vi, beforeEach } from "vitest";

const recordTimelineEventMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/services/messaging/recordTimelineEvent", () => ({
  recordTimelineEvent: (...args: unknown[]) => recordTimelineEventMock(...args),
}));

import {
  publishLeadCreated,
  publishLeadStatusChanged,
  publishLeadAssigned,
  publishFollowUpCreated,
  publishFollowUpCompleted,
  publishFollowUpDiff,
  publishNoteAdded,
  publishCallCompleted,
  publishSiteVisitScheduled,
  resolveStatusTimelineType,
} from "./timelinePublisher";

const base = { leadId: "L1", actorId: "u1", actorName: "Agent" };

beforeEach(() => {
  vi.clearAllMocks();
  recordTimelineEventMock.mockResolvedValue("evt-1");
});

describe("timelinePublisher", () => {
  it("publishLeadCreated emits lead_created with capped summary", async () => {
    await publishLeadCreated({ ...base, name: "Ada Lovelace" });

    expect(recordTimelineEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "lead_created",
        source: "lead",
        summary: "Lead created: Ada Lovelace",
      }),
    );
  });

  it("publishLeadStatusChanged no-ops when status unchanged", async () => {
    const id = await publishLeadStatusChanged({
      ...base,
      from: "new",
      to: "new",
      force: false,
    });
    expect(id).toBeNull();
    expect(recordTimelineEventMock).not.toHaveBeenCalled();
  });

  it("publishLeadStatusChanged emits lead_booked for booked transition", async () => {
    await publishLeadStatusChanged({
      ...base,
      from: "interested",
      to: "booked",
    });

    expect(recordTimelineEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "lead_booked",
        metadata: expect.objectContaining({ to: "booked" }),
      }),
    );
  });

  it("publishLeadAssigned includes assignee metadata", async () => {
    await publishLeadAssigned({
      ...base,
      assigneeName: "Ravi",
      assigneeId: "u2",
    });

    expect(recordTimelineEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "lead_assigned",
        summary: "Assigned → Ravi",
      }),
    );
  });

  it("publishFollowUpCreated no-ops when date unchanged", async () => {
    const id = await publishFollowUpCreated({
      ...base,
      followUpDate: "2026-07-28",
      previousFollowUpDate: "2026-07-28",
    });
    expect(id).toBeNull();
  });

  it("publishFollowUpCompleted emits when clearing previous date", async () => {
    await publishFollowUpCompleted({
      ...base,
      previousFollowUpDate: "2026-07-28",
      nextFollowUpDate: "",
    });

    expect(recordTimelineEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: "followup_completed" }),
    );
  });

  it("publishFollowUpDiff routes to created when date changes", async () => {
    await publishFollowUpDiff({
      ...base,
      previousFollowUpDate: "2026-07-20",
      nextFollowUpDate: "2026-07-28",
    });

    expect(recordTimelineEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: "followup_created" }),
    );
  });

  it("publishNoteAdded ignores blank notes", async () => {
    expect(await publishNoteAdded({ ...base, note: "   " })).toBeNull();
  });

  it("publishCallCompleted forwards call metadata", async () => {
    await publishCallCompleted({
      ...base,
      summary: "Spoke 5 min",
      status: "interested",
      duration: 300,
    });

    expect(recordTimelineEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "call_completed",
        metadata: expect.objectContaining({ duration: 300 }),
      }),
    );
  });

  it("publishSiteVisitScheduled builds human summary", async () => {
    await publishSiteVisitScheduled({
      ...base,
      date: "2026-07-30",
      time: "10:00",
    });

    expect(recordTimelineEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "site_visit_scheduled",
        summary: "Site visit scheduled for 2026-07-30 10:00",
      }),
    );
  });

  it("resolveStatusTimelineType maps booked statuses", () => {
    expect(resolveStatusTimelineType("booked")).toBe("lead_booked");
    expect(resolveStatusTimelineType("contacted")).toBe("lead_status_changed");
  });
});
