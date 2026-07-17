/**
 * migrate-users.mjs
 * 
 * Migrates existing Firestore users (with plaintext passwords) to Firebase Auth.
 * Run with: node scripts/migrate-users.mjs
 * 
 * Requirements: Needs a service account key. Put service account JSON in scripts/serviceAccount.json
 * OR set GOOGLE_APPLICATION_CREDENTIALS environment variable.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Try to load firebase-admin from functions directory  
let admin;
try {
  admin = require('../functions/node_modules/firebase-admin');
} catch (e) {
  try {
    // Try global
    admin = require('firebase-admin');
  } catch (e2) {
    console.error('firebase-admin not found. Install it:');
    console.error('  cd functions && npm install firebase-admin');
    process.exit(1);
  }
}

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Initialize Firebase Admin
const serviceAccountPath = join(__dirname, 'serviceAccount.json');

if (existsSync(serviceAccountPath)) {
  console.log('ℹ️ Found service account key, initializing with cert...');
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'golden-acres-projects'
  });
} else {
  console.log('ℹ️ No service account key found, falling back to Application Default Credentials (ADC)...');
  admin.initializeApp({
    projectId: 'golden-acres-projects'
  });
}

const db = admin.firestore();
const auth = admin.auth();

async function getEmailFromUsername(username) {
  return `${username.trim().toLowerCase()}@goldenacres.app`;
}

async function migrateUsers() {
  console.log('🚀 Starting user migration...\n');
  
  const usersSnapshot = await db.collection('users').get();
  
  for (const docSnap of usersSnapshot.docs) {
    const data = docSnap.data();
    const docId = docSnap.id;
    
    // Skip already migrated users
    if (data.isMigrated || (data.uid && data.uid.length > 10)) {
      console.log(`✅ Already migrated: ${data.username} (${docId})`);
      continue;
    }
    
    if (!data.username || !data.password) {
      console.log(`⚠️  Skipping incomplete user doc: ${docId}`);
      continue;
    }
    
    const email = await getEmailFromUsername(data.username);
    const password = data.password;
    
    console.log(`🔄 Migrating: ${data.username} → ${email}`);
    
    try {
      let userRecord;
      
      try {
        // Try creating a new auth user
        userRecord = await auth.createUser({
          email,
          password,
          displayName: data.username
        });
        console.log(`   ✅ Created Firebase Auth user: ${userRecord.uid}`);
      } catch (createErr) {
        if (createErr.code === 'auth/email-already-exists') {
          // User exists in auth, find them
          userRecord = await auth.getUserByEmail(email);
          console.log(`   ℹ️  Auth user already exists: ${userRecord.uid}`);
        } else {
          throw createErr;
        }
      }
      
      // Update Firestore doc
      await db.collection('users').doc(docId).update({
        uid: userRecord.uid,
        email: email,
        password: '',  // Clear plaintext password
        isMigrated: true,
        updatedAt: new Date().toISOString()
      });
      
      // Create userRoles doc
      await db.collection('userRoles').doc(userRecord.uid).set({
        role: data.role || 'telecaller'
      }, { merge: true });
      
      console.log(`   ✅ Firestore updated for ${data.username}\n`);
      
    } catch (err) {
      console.error(`   ❌ Failed to migrate ${data.username}:`, err.message);
    }
  }
  
  console.log('\n✅ Migration complete!');
  process.exit(0);
}

migrateUsers();
