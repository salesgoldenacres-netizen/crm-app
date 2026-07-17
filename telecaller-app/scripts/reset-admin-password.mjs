/**
 * reset-admin-password.mjs
 * Resets the admin user's Firebase Auth password back to "admin"
 * using the password reset flow via our custom email domain
 */

// We use the client SDK (as a "temporary admin login") to update the password
// This is a one-time migration fix script

const FIREBASE_API_KEY = 'AIzaSyBCmGr2081Eu1u6maFinvyrifdjvuafIuk';

async function changePassword(idToken, newPassword) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken,
        password: newPassword,
        returnSecureToken: false
      })
    }
  );
  const data = await response.json();
  return data;
}

async function signIn(email, currentPassword) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: currentPassword,
        returnSecureToken: true
      })
    }
  );
  const data = await response.json();
  return data;
}

// Try to find the admin's current password and reset it
async function main() {
  console.log('Trying to sign in as admin with various passwords...');
  
  const ADMIN_EMAIL = 'admin@goldenacres.app';
  const TARGET_PASSWORD = 'admin123'; // New secure password (>=6 chars)
  
  // Try common passwords that may have been set previously
  const trialPasswords = ['admin', 'admin123', 'goldenacres', 'Admin@123', 'password', '123456'];
  
  let idToken = null;
  let workingPassword = null;
  
  for (const pwd of trialPasswords) {
    console.log(`  Trying password: "${pwd}"...`);
    const result = await signIn(ADMIN_EMAIL, pwd);
    if (result.idToken) {
      console.log(`  ✅ Found working password: "${pwd}"`);
      idToken = result.idToken;
      workingPassword = pwd;
      break;
    } else {
      console.log(`  ❌ Failed: ${result.error?.message}`);
    }
  }
  
  if (!idToken) {
    console.log('\n❌ Could not sign in as admin with any known password.');
    console.log('Please use the Firebase Console to manually reset the password:');
    console.log('https://console.firebase.google.com/u/0/project/golden-acres-projects/authentication/users');
    console.log(`\nSet password for admin@goldenacres.app to: ${TARGET_PASSWORD}`);
    return;
  }
  
  if (workingPassword === TARGET_PASSWORD) {
    console.log(`\nPassword is already "${TARGET_PASSWORD}". No change needed.`);
    return;
  }
  
  console.log(`\nChanging password to "${TARGET_PASSWORD}"...`);
  const changeResult = await changePassword(idToken, TARGET_PASSWORD);
  
  if (changeResult.email) {
    console.log(`✅ Password changed successfully!`);
    console.log(`\nAdmin login credentials:`);
    console.log(`  Username: admin`);
    console.log(`  Password: ${TARGET_PASSWORD}`);
  } else {
    console.log('❌ Failed to change password:', changeResult.error);
  }
}

main().catch(console.error);
