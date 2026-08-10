const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { isInvalidFcmTokenError } = require('../helpers/firestoreWrites');
const { tokenIsManagerial } = require('../helpers/leadAccess');

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

/**
 * SEC-FCM-1: callers may notify themselves or managers may notify anyone.
 * @param {{ uid?: string, token?: object } | null | undefined} auth
 * @param {string} targetUserId
 */
function assertCallerCanSendFcmNotification(auth, targetUserId) {
  if (!auth || !auth.uid) {
    throw new HttpsError('unauthenticated', 'Method must be called authenticated.');
  }
  if (auth.uid === targetUserId) return;
  if (tokenIsManagerial(auth)) return;
  throw new HttpsError(
    'permission-denied',
    'You can only send notifications to yourself unless you are managerial.',
  );
}

const sendFcmNotification = onCall(
  // enforceAppCheck: client initializes App Check (ReCaptcha v3) (SEC-7).
  { region: 'us-central1', enforceAppCheck: true },
  async (request) => {
    const { targetUserId, title, body, extraData } = request.data;
    if (!targetUserId || !title || !body) {
      throw new HttpsError('invalid-argument', 'Missing parameters.');
    }

    assertCallerCanSendFcmNotification(request.auth, targetUserId);

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
  assertCallerCanSendFcmNotification,
};
