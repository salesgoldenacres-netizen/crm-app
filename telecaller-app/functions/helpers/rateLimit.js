/**
 * Lightweight in-memory fixed-window rate limiter (SEC-8).
 *
 * Cloud Functions instances are ephemeral and horizontally scaled, so this is a
 * best-effort throttle per warm instance rather than a global guarantee. It
 * still meaningfully blunts abusive bursts (e.g. bulk-import hammering) without
 * adding an external dependency or datastore round-trips on the hot path.
 * For hard global limits, front the endpoint with Cloud Armor / API Gateway.
 */

/**
 * Derive a best-effort client key from an Express request.
 * @param {import('express').Request} req
 * @returns {string}
 */
function clientKeyFromRequest(req) {
  const fwd = req.headers && req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) {
    return fwd.split(',')[0].trim();
  }
  if (Array.isArray(fwd) && fwd.length) {
    return String(fwd[0]).trim();
  }
  return (req.ip || (req.socket && req.socket.remoteAddress) || 'unknown').toString();
}

/**
 * Create an Express middleware enforcing `max` requests per `windowMs` per key.
 * @param {object} [opts]
 * @param {number} [opts.windowMs] - window length in ms (default 60s)
 * @param {number} [opts.max] - max requests per window (default 30)
 * @param {(req: import('express').Request) => string} [opts.keyGenerator]
 * @param {string} [opts.message] - client response body on limit
 * @returns {(req, res, next) => void}
 */
function createRateLimiter(opts = {}) {
  const windowMs = Number.isFinite(opts.windowMs) ? opts.windowMs : 60_000;
  const max = Number.isFinite(opts.max) ? opts.max : 30;
  const keyGenerator = opts.keyGenerator || clientKeyFromRequest;
  const message = opts.message || 'Too Many Requests';

  /** @type {Map<string, { count: number, resetAt: number }>} */
  const hits = new Map();

  return function rateLimit(req, res, next) {
    const now = Date.now();
    const key = keyGenerator(req) || 'unknown';

    // Opportunistic sweep so the map cannot grow unbounded on a warm instance.
    if (hits.size > 10_000) {
      for (const [k, v] of hits) {
        if (v.resetAt <= now) hits.delete(k);
      }
    }

    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;

    if (entry.count > max) {
      const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.set('Retry-After', String(retryAfterSec));
      console.warn(
        `[rate-limit] REJECTED key=${key} count=${entry.count} max=${max} windowMs=${windowMs}`,
      );
      return res.status(429).send(message);
    }

    return next();
  };
}

module.exports = {
  createRateLimiter,
  clientKeyFromRequest,
};
