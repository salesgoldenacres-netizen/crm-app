const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { isInvalidFcmTokenError } = require('../helpers/firestoreWrites');

// Helper to send FCM notification (prunes invalid tokens)
async function sendFcm(userId, payload) {
  const db = admin.firestore();
  try {
    const userDoc = await db.doc(`users/${userId}`).get();
    if (!userDoc.exists) {
      console.warn(`User ${userId} not found in Firestore. Skipping FCM.`);
      return;
    }
    const userData = userDoc.data();
    const token = userData.fcmToken;
    if (!token) {
      console.log(`User ${userId} has no FCM token registered. Skipping FCM.`);
      return;
    }

    const message = {
      token: token,
      notification: payload.notification,
      data: payload.data || {}
    };

    const response = await admin.messaging().send(message);
    console.log(`Successfully sent FCM notification to user ${userId}:`, response);
  } catch (err) {
    console.error(`Error sending FCM notification to user ${userId}:`, err);
    if (isInvalidFcmTokenError(err)) {
      try {
        await db.doc(`users/${userId}`).update({
          fcmToken: admin.firestore.FieldValue.delete(),
        });
        console.log(`Pruned invalid FCM token for user ${userId}`);
      } catch (pruneErr) {
        console.warn(`Failed to prune FCM token for user ${userId}:`, pruneErr);
      }
    }
  }
}

const sendFcmNotification = onCall(
  { region: 'us-central1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Method must be called authenticated.');
    }

    const { targetUserId, title, body, extraData } = request.data;
    if (!targetUserId || !title || !body) {
      throw new HttpsError('invalid-argument', 'Missing parameters.');
    }

    await sendFcm(targetUserId, {
      notification: { title, body },
      data: extraData || {}
    });

    return { success: true };
  }
);

module.exports = {
  sendFcm,
  sendFcmNotification,
};
