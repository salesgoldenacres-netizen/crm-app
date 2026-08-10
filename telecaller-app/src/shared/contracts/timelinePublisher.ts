/**
 * Typed Timeline Publisher API (Wave 6 Agent 0).
 * Feature code must use these helpers — never pass raw `type` strings
 * to `recordTimelineEvent` from UI.
 */

import {
  recordTimelineEvent,
  type RecordTimelineEventInput,
} from "@/shared/services/messaging/recordTimelineEvent";
import type {
  TimelineEventSource,
  TimelineEventType,
} from "@/shared/types/timeline";
import {
  isBookedLikeStatus,
  normalizeLeadStatus,
} from "./leadStatus";
import {
  planStatusTransition,
  type StatusTransitionReason,
} from "./statusTransition";

export type TimelineActor = {
  actorId?: string;
  actorName?: string;
};

export type TimelinePublishBase = TimelineActor & {
  leadId: string;
  sourceId?: string;
  idempotencyKey?: string;
  timestamp?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

function capSummary(summary: string): string {
  return String(summary || "").slice(0, 200);
}

async function publish(
  type: TimelineEventType,
  source: TimelineEventSource,
  base: TimelinePublishBase,
  summary: string,
  extra?: Partial<RecordTimelineEventInput>,
): Promise<string | null> {
  return recordTimelineEvent({
    leadId: base.leadId,
    type,
    source,
    sourceId: base.sourceId,
    summary: capSummary(summary),
    actorId: base.actorId,
    actorName: base.actorName,
    metadata: base.metadata,
    timestamp: base.timestamp,
    idempotencyKey: base.idempotencyKey,
    ...extra,
  });
}

export async function publishLeadCreated(
  base: TimelinePublishBase & { name?: string },
): Promise<string | null> {
  const name = base.name || "Lead";
  return publish(
    "lead_created",
    "lead",
    { ...base, sourceId: base.sourceId || base.leadId },
    `Lead created: ${name}`,
  );
}

export async function publishLeadStatusChanged(
  base: TimelinePublishBase & {
    from?: string | null;
    to: string;
    reason?: StatusTransitionReason;
    force?: boolean;
  },
): Promise<string | null> {
  const plan = planStatusTransition({
    from: base.from,
    to: base.to,
    force: base.force ?? true,
    reason: base.reason,
  });
  // Unchanged / invalid / disallowed (when force=false) → no event
  if (!plan.ok) return null;

  const to = plan.to;
  const type: TimelineEventType = plan.timelineType;
  return publish(
    type,
    "lead",
    {
      ...base,
      sourceId: base.sourceId || base.leadId,
      metadata: {
        from: plan.metadata.from,
        to,
        reason: plan.metadata.reason,
        ...base.metadata,
      },
    },
    plan.summary || `Status → ${to}`,
  );
}

export async function publishLeadAssigned(
  base: TimelinePublishBase & {
    assigneeName?: string | null;
    assigneeId?: string | null;
  },
): Promise<string | null> {
  const label = base.assigneeName || base.assigneeId || "Unassigned";
  return publish(
    "lead_assigned",
    "lead",
    {
      ...base,
      sourceId: base.sourceId || base.leadId,
      metadata: {
        to: base.assigneeName || base.assigneeId || null,
        ...base.metadata,
      },
    },
    `Assigned → ${label}`,
  );
}

export async function publishLeadReassigned(
  base: TimelinePublishBase & {
    fromName?: string | null;
    toName?: string | null;
    toId?: string | null;
  },
): Promise<string | null> {
  const label = base.toName || base.toId || "Unassigned";
  return publish(
    "lead_reassigned",
    "lead",
    {
      ...base,
      sourceId: base.sourceId || base.leadId,
      metadata: {
        from: base.fromName || null,
        to: base.toName || base.toId || null,
        ...base.metadata,
      },
    },
    `Reassigned → ${label}`,
  );
}

/**
 * Emit follow-up created **only when the date actually changes**.
 * Pass previous value; no-ops when equal (including both empty).
 */
export async function publishFollowUpCreated(
  base: TimelinePublishBase & {
    followUpDate: string;
    previousFollowUpDate?: string | null;
  },
): Promise<string | null> {
  const next = String(base.followUpDate || "").trim();
  const prev = String(base.previousFollowUpDate || "").trim();
  if (!next || next === prev) return null;
  return publish(
    "followup_created",
    "followup",
    {
      ...base,
      sourceId: base.sourceId || base.leadId,
      metadata: { followUpDate: next, previousFollowUp: prev || null, ...base.metadata },
    },
    `Follow-up set for ${next}`,
  );
}

/**
 * Emit follow-up completed when clearing a previously set date.
 */
export async function publishFollowUpCompleted(
  base: TimelinePublishBase & {
    previousFollowUpDate?: string | null;
    nextFollowUpDate?: string | null;
  },
): Promise<string | null> {
  const prev = String(base.previousFollowUpDate || "").trim();
  const next = String(base.nextFollowUpDate || "").trim();
  if (!prev || next) return null;
  return publish(
    "followup_completed",
    "followup",
    {
      ...base,
      sourceId: base.sourceId || base.leadId,
      metadata: { previousFollowUp: prev, ...base.metadata },
    },
    "Follow-up cleared/completed",
  );
}

/**
 * Diff-aware follow-up publisher: created on change-to-date, completed on clear.
 */
export async function publishFollowUpDiff(
  base: TimelinePublishBase & {
    previousFollowUpDate?: string | null;
    nextFollowUpDate?: string | null;
  },
): Promise<string | null> {
  const prev = String(base.previousFollowUpDate || "").trim();
  const next =
    base.nextFollowUpDate === undefined || base.nextFollowUpDate === null
      ? ""
      : String(base.nextFollowUpDate).trim();
  if (next === prev) return null;
  if (next) {
    return publishFollowUpCreated({
      ...base,
      followUpDate: next,
      previousFollowUpDate: prev,
    });
  }
  return publishFollowUpCompleted({
    ...base,
    previousFollowUpDate: prev,
    nextFollowUpDate: next,
  });
}

export async function publishNoteAdded(
  base: TimelinePublishBase & { note: string },
): Promise<string | null> {
  const note = String(base.note || "").trim();
  if (!note) return null;
  return publish("note_added", "note", base, note.slice(0, 120));
}

export async function publishCallCompleted(
  base: TimelinePublishBase & {
    summary?: string;
    status?: string;
    duration?: number | null;
    callType?: string | null;
  },
): Promise<string | null> {
  return publish(
    "call_completed",
    "call",
    {
      ...base,
      metadata: {
        status: base.status ?? null,
        duration: base.duration ?? null,
        callType: base.callType ?? null,
        ...base.metadata,
      },
    },
    base.summary || "Call completed",
  );
}

export async function publishSiteVisitScheduled(
  base: TimelinePublishBase & { date?: string; time?: string },
): Promise<string | null> {
  const when = [base.date, base.time].filter(Boolean).join(" ");
  return publish(
    "site_visit_scheduled",
    "site_visit",
    {
      ...base,
      metadata: { date: base.date || null, time: base.time || null, ...base.metadata },
    },
    when ? `Site visit scheduled for ${when}` : "Site visit scheduled",
  );
}

export async function publishSiteVisitCompleted(
  base: TimelinePublishBase & { summary?: string },
): Promise<string | null> {
  return publish(
    "site_visit_completed",
    "site_visit",
    base,
    base.summary || "Site visit completed",
  );
}

export async function publishSiteVisitCancelled(
  base: TimelinePublishBase & { summary?: string },
): Promise<string | null> {
  return publish(
    "site_visit_cancelled",
    "site_visit",
    base,
    base.summary || "Site visit cancelled",
  );
}

export async function publishSiteVisitNoShow(
  base: TimelinePublishBase & { summary?: string },
): Promise<string | null> {
  return publish(
    "site_visit_no_show",
    "site_visit",
    base,
    base.summary || "Site visit no-show",
  );
}

export async function publishDiscountRequested(
  base: TimelinePublishBase & { amount?: string; summary?: string },
): Promise<string | null> {
  return publish(
    "discount_requested",
    "discount",
    {
      ...base,
      metadata: { amount: base.amount || null, ...base.metadata },
    },
    base.summary ||
      (base.amount ? `Discount requested: ${base.amount}` : "Discount requested"),
  );
}

export async function publishDiscountApproved(
  base: TimelinePublishBase & { amount?: string; summary?: string },
): Promise<string | null> {
  return publish(
    "discount_approved",
    "discount",
    {
      ...base,
      metadata: { amount: base.amount || null, ...base.metadata },
    },
    base.summary ||
      (base.amount ? `Discount approved: ${base.amount}` : "Discount approved"),
  );
}

export async function publishDiscountRejected(
  base: TimelinePublishBase & { summary?: string },
): Promise<string | null> {
  return publish(
    "discount_rejected",
    "discount",
    base,
    base.summary || "Discount rejected",
  );
}

export async function publishLeadMerged(
  base: TimelinePublishBase & {
    sourceLeadId: string;
    sourceLeadName?: string;
  },
): Promise<string | null> {
  return publish(
    "lead_merged",
    "lead",
    {
      ...base,
      sourceId: base.sourceId || base.sourceLeadId,
      metadata: {
        sourceLeadId: base.sourceLeadId,
        sourceLeadName: base.sourceLeadName || null,
        ...base.metadata,
      },
    },
    base.sourceLeadName
      ? `Merged lead ${base.sourceLeadName}`
      : `Merged lead ${base.sourceLeadId}`,
  );
}

/**
 * Resolve timeline type for a status string without publishing.
 * Prefer `planStatusTransition` + `publishLeadStatusChanged` for writes.
 */
export function resolveStatusTimelineType(
  status: string | null | undefined,
): "lead_booked" | "lead_status_changed" {
  const normalized = normalizeLeadStatus(status);
  if (normalized && isBookedLikeStatus(normalized)) return "lead_booked";
  if (isBookedLikeStatus(status)) return "lead_booked";
  return "lead_status_changed";
}

/** @deprecated Alias — use `lead_booked` publishers. */
export async function publishLeadConverted(
  base: TimelinePublishBase & { status?: string },
): Promise<string | null> {
  return publishLeadStatusChanged({
    ...base,
    from: null,
    to: base.status || "booked",
    force: true,
    reason: "booking",
  });
}
