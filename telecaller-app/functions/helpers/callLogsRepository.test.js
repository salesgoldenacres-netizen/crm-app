const test = require("node:test");
const assert = require("node:assert/strict");
const {
  isSystemCallAgent,
  buildLeadCallSummaryPatch,
  mergeCallLogsDualRead,
  orderRecentCallLogsChronologically,
} = require("./callLogsRepository");

test("isSystemCallAgent", () => {
  assert.equal(isSystemCallAgent("system"), true);
  assert.equal(isSystemCallAgent("Alice"), false);
});

test("buildLeadCallSummaryPatch increments callCount field value and sets hasAgentCall", () => {
  const patch = buildLeadCallSummaryPatch({
    date: "2026-07-18T10:00:00.000Z",
    note: "Hi",
    status: "interested",
    agent: "Alice",
  });
  assert.equal(patch.lastCallAgent, "Alice");
  assert.equal(patch.hasAgentCall, true);
  assert.ok(patch.callCount); // FieldValue.increment sentinel
});

test("mergeCallLogsDualRead fills from embedded when collection empty", () => {
  const merged = mergeCallLogsDualRead(
    { callLogs: [{ date: "2026-07-18T09:00:00.000Z", note: "E", status: "new", agent: "Bob" }] },
    [],
    { includeEmbedded: true },
  );
  assert.equal(merged.length, 1);
  assert.equal(merged[0].agent, "Bob");
});

test("mergeCallLogsDualRead skips duplicate fingerprints", () => {
  const log = {
    date: "2026-07-18T09:00:00.000Z",
    note: "Same",
    status: "new",
    agent: "Bob",
  };
  const merged = mergeCallLogsDualRead(
    { callLogs: [log] },
    [{ id: "c1", leadId: "L", ...log }],
    { includeEmbedded: true },
  );
  assert.equal(merged.length, 1);
  assert.equal(merged[0].id, "c1");
});

test("orderRecentCallLogsChronologically keeps most recent 200 of 250 logs", () => {
  const allLogs = Array.from({ length: 250 }, (_, index) => ({
    id: `log-${index}`,
    date: new Date(Date.UTC(2020, 0, 1 + index)).toISOString(),
  }));
  const pageSize = 200;
  const newestFirst = [...allLogs].reverse().slice(0, pageSize);
  const chronological = orderRecentCallLogsChronologically(newestFirst);

  assert.equal(chronological.length, pageSize);
  assert.equal(chronological[0].id, "log-50");
  assert.equal(chronological[pageSize - 1].id, "log-249");
});
