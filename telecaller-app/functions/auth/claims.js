/**
 * Custom claims for managerial / admin gate (Phase 0.1).
 * Scheme: `{ managerial: true }` on the Firebase Auth token.
 * Firestore rules use `request.auth.token.managerial == true`.
 * Break-glass: Admin SDK / execution/stamp_managerial_claims.py only.
 */
const { HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

const DEFAULT_MANAGERIAL_ROLES = [
  'admin',
  'upper_management',
  'middle_management',
  'lower_management',
];

/**
 * @param {string} roleCode
 * @param {Array<{ id?: string, isManagerial?: boolean }>} customRoles
 */
function isManagerialRoleCode(roleCode, customRoles) {
  if (!roleCode) return false;
  const found = customRoles.find((r) => r.id === roleCode);
  if (found) return !!found.isManagerial;
  return DEFAULT_MANAGERIAL_ROLES.includes(roleCode);
}

/**
 * Caller may manage claims if token already has managerial claim, OR
 * (transition) Firestore userRoles + customRoles mark them managerial.
 * @param {import('firebase-admin').auth.DecodedIdToken} token
 * @param {FirebaseFirestore.Firestore} db
 */
async function assertCallerCanManageClaims(token, db) {
  if (token.managerial === true) return;

  const roleSnap = await db.doc(`userRoles/${token.uid}`).get();
  if (!roleSnap.exists) {
    throw new HttpsError(
      'permission-denied',
      'Only managerial users can set custom claims.'
    );
  }
  const roleCode = roleSnap.data().role;
  const rolesSnap = await db.collection('customRoles').get();
  const customRoles = rolesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (!isManagerialRoleCode(roleCode, customRoles)) {
    throw new HttpsError(
      'permission-denied',
      'Only managerial users can set custom claims.'
    );
  }
}

/**
 * Set or clear `{ managerial: true }` (and optional role claim) for a UID.
 * @param {object} request - callable request
 * @param {FirebaseFirestore.Firestore} db
 */
async function handleSetManagerialClaim(request, db) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required');
  }

  await assertCallerCanManageClaims(request.auth.token, db);

  const { uid, managerial, role } = request.data || {};
  if (!uid || typeof uid !== 'string') {
    throw new HttpsError('invalid-argument', 'uid is required');
  }
  if (typeof managerial !== 'boolean') {
    throw new HttpsError('invalid-argument', 'managerial must be a boolean');
  }

  const user = await admin.auth().getUser(uid);
  const nextClaims = { ...(user.customClaims || {}) };

  if (managerial) {
    nextClaims.managerial = true;
    if (typeof role === 'string' && role.trim()) {
      nextClaims.role = role.trim();
    } else if (!nextClaims.role) {
      nextClaims.role = 'admin';
    }
  } else {
    delete nextClaims.managerial;
    delete nextClaims.role;
  }

  await admin.auth().setCustomUserClaims(uid, nextClaims);
  console.log(
    `[claims] set managerial=${managerial} for uid=${uid} by=${request.auth.uid}`
  );

  return {
    success: true,
    uid,
    managerial: !!nextClaims.managerial,
    role: nextClaims.role || null,
  };
}

/**
 * Link Auth UID to an existing Firestore users doc (email/username match).
 * Replaces client self-update of `uid` / `password` (blocked by rules).
 * @param {object} request
 * @param {FirebaseFirestore.Firestore} db
 */
async function handleLinkUserProfile(request, db) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required');
  }

  const authUid = request.auth.uid;
  const email = (request.auth.token.email || '').toLowerCase();
  if (!email) {
    throw new HttpsError('failed-precondition', 'Auth user has no email');
  }

  let userDoc = null;
  const byEmail = await db.collection('users').where('email', '==', email).limit(1).get();
  if (!byEmail.empty) {
    userDoc = byEmail.docs[0];
  } else {
    const username = email.split('@')[0].toLowerCase();
    const byUsername = await db
      .collection('users')
      .where('username', '==', username)
      .limit(1)
      .get();
    if (!byUsername.empty) {
      userDoc = byUsername.docs[0];
    }
  }

  if (!userDoc) {
    throw new HttpsError(
      'not-found',
      'No registered user profile matches this account'
    );
  }

  const data = userDoc.data() || {};
  const existingUid = data.uid;
  if (existingUid && existingUid !== authUid) {
    throw new HttpsError(
      'already-exists',
      'This profile is already linked to a different Auth account'
    );
  }

  const updates = {
    uid: authUid,
    email,
    isMigrated: true,
    updatedAt: new Date().toISOString(),
    password: admin.firestore.FieldValue.delete(),
  };
  await userDoc.ref.update(updates);

  const role = data.role || 'telecaller';
  await db.collection('userRoles').doc(authUid).set({ role }, { merge: true });

  // If profile is managerial, ensure claims exist (idempotent stamp).
  const rolesSnap = await db.collection('customRoles').get();
  const customRoles = rolesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (isManagerialRoleCode(role, customRoles)) {
    const authUser = await admin.auth().getUser(authUid);
    const claims = { ...(authUser.customClaims || {}), managerial: true, role };
    await admin.auth().setCustomUserClaims(authUid, claims);
  }

  console.log(`[claims] linked profile users/${userDoc.id} -> uid=${authUid}`);
  return { success: true, userId: userDoc.id, uid: authUid, role };
}

module.exports = {
  handleSetManagerialClaim,
  handleLinkUserProfile,
  isManagerialRoleCode,
  DEFAULT_MANAGERIAL_ROLES,
};
