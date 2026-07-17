import { describe, it, expect } from "vitest";
import {
  buildLeadContext,
  buildTimelineContext,
  buildAutomationContext,
  buildIntelligenceContext,
  buildLeadBriefContext,
  buildLeadBriefContextSlots,
  scrubPiiFromText,
  phoneLast4,
} from "./index";
import { computeLeadIntelligence } from "@/features/leads/intelligence";
import { leadBriefV1Contract } from "../PromptRegistry";

const baseLead = {
  id: "lead_abc",
  name: "Secret Person",
  email: "secret@example.com",
  phone: "+91 98765 43210",
  address: "12 Hidden Lane",
  status: "interested",
  priority: "hot",
  source: "Google Ads",
  followUpDate: "2026-07-10",
  notes: "Call back at 9876543210 or secret@example.com",
  tags: ["nri", "plot"],
  budget: "50L",
  leadNumber: "L-100",
  siteVisit: null as null,
  updatedAt: "2026-07-01T10:00:00.000Z",
  createdAt: "2026-06-20T10:00:00.000Z",
  callLogs: [
    {
      date: "2026-07-01",
      disposition: "Connected",
      note: "Discussed plot",
      timestamp: "2026-07-01T10:00:00.000Z",
    },
  ],
};

describe("redact helpers", () => {
  it("scrubs emails and phone-like runs from free text", () => {
    const out = scrubPiiFromText(
      "Email me at a@b.com or +91 98765 43210 please",
      200,
    );
    expect(out).not.toContain("a@b.com");
    expect(out).not.toMatch(/98765/);
    expect(out).toContain("[email]");
    expect(out).toContain("[phone]");
  });

  it("extracts phone last4", () => {
    expect(phoneLast4("+91 98765 43210")).toBe("3210");
  });
});

describe("buildLeadContext", () => {
  it("allowlists fields and omits PII by default", () => {
    const pack = buildLeadContext(baseLead);
    expect(pack.leadId).toBe("lead_abc");
    expect(pack.statusLabel).toBe("Interested");
    expect(pack.source).toBe("Google Ads");
    expect(pack.priority).toBe("hot");
    expect(pack).not.toHaveProperty("phone");
    expect(pack).not.toHaveProperty("email");
    expect(pack).not.toHaveProperty("name");
    expect(pack).not.toHaveProperty("address");
    expect(pack.phoneLast4).toBeUndefined();
    expect(pack.notesSnippet).toContain("[phone]");
    expect(pack.notesSnippet).toContain("[email]");
  });

  it("optionally includes phone last4 only", () => {
    const pack = buildLeadContext(baseLead, { includePhoneLast4: true });
    expect(pack.phoneLast4).toBe("3210");
  });
});

describe("buildTimelineContext", () => {
  it("caps events and builds timelineSummary", () => {
    const pack = buildTimelineContext(
      [
        {
          type: "call_completed",
          summary: "Connected — discussed pricing 9876543210",
          timestamp: "2026-07-12T10:00:00.000Z",
        },
        {
          type: "note_added",
          summary: "Customer email secret@example.com",
          timestamp: "2026-07-11T10:00:00.000Z",
        },
        {
          type: "whatsapp_outbound",
          summary: "Template sent",
          timestamp: "2026-07-10T10:00:00.000Z",
        },
      ],
      { maxEvents: 2 },
    );
    expect(pack.eventCount).toBe(3);
    expect(pack.includedCount).toBe(2);
    expect(pack.timelineSummary).toContain("call_completed");
    expect(pack.timelineSummary).not.toMatch(/9876543210/);
    expect(pack.timelineSummary).not.toContain("secret@example.com");
  });
});

describe("buildAutomationContext", () => {
  it("flags overdue / idle using shared thresholds", () => {
    const pack = buildAutomationContext(baseLead, {
      todayYmd: "2026-07-14",
    });
    expect(pack.followUpOverdue).toBe(true);
    expect(pack.overdueDays).toBe(4);
    expect(pack.thresholds.leadIdleDays).toBe(3);
    expect(pack.signals.some((s) => /overdue/i.test(s))).toBe(true);
  });
});

describe("buildIntelligenceContext", () => {
  it("uses computeLeadIntelligence (does not invent scoreBand)", () => {
    const expected = computeLeadIntelligence(baseLead, {
      todayYmd: "2026-07-14",
      nowMs: Date.parse("2026-07-14T06:00:00.000Z"),
    });
    const pack = buildIntelligenceContext(baseLead, {
      todayYmd: "2026-07-14",
      nowMs: Date.parse("2026-07-14T06:00:00.000Z"),
    });
    expect(pack.score).toBe(expected.score);
    expect(pack.scoreBand).toBe(expected.scoreBand);
    expect(pack.health).toBe(expected.health);
    expect(pack.nextActionType).toBe(expected.nextAction.type);
    expect(pack.nextActionReason).toBe(expected.nextAction.reason);
    expect(pack.version).toBe(expected.version);
  });

  it("does not fork score formula — identical inputs yield Wave 6 parity", () => {
    const opts = {
      todayYmd: "2026-07-14",
      nowMs: Date.parse("2026-07-14T06:00:00.000Z"),
    } as const;
    const a = buildIntelligenceContext(baseLead, opts);
    const b = buildIntelligenceContext(baseLead, opts);
    const expected = computeLeadIntelligence(baseLead, opts);
    expect(a).toEqual(b);
    expect(a.score).toBe(expected.score);
    expect(a.scoreBand).toBe(expected.scoreBand);
    expect(a.health).toBe(expected.health);
    expect(a.nextActionType).toBe(expected.nextAction.type);
  });

  it("prefers precomputed intelligence without recomputing", () => {
    const precomputed = computeLeadIntelligence(baseLead, {
      todayYmd: "2026-07-14",
    });
    const pack = buildIntelligenceContext(baseLead, {
      intelligence: {
        ...precomputed,
        nextAction: {
          type: "whatsapp",
          reason: "Injected for test",
          channel: "whatsapp",
        },
      },
    });
    expect(pack.nextActionType).toBe("whatsapp");
    expect(pack.nextActionReason).toBe("Injected for test");
  });
});

describe("buildLeadBriefContext", () => {
  it("fills all lead-brief-v1 slots", () => {
    const slots = buildLeadBriefContextSlots({
      lead: baseLead,
      timelineEvents: [
        {
          type: "call_completed",
          summary: "Connected yesterday",
          timestamp: "2026-07-13T10:00:00.000Z",
        },
      ],
      automationOptions: { todayYmd: "2026-07-14" },
      intelligenceOptions: {
        todayYmd: "2026-07-14",
        nowMs: Date.parse("2026-07-14T06:00:00.000Z"),
      },
    });

    for (const field of leadBriefV1Contract.inputFields) {
      expect(slots).toHaveProperty(field);
      expect(typeof (slots as unknown as Record<string, string>)[field]).toBe(
        "string",
      );
    }
    expect(slots.statusLabel).toBe("Interested");
    expect(slots.timelineSummary).toContain("call_completed");
    expect(slots.facts).toContain("Lead id: lead_abc");
    expect(slots.facts).not.toContain("secret@example.com");
    expect(slots.facts).not.toContain("Secret Person");
  });

  it("returns composed packs", () => {
    const pack = buildLeadBriefContext({
      lead: { ...baseLead, siteVisit: { date: "2026-07-20", status: "scheduled" } },
      automationOptions: { todayYmd: "2026-07-14" },
      intelligenceOptions: { todayYmd: "2026-07-14" },
    });
    expect(pack.lead.hasSiteVisit).toBe(true);
    expect(pack.slots.facts).toContain("Site visit:");
    expect(pack.intelligence.scoreBand).toBe(pack.slots.scoreBand);
  });

  it("slots stay read-only projections of Wave 6 intelligence", () => {
    const expected = computeLeadIntelligence(baseLead, {
      todayYmd: "2026-07-14",
      nowMs: Date.parse("2026-07-14T06:00:00.000Z"),
    });
    const slots = buildLeadBriefContextSlots({
      lead: baseLead,
      automationOptions: { todayYmd: "2026-07-14" },
      intelligenceOptions: {
        todayYmd: "2026-07-14",
        nowMs: Date.parse("2026-07-14T06:00:00.000Z"),
      },
    });
    expect(slots.scoreBand).toBe(expected.scoreBand);
    expect(slots.health).toBe(expected.health);
    expect(slots.nextActionType).toBe(expected.nextAction.type);
    expect(slots.nextActionReason).toBe(expected.nextAction.reason);
    // slots are strings for the prompt — never a writable CRM patch shape
    expect(slots).not.toHaveProperty("leadPatch");
    expect(slots).not.toHaveProperty("score");
  });
});
