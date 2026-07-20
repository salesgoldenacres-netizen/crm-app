/**
 * Shared Firestore write helpers for Cloud Functions.
 *
 * Phase C: call-log writes go through helpers/callLogsRepository (top-level
 * `callLogs` collection + lead summary fields). No embedded array appends.
 */

const admin = require("firebase-admin");
const { createCallLog } = require("./callLogsRepository");

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
 * Append a call log entry to the top-level callLogs collection and update lead summaries.
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} leadId
 * @param {object} logEntry
 * @param {Record<string, unknown>} [extraFields] lead fields merged into the same batch
 * @returns {Promise<string>} callLog id
 */
async function appendCallLog(db, leadId, logEntry, extraFields = {}) {
  return createCallLog(db, leadId, logEntry, extraFields);
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
 * Create-once ingest event for webhook idempotency (claim-before-work gate).
 * Uses Firestore create() so concurrent callers race safely — only one wins.
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
 * Finalize a claimed ingest event after work completes.
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} eventId
 * @param {Record<string, unknown>} fields
 * @returns {Promise<void>}
 */
async function updateIngestEvent(db, eventId, fields) {
  const ref = db.collection("ingestEvents").doc(eventId);
  await ref.update({
    ...fields,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Release an ingest claim so a retriable failure can be reprocessed.
 * Safe only before any durable side effects (e.g. lead create) are committed.
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} eventId
 * @returns {Promise<void>}
 */
async function releaseIngestEvent(db, eventId) {
  const ref = db.collection("ingestEvents").doc(eventId);
  await ref.delete();
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
  updateIngestEvent,
  releaseIngestEvent,
  isInvalidFcmTokenError,
};
