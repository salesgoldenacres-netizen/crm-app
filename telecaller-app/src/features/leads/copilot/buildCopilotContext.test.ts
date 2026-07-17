import { describe, it, expect } from "vitest";
import { buildCopilotContext } from "./buildCopilotContext";
import type { Lead } from "@/shared/types";

const TODAY = "2026-07-14";

const baseLead = {
  id: "lead_copilot_1",
  name: "Ada Lovelace",
  email: "ada@example.com",
  phone: "+91 98765 43210",
  status: "interested",
  priority: "hot",
  source: "Google Ads",
  followUpDate: TODAY,
  notes: "Discussed plot",
  tags: ["nri"],
  budget: "50L",
  siteVisit: null as null,
  updatedAt: `${TODAY}T10:00:00+05:30`,
  createdAt: "2026-06-20T10:00:00.000Z",
} as Lead;

describe("buildCopilotContext", () => {
  it("packs contextSlots, NBA, readiness, timeline, and rulesBrief", () => {
    const pack = buildCopilotContext({
      lead: baseLead,
      todayYmd: TODAY,
      timelineEvents: [
        {
          type: "call_completed",
          summary: "Connected — discussed pricing",
          timestamp: `${TODAY}T09:00:00.000Z`,
        },
      ],
    });

    expect(pack.contextSlots).toBeTruthy();
    expect(pack.contextSlots.statusLabel).toBeTruthy();
    expect(pack.nextAction.type).toBeTruthy();
    expect(pack.nextAction.reason).toBeTruthy();
    expect(typeof pack.readiness.bookingProbability).toBe("number");
    expect(["low", "medium", "high"]).toContain(pack.readiness.band);
    expect(pack.timeline.items?.length).toBeGreaterThan(0);
    expect(pack.rulesBrief.brief.length).toBeGreaterThan(0);
    expect(pack.rulesBrief.bullets?.length).toBeGreaterThan(0);
    expect(pack.intelligence.score).toBeGreaterThanOrEqual(0);
  });

  it("reuses a precomputed intelligence snapshot (no formula fork)", () => {
    const first = buildCopilotContext({ lead: baseLead, todayYmd: TODAY });
    const second = buildCopilotContext({
      lead: baseLead,
      todayYmd: TODAY,
      intelligence: first.intelligence,
    });
    expect(second.nextAction).toEqual(first.nextAction);
    expect(second.intelligence.score).toBe(first.intelligence.score);
    expect(second.intelligence.nextAction.type).toBe(
      first.intelligence.nextAction.type,
    );
  });

  it("flags missing site visit / follow-up as readiness gaps when relevant", () => {
    const pack = buildCopilotContext({
      lead: {
        ...baseLead,
        followUpDate: undefined,
        followUpOn: undefined,
        siteVisit: null,
        status: "interested",
      } as Lead,
      todayYmd: TODAY,
    });
    expect(pack.readiness.gaps?.some((g) => /site visit/i.test(g))).toBe(true);
    expect(pack.readiness.gaps?.some((g) => /follow-up/i.test(g))).toBe(true);
  });

  it("does not include raw email/phone in context slots by default", () => {
    const pack = buildCopilotContext({ lead: baseLead, todayYmd: TODAY });
    const serialized = JSON.stringify(pack.contextSlots);
    expect(serialized).not.toContain("ada@example.com");
    expect(serialized).not.toContain("98765");
  });
});
