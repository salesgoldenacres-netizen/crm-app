import { httpsCallable } from "firebase/functions";
import { functions } from "@/shared/services/firebase";
import type {
  MessagingProviderStatus,
  WhatsAppMessageType,
} from "../types";

export interface MessagingSendPayload {
  leadId: string;
  type?: WhatsAppMessageType;
  text?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  mediaFileName?: string;
  templateId?: string;
}

export async function fetchMessagingStatus(): Promise<MessagingProviderStatus> {
  const fn = httpsCallable(functions, "messagingStatus");
  const res = await fn({});
  return res.data as MessagingProviderStatus;
}

export async function testMessagingConnection(): Promise<MessagingProviderStatus> {
  const fn = httpsCallable(functions, "messagingTestConnection");
  const res = await fn({});
  return res.data as MessagingProviderStatus;
}

export async function messagingInstanceAction(
  action: "qr" | "reconnect" | "disconnect" | "createInstance",
  opts?: { instanceName?: string },
): Promise<MessagingProviderStatus & { qrBase64?: string | null }> {
  const fn = httpsCallable(functions, "messagingInstanceAction");
  const res = await fn({ action, ...opts });
  return res.data as MessagingProviderStatus & { qrBase64?: string | null };
}

export async function messagingSend(payload: MessagingSendPayload): Promise<{
  ok: boolean;
  messageId?: string;
  status?: string;
  connected?: boolean;
  error?: string;
}> {
  const fn = httpsCallable(functions, "messagingSend");
  const res = await fn(payload);
  return res.data as {
    ok: boolean;
    messageId?: string;
    status?: string;
    connected?: boolean;
    error?: string;
  };
}
