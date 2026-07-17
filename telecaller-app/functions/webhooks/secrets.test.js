const test = require('node:test');
const assert = require('node:assert/strict');
const {
  timingSafeEqualString,
  normalizePresentedSecret,
  isSecretConfigured,
  assertWebhookSecret,
  resolveWhatsAppWebhookSecret,
} = require('./secrets');

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
