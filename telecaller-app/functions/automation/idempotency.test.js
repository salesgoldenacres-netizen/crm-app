const test = require("node:test");
const assert = require("node:assert/strict");
const {
  sanitizeIdPart,
  buildAutomationIdempotencyKey,
  buildAutomationNotificationId,
  AUTOMATION_JOB_TYPES,
} = require("./idempotency");

test("sanitizeIdPart replaces unsafe characters", () => {
  assert.equal(sanitizeIdPart("lead/abc!"), "lead_abc_");
});

test("buildAutomationIdempotencyKey formats jobType:leadId:ymd", () => {
  const key = buildAutomationIdempotencyKey({
    jobType: AUTOMATION_JOB_TYPES.FOLLOW_UP,
    leadId: "lead1",
    dateYmd: "2026-07-17",
  });
  assert.equal(key, "follow_up:lead1:2026-07-17");
});

test("buildAutomationIdempotencyKey rejects invalid date", () => {
  assert.throws(() =>
    buildAutomationIdempotencyKey({
      jobType: "follow_up",
      leadId: "lead1",
      dateYmd: "17-07-2026",
    }),
  );
});

test("buildAutomationNotificationId is deterministic from parts or key", () => {
  const fromParts = buildAutomationNotificationId({
    jobType: "sla_breach",
    leadId: "lead1",
    dateYmd: "2026-07-17",
  });
  const fromKey = buildAutomationNotificationId("sla_breach:lead1:2026-07-17");
  assert.equal(fromParts, "auto_sla_breach_lead1_2026-07-17");
  assert.equal(fromKey, fromParts);
});
