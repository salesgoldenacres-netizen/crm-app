import { logEvent } from "firebase/analytics";
import { analytics } from "@/shared/services/firebase";

/**
 * Safely logs a custom event to Firebase Analytics.
 * Automatically handles environments where Analytics is not supported.
 *
 * @param eventName - Name of the event to log.
 * @param eventParams - Optional parameters to attach.
 */
export const logAnalyticsEvent = (eventName: string, eventParams: Record<string, unknown> = {}): void => {
  if (analytics) {
    try {
      logEvent(analytics, eventName, eventParams);
      console.log(`[Analytics] Logged: ${eventName}`, eventParams);
    } catch (err) {
      console.error(`[Analytics] Error logging event "${eventName}":`, err);
    }
  } else {
    // Development fallback or unsupported browsers (e.g. Chrome iframe without cookie access)
    console.log(`[Analytics - Mock] Logged: ${eventName}`, eventParams);
  }
};
