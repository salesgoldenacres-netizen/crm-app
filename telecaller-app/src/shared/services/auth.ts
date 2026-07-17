import { initializeApp, deleteApp } from "firebase/app";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
  createUserWithEmailAndPassword,
  getAuth,
  User as FirebaseUser,
} from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { logger } from "@/shared/utils/logger";
import { linkUserProfile } from "./claimsApi";

// Helper to get email from username
export const getEmailFromUsername = (username: string): string => {
  if (username.includes("@")) return username.trim().toLowerCase();
  return `${username.trim().toLowerCase()}@goldenacres.app`;
};

/**
 * Handles login with password via Firebase Auth only.
 * Never reads or writes plaintext passwords in Firestore.
 */
export const loginWithEmailAndPassword = async (emailOrUsername: string, password: string): Promise<FirebaseUser> => {
  const email = getEmailFromUsername(emailOrUsername);
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );
  return userCredential.user;
};

/**
 * Handles Google Sign-In and checks if the user is registered in Firestore.
 * UID linking uses Admin SDK callable — clients cannot write uid/password on users.
 */
export const loginWithGoogle = async (): Promise<FirebaseUser> => {
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  const user = userCredential.user;

  const usersRef = collection(db, "users");
  if (!user.email) {
    throw new Error("No email found in Google account.");
  }

  const q = query(usersRef, where("email", "==", user.email.toLowerCase()));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    const username = user.email.split("@")[0].toLowerCase();
    const qUsername = query(usersRef, where("username", "==", username));
    const usernameSnapshot = await getDocs(qUsername);

    if (usernameSnapshot.empty) {
      await signOut(auth);
      throw new Error(
        "Access denied. Your Google account is not registered. Please contact the administrator."
      );
    }
  }

  try {
    await linkUserProfile();
  } catch (err) {
    logger.error("AuthService", "linkUserProfile failed", err);
    await signOut(auth);
    throw new Error(
      "Could not link your account to a registered profile. Please contact the administrator."
    );
  }

  return user;
};

/**
 * Sends a password reset email.
 */
export const resetPassword = async (emailOrUsername: string): Promise<void> => {
  const email = getEmailFromUsername(emailOrUsername);
  await sendPasswordResetEmail(auth, email);
};

/**
 * Signs out the current user.
 */
export const logout = async (): Promise<void> => {
  await signOut(auth);
};

/**
 * Creates a new user in Firebase Auth without disrupting the current user's session.
 * Uses a secondary, temporary Firebase app instance.
 */
export const createSecondaryUser = async (usernameOrEmail: string, password: string): Promise<FirebaseUser> => {
  const email = getEmailFromUsername(usernameOrEmail);
  const firebaseConfig = {
    apiKey: "AIzaSyBCmGr2081Eu1u6maFinvyrifdjvuafIuk",
    authDomain: "golden-acres-projects.firebaseapp.com",
    projectId: "golden-acres-projects",
    storageBucket: "golden-acres-projects.firebasestorage.app",
    messagingSenderId: "653663403052",
    appId: "1:653663403052:web:e34f126235e1eb4c13a589",
  };

  // Initialize a unique temporary app instance
  const tempAppName = `TempApp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const tempApp = initializeApp(firebaseConfig, tempAppName);
  const tempAuth = getAuth(tempApp);

  try {
    const userCredential = await createUserWithEmailAndPassword(
      tempAuth,
      email,
      password
    );
    const user = userCredential.user;
    await signOut(tempAuth);
    await deleteApp(tempApp);
    return user;
  } catch (error) {
    try {
      await deleteApp(tempApp);
    } catch (e) {
      logger.error("AuthService", "Failed to delete temp app", e);
    }
    throw error;
  }
};
