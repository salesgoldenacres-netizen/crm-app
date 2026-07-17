import { addDoc, collection, doc, setDoc } from "firebase/firestore";
import { db } from "@/shared/services/firebase";
import {
  TIMELINE_EVENT_ICONS,
  TIMELINE_SUMMARY_MAX,
  type TimelineEventIcon,
  type TimelineEventSource,
  type TimelineEventType,
} from "../timelineTypes";

export interface RecordTimelineEventInput {
  leadId: string;
  type: TimelineEventType;
  source?: TimelineEventSource;
  sourceId?: string;
  conversationId?: string;
  messageId?: string;
  summary: string;
  icon?: TimelineEventIcon;
  actorId?: string;
  actorName?: string;
  metadata?: Record<string, string | number | boolean | null>;
  timestamp?: string;
  /**
   * When set, writes with a deterministic doc id (`tl_${idempotencyKey}`) via setDoc.
   * Use before bulk / retryable publishers. Safe to re-call — last write wins on same key.
   */
  idempotencyKey?: string;
}

/**
 * Publish a lightweight immutable timeline event.
 * Never store full message/note/call bodies here — refs + summary only.
 *
 * Prefer typed helpers from `@/shared/contracts/timelinePublisher`
 * instead of calling this with raw `type` strings from UI.
 */
export async function recordTimelineEvent(
  input: RecordTimelineEventInput,
): Promise<string | null> {
  if (!input.leadId || !input.type) return null;
  const now = new Date().toISOString();
  const payload = {
    leadId: input.leadId,
    type: input.type,
    source: input.source || "system",
    sourceId: input.sourceId || null,
    conversationId: input.conversationId || null,
    messageId: input.messageId || null,
    summary: String(input.summary || input.type).slice(0, TIMELINE_SUMMARY_MAX),
    icon: input.icon || TIMELINE_EVENT_ICONS[input.type] || "note",
    actorId: input.actorId || null,
    actorName: input.actorName || null,
    metadata: input.metadata || null,
    timestamp: input.timestamp || now,
    createdAt: now,
    ...(input.idempotencyKey
      ? { idempotencyKey: String(input.idempotencyKey) }
      : {}),
  };

  try {
    if (input.idempotencyKey) {
      const safeKey = String(input.idempotencyKey).replace(/[^\w.-]/g, "_").slice(0, 120);
      const id = `tl_${safeKey}`;
      await setDoc(doc(db, "timelineEvents", id), payload, { merge: true });
      return id;
    }
    const ref = await addDoc(collection(db, "timelineEvents"), payload);
    return ref.id;
  } catch (err) {
    console.warn("recordTimelineEvent failed", err);
    return null;
  }
}
