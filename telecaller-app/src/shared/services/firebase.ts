import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { logger } from "@/shared/utils/logger";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import {
  getMessaging,
  isSupported as isMessagingSupported,
  Messaging,
} from "firebase/messaging";
import {
  getAnalytics,
  isSupported as isAnalyticsSupported,
  Analytics,
} from "firebase/analytics";
import { getPerformance, FirebasePerformance } from "firebase/performance";
import { getRemoteConfig } from "firebase/remote-config";
import { initializeAppCheck, ReCaptchaV3Provider, AppCheck } from "firebase/app-check";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyBCmGr2081Eu1u6maFinvyrifdjvuafIuk",
  authDomain: "golden-acres-projects.firebaseapp.com",
  projectId: "golden-acres-projects",
  storageBucket: "golden-acres-projects.firebasestorage.app",
  messagingSenderId: "653663403052",
  appId: "1:653663403052:web:e34f126235e1eb4c13a589",
};

export { firebaseConfig };

const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore with modern persistent offline cache (multi-tab support)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

// Initialize Storage
export const storage = getStorage(app);

// Initialize Functions
export const functions = getFunctions(app, "us-central1");

// Initialize Remote Config
export const remoteConfig = getRemoteConfig(app);
remoteConfig.settings.minimumFetchIntervalMillis = 3600000; // 1 hour

// Safe initialization of browser-only services
export let messaging: Messaging | null = null;
isMessagingSupported()
  .then((supported) => {
    if (supported) {
      messaging = getMessaging(app);
    } else {
      logger.warn(
        "Firebase",
        "FCM Messaging is not supported in this environment/browser."
      );
    }
  })
  .catch((err) => logger.error("Firebase", "Error checking messaging support", err));

export let analytics: Analytics | null = null;
isAnalyticsSupported()
  .then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    } else {
      logger.warn("Firebase", "Firebase Analytics is not supported in this environment.");
    }
  })
  .catch((err) => logger.error("Firebase", "Error checking analytics support", err));

export let performance: FirebasePerformance | null = null;
if (typeof window !== "undefined") {
  try {
    performance = getPerformance(app);
  } catch (err) {
    logger.warn(
      "Firebase",
      "Firebase Performance Monitoring could not be initialized",
      err
    );
  }
}

// App Check setup
export let appCheck: AppCheck | null = null;
if (typeof window !== "undefined") {
  // Allow App Check debug mode for local development
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    (self as typeof globalThis & { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }

  const siteKey =
    import.meta.env.VITE_RECAPTCHA_SITE_KEY ||
    "6Lcj0SQtAAAAAFt-CqBdNCgU0brw8_8_DLt7iPPT";
  try {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
    logger.info("Firebase", "App Check initialized successfully.");
  } catch (err) {
    logger.warn(
      "Firebase",
      "App Check failed to initialize (likely due to missing/invalid siteKey)",
      err
    );
  }
}
