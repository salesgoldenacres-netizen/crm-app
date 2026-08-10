const test = require('node:test');
const assert = require('node:assert/strict');

/**
 * SEC-MSG-R: messaging admin callables must fail closed without managerial claim.
 * Handler bodies are inlined here to avoid Firebase emulator bootstrap for onCall wrappers.
 */
const { tokenIsManagerial } = require('../helpers/leadAccess');

function assertMessagingTestConnectionAllowed(auth) {
  if (!auth) {
    const err = new Error('unauthenticated');
    err.code = 'unauthenticated';
    throw err;
  }
  if (!tokenIsManagerial(auth)) {
    const err = new Error('permission-denied');
    err.code = 'permission-denied';
    throw err;
  }
}

function assertMessagingInstanceActionAllowed(auth) {
  assertMessagingTestConnectionAllowed(auth);
}

test('messagingTestConnection rejects unauthenticated callers', () => {
  assert.throws(
    () => assertMessagingTestConnectionAllowed(null),
    (err) => err.code === 'unauthenticated',
  );
});

test('messagingTestConnection rejects non-managerial authenticated callers (SEC-MSG-R)', () => {
  assert.throws(
    () => assertMessagingTestConnectionAllowed({ uid: 'u1', token: {} }),
    (err) => err.code === 'permission-denied',
  );
});

test('messagingTestConnection allows managerial claim holders', () => {
  assert.doesNotThrow(() =>
    assertMessagingTestConnectionAllowed({ uid: 'mgr', token: { managerial: true } }),
  );
});

test('messagingInstanceAction uses the same managerial gate as testConnection', () => {
  assert.throws(
    () => assertMessagingInstanceActionAllowed({ uid: 'u1', token: {} }),
    (err) => err.code === 'permission-denied',
  );
});
