import { describe, it, expect } from "vitest";
import {
  AI_SUMMARY_UNAVAILABLE,
  secureLeadBriefOutput,
} from "./secureCopilotOutput";

describe("secureLeadBriefOutput", () => {
  it("accepts a clean lead brief and preserves bullets", () => {
    const result = secureLeadBriefOutput({
      brief: "Call today about the site visit.",
      bullets: ["Confirm budget", "Share brochure"],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.brief).toBe("Call today about the site visit.");
    expect(result.data.bullets).toEqual(["Confirm budget", "Share brochure"]);
  });

  it("redacts emails and phones inside brief text", () => {
    const result = secureLeadBriefOutput({
      brief: "Email secret@example.com or call +91 98765 43210",
      bullets: ["Reach at secret@example.com"],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.brief).not.toContain("secret@example.com");
    expect(result.data.brief).not.toMatch(/98765/);
    expect(result.data.bullets?.[0]).not.toContain("secret@example.com");
  });

  it("rejects CRM patch payloads with safe notice only", () => {
    const result = secureLeadBriefOutput({
      brief: "ok",
      crmPatch: { status: "booked" },
    });
    expect(result).toEqual({
      ok: false,
      notice: AI_SUMMARY_UNAVAILABLE,
    });
  });

  it("rejects empty / missing brief shape", () => {
    expect(secureLeadBriefOutput(null).ok).toBe(false);
    expect(secureLeadBriefOutput({}).ok).toBe(false);
    expect(secureLeadBriefOutput({ brief: "   " }).ok).toBe(false);
    expect(secureLeadBriefOutput({ brief: 42 }).ok).toBe(false);
  });

  it("never returns raw provider / stack text in notice", () => {
    const result = secureLeadBriefOutput({
      brief: "x",
      crmPatch: { notes: "leaked" },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.notice).toBe(AI_SUMMARY_UNAVAILABLE);
    expect(result.notice).not.toMatch(/stack|provider|openai|gemini|leaked/i);
  });
});
