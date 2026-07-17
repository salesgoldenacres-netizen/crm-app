/**
 * Canonical CRM activity stream — lightweight references only.
 * Full bodies live on source entities (messages, callLogs, notes, etc.).
 *
 * Wave 6: prefer typed helpers in `@/shared/contracts/timelinePublisher`
 * — UI must not pass raw `type` strings to `recordTimelineEvent`.
 */

export type TimelineEventType =
  | "whatsapp_inbound"
  | "whatsapp_outbound"
  | "call_completed"
  | "note_added"
  | "lead_status_changed"
  | "lead_assigned"
  | "lead_reassigned"
  | "followup_created"
  | "followup_completed"
  | "lead_created"
  /** @deprecated Prefer `lead_booked`. Kept for dual-read of any legacy rows. */
  | "lead_converted"
  | "lead_booked"
  | "site_visit_scheduled"
  | "site_visit_completed"
  | "site_visit_cancelled"
  | "site_visit_no_show"
  | "discount_requested"
  | "discount_approved"
  | "discount_rejected"
  | "lead_merged";

export type TimelineEventSource =
  | "whatsapp"
  | "call"
  | "note"
  | "lead"
  | "followup"
  | "system"
  | "site_visit"
  | "discount";

export type TimelineEventIcon =
  | "message"
  | "phone"
  | "note"
  | "status"
  | "user"
  | "calendar"
  | "check"
  | "star"
  | "plus"
  | "map"
  | "tag"
  | "merge";

/** Top-level `timelineEvents/{id}` — immutable after create */
export interface TimelineEvent {
  id: string;
  leadId: string;
  type: TimelineEventType;
  source: TimelineEventSource;
  /** Original entity id (messageId, callLog index key, note id, etc.) */
  sourceId?: string;
  conversationId?: string;
  messageId?: string;
  summary: string;
  icon: TimelineEventIcon;
  actorId?: string;
  actorName?: string;
  metadata?: Record<string, string | number | boolean | null>;
  timestamp: string;
  createdAt: string;
  /** Optional idempotency key mirrored from write input (not always stored). */
  idempotencyKey?: string;
}

export const TIMELINE_EVENT_ICONS: Record<TimelineEventType, TimelineEventIcon> = {
  whatsapp_inbound: "message",
  whatsapp_outbound: "message",
  call_completed: "phone",
  note_added: "note",
  lead_status_changed: "status",
  lead_assigned: "user",
  lead_reassigned: "user",
  followup_created: "calendar",
  followup_completed: "check",
  lead_created: "plus",
  lead_converted: "star",
  lead_booked: "star",
  site_visit_scheduled: "map",
  site_visit_completed: "map",
  site_visit_cancelled: "map",
  site_visit_no_show: "map",
  discount_requested: "tag",
  discount_approved: "tag",
  discount_rejected: "tag",
  lead_merged: "merge",
};

/** Summary hard cap — keep in sync with Functions `recordTimelineEvent`. */
export const TIMELINE_SUMMARY_MAX = 200;
