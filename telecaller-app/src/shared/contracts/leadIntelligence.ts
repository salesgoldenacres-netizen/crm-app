/**
 * Lead intelligence contract (computed-on-read v1).
 * Agent 4 implements scorers; Agent 0 owns this shape.
 * Do not persist unless Architecture Owner authorizes caching.
 *
 * Frozen APIs: types, version stamps, band thresholds, factor IDs,
 * and pure band / next-action helpers. Feature code must not fork these.
 */

import { AUTOMATION_THRESHOLDS } from "./automation";

export type LeadScoreBand = "hot" | "warm" | "cold";
export type LeadHealthBand = "healthy" | "watch" | "critical";
export type DuplicateRisk = "none" | "possible" | "confirmed";

export type LeadNextActionType =
  | "call"
  | "whatsapp"
  | "schedule_visit"
  | "log_outcome"
  | "request_discount"
  | "close_lost"
  | "merge_review";

export interface LeadScoreFactor {
  id: string;
  label: string;
  delta: number;
}

export interface LeadNextAction {
  type: LeadNextActionType;
  reason: string;
  channel?: "phone" | "whatsapp";
}

export interface LeadIntelligenceSummary {
  text: string;
  source: "rules" | "llm";
  updatedAt: string;
}

/**
 * Versioned intelligence snapshot. Prefer computed-on-read for v1
 * (`version: "lead-score-v1"`). Manual `Lead.priority` remains the override.
 */
export interface LeadIntelligence {
  score: number;
  scoreBand: LeadScoreBand;
  scoreFactors: LeadScoreFactor[];
  bookingProbability: number;
  health: LeadHealthBand;
  healthReasons: string[];
  staleDays: number;
  duplicateRisk: DuplicateRisk;
  duplicateCandidateIds?: string[];
  nextAction: LeadNextAction;
  summary?: LeadIntelligenceSummary;
  computedAt: string;
  version: string;
}

/** Formula version string Agent 4 must stamp on computed results. */
export const LEAD_SCORE_VERSION_V1 = "lead-score-v1" as const;
export const LEAD_NEXT_ACTION_VERSION_V1 = "next-action-v1" as const;
export const LEAD_BOOKING_PROB_VERSION_V1 = "pBook-v1" as const;

/**
 * Intelligence-specific thresholds. Idle watch days align with automation
 * (`AUTOMATION_THRESHOLDS.LEAD_IDLE_DAYS`) — do not invent parallel magic numbers.
 */
export const LEAD_INTELLIGENCE_THRESHOLDS = {
  SCORE_BASE: 40,
  SCORE_HOT_MIN: 70,
  SCORE_WARM_MIN: 40,
  IDLE_WATCH_DAYS: AUTOMATION_THRESHOLDS.LEAD_IDLE_DAYS,
  IDLE_CRITICAL_DAYS: 7,
  OVERDUE_WATCH_DAYS: 1,
  OVERDUE_CRITICAL_DAYS: 2,
  RECENT_CONNECT_HOURS: 48,
  DAILY_PRIORITIES_DEFAULT_LIMIT: 15,
} as const;

/** Stable factor IDs for `lead-score-v1` (explainability + tests). */
export const LEAD_SCORE_FACTOR_IDS = {
  MANUAL_HOT: "manual_hot",
  MANUAL_COLD: "manual_cold",
  STAGE_INTERESTED: "stage_interested",
  STAGE_SITE_VISIT: "stage_site_visit",
  STAGE_RESERVED: "stage_reserved",
  STAGE_BOOKED: "stage_booked",
  STAGE_NOT_INTERESTED: "stage_not_interested",
  STAGE_NEW_RAW: "stage_new_raw",
  STAGE_RNR: "stage_rnr",
  FOLLOWUP_TODAY: "followup_today",
  FOLLOWUP_OVERDUE: "followup_overdue",
  FOLLOWUP_MISSING: "followup_missing",
  IDLE_3D: "idle_3d",
  IDLE_7D: "idle_7d",
  RECENT_CONNECT: "recent_connect",
  HAS_SITE_VISIT_OBJ: "has_site_visit_obj",
  SOURCE_PAID: "source_paid",
  DUPLICATE_SUSPECTED: "duplicate_suspected",
} as const;

export type LeadScoreFactorId =
  (typeof LEAD_SCORE_FACTOR_IDS)[keyof typeof LEAD_SCORE_FACTOR_IDS];

export function clampLeadScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function scoreToBand(score: number): LeadScoreBand {
  const n = clampLeadScore(score);
  if (n >= LEAD_INTELLIGENCE_THRESHOLDS.SCORE_HOT_MIN) return "hot";
  if (n >= LEAD_INTELLIGENCE_THRESHOLDS.SCORE_WARM_MIN) return "warm";
  return "cold";
}

export interface LeadHealthSignals {
  overdueDays: number;
  staleDays: number;
  missingFollowUp: boolean;
  manualHot: boolean;
  isTerminal: boolean;
}

/**
 * Health band decision helper (`lead-health-v1` rules).
 * Escalate: any Critical match → critical; else any Watch → watch; else healthy.
 */
export function decideLeadHealthBand(
  signals: LeadHealthSignals,
): { health: LeadHealthBand; reasons: string[] } {
  if (signals.isTerminal) {
    return { health: "healthy", reasons: [] };
  }

  const reasons: string[] = [];
  let health: LeadHealthBand = "healthy";

  const overdueCritical =
    signals.overdueDays >= LEAD_INTELLIGENCE_THRESHOLDS.OVERDUE_CRITICAL_DAYS;
  const idleCritical =
    signals.staleDays >= LEAD_INTELLIGENCE_THRESHOLDS.IDLE_CRITICAL_DAYS;
  const hotOverdue = signals.manualHot && signals.overdueDays >= 1;

  if (overdueCritical) {
    health = "critical";
    reasons.push(`Overdue follow-up ${signals.overdueDays}d`);
  }
  if (idleCritical) {
    health = "critical";
    reasons.push(`No activity for ${signals.staleDays}d`);
  }
  if (hotOverdue) {
    health = "critical";
    reasons.push("Hot lead with overdue follow-up");
  }

  if (health === "critical") {
    return { health, reasons };
  }

  const overdueWatch =
    signals.overdueDays >= LEAD_INTELLIGENCE_THRESHOLDS.OVERDUE_WATCH_DAYS;
  const idleWatch =
    signals.staleDays >= LEAD_INTELLIGENCE_THRESHOLDS.IDLE_WATCH_DAYS &&
    signals.staleDays < LEAD_INTELLIGENCE_THRESHOLDS.IDLE_CRITICAL_DAYS;

  if (overdueWatch) {
    health = "watch";
    reasons.push(`Overdue follow-up ${signals.overdueDays}d`);
  }
  if (idleWatch) {
    health = "watch";
    reasons.push(`Idle ${signals.staleDays}d`);
  }
  if (signals.missingFollowUp) {
    health = "watch";
    reasons.push("Missing follow-up date");
  }

  return { health, reasons };
}

export interface NextActionDecisionInput {
  duplicateRisk: DuplicateRisk;
  isManagerial: boolean;
  status: string;
  hasSiteVisit: boolean;
  followUpToday: boolean;
  followUpOverdue: boolean;
  consecutiveRnrOrUnanswered: number;
  staleDays: number;
  hadPriorConnect: boolean;
  health: LeadHealthBand;
  isTerminal: boolean;
}

/**
 * Top-down `next-action-v1` decision helper. First match wins.
 * Feature scorers should call this rather than reordering the table.
 */
export function decideNextActionV1(
  input: NextActionDecisionInput,
): LeadNextAction {
  if (
    input.isManagerial &&
    (input.duplicateRisk === "confirmed" || input.duplicateRisk === "possible")
  ) {
    return {
      type: "merge_review",
      reason: "Duplicate phone group — review merge",
    };
  }

  if (
    input.status === "site-visit-confirmed" ||
    input.status === "site-visit-completed"
  ) {
    return {
      type: "call",
      channel: "phone",
      reason: "Confirm / host site visit",
    };
  }

  if (input.status === "interested" && !input.hasSiteVisit) {
    return {
      type: "schedule_visit",
      channel: "phone",
      reason: "Interested — push site visit",
    };
  }

  if (input.followUpToday || input.followUpOverdue) {
    return {
      type: "call",
      channel: "phone",
      reason: input.followUpOverdue
        ? "Follow-up overdue — call now"
        : "Follow-up due today",
    };
  }

  if (input.consecutiveRnrOrUnanswered >= 2) {
    return {
      type: "whatsapp",
      channel: "whatsapp",
      reason: "Break RNR streak with WhatsApp",
    };
  }

  if (
    input.status === "new" ||
    input.status === "raw" ||
    input.status === "not-attempted"
  ) {
    return {
      type: "call",
      channel: "phone",
      reason: "First contact",
    };
  }

  if (
    input.staleDays >= LEAD_INTELLIGENCE_THRESHOLDS.IDLE_WATCH_DAYS &&
    input.hadPriorConnect
  ) {
    return {
      type: "whatsapp",
      channel: "whatsapp",
      reason: "Re-engage idle lead",
    };
  }

  if (input.status === "reserved") {
    return {
      type: "call",
      channel: "phone",
      reason: "Close documentation / payment",
    };
  }

  if (input.health === "critical" && !input.isTerminal) {
    return {
      type: "call",
      channel: "phone",
      reason: "Rescue at-risk lead",
    };
  }

  return {
    type: "log_outcome",
    channel: "phone",
    reason: "Refresh status & follow-up",
  };
}

/** Health sort weight for daily priorities (higher = work first). */
export function healthRankWeight(health: LeadHealthBand): number {
  switch (health) {
    case "critical":
      return 3;
    case "watch":
      return 2;
    default:
      return 1;
  }
}
