/**
 * Lead access guards (SEC-3 IDOR fix).
 *
 * A caller may contact (dial / message) a lead only when:
 *  - they hold the managerial custom claim (token.managerial === true), OR
 *  - the lead is assigned to them.
 *
 * "Assigned to them" is resolved against every identifier the caller can
 * legitimately own, because historical data links leads to either the Auth
 * uid, the `users` document id, or the `users.uid` field. Any of these matching
 * `lead.assignedTo` counts as ownership. Everything else fails closed.
 */
const { HttpsError } = require('firebase-functions/v2/https');

/**
 * @param {{ token?: { managerial?: unknown } } | null | undefined} auth
 * @returns {boolean}
 */
function tokenIsManagerial(auth) {
  return !!(auth && auth.token && auth.token.managerial === true);
}

/**
 * Gather every identifier the caller could be recorded under on a lead.
 * @param {{ uid?: string } | null | undefined} auth
 * @param {FirebaseFirestore.QueryDocumentSnapshot | null} [agentDoc]
 * @returns {Set<string>}
 */
function collectCallerLeadIds(auth, agentDoc) {
  const ids = new Set();
  if (auth && auth.uid) ids.add(auth.uid);
  if (agentDoc) {
    if (agentDoc.id) ids.add(agentDoc.id);
    const data = typeof agentDoc.data === 'function' ? agentDoc.data() : null;
    if (data && data.uid) ids.add(data.uid);
  }
  return ids;
}

/**
 * True when `lead.assignedTo` matches any caller identifier.
 * @param {{ assignedTo?: unknown } | null | undefined} lead
 * @param {Set<string>} callerIds
 * @returns {boolean}
 */
function callerOwnsLead(lead, callerIds) {
  const assigned = lead && typeof lead.assignedTo === 'string' ? lead.assignedTo : '';
  if (!assigned) return false;
  return callerIds.has(assigned);
}

/**
 * Fail closed unless the caller is managerial or owns the lead.
 * @param {object} opts
 * @param {FirebaseFirestore.Firestore} [opts.db]
 * @param {{ uid?: string, token?: object } | null | undefined} opts.auth
 * @param {{ assignedTo?: unknown } | null | undefined} opts.lead
 * @param {FirebaseFirestore.QueryDocumentSnapshot | null} [opts.agentDoc]
 * @returns {Promise<void>}
 */
async function assertCallerCanContactLead({ db, auth, lead, agentDoc = null }) {
  if (!auth || !auth.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  if (tokenIsManagerial(auth)) return;

  const callerIds = collectCallerLeadIds(auth, agentDoc);

  // Resolve the caller's users doc id when it was not already fetched, so that
  // legacy leads keyed by document id are still recognised as owned.
  if (!agentDoc && db) {
    try {
      const snap = await db
        .collection('users')
        .where('uid', '==', auth.uid)
        .limit(1)
        .get();
      if (!snap.empty) {
        callerIds.add(snap.docs[0].id);
        const data = snap.docs[0].data() || {};
        if (data.uid) callerIds.add(data.uid);
      }
    } catch (err) {
      console.error('[lead-access] failed to resolve caller identity:', err.message || err);
    }
  }

  if (callerOwnsLead(lead, callerIds)) return;

  throw new HttpsError(
    'permission-denied',
    'You do not have permission to contact this lead.',
  );
}

module.exports = {
  tokenIsManagerial,
  collectCallerLeadIds,
  callerOwnsLead,
  assertCallerCanContactLead,
};
