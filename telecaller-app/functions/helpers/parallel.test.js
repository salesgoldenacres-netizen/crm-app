const test = require("node:test");
const assert = require("node:assert/strict");
const { mapWithConcurrency } = require("./parallel");

test("mapWithConcurrency preserves order under limited concurrency", async () => {
  let inFlight = 0;
  let maxInFlight = 0;
  const results = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (n) => {
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((r) => setTimeout(r, 5));
    inFlight -= 1;
    return n * 10;
  });
  assert.deepEqual(results, [10, 20, 30, 40, 50]);
  assert.ok(maxInFlight <= 2);
});

test("mapWithConcurrency handles empty list", async () => {
  const results = await mapWithConcurrency([], 5, async () => 1);
  assert.deepEqual(results, []);
});
