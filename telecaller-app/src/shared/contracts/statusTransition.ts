/**
 * Status transition helper — feature code must plan transitions here
 * instead of writing ad-hoc status strings.
 */

import {
  isBookedLikeStatus,
  isCanonicalLeadStatus,
  normalizeLeadStatus,
  type LeadStatus,
  TERMINAL_LOST_STATUSES,
  TERMINAL_WON_STATUSES,
} from "./leadStatus";

export type StatusTransitionReason =
  | "call"
  | "pipeline"
  | "kanban"
  | "admin"
  | "site_visit"
  | "booking"
  | "bulk"
  | "import"
  | "system"
  | "reopen";

export interface PlanStatusTransitionInput {
  from: string | null | undefined;
  to: string;
  /** When true, skip graph checks (manager override / import). Still requires canonical `to`. */
  force?: boolean;
  reason?: StatusTransitionReason;
}

export interface StatusTransitionPlan {
  ok: boolean;
  error?: string;
  from: LeadStatus | null;
  to: LeadStatus;
  /** Patch to apply on the lead document (status only — callers add other fields). */
  leadPatch: { status: LeadStatus };
  /** Timeline type preference for publishers. */
  timelineType: "lead_status_changed" | "lead_booked";
  summary: string;
  metadata: {
    from: string | null;
    to: LeadStatus;
    reason: StatusTransitionReason;
  };
}

/** Active (non-terminal) statuses that may freely move among themselves. */
const ACTIVE: readonly LeadStatus[] = [
  "raw",
  "new",
  "not-attempted",
  "contacted",
  "interested",
  "rnr",
  "re-engaged",
  "site-visit-confirmed",
  "site-visit-completed",
] as const;

const ACTIVE_SET = new Set<string>(ACTIVE);
const WON_SET = new Set<string>(TERMINAL_WON_STATUSES);

/**
 * Allowed edges. Keys are `from`; values are allowed `to` statuses.
 * Missing `from` (null/unknown) may enter any status.
 */
function buildAllowedMap(): Record<LeadStatus, ReadonlySet<LeadStatus>> {
  const all = new Set<LeadStatus>([
    ...ACTIVE,
    ...TERMINAL_WON_STATUSES,
    ...TERMINAL_LOST_STATUSES,
  ]);

  const map = {} as Record<LeadStatus, ReadonlySet<LeadStatus>>;
  for (const from of all) {
    if (ACTIVE_SET.has(from)) {
      // Active → any status (including terminal + peer actives)
      map[from] = all;
    } else if (WON_SET.has(from)) {
      // Won → reopen to new/re-engaged, or switch booked ↔ reserved
      map[from] = new Set<LeadStatus>([
        "new",
        "re-engaged",
        "booked",
        "reserved",
      ]);
    } else {
      // Lost → reopen
      map[from] = new Set<LeadStatus>(["new", "re-engaged", "not-interested"]);
    }
  }
  return map;
}

const ALLOWED = buildAllowedMap();

export function getAllowedTransitions(
  from: string | null | undefined,
): readonly LeadStatus[] {
  const normalized = normalizeLeadStatus(from);
  if (!normalized) {
    return [...ACTIVE, ...TERMINAL_WON_STATUSES, ...TERMINAL_LOST_STATUSES];
  }
  return [...ALLOWED[normalized]];
}

export function canTransitionStatus(
  from: string | null | undefined,
  to: string,
  options?: { force?: boolean },
): boolean {
  return planStatusTransition({ from, to, force: options?.force }).ok;
}

/**
 * Plan a status change. Does not write Firestore — callers apply `leadPatch`
 * and publish via typed timeline helpers.
 */
export function planStatusTransition(
  input: PlanStatusTransitionInput,
): StatusTransitionPlan {
  const reason = input.reason ?? "system";
  const to = normalizeLeadStatus(input.to);

  if (!to || !isCanonicalLeadStatus(to)) {
    return {
      ok: false,
      error: `Invalid target status: "${input.to}"`,
      from: normalizeLeadStatus(input.from),
      to: "new",
      leadPatch: { status: "new" },
      timelineType: "lead_status_changed",
      summary: "",
      metadata: { from: input.from ? String(input.from) : null, to: "new", reason },
    };
  }

  const from = normalizeLeadStatus(input.from);
  const fromRaw = input.from != null && String(input.from).trim() !== ""
    ? String(input.from)
    : null;

  if (from === to) {
    return {
      ok: false,
      error: "Status unchanged",
      from,
      to,
      leadPatch: { status: to },
      timelineType: isBookedLikeStatus(to) ? "lead_booked" : "lead_status_changed",
      summary: `Status unchanged (${to})`,
      metadata: { from: fromRaw, to, reason },
    };
  }

  if (!input.force && from && !ALLOWED[from].has(to)) {
    return {
      ok: false,
      error: `Transition not allowed: ${from} → ${to}`,
      from,
      to,
      leadPatch: { status: to },
      timelineType: isBookedLikeStatus(to) ? "lead_booked" : "lead_status_changed",
      summary: "",
      metadata: { from: fromRaw, to, reason },
    };
  }

  const booked = isBookedLikeStatus(to);
  const summary = booked
    ? `Lead booked/converted → ${to}`
    : `Status: ${fromRaw || from || "—"} → ${to}`;

  return {
    ok: true,
    from,
    to,
    leadPatch: { status: to },
    timelineType: booked ? "lead_booked" : "lead_status_changed",
    summary,
    metadata: { from: fromRaw, to, reason },
  };
}

/**
 * Site-visit schedule must advance pipeline to `site-visit-confirmed`
 * (Agent 1 P0). Convenience planner for that intent.
 */
export function planSiteVisitConfirmedTransition(
  from: string | null | undefined,
  options?: { force?: boolean },
): StatusTransitionPlan {
  return planStatusTransition({
    from,
    to: "site-visit-confirmed",
    force: options?.force,
    reason: "site_visit",
  });
}
