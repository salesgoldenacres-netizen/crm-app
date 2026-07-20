const test = require("node:test");
const assert = require("node:assert/strict");
const {
  shouldAggregateCallLog,
  buildProductivityEventMarker,
  buildProductivityAggregateLog,
  parseDurationFromNote,
  AGGREGATION_VERSION,
} = require("./applyCallLogProductivity");

test("shouldAggregateCallLog skips system / migrated / flagged", () => {
  assert.equal(shouldAggregateCallLog(null), false);
  assert.equal(shouldAggregateCallLog({ agent: "system" }), false);
  assert.equal(
    shouldAggregateCallLog({ agent: "Alice", migratedFromEmbedded: true }),
    false,
  );
  assert.equal(
    shouldAggregateCallLog({ agent: "Alice", skipProductivity: true }),
    false,
  );
  assert.equal(shouldAggregateCallLog({ agent: "Alice" }), true);
});

test("buildProductivityEventMarker includes required metadata", () => {
  const marker = buildProductivityEventMarker({
    callLogId: "cl1",
    leadId: "lead1",
    agentId: "agent1",
    projectId: "proj1",
  });
  assert.equal(marker.callLogId, "cl1");
  assert.equal(marker.leadId, "lead1");
  assert.equal(marker.agentId, "agent1");
  assert.equal(marker.projectId, "proj1");
  assert.equal(marker.aggregationVersion, AGGREGATION_VERSION);
  assert.ok(typeof marker.processedAt === "string");
});

test("parseDurationFromNote handles MM:SS and HH:MM:SS", () => {
  assert.equal(parseDurationFromNote("Duration: 1:30"), 90);
  assert.equal(parseDurationFromNote("[Call Log - Duration: 0:05:01]"), 301);
  assert.equal(parseDurationFromNote("no duration"), 0);
});

test("idempotency marker key is the callLogId (business event)", () => {
  // Document the contract: marker doc id === callLogId (enforced by caller).
  const callLogId = "emb_lead1_0_x";
  const marker = buildProductivityEventMarker({ callLogId, leadId: "lead1", agentId: "a1" });
  assert.equal(marker.callLogId, callLogId);
});

test("buildProductivityAggregateLog emits structured productivity_aggregate fields", () => {
  assert.deepEqual(
    buildProductivityAggregateLog({
      callLogId: "cl1",
      applied: false,
      reason: "already_processed",
      agentId: "a1",
      leadId: "l1",
      durationMs: 12,
    }),
    {
      event: "productivity_aggregate",
      callLogId: "cl1",
      applied: false,
      reason: "already_processed",
      agentId: "a1",
      leadId: "l1",
      durationMs: 12,
    },
  );
});
