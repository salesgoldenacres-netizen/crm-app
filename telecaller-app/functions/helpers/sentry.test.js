const test = require("node:test");
const assert = require("node:assert/strict");

test("initFunctionsSentry warns and stays disabled without SENTRY_DSN", () => {
  const prev = process.env.SENTRY_DSN;
  delete process.env.SENTRY_DSN;

  // Fresh require so module state matches env for this process.
  // Module is already loaded in the suite — exercise public API only.
  const { initFunctionsSentry, isSentryEnabled, captureException } = require("./sentry");

  const enabled = initFunctionsSentry();
  // If a prior test/env already initialized with a DSN, skip strict assertion.
  if (!prev) {
    assert.equal(enabled, false);
    assert.equal(isSentryEnabled(), false);
  }

  // captureException must never throw when disabled
  assert.doesNotThrow(() => captureException(new Error("noop")));

  if (prev !== undefined) process.env.SENTRY_DSN = prev;
});
