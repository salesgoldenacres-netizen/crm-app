const test = require("node:test");
const assert = require("node:assert/strict");
const { buildAgentPool, pickNextRoundRobinAgent } = require("./allocation");

const agents = [
  { id: "a1", username: "Alice", uid: "uid-a1" },
  { id: "a2", username: "Bob", uid: "uid-a2" },
  { id: "a3", username: "Cara", uid: "uid-a3" },
];

test("buildAgentPool returns all telecallers when activeAgents empty", () => {
  assert.deepEqual(buildAgentPool(agents, []), agents);
  assert.deepEqual(buildAgentPool(agents, undefined), agents);
});

test("buildAgentPool filters to activeAgents when configured", () => {
  const pool = buildAgentPool(agents, ["a2", "a3"]);
  assert.deepEqual(
    pool.map((a) => a.id),
    ["a2", "a3"],
  );
});

test("pickNextRoundRobinAgent returns Unassigned when no active agents", () => {
  const result = pickNextRoundRobinAgent({
    pool: agents,
    activeAgentIds: new Set(),
    lastAgentId: "a1",
  });
  assert.deepEqual(result, { assignedTo: "", assignedToName: "Unassigned", assignedToUid: "" });
});

test("pickNextRoundRobinAgent picks first agent when lastAgent unknown", () => {
  const result = pickNextRoundRobinAgent({
    pool: agents,
    activeAgentIds: ["a1", "a2", "a3"],
    lastAgentId: "",
  });
  assert.equal(result.assignedTo, "a1");
  assert.equal(result.assignedToName, "Alice");
  assert.equal(result.assignedToUid, "uid-a1");
});

test("pickNextRoundRobinAgent advances to next agent after last", () => {
  const result = pickNextRoundRobinAgent({
    pool: agents,
    activeAgentIds: new Set(["a1", "a2", "a3"]),
    lastAgentId: "a1",
  });
  assert.equal(result.assignedTo, "a2");
  assert.equal(result.assignedToName, "Bob");
});

test("pickNextRoundRobinAgent wraps around the active pool", () => {
  const result = pickNextRoundRobinAgent({
    pool: agents,
    activeAgentIds: ["a1", "a2"],
    lastAgentId: "a2",
  });
  assert.equal(result.assignedTo, "a1");
});

test("pickNextRoundRobinAgent ignores inactive members of the pool", () => {
  const result = pickNextRoundRobinAgent({
    pool: agents,
    activeAgentIds: ["a3"],
    lastAgentId: "a1",
  });
  assert.equal(result.assignedTo, "a3");
  assert.equal(result.assignedToName, "Cara");
});
