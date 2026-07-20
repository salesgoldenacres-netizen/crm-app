/**
 * Bounded exponential backoff for Firestore transaction contention.
 * Phase D: instrument counters / round-robin — no sharding.
 */

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_BASE_DELAY_MS = 40;
const DEFAULT_MAX_DELAY_MS = 2000;

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Detect Firestore / gRPC contention / abort errors that are safe to retry.
 * @param {unknown} err
 * @returns {boolean}
 */
function isContentionError(err) {
  if (!err || typeof err !== "object") return false;
  const code = /** @type {{ code?: string|number }} */ (err).code;
  const message = String(/** @type {{ message?: string }} */ (err).message || "");
  if (code === 10 || code === "aborted" || code === "ABORTED") return true;
  if (code === 4 || code === "deadline-exceeded" || code === "DEADLINE_EXCEEDED") {
    return true;
  }
  if (code === 8 || code === "resource-exhausted" || code === "RESOURCE_EXHAUSTED") {
    return true;
  }
  if (/aborted|contention|too much contention|failed precondition/i.test(message)) {
    return true;
  }
  return false;
}

/**
 * Delay for attempt index (0-based) with exponential backoff + light jitter.
 * @param {number} attemptIndex
 * @param {{ baseDelayMs?: number, maxDelayMs?: number }} [opts]
 * @returns {number}
 */
function backoffDelayMs(attemptIndex, opts = {}) {
  const base = opts.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const max = opts.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const exp = Math.min(max, base * 2 ** Math.max(0, attemptIndex));
  const jitter = Math.floor(Math.random() * Math.min(25, exp * 0.2 + 1));
  return Math.min(max, exp + jitter);
}

/**
 * Run an async function with bounded retries on contention errors.
 * @template T
 * @param {() => Promise<T>} fn
 * @param {{
 *   maxAttempts?: number,
 *   baseDelayMs?: number,
 *   maxDelayMs?: number,
 *   label?: string,
 *   onRetry?: (info: { attempt: number, err: unknown, delayMs: number }) => void,
 *   sleepFn?: (ms: number) => Promise<void>,
 * }} [opts]
 * @returns {Promise<{ value: T, attempts: number, retries: number }>}
 */
async function withExponentialBackoff(fn, opts = {}) {
  const maxAttempts = Math.max(1, opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
  const sleepFn = opts.sleepFn || sleep;
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const value = await fn();
      return { value, attempts: attempt, retries: attempt - 1 };
    } catch (err) {
      lastErr = err;
      const retryable = isContentionError(err);
      if (!retryable || attempt >= maxAttempts) {
        throw Object.assign(err instanceof Error ? err : new Error(String(err)), {
          attempts: attempt,
          retries: attempt - 1,
          contention: retryable,
          label: opts.label || null,
        });
      }
      const delayMs = backoffDelayMs(attempt - 1, opts);
      if (typeof opts.onRetry === "function") {
        opts.onRetry({ attempt, err, delayMs });
      }
      await sleepFn(delayMs);
    }
  }
  throw lastErr;
}

/**
 * Firestore runTransaction wrapped with contention retries + structured logging hooks.
 * @template T
 * @param {FirebaseFirestore.Firestore} db
 * @param {(txn: FirebaseFirestore.Transaction) => Promise<T>} updateFunction
 * @param {{
 *   maxAttempts?: number,
 *   baseDelayMs?: number,
 *   maxDelayMs?: number,
 *   label?: string,
 *   log?: (payload: Record<string, unknown>) => void,
 * }} [opts]
 * @returns {Promise<T>}
 */
async function runTransactionWithRetry(db, updateFunction, opts = {}) {
  const label = opts.label || "transaction";
  const log =
    opts.log ||
    ((payload) => {
      console.log(JSON.stringify(payload));
    });

  try {
    const { value, attempts, retries } = await withExponentialBackoff(
      () => db.runTransaction(updateFunction),
      {
        maxAttempts: opts.maxAttempts,
        baseDelayMs: opts.baseDelayMs,
        maxDelayMs: opts.maxDelayMs,
        label,
        onRetry: ({ attempt, err, delayMs }) => {
          log({
            event: "firestore_transaction_contention",
            label,
            attempt,
            delayMs,
            code: err && /** @type {{ code?: unknown }} */ (err).code,
            message: err instanceof Error ? err.message : String(err),
          });
        },
      },
    );
    if (retries > 0) {
      log({
        event: "firestore_transaction_retry_ok",
        label,
        attempts,
        retries,
      });
    }
    return value;
  } catch (err) {
    log({
      event: "firestore_transaction_failed",
      label,
      attempts: /** @type {{ attempts?: number }} */ (err).attempts || null,
      retries: /** @type {{ retries?: number }} */ (err).retries || null,
      contention: Boolean(/** @type {{ contention?: boolean }} */ (err).contention),
      code: err && /** @type {{ code?: unknown }} */ (err).code,
      message: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

module.exports = {
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_BASE_DELAY_MS,
  DEFAULT_MAX_DELAY_MS,
  sleep,
  isContentionError,
  backoffDelayMs,
  withExponentialBackoff,
  runTransactionWithRetry,
};
