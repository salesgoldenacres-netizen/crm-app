const test = require('node:test');
const assert = require('node:assert/strict');
const { assertCallerCanSendFcmNotification } = require('./fcm');

test('assertCallerCanSendFcmNotification allows self-target', () => {
  assert.doesNotThrow(() =>
    assertCallerCanSendFcmNotification({ uid: 'user-1', token: {} }, 'user-1'),
  );
});

test('assertCallerCanSendFcmNotification allows managerial target', () => {
  assert.doesNotThrow(() =>
    assertCallerCanSendFcmNotification(
      { uid: 'mgr-1', token: { managerial: true } },
      'user-2',
    ),
  );
});

test('assertCallerCanSendFcmNotification denies cross-user without claim (SEC-FCM-1)', () => {
  assert.throws(
    () =>
      assertCallerCanSendFcmNotification(
        { uid: 'user-1', token: {} },
        'user-2',
      ),
    /only send notifications to yourself/i,
  );
});

test('assertCallerCanSendFcmNotification requires auth', () => {
  assert.throws(
    () => assertCallerCanSendFcmNotification(null, 'user-1'),
    /authenticated/i,
  );
});
