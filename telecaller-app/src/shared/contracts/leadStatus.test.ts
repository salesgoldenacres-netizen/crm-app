import { describe, it, expect } from "vitest";
import {
  isCanonicalLeadStatus,
  normalizeLeadStatus,
  isBookedLikeStatus,
  LEAD_STATUSES,
} from "./leadStatus";
import {
  canTransitionStatus,
  planStatusTransition,
  planSiteVisitConfirmedTransition,
  getAllowedTransitions,
} from "./statusTransition";
import { publishFollowUpDiff } from "./timelinePublisher";

describe("leadStatus", () => {
  it("includes all filter statuses plus re-engaged", () => {
    expect(LEAD_STATUSES).toContain("site-visit-confirmed");
    expect(LEAD_STATUSES).toContain("re-engaged");
    expect(LEAD_STATUSES).toContain("booked");
  });

  it("normalizes aliases", () => {
    expect(normalizeLeadStatus("converted")).toBe("booked");
    expect(normalizeLeadStatus("site_visit_confirmed")).toBe(
      "site-visit-confirmed",
    );
    expect(normalizeLeadStatus("interested")).toBe("interested");
    expect(normalizeLeadStatus("nope")).toBeNull();
  });

  it("detects booked-like statuses", () => {
    expect(isBookedLikeStatus("booked")).toBe(true);
    expect(isBookedLikeStatus("reserved")).toBe(true);
    expect(isCanonicalLeadStatus("rnr")).toBe(true);
  });
});

describe("statusTransition", () => {
  it("allows active → site-visit-confirmed", () => {
    const plan = planSiteVisitConfirmedTransition("interested");
    expect(plan.ok).toBe(true);
    expect(plan.to).toBe("site-visit-confirmed");
    expect(plan.leadPatch.status).toBe("site-visit-confirmed");
  });

  it("rejects invalid target status", () => {
    const plan = planStatusTransition({ from: "new", to: "banana" });
    expect(plan.ok).toBe(false);
    expect(plan.error).toMatch(/Invalid/);
  });

  it("rejects unchanged status", () => {
    const plan = planStatusTransition({ from: "new", to: "new" });
    expect(plan.ok).toBe(false);
    expect(plan.error).toMatch(/unchanged/i);
  });

  it("blocks won → interested without force", () => {
    expect(canTransitionStatus("booked", "interested")).toBe(false);
    expect(canTransitionStatus("booked", "interested", { force: true })).toBe(
      true,
    );
  });

  it("allows reopen from lost → new", () => {
    expect(canTransitionStatus("not-interested", "new")).toBe(true);
  });

  it("uses lead_booked timeline type for booked", () => {
    const plan = planStatusTransition({
      from: "interested",
      to: "booked",
    });
    expect(plan.ok).toBe(true);
    expect(plan.timelineType).toBe("lead_booked");
  });

  it("lists allowed transitions for terminal won", () => {
    const allowed = getAllowedTransitions("booked");
    expect(allowed).toContain("new");
    expect(allowed).toContain("reserved");
    expect(allowed).not.toContain("interested");
  });
});

describe("publishFollowUpDiff (diff-only contract)", () => {
  it("is exported as a function", () => {
    expect(typeof publishFollowUpDiff).toBe("function");
  });
});
