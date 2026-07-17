const test = require("node:test");
const assert = require("node:assert/strict");
const { cleanLeadData } = require("./cleanLeadData");

test("cleanLeadData title-cases name and collapses whitespace", () => {
  const result = cleanLeadData({ name: "  john   DOE  ", phone: "9876543210" });
  assert.equal(result.name, "John Doe");
});

test("cleanLeadData defaults empty name to Unknown Customer", () => {
  const result = cleanLeadData({ phone: "9876543210" });
  assert.equal(result.name, "Unknown Customer");
});

test("cleanLeadData lowercases email", () => {
  const result = cleanLeadData({
    name: "Ada",
    email: "  Ada@Example.COM ",
    phone: "9876543210",
  });
  assert.equal(result.email, "ada@example.com");
});

test("cleanLeadData normalizes 10-digit Indian phones to +91", () => {
  const result = cleanLeadData({ name: "A", phone: "9876543210" });
  assert.equal(result.phone, "+919876543210");
});

test("cleanLeadData strips leading 0 from 11-digit local numbers", () => {
  const result = cleanLeadData({ name: "A", phone: "09876543210" });
  assert.equal(result.phone, "+919876543210");
});

test("cleanLeadData prefixes 91XXXXXXXXXX with +", () => {
  const result = cleanLeadData({ name: "A", phone: "919876543210" });
  assert.equal(result.phone, "+919876543210");
});

test("cleanLeadData strips non-digits then adds + when needed", () => {
  const result = cleanLeadData({ name: "A", phone: "+91-98765-43210" });
  assert.equal(result.phone, "+919876543210");
});
