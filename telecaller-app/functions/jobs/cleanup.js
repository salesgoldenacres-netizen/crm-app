const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

const cleanupOldAuditLogs = onSchedule(
  { schedule: '0 0 * * 0', timeZone: 'Asia/Kolkata', region: 'us-central1' },
  async () => {
    const db = admin.firestore();
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    console.log(`Cleaning audit logs older than: ${ninetyDaysAgo}`);

    const BATCH_SIZE = 400;
    let totalDeleted = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const logsSnap = await db.collection('auditLogs')
        .where('timestamp', '<', ninetyDaysAgo)
        .limit(BATCH_SIZE)
        .get();

      if (logsSnap.empty) break;

      const batch = db.batch();
      logsSnap.docs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
      totalDeleted += logsSnap.size;

      if (logsSnap.size < BATCH_SIZE) break;
    }

    if (totalDeleted === 0) {
      console.log('No old audit logs found to cleanup.');
    } else {
      console.log(`Successfully purged ${totalDeleted} old audit log entries.`);
    }
  }
);

module.exports = {
  cleanupOldAuditLogs,
};
