import { CapacitorUpdater } from "@capgo/capacitor-updater";
import { Capacitor } from "@capacitor/core";
import { logger } from "@/shared/utils/logger";

// The absolute URL to the updates manifest hosted on Firebase Hosting
const MANIFEST_URL =
  "https://golden-acres-projects.web.app/updates/manifest.json";

// Delay before checking for updates (ms) — gives the app time to fully load first
const UPDATE_CHECK_DELAY = 10000;

/**
 * Initializes the OTA update manager.
 * This should be called as early as possible on app startup.
 */
export async function initializeUpdater(): Promise<void> {
  // Set to true to disable updates during local development/debugging
  const DISABLE_OTA_FOR_DEBUGGING = import.meta.env.DEV;
  if (DISABLE_OTA_FOR_DEBUGGING) {
    logger.info("Updater", "OTA updates disabled for debugging.");
    return;
  }

  if (!Capacitor.isNativePlatform()) {
    logger.info("Updater", "Running in web browser, skipping updater check.");
    return;
  }

  try {
    // 1. Notify Capacitor that the bundle loaded successfully.
    // This MUST be called within 10 seconds of startup, otherwise the plugin
    // will roll back to the previous stable version automatically.
    const readyResult = await CapacitorUpdater.notifyAppReady();
    logger.info("Updater", "App ready state notified.", readyResult);

    // 2. Perform the update check after a delay so the app can fully initialize
    // (Firebase auth, Firestore data, etc.) before we potentially reload.
    setTimeout(() => {
      checkForUpdates().catch((err) =>
        logger.error("Updater", "checkForUpdates failed", err)
      );
    }, UPDATE_CHECK_DELAY);
  } catch (error) {
    logger.error("Updater", "Initialization failed", error);
  }
}

/**
 * Checks for updates, downloads the package if version mismatch occurs,
 * and sets the new package as active (which reloads the app).
 */
async function checkForUpdates(): Promise<void> {
  try {
    logger.info("Updater", "Checking for updates from:", MANIFEST_URL);

    // Add a cache-busting timestamp to ensure we fetch the latest file
    const response = await fetch(`${MANIFEST_URL}?t=${Date.now()}`);
    if (!response.ok) {
      logger.warn(
        "Updater",
        "Could not retrieve updates manifest from server.",
        response.statusText
      );
      return;
    }

    const manifest = await response.json();
    if (!manifest || !manifest.version || !manifest.url) {
      logger.warn(
        "Updater",
        "Invalid manifest format received:",
        manifest
      );
      return;
    }

    // Get information about the currently active bundle
    const currentInfo = await CapacitorUpdater.current();
    // The current() method returns { bundle: { id, version, ... } }
    const currentVersion = currentInfo.bundle?.version || "builtin";
    logger.info(
      "Updater",
      "Current version:",
      currentVersion,
      "| Server version:",
      manifest.version
    );

    // Skip if already up-to-date
    if (manifest.version === currentVersion) {
      logger.info("Updater", "App is already up-to-date.");
      return;
    }

    // Check if we already tried this version (prevent infinite loop)
    const lastAttemptedVersion = localStorage.getItem(
      "ota_last_attempted_version"
    );
    if (lastAttemptedVersion === manifest.version) {
      logger.info(
        "Updater",
        "Already attempted this version, skipping to prevent loop."
      );
      return;
    }

    logger.info(
      "Updater",
      "Version mismatch detected. Downloading update..."
    );

    // Mark this version as attempted before downloading
    localStorage.setItem("ota_last_attempted_version", manifest.version);

    // Download the zip archive
    const bundle = await CapacitorUpdater.download({
      url: manifest.url,
      version: manifest.version,
    });

    logger.info("Updater", "Bundle downloaded successfully:", bundle.id);

    // Set the downloaded bundle as active. This triggers an immediate application reload.
    await CapacitorUpdater.set({ id: bundle.id });
    logger.info("Updater", "Update applied. Reloading app...");
  } catch (error) {
    logger.error("Updater", "Update check failed", error);
  }
}
