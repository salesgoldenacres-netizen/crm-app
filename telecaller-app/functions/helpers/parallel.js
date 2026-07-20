/**
 * Controlled concurrency for I/O-bound bulk work.
 */

/**
 * Map over items with at most `concurrency` in-flight promises.
 * Preserves input order in the returned array.
 *
 * @template T, R
 * @param {T[]} items
 * @param {number} concurrency
 * @param {(item: T, index: number) => Promise<R>} fn
 * @returns {Promise<R[]>}
 */
async function mapWithConcurrency(items, concurrency, fn) {
  const list = Array.isArray(items) ? items : [];
  const limit = Math.max(1, Math.floor(Number(concurrency) || 1));
  /** @type {R[]} */
  const results = new Array(list.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const i = nextIndex;
      nextIndex += 1;
      if (i >= list.length) return;
      results[i] = await fn(list[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(limit, list.length || 1) }, () =>
    worker(),
  );
  await Promise.all(workers);
  return results;
}

module.exports = {
  mapWithConcurrency,
};
