/**
 * Webhook secret helpers — fail-closed, timing-safe compare.
 * Secrets come from settings/integrations_secrets and/or process.env.
 * Never ship guessable defaults.
 */
const crypto = require('crypto');

const ENV_SECRET_KEYS = {
  googleWebhookKey: 'GOOGLE_WEBHOOK_KEY',
  metaVerifyToken: 'META_VERIFY_TOKEN',
  apiWebhookKey: 'API_WEBHOOK_KEY',
  evolutionWebhookSecret: 'EVOLUTION_WEBHOOK_SECRET',
  metaAccessToken: 'META_ACCESS_TOKEN',
  // App secret used to verify Meta X-Hub-Signature-256 (SEC-4).
  metaAppSecret: 'META_APP_SECRET',
  // IVR provider tokens — read via the merged loader, never the public doc (SEC-2).
  exotelToken: 'EXOTEL_TOKEN',
  twilioAuthToken: 'TWILIO_AUTH_TOKEN',
};

/**
 * Constant-time string equality. Length mismatch returns false without leaking
 * which side was longer via early return on content compare.
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
function timingSafeEqualString(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    // Burn a compare so length-mismatch path is not trivially faster on content.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Strip Bearer prefix and trim.
 * @param {unknown} value
 * @returns {string}
 */
function normalizePresentedSecret(value) {
  if (value == null) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  return raw.replace(/^Bearer\s+/i, '').trim();
}

/**
 * True when a configured secret is non-empty after trim.
 * @param {unknown} value
 * @returns {boolean}
 */
function isSecretConfigured(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Merge Firestore public + secret integration docs with env overrides.
 * Secret fields default to empty (fail closed) — never hardcode defaults.
 * @param {FirebaseFirestore.Firestore} db
 * @returns {Promise<Record<string, unknown>>}
 */
async function loadIntegrationSettings(db) {
  const combined = {
    googleWebhookKey: '',
    metaVerifyToken: '',
    metaAccessToken: '',
    metaAppSecret: '',
    apiWebhookKey: '',
    evolutionWebhookSecret: '',
  };

  try {
    const [publicSnap, secretSnap] = await Promise.all([
      db.doc('settings/integrations').get(),
      db.doc('settings/integrations_secrets').get(),
    ]);
    if (publicSnap.exists) {
      Object.assign(combined, publicSnap.data());
    }
    if (secretSnap.exists) {
      Object.assign(combined, secretSnap.data());
    }
  } catch (err) {
    console.error('Error fetching integration settings:', err.message || err);
  }

  for (const [field, envName] of Object.entries(ENV_SECRET_KEYS)) {
    const fromEnv = process.env[envName];
    if (isSecretConfigured(fromEnv)) {
      combined[field] = fromEnv.trim();
    }
  }

  return combined;
}

/**
 * Resolve WhatsApp/Evolution webhook secret (dedicated, else API key).
 * @param {Record<string, unknown>} settings
 * @returns {string}
 */
function resolveWhatsAppWebhookSecret(settings) {
  if (isSecretConfigured(settings.evolutionWebhookSecret)) {
    return String(settings.evolutionWebhookSecret).trim();
  }
  if (isSecretConfigured(settings.apiWebhookKey)) {
    return String(settings.apiWebhookKey).trim();
  }
  return '';
}

/**
 * Validate presented secret against expected. Fail closed if expected missing.
 * Logs rejection reason without secret values.
 * @param {object} opts
 * @param {unknown} opts.presented
 * @param {unknown} opts.expected
 * @param {string} opts.context - log label (e.g. 'generic_webhook')
 * @returns {{ ok: true } | { ok: false, status: number, message: string }}
 */
function assertWebhookSecret({ presented, expected, context }) {
  if (!isSecretConfigured(expected)) {
    console.warn(`[webhook-auth] REJECTED ${context}: secret not configured`);
    return { ok: false, status: 401, message: 'Unauthorized' };
  }
  const presentedNorm = normalizePresentedSecret(presented);
  if (!presentedNorm) {
    console.warn(`[webhook-auth] REJECTED ${context}: missing presented secret`);
    return { ok: false, status: 401, message: 'Unauthorized' };
  }
  if (!timingSafeEqualString(presentedNorm, String(expected).trim())) {
    console.warn(`[webhook-auth] REJECTED ${context}: invalid secret`);
    return { ok: false, status: 401, message: 'Unauthorized' };
  }
  return { ok: true };
}

/**
 * Verify a Meta webhook `X-Hub-Signature-256` header (SEC-4).
 * Meta signs the raw request body with the app secret: `sha256=<hex hmac>`.
 * Fails closed if the app secret is not configured or the signature is
 * missing / malformed / mismatched. Never logs secret material.
 *
 * @param {object} opts
 * @param {Buffer|string|undefined} opts.rawBody - exact bytes Meta POSTed
 * @param {unknown} opts.signature - value of the X-Hub-Signature-256 header
 * @param {unknown} opts.appSecret - Meta app secret (from merged loader)
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
function verifyMetaSignature({ rawBody, signature, appSecret }) {
  if (!isSecretConfigured(appSecret)) {
    return { ok: false, reason: 'app_secret_not_configured' };
  }
  const presented = typeof signature === 'string' ? signature.trim() : '';
  if (!presented) {
    return { ok: false, reason: 'missing_signature' };
  }
  const match = /^sha256=([A-Fa-f0-9]+)$/.exec(presented);
  if (!match) {
    return { ok: false, reason: 'malformed_signature' };
  }
  const provided = match[1].toLowerCase();

  let bodyBuffer;
  if (Buffer.isBuffer(rawBody)) {
    bodyBuffer = rawBody;
  } else if (typeof rawBody === 'string') {
    bodyBuffer = Buffer.from(rawBody, 'utf8');
  } else {
    // No raw body captured — cannot verify, fail closed.
    return { ok: false, reason: 'missing_raw_body' };
  }

  const expected = crypto
    .createHmac('sha256', String(appSecret))
    .update(bodyBuffer)
    .digest('hex');

  if (!timingSafeEqualString(provided, expected)) {
    return { ok: false, reason: 'signature_mismatch' };
  }
  return { ok: true };
}

module.exports = {
  timingSafeEqualString,
  normalizePresentedSecret,
  isSecretConfigured,
  loadIntegrationSettings,
  resolveWhatsAppWebhookSecret,
  assertWebhookSecret,
  verifyMetaSignature,
  ENV_SECRET_KEYS,
};
