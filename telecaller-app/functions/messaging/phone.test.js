const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizePhoneE164, digitsOnly } = require("./phone");

test("digitsOnly strips non-numeric characters", () => {
  assert.equal(digitsOnly("+91-98765-43210"), "919876543210");
  assert.equal(digitsOnly(""), "");
});

test("normalizePhoneE164 adds 91 for 10-digit numbers", () => {
  assert.equal(normalizePhoneE164("9876543210"), "919876543210");
});

test("normalizePhoneE164 strips leading 0 from 11-digit local numbers", () => {
  assert.equal(normalizePhoneE164("09876543210"), "919876543210");
});

test("normalizePhoneE164 leaves already-normalized digits", () => {
  assert.equal(normalizePhoneE164("919876543210"), "919876543210");
});
