/**
 * MessagingProvider contract (plugin interface).
 *
 * CRM Cloud Functions and UI never call Evolution/Meta/Twilio APIs directly.
 * Implementations live under ./providers/*.
 *
 * Required methods:
 *   getStatus() -> MessagingProviderStatus
 *   testConnection() -> MessagingProviderStatus
 *   getQr() -> status + qrBase64
 *   reconnect() -> status
 *   disconnect() -> status
 *   sendText({ number, text }) -> { providerMessageId }
 *   sendMedia({ number, mediaUrl, mediaMimeType, fileName, caption }) -> { providerMessageId }
 *   handleWebhook(body) -> { ok, handled }
 *
 * Optional:
 *   createInstance(opts) -> status  (throws UnsupportedCapabilityError if not supported)
 *   downloadMedia(ref) -> { url }
 *   markRead(conversationId)
 *
 * Shared CRM persistence (conversations / messages / timeline) is via createMessagingStore(db),
 * not provider-specific collections.
 */

module.exports = {
  /** Documented contract only — providers implement methods on their class. */
  MessagingProviderContract: {
    required: [
      "getStatus",
      "testConnection",
      "getQr",
      "reconnect",
      "disconnect",
      "sendText",
      "sendMedia",
      "handleWebhook",
    ],
    optional: ["createInstance", "downloadMedia", "markRead"],
  },
};
