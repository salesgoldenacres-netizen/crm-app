/**
 * fix-admin-account.mjs
 * 
 * Uses the Firebase Identity Platform REST API to delete the old admin auth account
 * so JIT migration can create a fresh one with the correct password.
 */

const FIREBASE_API_KEY = 'AIzaSyBCmGr2081Eu1u6maFinvyrifdjvuafIuk';
const PROJECT_ID = 'golden-acres-projects';

// Delete user via Firebase Auth Admin REST API
// We use the Identity Platform Management API for this
async function deleteUserByUid(uid) {
  // Use Firebase Admin REST to delete - requires service account
  // Alternative: Use Google OAuth2 with a known access token
  
  // Try using the Identity Toolkit REST API to lookup and use their account:
  // Actually let's use the Firebase CLI local emulator approach
  
  // Best approach for Windows: use firebase-admin if available, otherwise guide
  try {
    // Try to use firebase-admin via functions directory
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    
    // Check functions/node_modules
    const paths = [
      '../functions/node_modules/firebase-admin',
      'firebase-admin'
    ];
    
    let admin = null;
    for (const p of paths) {
      try {
        admin = require(p);
        console.log(`Loaded firebase-admin from: ${p}`);
        break;
      } catch (e) {
        continue;
      }
    }
    
    if (!admin) {
      throw new Error('firebase-admin not found');
    }
    
    // Need service account
    const { readFileSync, existsSync } = await import('fs');
    const { join, dirname } = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const serviceAccountPath = join(__dirname, 'serviceAccount.json');
    
    if (!existsSync(serviceAccountPath)) {
      throw new Error('No service account file found at scripts/serviceAccount.json');
    }
    
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: PROJECT_ID
    });
    
    const auth = admin.auth();
    
    console.log(`Deleting Firebase Auth user: ${uid}`);
    await auth.deleteUser(uid);
    console.log('✅ User deleted successfully!');
    console.log('');
    console.log('Now login with username="admin" password="admin123"');
    console.log('The app will automatically recreate the Firebase Auth account via JIT migration.');
    
  } catch (err) {
    console.error('❌ Could not use firebase-admin:', err.message);
    console.error('');
    console.error('MANUAL FIX REQUIRED:');
    console.error('1. Go to: https://console.firebase.google.com/project/golden-acres-projects/authentication/users');
    console.error('2. Sign in with your Google account');
    console.error('3. Find admin@goldenacres.app');
    console.error('4. Click ⋮ → Delete');
    console.error('5. Then login to the app with username: admin, password: admin123');
  }
}

// Delete the broken admin account
deleteUserByUid('MyNP5NAVSJR1IgTnxKC5MmS8PvA2');
