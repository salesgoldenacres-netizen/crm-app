import { describe, it, expect } from "vitest";
import {
  getLeadStatusColor,
  getLeadStatusBadgeVariant,
} from "./leadColors";
import { LEAD_STATUSES } from "@/shared/contracts/leadStatus";

/** Every canonical CRM status should map to stable styling helpers. */
const STATUS_COLOR_EXPECTATIONS: Record<string, string> = {
  raw: "theme-surface",
  new: "sky",
  "not-attempted": "theme-surface",
  contacted: "theme-warning",
  interested: "theme-success",
  rnr: "theme-surface",
  "re-engaged": "theme-surface",
  "site-visit-confirmed": "theme-surface",
  "site-visit-completed": "theme-surface",
  booked: "theme-accent",
  reserved: "theme-accent",
  "not-interested": "theme-danger",
};

const STATUS_BADGE_EXPECTATIONS: Record<
  string,
  "default" | "primary" | "success" | "warning" | "danger" | "info"
> = {
  raw: "default",
  new: "info",
  "not-attempted": "primary",
  contacted: "warning",
  interested: "warning",
  rnr: "primary",
  "re-engaged": "primary",
  "site-visit-confirmed": "warning",
  "site-visit-completed": "success",
  booked: "success",
  reserved: "success",
  "not-interested": "danger",
};

describe("leadColors", () => {
  it("covers every canonical LEAD_STATUSES entry for color + badge", () => {
    for (const status of LEAD_STATUSES) {
      const color = getLeadStatusColor(status);
      expect(color).toContain(STATUS_COLOR_EXPECTATIONS[status]);
      expect(getLeadStatusBadgeVariant(status)).toBe(
        STATUS_BADGE_EXPECTATIONS[status],
      );
    }
  });

  it("is case-insensitive for status strings", () => {
    expect(getLeadStatusColor("NEW")).toContain("sky");
    expect(getLeadStatusBadgeVariant("BOOKED")).toBe("success");
  });

  it("normalizes hyphen/underscore not-interested variants", () => {
    expect(getLeadStatusBadgeVariant("not_interested")).toBe("danger");
    expect(getLeadStatusBadgeVariant("not-interested")).toBe("danger");
    expect(getLeadStatusColor("not_interested")).toContain("theme-danger");
  });

  it("returns default styling for unknown statuses", () => {
    expect(getLeadStatusColor("mystery")).toContain("theme-surface");
    expect(getLeadStatusBadgeVariant("mystery")).toBe("primary");
  });

  it("maps site-visit milestone aliases consistently", () => {
    expect(getLeadStatusBadgeVariant("site-visit-confirmed")).toBe("warning");
    expect(getLeadStatusBadgeVariant("sitevisit-completed")).toBe("success");
    expect(getLeadStatusBadgeVariant("sitevisit-confirmed")).toBe("warning");
  });
});
