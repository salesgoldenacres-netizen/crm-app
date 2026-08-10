const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const {
  timingSafeEqualString,
  normalizePresentedSecret,
  isSecretConfigured,
  assertWebhookSecret,
  resolveWhatsAppWebhookSecret,
  verifyMetaSignature,
} = require('./secrets');

function signMeta(body, secret) {
  const buf = Buffer.from(body, 'utf8');
  const hex = crypto.createHmac('sha256', secret).update(buf).digest('hex');
  return { buf, header: `sha256=${hex}` };
}

test('timingSafeEqualString matches equal secrets', () => {
  assert.equal(timingSafeEqualString('abc123', 'abc123'), true);
});

test('timingSafeEqualString rejects mismatches and non-strings', () => {
  assert.equal(timingSafeEqualString('abc123', 'abc124'), false);
  assert.equal(timingSafeEqualString('short', 'longer'), false);
  assert.equal(timingSafeEqualString(null, 'x'), false);
});

test('normalizePresentedSecret strips Bearer prefix', () => {
  assert.equal(normalizePresentedSecret('Bearer secret-value'), 'secret-value');
  assert.equal(normalizePresentedSecret('  secret-value  '), 'secret-value');
  assert.equal(normalizePresentedSecret(''), '');
});

test('assertWebhookSecret fails closed when expected missing', () => {
  const r = assertWebhookSecret({
    presented: 'anything',
    expected: '',
    context: 'test',
  });
  assert.equal(r.ok, false);
  assert.equal(r.status, 401);
});

test('assertWebhookSecret fails closed when presented missing', () => {
  const r = assertWebhookSecret({
    presented: '',
    expected: 'configured-secret',
    context: 'test',
  });
  assert.equal(r.ok, false);
  assert.equal(r.status, 401);
});

test('assertWebhookSecret accepts valid secret', () => {
  const r = assertWebhookSecret({
    presented: 'Bearer configured-secret',
    expected: 'configured-secret',
    context: 'test',
  });
  assert.equal(r.ok, true);
});

test('isSecretConfigured rejects empty', () => {
  assert.equal(isSecretConfigured(''), false);
  assert.equal(isSecretConfigured('  '), false);
  assert.equal(isSecretConfigured('ok'), true);
});

test('verifyMetaSignature accepts a correct sha256 HMAC', () => {
  const { buf, header } = signMeta('{"object":"page"}', 'app-secret');
  const r = verifyMetaSignature({
    rawBody: buf,
    signature: header,
    appSecret: 'app-secret',
  });
  assert.equal(r.ok, true);
});

test('verifyMetaSignature fails closed without app secret', () => {
  const { buf, header } = signMeta('{"object":"page"}', 'app-secret');
  const r = verifyMetaSignature({ rawBody: buf, signature: header, appSecret: '' });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'app_secret_not_configured');
});

test('verifyMetaSignature rejects missing / malformed / mismatched signatures', () => {
  const { buf } = signMeta('{"object":"page"}', 'app-secret');
  assert.equal(
    verifyMetaSignature({ rawBody: buf, signature: '', appSecret: 'app-secret' }).reason,
    'missing_signature',
  );
  assert.equal(
    verifyMetaSignature({ rawBody: buf, signature: 'deadbeef', appSecret: 'app-secret' })
      .reason,
    'malformed_signature',
  );
  assert.equal(
    verifyMetaSignature({
      rawBody: buf,
      signature: 'sha256=00ff',
      appSecret: 'app-secret',
    }).reason,
    'signature_mismatch',
  );
});

test('verifyMetaSignature rejects when raw body is unavailable', () => {
  const { header } = signMeta('{"object":"page"}', 'app-secret');
  const r = verifyMetaSignature({
    rawBody: undefined,
    signature: header,
    appSecret: 'app-secret',
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'missing_raw_body');
});

test('verifyMetaSignature is body-sensitive (tamper detection)', () => {
  const { header } = signMeta('{"object":"page"}', 'app-secret');
  const tampered = Buffer.from('{"object":"page","evil":true}', 'utf8');
  const r = verifyMetaSignature({
    rawBody: tampered,
    signature: header,
    appSecret: 'app-secret',
  });
  assert.equal(r.ok, false);
});

test('resolveWhatsAppWebhookSecret prefers evolution secret', () => {
  assert.equal(
    resolveWhatsAppWebhookSecret({
      evolutionWebhookSecret: 'evo',
      apiWebhookKey: 'api',
    }),
    'evo'
  );
  assert.equal(
    resolveWhatsAppWebhookSecret({ apiWebhookKey: 'api' }),
    'api'
  );
  assert.equal(resolveWhatsAppWebhookSecret({}), '');
});
