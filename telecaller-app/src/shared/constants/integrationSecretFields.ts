/** Fields stored in settings/integrations_secrets (admin-only read). */
export const INTEGRATION_SECRET_FIELD_KEYS = [
  "googleWebhookKey",
  "metaVerifyToken",
  "metaAccessToken",
  "apiWebhookKey",
  "twilioAccountSid",
  "twilioAuthToken",
  "twilioPhoneNumber",
  "whatsAppAccessToken",
  "whatsAppPhoneNumberId",
  "evolutionApiKey",
  "evolutionInstanceToken",
  "evolutionWebhookSecret",
  "exotelSid",
  "exotelToken",
  "ivrCustomAuthHeader",
] as const;

export type IntegrationSecretFieldKey = (typeof INTEGRATION_SECRET_FIELD_KEYS)[number];

/** IVR-related subset routed via useIVRStore.updateIvrSettings. */
export const IVR_SECRET_FIELD_KEYS = [
  "twilioAccountSid",
  "twilioAuthToken",
  "twilioPhoneNumber",
  "exotelSid",
  "exotelToken",
  "ivrCustomAuthHeader",
] as const;

export function splitIntegrationFields(
  settings: Record<string, unknown>,
): { publicFields: Record<string, unknown>; secretFields: Record<string, unknown> } {
  const secretSet = new Set<string>(INTEGRATION_SECRET_FIELD_KEYS);
  const publicFields: Record<string, unknown> = {};
  const secretFields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(settings)) {
    if (secretSet.has(key)) {
      secretFields[key] = value;
    } else {
      publicFields[key] = value;
    }
  }
  return { publicFields, secretFields };
}

export function splitIvrSettingsFields(
  settings: Record<string, unknown>,
): { publicFields: Record<string, unknown>; secretFields: Record<string, unknown> } {
  const secretSet = new Set<string>(IVR_SECRET_FIELD_KEYS);
  const publicFields: Record<string, unknown> = {};
  const secretFields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(settings)) {
    if (secretSet.has(key)) {
      secretFields[key] = value;
    } else {
      publicFields[key] = value;
    }
  }
  return { publicFields, secretFields };
}
