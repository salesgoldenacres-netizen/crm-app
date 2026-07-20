/**
 * Idempotent productivity aggregation for a single call log event.
 *
 * Pattern:
 *   productivityEvents/{callLogId} create-once marker in SAME transaction
 *   as agentProductivity increment.
 */

const AGGREGATION_VERSION = 1;

/**
 * Pure: whether this call log should drive productivity (skip system / migrated).
 * @param {object | null | undefined} callLog
 * @returns {boolean}
 */
function shouldAggregateCallLog(callLog) {
  if (!callLog) return false;
  if (callLog.skipProductivity || callLog.migratedFromEmbedded) return false;
  const agent = callLog.agent;
  if (!agent || agent === "system") return false;
  return true;
}

/**
 * Pure: build create-once marker payload.
 * @param {{ callLogId: string, leadId?: string, agentId?: string, projectId?: string|null }} input
 * @returns {Record<string, unknown>}
 */
function buildProductivityEventMarker(input) {
  return {
    processedAt: new Date().toISOString(),
    leadId: input.leadId || null,
    agentId: input.agentId || null,
    projectId: input.projectId || null,
    aggregationVersion: AGGREGATION_VERSION,
    callLogId: input.callLogId,
  };
}

/**
 * Pure: structured ops log for productivity aggregation.
 * @param {{
 *   callLogId: string,
 *   applied: boolean,
 *   reason?: string|null,
 *   agentId?: string|null,
 *   leadId?: string|null,
 *   durationMs?: number,
 * }} stats
 */
function buildProductivityAggregateLog(stats) {
  return {
    event: "productivity_aggregate",
    callLogId: stats.callLogId,
    applied: Boolean(stats.applied),
    reason: stats.reason || null,
    agentId: stats.agentId || null,
    leadId: stats.leadId || null,
    durationMs: typeof stats.durationMs === "number" ? stats.durationMs : null,
  };
}

/**
 * Pure helper: parse Duration: MM:SS or HH:MM:SS from note text.
 * @param {string} note
 * @returns {number}
 */
function parseDurationFromNote(note) {
  const match = String(note || "").match(/Duration:\s*(\d+):(\d+)(?::(\d+))?/i);
  if (!match) return 0;
  if (match[3] !== undefined) {
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const s = parseInt(match[3], 10);
    return h * 3600 + m * 60 + s;
  }
  const m = parseInt(match[1], 10);
  const s = parseInt(match[2], 10);
  return m * 60 + s;
}

/**
 * Apply productivity for one callLog inside a Firestore transaction.
 * If productivityEvents/{callLogId} already exists → no-op (idempotent).
 *
 * @param {FirebaseFirestore.Firestore} db
 * @param {object} params
 * @param {string} params.callLogId
 * @param {object} params.callLog
 * @param {string} params.agentId
 * @param {string} params.agentName
 * @param {string} params.dateStr - IST YYYY-MM-DD
 * @param {string} [params.projectId]
 * @returns {Promise<{ applied: boolean, reason?: string }>}
 */
async function applyCallLogProductivityIdempotent(db, params) {
  const { callLogId, callLog, agentId, agentName, dateStr, projectId } = params;

  if (!shouldAggregateCallLog(callLog)) {
    return { applied: false, reason: "skipped_call_log" };
  }
  if (!callLogId || !agentId) {
    return { applied: false, reason: "missing_ids" };
  }

  const duration =
    typeof callLog.duration === "number" && callLog.duration > 0
      ? callLog.duration
      : parseDurationFromNote(callLog.note || "");

  const isBooked = callLog.status === "booked" || callLog.status === "reserved";
  const isInterested = callLog.status === "interested";

  const eventRef = db.collection("productivityEvents").doc(callLogId);
  const prodRef = db.collection("agentProductivity").doc(`${agentId}_${dateStr}`);

  const result = await db.runTransaction(async (transaction) => {
    const eventSnap = await transaction.get(eventRef);
    if (eventSnap.exists) {
      return { applied: false, reason: "already_processed" };
    }

    const prodSnap = await transaction.get(prodRef);
    const nowStr = new Date().toISOString();

    if (!prodSnap.exists) {
      transaction.set(prodRef, {
        userId: agentId,
        agentId,
        agentName,
        date: dateStr,
        totalCalls: 1,
        totalTalkTimeSeconds: duration,
        lastActiveTime: nowStr,
        idleWarning: false,
        bookedCount: isBooked ? 1 : 0,
        interestedCount: isInterested ? 1 : 0,
        createdAt: nowStr,
        updatedAt: nowStr,
      });
    } else {
      const data = prodSnap.data() || {};
      transaction.update(prodRef, {
        userId: data.userId || agentId,
        agentId: data.agentId || agentId,
        totalCalls: (data.totalCalls || 0) + 1,
        totalTalkTimeSeconds: (data.totalTalkTimeSeconds || 0) + duration,
        lastActiveTime: nowStr,
        idleWarning: false,
        bookedCount: (data.bookedCount || 0) + (isBooked ? 1 : 0),
        interestedCount: (data.interestedCount || 0) + (isInterested ? 1 : 0),
        updatedAt: nowStr,
      });
    }

    transaction.create(
      eventRef,
      buildProductivityEventMarker({
        callLogId,
        leadId: callLog.leadId,
        agentId,
        projectId: projectId || callLog.projectId || null,
      }),
    );

    return { applied: true };
  });

  return result;
}

module.exports = {
  AGGREGATION_VERSION,
  shouldAggregateCallLog,
  buildProductivityEventMarker,
  buildProductivityAggregateLog,
  parseDurationFromNote,
  applyCallLogProductivityIdempotent,
};
