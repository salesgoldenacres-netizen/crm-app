const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getFollowUpDate,
  isTerminalForReminders,
  hasAgentCallLog,
  isSlaBreached,
  isStuckLead,
  isFollowUpOverdue,
  isFollowUpDueToday,
} = require("./leadPredicates");

test("getFollowUpDate prefers followUpDate over legacy followUpOn", () => {
  assert.equal(
    getFollowUpDate({ followUpDate: "2026-07-20", followUpOn: "2026-07-01" }),
    "2026-07-20",
  );
  assert.equal(getFollowUpDate({ followUpOn: "2026-07-01" }), "2026-07-01");
});

test("isTerminalForReminders covers booked/reserved/not-interested/sold", () => {
  assert.equal(isTerminalForReminders("booked"), true);
  assert.equal(isTerminalForReminders("Interested"), false);
});

test("hasAgentCallLog ignores system agents", () => {
  assert.equal(
    hasAgentCallLog({ callLogs: [{ agent: "system" }, { agent: "Alice" }] }),
    true,
  );
  assert.equal(hasAgentCallLog({ callLogs: [{ agent: "system_webhook" }] }), false);
});

test("isSlaBreached requires age past threshold and no agent call", () => {
  const now = new Date("2026-07-17T12:00:00.000Z");
  const oldLead = {
    createdAt: "2026-07-15T12:00:00.000Z",
    callLogs: [{ agent: "system" }],
  };
  assert.equal(isSlaBreached(oldLead, { now, hours: 24 }), true);
  assert.equal(
    isSlaBreached(
      { ...oldLead, callLogs: [{ agent: "Alice" }] },
      { now, hours: 24 },
    ),
    false,
  );
});

test("isStuckLead skips terminal statuses", () => {
  const now = new Date("2026-07-17T12:00:00.000Z");
  assert.equal(
    isStuckLead(
      { status: "booked", updatedAt: "2026-07-01T00:00:00.000Z" },
      { now, days: 5 },
    ),
    false,
  );
  assert.equal(
    isStuckLead(
      { status: "interested", updatedAt: "2026-07-01T00:00:00.000Z" },
      { now, days: 5 },
    ),
    true,
  );
});

test("isFollowUpOverdue / isFollowUpDueToday use IST YMD", () => {
  assert.equal(
    isFollowUpOverdue({ followUpDate: "2026-07-16", status: "interested" }, "2026-07-17"),
    true,
  );
  assert.equal(
    isFollowUpDueToday({ followUpDate: "2026-07-17", status: "interested" }, "2026-07-17"),
    true,
  );
  assert.equal(
    isFollowUpDueToday({ followUpDate: "2026-07-17", status: "booked" }, "2026-07-17"),
    false,
  );
});
