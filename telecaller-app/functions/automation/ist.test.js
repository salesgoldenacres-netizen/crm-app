const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getIstDateString,
  addIstDays,
  compareYmd,
  isYmdBefore,
  isYmdToday,
  hoursSince,
  calendarDaysBetween,
} = require("./ist");

test("getIstDateString formats a known UTC instant in IST", () => {
  // 2026-07-16T20:00:00Z == 2026-07-17 01:30 IST
  assert.equal(getIstDateString("2026-07-16T20:00:00.000Z"), "2026-07-17");
});

test("addIstDays shifts calendar dates", () => {
  assert.equal(addIstDays("2026-07-17", 1), "2026-07-18");
  assert.equal(addIstDays("2026-07-01", -1), "2026-06-30");
});

test("compareYmd / isYmdBefore / isYmdToday work lexicographically", () => {
  assert.ok(compareYmd("2026-07-16", "2026-07-17") < 0);
  assert.equal(isYmdBefore("2026-07-16", "2026-07-17"), true);
  assert.equal(isYmdToday("2026-07-17", "2026-07-17"), true);
});

test("hoursSince returns elapsed hours or null for invalid input", () => {
  const now = new Date("2026-07-17T12:00:00.000Z");
  assert.equal(hoursSince("2026-07-17T10:00:00.000Z", now), 2);
  assert.equal(hoursSince(null, now), null);
  assert.equal(hoursSince("not-a-date", now), null);
});

test("calendarDaysBetween returns whole days", () => {
  assert.equal(calendarDaysBetween("2026-07-10", "2026-07-17"), 7);
});
