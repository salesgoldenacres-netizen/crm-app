const test = require("node:test");
const assert = require("node:assert/strict");
const {
  chunkArray,
  clampChunkSize,
  resolveBulkChunkSize,
  DEFAULT_CHUNK_SIZE,
  MIN_CHUNK_SIZE,
  MAX_CHUNK_SIZE,
} = require("./chunk");

test("chunkArray splits into equal chunks", () => {
  assert.deepEqual(chunkArray([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
});

test("chunkArray returns empty for empty input", () => {
  assert.deepEqual(chunkArray([], 100), []);
});

test("chunkArray treats invalid size as 1", () => {
  assert.deepEqual(chunkArray([1, 2], 0), [[1], [2]]);
});

test("clampChunkSize enforces 100–500 window", () => {
  assert.equal(clampChunkSize(50), MIN_CHUNK_SIZE);
  assert.equal(clampChunkSize(999), MAX_CHUNK_SIZE);
  assert.equal(clampChunkSize(250), 250);
  assert.equal(clampChunkSize("nope"), DEFAULT_CHUNK_SIZE);
});

test("resolveBulkChunkSize prefers request then env then default", () => {
  const prev = process.env.BULK_IMPORT_CHUNK_SIZE;
  try {
    delete process.env.BULK_IMPORT_CHUNK_SIZE;
    assert.equal(resolveBulkChunkSize(undefined), DEFAULT_CHUNK_SIZE);
    assert.equal(resolveBulkChunkSize(150), 150);
    process.env.BULK_IMPORT_CHUNK_SIZE = "300";
    assert.equal(resolveBulkChunkSize(undefined), 300);
    assert.equal(resolveBulkChunkSize(120), 120);
  } finally {
    if (prev === undefined) delete process.env.BULK_IMPORT_CHUNK_SIZE;
    else process.env.BULK_IMPORT_CHUNK_SIZE = prev;
  }
});
