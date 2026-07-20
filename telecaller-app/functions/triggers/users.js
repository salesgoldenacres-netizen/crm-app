const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

const onUserCreated = onDocumentCreated(
  { document: 'users/{userId}', region: 'us-central1' },
  async (event) => {
    const db = admin.firestore();
    const userData = event.data.data();
    if (!userData) return;

    if (userData.isMigrated || !userData.email) return;

    const email = userData.email.toLowerCase();

    try {
      const authUser = await admin.auth().getUserByEmail(email);
      if (authUser && authUser.uid) {
        await event.data.ref.update({
          uid: authUser.uid,
          isMigrated: true,
          updatedAt: new Date().toISOString()
        });
        await db.collection('userRoles').doc(authUser.uid).set({
          role: userData.role || 'telecaller'
        }, { merge: true });
        console.log(`Patched Auth UID ${authUser.uid} into Firestore user doc ${event.params.userId}`);
      }
    } catch (err) {
      console.log(`No Auth user found for email ${email} yet: ${err.message}`);
    }
  }
);

module.exports = {
  onUserCreated,
};
