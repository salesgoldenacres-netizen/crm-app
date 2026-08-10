const test = require("node:test");
const assert = require("node:assert/strict");
const { buildLeadCreatePatches } = require("./leadCreatePatches");

test("backfills leadReference when the lead has none", () => {
  const { patches } = buildLeadCreatePatches({
    lead: { name: "Ada" },
    leadReference: "01HXULIDVALUE",
    allocation: null,
  });
  assert.equal(patches.leadReference, "01HXULIDVALUE");
});

test("preserves an existing leadReference (no reference patch)", () => {
  const { patches } = buildLeadCreatePatches({
    lead: { name: "Ada", leadReference: "EXISTING" },
    leadReference: "EXISTING",
    allocation: null,
  });
  assert.equal("leadReference" in patches, false);
});

test("never clears a reference when none is resolved", () => {
  const { patches } = buildLeadCreatePatches({
    lead: { name: "Ada", leadReference: "EXISTING" },
    leadReference: "",
    allocation: null,
  });
  assert.equal("leadReference" in patches, false);
});

test("applies round-robin allocation when the lead is unassigned", () => {
  const { patches, assignedTo, assignedToName } = buildLeadCreatePatches({
    lead: { name: "Ada", leadReference: "R1" },
    leadReference: "R1",
    allocation: {
      assignedTo: "agent-2",
      assignedToName: "Bob",
      assignedToUid: "auth-bob",
    },
  });
  assert.equal(patches.assignedTo, "agent-2");
  assert.equal(patches.assignedToName, "Bob");
  assert.equal(patches.assignedToUid, "auth-bob");
  assert.equal(assignedTo, "agent-2");
  assert.equal(assignedToName, "Bob");
});

test("treats the literal 'Unassigned' sentinel as unassigned", () => {
  const { patches, assignedTo } = buildLeadCreatePatches({
    lead: { name: "Ada", assignedTo: "Unassigned", leadReference: "R1" },
    leadReference: "R1",
    allocation: { assignedTo: "agent-3", assignedToName: "Cara" },
  });
  assert.equal(patches.assignedTo, "agent-3");
  assert.equal(assignedTo, "agent-3");
});

test("does not override an explicit assignee even if allocation is provided", () => {
  const { patches, assignedTo } = buildLeadCreatePatches({
    lead: { name: "Ada", assignedTo: "agent-1", assignedToName: "Alice", leadReference: "R1" },
    leadReference: "R1",
    allocation: { assignedTo: "agent-9", assignedToName: "Zed" },
  });
  // Already assigned → no assignment patch and the original assignee is kept.
  assert.equal("assignedTo" in patches, false);
  assert.equal(assignedTo, "agent-1");
});

test("leaves the lead unassigned when allocation yields nobody", () => {
  const { patches, assignedTo } = buildLeadCreatePatches({
    lead: { name: "Ada", leadReference: "R1" },
    leadReference: "R1",
    allocation: { assignedTo: "", assignedToName: "Unassigned" },
  });
  assert.equal("assignedTo" in patches, false);
  assert.equal(assignedTo, undefined);
});

test("combines reference backfill and assignment in one patch set", () => {
  const { patches } = buildLeadCreatePatches({
    lead: { name: "Ada" },
    leadReference: "NEWREF",
    allocation: {
      assignedTo: "agent-2",
      assignedToName: "Bob",
      assignedToUid: "auth-bob",
    },
  });
  assert.deepEqual(patches, {
    leadReference: "NEWREF",
    assignedTo: "agent-2",
    assignedToName: "Bob",
    assignedToUid: "auth-bob",
  });
});

test("returns an empty patch set when nothing changes", () => {
  const { patches } = buildLeadCreatePatches({
    lead: { name: "Ada", assignedTo: "agent-1", leadReference: "R1" },
    leadReference: "R1",
    allocation: null,
  });
  assert.deepEqual(patches, {});
});

test("handles a null lead defensively", () => {
  const { patches, assignedTo } = buildLeadCreatePatches({
    lead: null,
    leadReference: "REF",
    allocation: null,
  });
  assert.equal(patches.leadReference, "REF");
  assert.equal(assignedTo, undefined);
});
