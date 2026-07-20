/**
 * Array chunking helpers for bulk import / batch writes.
 * Firestore writeBatch limit is 500 ops; default chunk stays well under that.
 */

const DEFAULT_CHUNK_SIZE = 200;
const MIN_CHUNK_SIZE = 100;
const MAX_CHUNK_SIZE = 500;

/**
 * Split an array into contiguous chunks of at most `size`.
 * @template T
 * @param {T[]} items
 * @param {number} size
 * @returns {T[][]}
 */
function chunkArray(items, size) {
  const list = Array.isArray(items) ? items : [];
  const n = Math.max(1, Math.floor(Number(size) || 1));
  /** @type {T[][]} */
  const out = [];
  for (let i = 0; i < list.length; i += n) {
    out.push(list.slice(i, i + n));
  }
  return out;
}

/**
 * Clamp a requested chunk size into the allowed bulk-import window.
 * @param {unknown} value
 * @param {{ min?: number, max?: number, fallback?: number }} [opts]
 * @returns {number}
 */
function clampChunkSize(value, opts = {}) {
  const min = opts.min ?? MIN_CHUNK_SIZE;
  const max = opts.max ?? MAX_CHUNK_SIZE;
  const fallback = opts.fallback ?? DEFAULT_CHUNK_SIZE;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

/**
 * Resolve bulk chunk size from env / request, clamped to 100–500.
 * @param {unknown} [requestValue]
 * @returns {number}
 */
function resolveBulkChunkSize(requestValue) {
  if (requestValue != null && requestValue !== "") {
    return clampChunkSize(requestValue);
  }
  if (process.env.BULK_IMPORT_CHUNK_SIZE != null) {
    return clampChunkSize(process.env.BULK_IMPORT_CHUNK_SIZE);
  }
  return DEFAULT_CHUNK_SIZE;
}

module.exports = {
  DEFAULT_CHUNK_SIZE,
  MIN_CHUNK_SIZE,
  MAX_CHUNK_SIZE,
  chunkArray,
  clampChunkSize,
  resolveBulkChunkSize,
};
