import { describe, it, expect } from "vitest";
import { assessDuplicateRisk } from "./duplicateRisk";

describe("assessDuplicateRisk", () => {
  it("returns none when lead has no phone", () => {
    expect(assessDuplicateRisk({ id: "L1", phone: "" }, [])).toEqual({
      duplicateRisk: "none",
      duplicateCandidateIds: [],
    });
  });

  it("detects confirmed duplicate on exact digit match", () => {
    const result = assessDuplicateRisk(
      { id: "L1", phone: "+919876543210" },
      [{ id: "L2", phone: "919876543210" }],
    );
    expect(result.duplicateRisk).toBe("confirmed");
    expect(result.duplicateCandidateIds).toContain("L2");
  });

  it("detects possible duplicate when formatting differs but last10 matches", () => {
    const result = assessDuplicateRisk(
      { id: "L1", phone: "09876543210" },
      [{ id: "L3", phone: "+919876543210" }],
    );
    expect(result.duplicateRisk).toBe("possible");
  });

  it("detects possible duplicate when full digits differ but last10 matches", () => {
    const result = assessDuplicateRisk(
      { id: "L1", phone: "919876543210" },
      [{ id: "L4", phone: "9876543210" }],
    );
    expect(result.duplicateRisk).toBe("possible");
    expect(result.duplicateCandidateIds).toEqual(["L4"]);
  });

  it("ignores self and empty peer phones", () => {
    const result = assessDuplicateRisk(
      { id: "L1", phone: "9876543210" },
      [
        { id: "L1", phone: "9876543210" },
        { id: "L5", phone: "" },
      ],
    );
    expect(result.duplicateRisk).toBe("none");
  });

  it("merges confirmed and possible candidate ids without duplicates", () => {
    const result = assessDuplicateRisk(
      { id: "L1", phone: "9876543210" },
      [
        { id: "L2", phone: "9876543210" },
        { id: "L3", phone: "09876543210" },
      ],
    );
    expect(result.duplicateRisk).toBe("confirmed");
    expect(new Set(result.duplicateCandidateIds).size).toBe(
      result.duplicateCandidateIds.length,
    );
  });
});
