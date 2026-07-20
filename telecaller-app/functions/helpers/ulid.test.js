const test = require('node:test');
const assert = require('node:assert');
const { generateUlid } = require('./ulid');

test('generateUlid returns 26-character Crockford Base32 string', () => {
  const ulid = generateUlid();
  assert.strictEqual(typeof ulid, 'string');
  assert.strictEqual(ulid.length, 26);
  assert.match(ulid, /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$/);
});

test('generateUlid values are unique and time-sortable', async () => {
  const ulid1 = generateUlid();
  // Brief delay to ensure different timestamp if needed
  await new Promise((resolve) => setTimeout(resolve, 2));
  const ulid2 = generateUlid();

  assert.notStrictEqual(ulid1, ulid2);
  // Lexicographical comparison should sort by time
  assert.ok(ulid1 < ulid2, `Expected ${ulid1} < ${ulid2}`);
});
