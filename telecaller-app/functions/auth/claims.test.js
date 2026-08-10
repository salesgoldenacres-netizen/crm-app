const test = require('node:test');
const assert = require('node:assert/strict');
const {
  assertCallerCanManageClaims,
  handleSetManagerialClaim,
} = require('./claims');

test('assertCallerCanManageClaims allows token with managerial claim', () => {
  assert.doesNotThrow(() =>
    assertCallerCanManageClaims({ uid: 'mgr-1', managerial: true }),
  );
});

test('assertCallerCanManageClaims rejects Firestore-only managerial role (SEC-11R)', () => {
  assert.throws(
    () => assertCallerCanManageClaims({ uid: 'user-1', role: 'admin' }),
    /Only managerial users can set custom claims/,
  );
});

test('assertCallerCanManageClaims rejects missing claim', () => {
  assert.throws(
    () => assertCallerCanManageClaims({ uid: 'user-1' }),
    /Only managerial users can set custom claims/,
  );
});

test('handleSetManagerialClaim blocks self-elevation without claim', async () => {
  const request = {
    auth: { uid: 'user-1', token: { uid: 'user-1' } },
    data: { uid: 'user-1', managerial: true },
  };
  await assert.rejects(
    () => handleSetManagerialClaim(request, {}),
    /Only managerial users can set custom claims/,
  );
});

test('handleSetManagerialClaim allows manager to elevate another user', async () => {
  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp({ projectId: 'test-project' });
  }

  let captured = null;
  const originalGetUser = admin.auth().getUser.bind(admin.auth());
  const originalSetClaims = admin.auth().setCustomUserClaims.bind(admin.auth());
  admin.auth().getUser = async () => ({ customClaims: {} });
  admin.auth().setCustomUserClaims = async (uid, claims) => {
    captured = { uid, claims };
  };

  try {
    const request = {
      auth: { uid: 'mgr-1', token: { uid: 'mgr-1', managerial: true } },
      data: { uid: 'user-2', managerial: true, role: 'lower_management' },
    };
    const result = await handleSetManagerialClaim(request, {});
    assert.equal(result.success, true);
    assert.equal(captured.uid, 'user-2');
    assert.equal(captured.claims.managerial, true);
    assert.equal(captured.claims.role, 'lower_management');
  } finally {
    admin.auth().getUser = originalGetUser;
    admin.auth().setCustomUserClaims = originalSetClaims;
  }
});
