const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const {
  applyCallLogProductivityIdempotent,
  buildProductivityAggregateLog,
} = require('../productivity/applyCallLogProductivity');
const { getIstDateString } = require('../automation');
const { captureException } = require('../helpers/sentry');

const onCallLogCreated = onDocumentCreated(
  { document: 'callLogs/{callLogId}', region: 'us-central1' },
  async (event) => {
    const db = admin.firestore();
    const startedAt = Date.now();
    const callLogId = event.params.callLogId;
    const callLog = event.data?.data();
    if (!callLog) return null;

    const agentUsername = callLog.agent;
    if (!agentUsername || agentUsername === 'system') {
      console.log(
        JSON.stringify(
          buildProductivityAggregateLog({
            callLogId,
            applied: false,
            reason: 'skipped_system_or_missing_agent',
            leadId: callLog.leadId || null,
            durationMs: Date.now() - startedAt,
          }),
        ),
      );
      return null;
    }

    try {
      let agentId = callLog.lastAgentId || null;
      let agentName = agentUsername;

      if (!agentId && callLog.leadId) {
        const leadSnap = await db.collection('leads').doc(callLog.leadId).get();
        if (leadSnap.exists) {
          const lead = leadSnap.data() || {};
          if (
            agentUsername === lead.assignedToName ||
            agentUsername === lead.assignedAgent
          ) {
            agentId = lead.assignedTo || null;
          }
        }
      }

      if (!agentId) {
        const userSnap = await db
          .collection('users')
          .where('username', '==', agentUsername)
          .limit(1)
          .get();
        if (!userSnap.empty) {
          agentId = userSnap.docs[0].id;
          agentName = userSnap.docs[0].data().username || agentUsername;
        }
      }

      if (!agentId) {
        agentId = agentUsername;
      }

      const dateStr = getIstDateString();
      const result = await applyCallLogProductivityIdempotent(db, {
        callLogId,
        callLog: { ...callLog, leadId: callLog.leadId },
        agentId,
        agentName,
        dateStr,
        projectId: callLog.projectId || null,
      });

      console.log(
        JSON.stringify(
          buildProductivityAggregateLog({
            callLogId,
            applied: result.applied,
            reason: result.reason || null,
            agentId,
            leadId: callLog.leadId || null,
            durationMs: Date.now() - startedAt,
          }),
        ),
      );

      if (result.applied) {
        await db.collection('agentStatus').doc(agentId).set(
          {
            agentId,
            agentName,
            lastActiveTime: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );
      }
    } catch (err) {
      console.error(
        JSON.stringify({
          event: 'productivity_aggregate_failed',
          callLogId,
          message: err && err.message ? err.message : String(err),
        }),
      );
      captureException(err, { handler: 'onCallLogCreated', callLogId });
      throw err;
    }

    return null;
  },
);

module.exports = {
  onCallLogCreated,
};
