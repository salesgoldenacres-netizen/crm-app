/**
 * SEC-1 callables — server-side lead aggregates and phone dedup.
 * Admin SDK bypasses client read rules; authorization enforced here.
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { tokenIsManagerial } = require('../helpers/leadAccess');
const { writeAuditLog } = require('../helpers/firestoreWrites');

const CALLABLE_OPTS = { region: 'us-central1', enforceAppCheck: true };

const PIPELINE_STATUSES = ['new', 'contacted', 'interested', 'booked', 'reserved'];

/**
 * @param {FirebaseFirestore.Query} q
 * @returns {Promise<number>}
 */
async function countQuery(q) {
  const snap = await q.count().get();
  return snap.data().count;
}

/**
 * @param {FirebaseFirestore.Firestore} db
 * @param {boolean} isManagerial
 * @param {string} authUid
 * @param {string|undefined} projectId
 * @param {Array<[string, FirebaseFirestore.WhereFilterOp, unknown]>} extra
 */
function buildLeadCountQuery(db, isManagerial, authUid, projectId, extra = []) {
  /** @type {FirebaseFirestore.Query} */
  let q = db.collection('leads');
  if (projectId) q = q.where('projectId', '==', projectId);
  if (!isManagerial) q = q.where('assignedToUid', '==', authUid);
  for (const [field, op, value] of extra) {
    q = q.where(field, op, value);
  }
  return q;
}

/**
 * @param {object} request
 * @param {FirebaseFirestore.Firestore} db
 */
async function handleGetLeadPipelineCounts(request, db) {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const { projectId, assignedToUsername } = request.data || {};
  const scopedProjectId =
    typeof projectId === 'string' && projectId.trim() ? projectId.trim() : undefined;
  const isManagerial = tokenIsManagerial(request.auth);
  const authUid = request.auth.uid;

  const statusCounts = {};
  await Promise.all(
    PIPELINE_STATUSES.map(async (status) => {
      const q = buildLeadCountQuery(db, isManagerial, authUid, scopedProjectId, [
        ['status', '==', status],
      ]);
      statusCounts[status] = await countQuery(q);
    }),
  );

  const totalQ = buildLeadCountQuery(db, isManagerial, authUid, scopedProjectId);
  const totalCount = await countQuery(totalQ);

  let callsLoggedToday = 0;
  if (
    typeof assignedToUsername === 'string' &&
    assignedToUsername.trim() &&
    isManagerial
  ) {
    const q = buildLeadCountQuery(db, true, authUid, scopedProjectId, [
      ['assignedTo', '==', assignedToUsername.trim()],
    ]);
    callsLoggedToday = await countQuery(q);
  } else if (!isManagerial) {
    callsLoggedToday = totalCount;
  }

  const bookedCount = statusCounts.booked || 0;
  const reservedCount = statusCounts.reserved || 0;

  return {
    newCount: statusCounts.new || 0,
    contactedCount: statusCounts.contacted || 0,
    interestedCount: statusCounts.interested || 0,
    bookedCount,
    reservedCount,
    totalCount,
    callsLoggedToday,
  };
}

/**
 * Agent-visible lead slice for dedup — no cross-owner leakage.
 * @param {Record<string, unknown>} data
 * @param {string} authUid
 * @param {boolean} isManagerial
 */
function leadVisibleToCaller(data, authUid, isManagerial) {
  if (isManagerial) return true;
  const assignedToUid = typeof data.assignedToUid === 'string' ? data.assignedToUid : '';
  if (assignedToUid && assignedToUid === authUid) return true;
  const assignedTo = typeof data.assignedTo === 'string' ? data.assignedTo : '';
  return !assignedTo || assignedTo === 'Unassigned';
}

/**
 * @param {object} request
 * @param {FirebaseFirestore.Firestore} db
 */
async function handleFindLeadsByPhone(request, db) {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const { phone, max = 10 } = request.data || {};
  const normalizedPhone = typeof phone === 'string' ? phone.trim() : '';
  if (!normalizedPhone) {
    return { leads: [] };
  }

  const limit = Math.min(Math.max(Number(max) || 10, 1), 25);
  const isManagerial = tokenIsManagerial(request.auth);
  const snap = await db
    .collection('leads')
    .where('phone', '==', normalizedPhone)
    .limit(limit)
    .get();

  const leads = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data() || {};
    if (!leadVisibleToCaller(data, request.auth.uid, isManagerial)) return;
    leads.push({ id: docSnap.id, ...data });
  });

  return { leads };
}

/**
 * @param {object} request
 * @param {FirebaseFirestore.Firestore} db
 */
async function handleLogAuditEvent(request, db) {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const { action, details, user, changes } = request.data || {};
  if (!action || typeof action !== 'string') {
    throw new HttpsError('invalid-argument', 'action is required');
  }

  const actorLabel =
    typeof user === 'string' && user.trim() ? user.trim() : request.auth.uid;

  const id = await writeAuditLog(db, {
    action: action.trim(),
    details: typeof details === 'string' ? details : '',
    user: actorLabel,
  });

  if (changes && typeof changes === 'object') {
    await db.collection('auditLogs').doc(id).set({ changes }, { merge: true });
  }

  return { id };
}

const getLeadPipelineCounts = onCall(CALLABLE_OPTS, async (request) => {
  const db = admin.firestore();
  return handleGetLeadPipelineCounts(request, db);
});

const findLeadsByPhone = onCall(CALLABLE_OPTS, async (request) => {
  const db = admin.firestore();
  return handleFindLeadsByPhone(request, db);
});

const logAuditEventCallable = onCall(CALLABLE_OPTS, async (request) => {
  const db = admin.firestore();
  return handleLogAuditEvent(request, db);
});

module.exports = {
  CALLABLE_OPTS,
  handleGetLeadPipelineCounts,
  handleFindLeadsByPhone,
  handleLogAuditEvent,
  leadVisibleToCaller,
  getLeadPipelineCounts,
  findLeadsByPhone,
  logAuditEventCallable,
};
