import { fetchAndActivate, getValue } from "firebase/remote-config";
import { remoteConfig } from "./firebase";
import { logger } from "@/shared/utils/logger";

// Set default configuration values
remoteConfig.defaultConfig = {
  announcement_text:
    "Welcome to the new Golden Acres CRM! Explore real-time interactive mapping and secure portal auth.",
  show_announcement: true,
  default_rate_per_sqft: 3500,
  follow_up_reminder_days: 1,
};

/**
 * Fetches and activates configuration from the Remote Config console.
 */
export const fetchConfig = async (): Promise<void> => {
  try {
    // By default, minimumFetchIntervalMillis is set to 1 hour in firebase.js
    await fetchAndActivate(remoteConfig);
    logger.info("RemoteConfig", "Remote Config loaded successfully.");
  } catch (err) {
    logger.warn("RemoteConfig", "Failed to fetch Remote Config, using local defaults", err);
  }
};

/**
 * Gets a typed config value by key.
 */
export const getConfigValue = (key: string): string | number | boolean => {
  try {
    const val = getValue(remoteConfig, key);
    if (key === "show_announcement") {
      return val.asBoolean();
    }
    if (key === "default_rate_per_sqft" || key === "follow_up_reminder_days") {
      return val.asNumber();
    }
    return val.asString();
  } catch (err) {
    logger.error("RemoteConfig", `Error reading remote config key: ${key}`, err);
    // Fallback directly to defaults
    return remoteConfig.defaultConfig ? remoteConfig.defaultConfig[key] : "";
  }
};
