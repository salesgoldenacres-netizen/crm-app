/**
 * Notification contract types + client write helper.
 * Wraps existing NotificationsRepository — does not rebuild FCM infra.
 * Server twin: `functions/notifications/publishNotification.js`.
 */

import { NotificationsRepository } from "@/shared/services/firebase/repositories";
import type { NotificationItem } from "@/shared/types";

/** Canonical notification `type` values (extend over time; dual-read legacy strings OK). */
export const NOTIFICATION_TYPES = [
  "info",
  "success",
  "warning",
  "error",
  "lead",
  "lead_assigned",
  "follow_up",
  "follow_up_overdue",
  "sla_breach",
  "site_visit",
  "site_visit_reminder",
  "site_visit_no_show",
  "discount",
  "missed_call",
  "stuck_lead",
  "system",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface PublishNotificationInput {
  userId: string;
  message: string;
  type?: NotificationType | string;
  /** Optional title for FCM / richer UI (stored in message prefix if not persisted separately). */
  title?: string;
  leadId?: string;
  /** Stable id for idempotent writes; auto-generated when omitted. */
  id?: string;
  /** Extra metadata for future UI (not required by current NotificationItem consumers). */
  metadata?: Record<string, string | number | boolean | null>;
}

export interface PublishNotificationResult {
  id: string;
  notification: NotificationItem;
}

function buildMessage(input: PublishNotificationInput): string {
  const body = String(input.message || "").trim();
  if (input.title && body) return `${input.title}: ${body}`;
  if (input.title) return String(input.title);
  return body;
}

/**
 * Write an in-app `notifications` document.
 * Does not send FCM — client callables / server helper own push delivery.
 */
export async function publishInAppNotification(
  input: PublishNotificationInput,
): Promise<PublishNotificationResult | null> {
  const userId = String(input.userId || "").trim();
  const message = buildMessage(input);
  if (!userId || !message) return null;

  const id =
    input.id ||
    (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
  const notification: NotificationItem = {
    id,
    userId,
    message,
    type: input.type || "info",
    read: false,
    createdAt: new Date().toISOString(),
    ...(input.leadId ? { leadId: input.leadId } : {}),
  };

  await NotificationsRepository.add(notification);
  return { id, notification };
}

/**
 * Prefer this over hand-rolled `NotificationsRepository.add` in feature code.
 * Alias kept for readability in migration notes.
 */
export const publishNotification = publishInAppNotification;
