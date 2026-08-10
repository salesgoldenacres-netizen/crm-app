import { describe, it, expect } from "vitest";
import { buildAssignmentFields, resolveAssignedToUid } from "./leadAssignment";

describe("leadAssignment (SEC-1 denorm)", () => {
  it("resolveAssignedToUid returns empty when assignee has no uid", () => {
    expect(resolveAssignedToUid("doc-1", { id: "doc-1" })).toBe("");
  });

  it("buildAssignmentFields includes assignedToUid when assignee uid is known", () => {
    expect(
      buildAssignmentFields("doc-1", "Alice", { id: "doc-1", uid: "auth-1" }),
    ).toEqual({
      assignedTo: "doc-1",
      assignedToName: "Alice",
      assignedToUid: "auth-1",
    });
  });
});
