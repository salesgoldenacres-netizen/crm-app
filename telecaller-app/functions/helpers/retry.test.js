const test = require("node:test");
const assert = require("node:assert/strict");
const {
  isContentionError,
  backoffDelayMs,
  withExponentialBackoff,
} = require("./retry");

test("isContentionError detects aborted / contention codes", () => {
  assert.equal(isContentionError({ code: 10 }), true);
  assert.equal(isContentionError({ code: "ABORTED" }), true);
  assert.equal(isContentionError({ message: "Aborted due to contention" }), true);
  assert.equal(isContentionError({ code: "not-found" }), false);
  assert.equal(isContentionError(null), false);
});

test("backoffDelayMs grows exponentially and stays bounded", () => {
  const d0 = backoffDelayMs(0, { baseDelayMs: 40, maxDelayMs: 2000 });
  const d3 = backoffDelayMs(3, { baseDelayMs: 40, maxDelayMs: 2000 });
  const d20 = backoffDelayMs(20, { baseDelayMs: 40, maxDelayMs: 2000 });
  assert.ok(d0 >= 40);
  assert.ok(d3 > d0);
  assert.ok(d20 <= 2000);
});

test("withExponentialBackoff succeeds after contention retries", async () => {
  let calls = 0;
  const sleeps = [];
  const { value, attempts, retries } = await withExponentialBackoff(
    async () => {
      calls += 1;
      if (calls < 3) {
        const err = new Error("Aborted due to contention");
        err.code = 10;
        throw err;
      }
      return "ok";
    },
    {
      maxAttempts: 5,
      baseDelayMs: 1,
      maxDelayMs: 5,
      sleepFn: async (ms) => {
        sleeps.push(ms);
      },
    },
  );
  assert.equal(value, "ok");
  assert.equal(attempts, 3);
  assert.equal(retries, 2);
  assert.equal(sleeps.length, 2);
});

test("withExponentialBackoff does not retry non-contention errors", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      withExponentialBackoff(
        async () => {
          calls += 1;
          throw new Error("permission-denied");
        },
        { maxAttempts: 5, sleepFn: async () => {} },
      ),
    /permission-denied/,
  );
  assert.equal(calls, 1);
});

test("withExponentialBackoff exhausts attempts on persistent contention", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      withExponentialBackoff(
        async () => {
          calls += 1;
          const err = new Error("too much contention");
          err.code = "ABORTED";
          throw err;
        },
        { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 2, sleepFn: async () => {} },
      ),
    (err) => {
      assert.equal(err.attempts, 3);
      assert.equal(err.contention, true);
      return true;
    },
  );
  assert.equal(calls, 3);
});
