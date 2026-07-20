/**
 * Phase C — top-level callLogs collection writes (Cloud Functions).
 * Never appends to embedded lead.callLogs[].
 */

const admin = require("firebase-admin");

const SYSTEM_CALL_AGENTS = new Set([
  "system",
  "System (Auto)",
  "system_webhook",
]);

/**
 * @param {string | undefined | null} agent
 * @returns {boolean}
 */
function isSystemCallAgent(agent) {
  if (!agent) return false;
  return SYSTEM_CALL_AGENTS.has(String(agent));
}

/**
 * @param {object} logEntry
 * @param {{ lastAgentId?: string|null }} [options]
 * @returns {Record<string, unknown>}
 */
function buildLeadCallSummaryPatch(logEntry, options = {}) {
  const now = new Date().toISOString();
  const at = logEntry.date || now;
  const patch = {
    lastCallAt: at,
    lastCallOutcome: logEntry.status || "",
    lastCallAgent: logEntry.agent || "",
    lastCallNote: String(logEntry.note || "").slice(0, 200),
    updatedAt: now,
    callCount: admin.firestore.FieldValue.increment(1),
  };
  if (options.lastAgentId) {
    patch.lastAgentId = options.lastAgentId;
  }
  if (!isSystemCallAgent(logEntry.agent)) {
    patch.hasAgentCall = true;
  }
  return patch;
}

/**
 * Create a top-level callLogs doc + update lead summaries (and optional extra fields).
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} leadId
 * @param {object} logEntry
 * @param {Record<string, unknown>} [extraLeadFields]
 * @param {{ id?: string, lastAgentId?: string|null, skipProductivity?: boolean, migratedFromEmbedded?: boolean }} [options]
 * @returns {Promise<string>} callLog document id
 */
async function createCallLog(db, leadId, logEntry, extraLeadFields = {}, options = {}) {
  const callLogRef = options.id
    ? db.collection("callLogs").doc(options.id)
    : db.collection("callLogs").doc();
  const id = callLogRef.id;
  const now = new Date().toISOString();
  const date = logEntry.date || now;

  const callLogDoc = {
    ...logEntry,
    id,
    leadId,
    date,
    createdAt: now,
  };
  if (options.skipProductivity) callLogDoc.skipProductivity = true;
  if (options.migratedFromEmbedded) callLogDoc.migratedFromEmbedded = true;
  if (options.embeddedIndex != null) callLogDoc.embeddedIndex = options.embeddedIndex;

  const leadPatch = {
    ...buildLeadCallSummaryPatch(logEntry, { lastAgentId: options.lastAgentId }),
    ...extraLeadFields,
  };

  const batch = db.batch();
  batch.set(callLogRef, callLogDoc);
  batch.update(db.collection("leads").doc(leadId), leadPatch);
  await batch.commit();
  return id;
}

/**
 * Reverse newest-first Firestore results into ascending chronological order.
 * @param {Array<object>} logsNewestFirst
 * @returns {Array<object>}
 */
function orderRecentCallLogsChronologically(logsNewestFirst) {
  return [...logsNewestFirst].reverse();
}

/**
 * List the most recent call logs for a lead (default 200), returned in ascending
 * chronological order for timelines and dual-read merge compatibility.
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} leadId
 * @param {number} [pageSize]
 * @returns {Promise<Array<object>>}
 */
async function listCallLogsByLeadId(db, leadId, pageSize = 200) {
  const snap = await db
    .collection("callLogs")
    .where("leadId", "==", leadId)
    .orderBy("date", "desc")
    .limit(pageSize)
    .get();
  const newestFirst = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return orderRecentCallLogsChronologically(newestFirst);
}

/**
 * Dual-read: collection + optional embedded fallback (for SLA / history during migration).
 * @param {object} lead
 * @param {Array<object>} collectionLogs
 * @param {{ includeEmbedded?: boolean }} [options]
 * @returns {Array<object>}
 */
function mergeCallLogsDualRead(lead, collectionLogs, options = {}) {
  const includeEmbedded = options.includeEmbedded !== false;
  const fromCollection = Array.isArray(collectionLogs) ? [...collectionLogs] : [];
  fromCollection.sort(
    (a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime(),
  );
  if (!includeEmbedded) return fromCollection;

  const embedded = (lead && lead.callLogs) || [];
  if (!embedded.length) return fromCollection;

  const fingerprint = (log) =>
    `${log.date || ""}|${log.agent || ""}|${log.status || ""}|${String(log.note || "").slice(0, 120)}`;
  const seen = new Set(fromCollection.map(fingerprint));
  const merged = [...fromCollection];
  embedded.forEach((log, index) => {
    const fp = fingerprint(log);
    if (seen.has(fp)) return;
    seen.add(fp);
    merged.push({ ...log, id: `embedded:${index}` });
  });
  merged.sort(
    (a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime(),
  );
  return merged;
}

module.exports = {
  isSystemCallAgent,
  buildLeadCallSummaryPatch,
  createCallLog,
  orderRecentCallLogsChronologically,
  listCallLogsByLeadId,
  mergeCallLogsDualRead,
};
