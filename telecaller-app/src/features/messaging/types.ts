/**
 * Provider-agnostic messaging domain types.
 * CRM UI and Cloud Functions talk through MessagingProvider — never Evolution-specific models.
 */

export type MessagingProviderId = "evolution" | "meta_cloud" | "twilio" | string;

/** Canonical connection lifecycle shown in Admin / Inbox (provider-agnostic). */
export type MessagingConnectionStatus =
  | "not_configured"
  | "disabled"
  | "disconnected"
  | "connecting"
  | "waiting_qr"
  | "connected"
  | "error";

/** @deprecated Prefer MessagingConnectionStatus — kept for settings field mapping */
export type EvolutionConnectionStatus = MessagingConnectionStatus | "qr";

export type WhatsAppMessageType =
  | "text"
  | "image"
  | "document"
  | "audio"
  | "template";

export type WhatsAppMessageStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export type WhatsAppMessageDirection = "outbound" | "inbound";

/** Top-level `whatsappConversations/{id}` */
export interface WhatsAppConversation {
  id: string;
  leadId: string;
  phoneNumber: string;
  waId?: string;
  provider: MessagingProviderId;
  status: "open" | "closed" | "archived";
  lastMessageAt?: string;
  lastMessagePreview?: string;
  lastMessageDirection?: WhatsAppMessageDirection;
  unreadCount: number;
  assignedTo?: string;
  assignedToName?: string;
  createdAt: string;
  updatedAt: string;
}

/** Top-level `whatsappMessages/{id}` — full message body lives here, not on Lead */
export interface WhatsAppMessage {
  id: string;
  conversationId: string;
  leadId: string;
  provider: MessagingProviderId;
  providerMessageId?: string;
  direction: WhatsAppMessageDirection;
  type: WhatsAppMessageType;
  text?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  mediaFileName?: string;
  templateId?: string;
  status: WhatsAppMessageStatus;
  error?: string;
  timestamp: string;
  updatedAt?: string;
  agentId?: string;
  agentName?: string;
  /** Legacy subcollection bridge marker only */
  legacyNoteTag?: string;
}

/** @deprecated Lead-nested meta — read-only compatibility */
export interface WhatsAppConversationMeta {
  lastMessageAt?: string;
  lastMessagePreview?: string;
  unreadCount?: number;
  waId?: string;
  updatedAt?: string;
}

/**
 * Public integration settings for the active messaging provider.
 * Field names may still use `evolution*` keys in Firestore for V1 storage;
 * UI should prefer MessagingProviderStatus from callables.
 */
export interface MessagingIntegrationPublic {
  messagingProviderId: MessagingProviderId;
  messagingEnabled: boolean;
  messagingBaseUrl: string;
  messagingInstanceName: string;
  messagingConnectionStatus: MessagingConnectionStatus;
  messagingQrStatus: string;
  messagingConnectedPhone: string;
  messagingInstanceStatus: string;
  messagingLastSyncAt: string;
  messagingLastError: string;
  messagingLastWebhookAt: string;
  messagingWebhookHealth: "unknown" | "healthy" | "stale" | "error";
  /** V1 Evolution storage keys (mirrored for backward compatibility) */
  evolutionEnabled: boolean;
  evolutionBaseUrl: string;
  evolutionInstanceName: string;
  evolutionConnectionStatus: EvolutionConnectionStatus;
  evolutionQrStatus: string;
  evolutionConnectedPhone: string;
  evolutionInstanceStatus: string;
  evolutionLastSyncAt: string;
  evolutionLastError: string;
  evolutionLastWebhookAt?: string;
  evolutionWebhookHealth?: "unknown" | "healthy" | "stale" | "error";
}

/** @deprecated Use MessagingIntegrationPublic */
export type EvolutionIntegrationPublic = MessagingIntegrationPublic;

export interface MessagingProviderStatus {
  provider: MessagingProviderId;
  connected: boolean;
  status: MessagingConnectionStatus;
  instanceName?: string;
  connectedPhone?: string;
  instanceStatus?: string;
  qrStatus?: string;
  qrBase64?: string | null;
  lastSyncAt?: string;
  lastError?: string;
  lastWebhookAt?: string;
  webhookHealth?: "unknown" | "healthy" | "stale" | "error";
  webhookUrl: string;
  message?: string;
  supportsCreateInstance?: boolean;
}

export const DEFAULT_MESSAGING_PUBLIC: MessagingIntegrationPublic = {
  messagingProviderId: "evolution",
  messagingEnabled: false,
  messagingBaseUrl: "",
  messagingInstanceName: "",
  messagingConnectionStatus: "not_configured",
  messagingQrStatus: "n/a",
  messagingConnectedPhone: "",
  messagingInstanceStatus: "not_configured",
  messagingLastSyncAt: "",
  messagingLastError: "",
  messagingLastWebhookAt: "",
  messagingWebhookHealth: "unknown",
  evolutionEnabled: false,
  evolutionBaseUrl: "",
  evolutionInstanceName: "",
  evolutionConnectionStatus: "not_configured",
  evolutionQrStatus: "n/a",
  evolutionConnectedPhone: "",
  evolutionInstanceStatus: "not_configured",
  evolutionLastSyncAt: "",
  evolutionLastError: "",
  evolutionLastWebhookAt: "",
  evolutionWebhookHealth: "unknown",
};

/** @deprecated Prefer DEFAULT_MESSAGING_PUBLIC */
export const DEFAULT_EVOLUTION_PUBLIC = DEFAULT_MESSAGING_PUBLIC;

/** Map legacy `qr` status to canonical `waiting_qr` */
export function normalizeConnectionStatus(
  status: string | undefined | null,
): MessagingConnectionStatus {
  if (!status) return "not_configured";
  if (status === "qr") return "waiting_qr";
  const allowed: MessagingConnectionStatus[] = [
    "not_configured",
    "disabled",
    "disconnected",
    "connecting",
    "waiting_qr",
    "connected",
    "error",
  ];
  return (allowed.includes(status as MessagingConnectionStatus)
    ? status
    : "not_configured") as MessagingConnectionStatus;
}
