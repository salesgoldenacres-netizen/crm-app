const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const { getIstDateString } = require('../automation');
const { writeAuditLog } = require('../helpers/firestoreWrites');

const scheduledAgentIdleCheck = onSchedule(
  { schedule: '*/30 * * * *', timeZone: 'Asia/Kolkata', region: 'us-central1' },
  async () => {
    const db = admin.firestore();
    const activeStatusesSnap = await db.collection('agentStatus')
      .where('status', 'in', ['available', 'on-call'])
      .get();

    if (activeStatusesSnap.empty) {
      console.log('No active agents found in agentStatus.');
      return;
    }

    const dateStr = getIstDateString();
    const now = new Date();
    const thresholdMs = 45 * 60 * 1000; // 45 minutes

    for (const doc of activeStatusesSnap.docs) {
      const statusData = doc.data();
      const agentId = doc.id;
      const username = statusData.username || 'Unknown';
      const statusUpdatedAt = statusData.updatedAt;

      const prodDocId = `${agentId}_${dateStr}`;
      const prodRef = db.collection('agentProductivity').doc(prodDocId);
      const prodSnap = await prodRef.get();

      let lastActiveTime = null;
      let alreadyWarned = false;

      if (prodSnap.exists) {
        const prodData = prodSnap.data();
        lastActiveTime = prodData.lastActiveTime;
        alreadyWarned = !!prodData.idleWarning;
      } else {
        lastActiveTime = statusUpdatedAt;
      }

      if (!lastActiveTime) {
        lastActiveTime = now.toISOString();
      }

      const elapsedMs = now.getTime() - new Date(lastActiveTime).getTime();

      if (elapsedMs > thresholdMs) {
        if (prodSnap.exists) {
          await prodRef.update({
            idleWarning: true,
            updatedAt: now.toISOString()
          });
        } else {
          await prodRef.set({
            userId: agentId,
            agentId,
            agentName: username,
            date: dateStr,
            totalCalls: 0,
            totalTalkTimeSeconds: 0,
            lastActiveTime,
            idleWarning: true,
            bookedCount: 0,
            interestedCount: 0,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
          });
        }

        if (!alreadyWarned) {
          await writeAuditLog(db, {
            action: 'Agent Idle Warning',
            details: `[System Warning] Telecaller ${username} is currently idle (no call activity for 45+ minutes).`,
            user: 'system',
          });
          console.log(`Flagged agent ${username} (${agentId}) as idle.`);
        }
      }
    }
  }
);

module.exports = {
  scheduledAgentIdleCheck,
};
