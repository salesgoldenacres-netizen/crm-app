/**
 * Shared Firestore write helpers for Cloud Functions.
 *
 * DEFERRED (callLogs extraction): dual-write to a top-level `callLogs`
 * collection + cap the embedded lead.callLogs array. Until then, prefer
 * appendCallLog (arrayUnion) for race-safe appends.
 */

const admin = require("firebase-admin");

/**
 * @param {unknown} err
 * @returns {boolean}
 */
function isAlreadyExistsError(err) {
  if (!err || typeof err !== "object") return false;
  const code = /** @type {{ code?: string|number }} */ (err).code;
  return code === 6 || code === "already-exists" || code === "ALREADY_EXISTS";
}

/**
 * Append a call log entry without read-modify-write races.
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} leadId
 * @param {object} logEntry
 * @param {Record<string, unknown>} [extraFields]
 */
async function appendCallLog(db, leadId, logEntry, extraFields = {}) {
  await db
    .collection("leads")
    .doc(leadId)
    .update({
      updatedAt: new Date().toISOString(),
      callLogs: admin.firestore.FieldValue.arrayUnion(logEntry),
      ...extraFields,
    });
}

/**
 * Write an audit log with an auto-generated document ID.
 * @param {FirebaseFirestore.Firestore} db
 * @param {{ action: string, details: string, user: string }} input
 * @returns {Promise<string>} document id
 */
async function writeAuditLog(db, input) {
  const ref = db.collection("auditLogs").doc();
  await ref.set({
    id: ref.id,
    timestamp: new Date().toISOString(),
    action: input.action,
    details: input.details,
    user: input.user,
  });
  return ref.id;
}

/**
 * Create-once ingest event for webhook idempotency (after auth).
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} eventId
 * @param {Record<string, unknown>} payload
 * @returns {Promise<{ created: boolean }>}
 */
async function claimIngestEvent(db, eventId, payload) {
  const ref = db.collection("ingestEvents").doc(eventId);
  try {
    await ref.create({
      ...payload,
      createdAt: new Date().toISOString(),
    });
    return { created: true };
  } catch (err) {
    if (isAlreadyExistsError(err)) {
      return { created: false };
    }
    throw err;
  }
}

/**
 * FCM error codes / messages that mean the token should be pruned.
 * @param {unknown} err
 * @returns {boolean}
 */
function isInvalidFcmTokenError(err) {
  if (!err || typeof err !== "object") return false;
  const code = String(/** @type {{ code?: string }} */ (err).code || "");
  const message = String(/** @type {{ message?: string }} */ (err).message || "");
  return (
    code === "messaging/registration-token-not-registered" ||
    code === "messaging/invalid-registration-token" ||
    /registration-token-not-registered/i.test(message) ||
    /invalid-registration-token/i.test(message)
  );
}

module.exports = {
  isAlreadyExistsError,
  appendCallLog,
  writeAuditLog,
  claimIngestEvent,
  isInvalidFcmTokenError,
};
