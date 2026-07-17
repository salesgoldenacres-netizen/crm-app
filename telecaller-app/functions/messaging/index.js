/**
 * Messaging module entry — factory selects the active provider plugin.
 *
 * Architecture:
 *   MessagingProvider (contract)
 *   ├── EvolutionProvider (V1)
 *   ├── MetaCloudProvider (future)
 *   └── TwilioProvider (future)
 *
 * CRM callables / webhooks use createMessagingProvider(db) only.
 */

const { NotConnectedError, UnsupportedCapabilityError } = require("./errors");
const { normalizePhoneE164, digitsOnly } = require("./phone");
const { createMessagingStore, TIMELINE_ICONS } = require("./store");
const { MessagingProviderContract } = require("./MessagingProvider");
const {
  EvolutionProvider,
  loadEvolutionConfig,
  loadProviderConfig,
  webhookUrlForProject,
} = require("./providers/evolution");

/**
 * Resolve active provider id from settings (default: evolution).
 * @param {FirebaseFirestore.Firestore} db
 */
async function resolveProviderId(db) {
  try {
    const snap = await db.doc("settings/integrations").get();
    const data = snap.exists ? snap.data() : {};
    return data.messagingProviderId || data.messagingProvider || "evolution";
  } catch {
    return "evolution";
  }
}

/**
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} [providerId]
 */
function createMessagingProvider(db, providerId = "evolution") {
  switch (providerId) {
    case "evolution":
      return new EvolutionProvider(db);
    case "meta_cloud":
    case "twilio":
      // Future plugins — fall back to Evolution until implemented
      console.warn(
        `Messaging provider "${providerId}" not implemented; using Evolution.`,
      );
      return new EvolutionProvider(db);
    default:
      return new EvolutionProvider(db);
  }
}

/**
 * Async factory that reads settings/integrations.messagingProviderId.
 */
async function createMessagingProviderFromSettings(db) {
  const id = await resolveProviderId(db);
  return createMessagingProvider(db, id);
}

module.exports = {
  NotConnectedError,
  UnsupportedCapabilityError,
  EvolutionProvider,
  createMessagingProvider,
  createMessagingProviderFromSettings,
  createMessagingStore,
  loadEvolutionConfig,
  loadProviderConfig,
  webhookUrlForProject,
  normalizePhoneE164,
  digitsOnly,
  MessagingProviderContract,
  TIMELINE_ICONS,
};
