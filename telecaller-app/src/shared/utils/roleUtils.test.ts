import { describe, it, expect } from "vitest";
import { isManagerial } from "./roleUtils";
import type { CustomRole } from "@/shared/types";

describe("roleUtils.isManagerial", () => {
  describe("default managerial roles", () => {
    it.each([
      "admin",
      "upper_management",
      "middle_management",
      "lower_management",
    ])("treats %s as managerial by default", (role) => {
      expect(isManagerial(role)).toBe(true);
    });

    it.each(["telecaller", "agent", "", "unknown_role"])(
      "treats %s as non-managerial by default",
      (role) => {
        expect(isManagerial(role)).toBe(false);
      }
    );
  });

  describe("custom role overrides", () => {
    const customRoles: CustomRole[] = [
      { id: "team_lead", name: "Team Lead", isManagerial: true },
      { id: "senior_agent", name: "Senior Agent", isManagerial: false },
      // A custom role can also override/demote a would-be default managerial code.
      { id: "admin", name: "Restricted Admin", isManagerial: false },
    ];

    it("honors a custom managerial role", () => {
      expect(isManagerial("team_lead", customRoles)).toBe(true);
    });

    it("honors a custom non-managerial role", () => {
      expect(isManagerial("senior_agent", customRoles)).toBe(false);
    });

    it("lets a matching custom role override the default managerial list", () => {
      expect(isManagerial("admin", customRoles)).toBe(false);
    });

    it("falls back to defaults when no custom role matches", () => {
      expect(isManagerial("upper_management", customRoles)).toBe(true);
      expect(isManagerial("telecaller", customRoles)).toBe(false);
    });
  });

  it("defaults customRoles to an empty array", () => {
    expect(isManagerial("admin", undefined as unknown as CustomRole[])).toBe(true);
  });
});
