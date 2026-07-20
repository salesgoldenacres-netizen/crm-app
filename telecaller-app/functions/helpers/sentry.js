/**
 * Optional Sentry for Cloud Functions.
 *
 * Enabled only when SENTRY_DSN is set. Missing DSN → structured warning, not a deploy blocker.
 * No full APM (tracesSampleRate: 0).
 */

let Sentry = null;
let enabled = false;
let warnedMissing = false;

/**
 * Initialize once at cold start. Safe to call repeatedly.
 * @returns {boolean}
 */
function initFunctionsSentry() {
  const dsn = String(process.env.SENTRY_DSN || "").trim();
  if (!dsn) {
    if (!warnedMissing) {
      console.warn(
        JSON.stringify({
          event: "sentry_disabled",
          reason: "SENTRY_DSN not set",
          note: "not a deploy blocker",
        }),
      );
      warnedMissing = true;
    }
    return false;
  }

  if (enabled) return true;

  try {
    // Lazy require so local tests without the package still load helpers.
    Sentry = require("@sentry/node");
    Sentry.init({
      dsn,
      tracesSampleRate: 0,
      sendDefaultPii: false,
    });
    enabled = true;
    console.log(JSON.stringify({ event: "sentry_initialized" }));
    return true;
  } catch (err) {
    console.warn(
      JSON.stringify({
        event: "sentry_init_failed",
        message: err && err.message ? err.message : String(err),
      }),
    );
    return false;
  }
}

/**
 * @param {unknown} err
 * @param {Record<string, unknown>} [extra]
 */
function captureException(err, extra) {
  if (!enabled || !Sentry) return;
  try {
    Sentry.captureException(err, extra ? { extra } : undefined);
  } catch {
    // never break the request path
  }
}

/**
 * Light wrap for critical handlers — capture then rethrow.
 * @template T
 * @param {string} handler
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
async function withSentry(handler, fn) {
  try {
    return await fn();
  } catch (err) {
    captureException(err, { handler });
    throw err;
  }
}

function isSentryEnabled() {
  return enabled;
}

module.exports = {
  initFunctionsSentry,
  captureException,
  withSentry,
  isSentryEnabled,
};
