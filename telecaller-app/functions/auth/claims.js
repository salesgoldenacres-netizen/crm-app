/**
 * Custom claims for managerial / admin gate (Phase 0.1).
 * Scheme: `{ managerial: true }` on the Firebase Auth token.
 * Firestore rules use `request.auth.token.managerial == true`.
 * Break-glass: Admin SDK / execution/stamp_managerial_claims.py only.
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
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
 * Caller may manage claims only when the Auth token already carries the
 * managerial custom claim (SEC-11R). Firestore userRoles alone must not
 * confer claim-management authority — that blocked the linkUserProfile →
 * userRoles → setManagerialClaim self-elevation chain.
 * @param {import('firebase-admin').auth.DecodedIdToken} token
 */
function assertCallerCanManageClaims(token) {
  if (token && token.managerial === true) return;
  throw new HttpsError(
    'permission-denied',
    'Only managerial users can set custom claims.',
  );
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

  assertCallerCanManageClaims(request.auth.token);

  const { uid, managerial, role } = request.data || {};
  if (!uid || typeof uid !== 'string') {
    throw new HttpsError('invalid-argument', 'uid is required');
  }
  if (typeof managerial !== 'boolean') {
    throw new HttpsError('invalid-argument', 'managerial must be a boolean');
  }

  // SEC-11R: belt-and-suspenders — never allow self-elevation without claim.
  if (managerial && uid === request.auth.uid && request.auth.token.managerial !== true) {
    throw new HttpsError(
      'permission-denied',
      'Managerial elevation requires an existing manager.',
    );
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
  let matchedBy = null;
  const byEmail = await db.collection('users').where('email', '==', email).limit(1).get();
  if (!byEmail.empty) {
    userDoc = byEmail.docs[0];
    matchedBy = 'email';
  } else {
    const username = email.split('@')[0].toLowerCase();
    const byUsername = await db
      .collection('users')
      .where('username', '==', username)
      .limit(1)
      .get();
    if (!byUsername.empty) {
      userDoc = byUsername.docs[0];
      matchedBy = 'username';
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

  const role = data.role || 'telecaller';
  const rolesSnap = await db.collection('customRoles').get();
  const customRoles = rolesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const roleIsManagerial = isManagerialRoleCode(role, customRoles);
  const emailVerified = request.auth.token.email_verified === true;

  // SEC-11: never let a bare email/username match confer managerial access.
  // A managerial profile may only be linked when the caller proves control of
  // the *exact* profile email (verified), which closes both username-collision
  // and unverified-email escalation paths. Even then we do NOT stamp the
  // managerial custom claim here — claims are granted only via
  // setManagerialClaim (by an existing manager) or the break-glass admin script
  // (execution/stamp_managerial_claims.py). This disables opportunistic
  // managerial escalation entirely.
  if (roleIsManagerial && !(matchedBy === 'email' && emailVerified)) {
    console.warn(
      `[claims] BLOCKED managerial link attempt uid=${authUid} matchedBy=${matchedBy} emailVerified=${emailVerified} profile=users/${userDoc.id}`
    );
    throw new HttpsError(
      'permission-denied',
      'Managerial profiles require a verified email match and must be elevated by an administrator.'
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

  await db.collection('userRoles').doc(authUid).set({ role }, { merge: true });

  console.log(
    `[claims] linked profile users/${userDoc.id} -> uid=${authUid} (managerial claim NOT auto-granted)`
  );
  return { success: true, userId: userDoc.id, uid: authUid, role };
}

// Callable wrappers. enforceAppCheck: client initializes App Check
// (ReCaptcha v3), so require a valid App Check token (SEC-7).
const CALLABLE_OPTS = { region: 'us-central1', enforceAppCheck: true };

const setManagerialClaim = onCall(CALLABLE_OPTS, (request) =>
  handleSetManagerialClaim(request, admin.firestore())
);

const linkUserProfile = onCall(CALLABLE_OPTS, (request) =>
  handleLinkUserProfile(request, admin.firestore())
);

module.exports = {
  handleSetManagerialClaim,
  handleLinkUserProfile,
  setManagerialClaim,
  linkUserProfile,
  assertCallerCanManageClaims,
  isManagerialRoleCode,
  DEFAULT_MANAGERIAL_ROLES,
};
