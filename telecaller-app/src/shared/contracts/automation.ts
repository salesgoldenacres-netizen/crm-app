/**
 * Wave 6 Phase 2C — Automation contracts (client mirror of functions/automation).
 * Feature agents import from `@/shared/contracts` — do not fork thresholds/keys.
 */

/** Canonical automation job / notification type keys (server + client). */
export const AUTOMATION_JOB_TYPES = {
  FOLLOW_UP: "follow_up",
  FOLLOW_UP_OVERDUE: "follow_up_overdue",
  SLA_BREACH: "sla_breach",
  /** Notification `type` for site-visit reminders (shared across D-1 / D-0). */
  SITE_VISIT_REMINDER: "site_visit_reminder",
  /** Idempotency job types — distinct so D-1 and D-0 can both fire for one visit date. */
  SITE_VISIT_REMINDER_DAY_BEFORE: "site_visit_reminder_day_before",
  SITE_VISIT_REMINDER_SAME_DAY: "site_visit_reminder_same_day",
  /** No-show framework (disabled by default until product approves). */
  SITE_VISIT_NO_SHOW: "site_visit_no_show",
  STUCK_LEAD: "stuck_lead",
  LEAD_ASSIGNED: "lead_assigned",
} as const;

export type AutomationJobType =
  (typeof AUTOMATION_JOB_TYPES)[keyof typeof AUTOMATION_JOB_TYPES];

/**
 * Shared thresholds — align with `functions/automation/thresholds.js`.
 * Phase 2D health must consume these rather than invent new magic numbers.
 */
export const AUTOMATION_THRESHOLDS = {
  SLA_FIRST_TOUCH_HOURS: 24,
  STUCK_LEAD_DAYS: 5,
  LEAD_IDLE_DAYS: 3,
  AGENT_IDLE_MINUTES: 45,
  SITE_VISIT_REMINDER_DAYS_BEFORE: 1,
} as const;

export const SYSTEM_CALL_AGENTS = [
  "system",
  "System (Auto)",
  "system_webhook",
] as const;

export const IST_TIME_ZONE = "Asia/Kolkata";

/**
 * Current (or given) calendar date as YYYY-MM-DD in Asia/Kolkata.
 * Prefer over `new Date().toISOString().split('T')[0]` (UTC).
 */
export function getIstDateString(input?: Date | number | string): string {
  const date = input == null ? new Date() : new Date(input);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date for IST formatting: ${String(input)}`);
  }
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Shift a YYYY-MM-DD by N calendar days (IST-safe date-only arithmetic). */
export function addIstDays(ymd: string, deltaDays: number): string {
  const match = String(ymd || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(`Expected YYYY-MM-DD, got: ${ymd}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = Date.UTC(year, month - 1, day + Number(deltaDays), 12, 0, 0);
  return getIstDateString(utc);
}

export function compareYmd(a: string, b: string): number {
  return String(a || "").localeCompare(String(b || ""));
}

export function isYmdBefore(ymd: string, todayYmd?: string): boolean {
  return compareYmd(ymd, todayYmd ?? getIstDateString()) < 0;
}

export function isYmdToday(ymd: string, todayYmd?: string): boolean {
  return compareYmd(ymd, todayYmd ?? getIstDateString()) === 0;
}

function sanitizeIdPart(value: string): string {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 120);
}

export interface AutomationIdempotencyParts {
  jobType: AutomationJobType | string;
  leadId: string;
  dateYmd: string;
}

/** `{jobType}:{leadId}:{ymd}` — same strategy as server. */
export function buildAutomationIdempotencyKey(
  input: AutomationIdempotencyParts,
): string {
  const jobType = sanitizeIdPart(input.jobType);
  const leadId = sanitizeIdPart(input.leadId);
  const dateYmd = String(input.dateYmd || "").trim();
  if (!jobType || !leadId || !/^\d{4}-\d{2}-\d{2}$/.test(dateYmd)) {
    throw new Error(
      `Invalid idempotency parts: jobType=${input.jobType} leadId=${input.leadId} date=${input.dateYmd}`,
    );
  }
  return `${jobType}:${leadId}:${dateYmd}`;
}

/** Deterministic notifications doc id: `auto_{jobType}_{leadId}_{ymd}`. */
export function buildAutomationNotificationId(
  input: AutomationIdempotencyParts | string,
): string {
  if (typeof input === "string") {
    const parts = input.split(":");
    if (parts.length < 3) return `auto_${sanitizeIdPart(input)}`;
    const jobType = parts[0];
    const dateYmd = parts[parts.length - 1];
    const leadId = parts.slice(1, -1).join(":");
    return `auto_${sanitizeIdPart(jobType)}_${sanitizeIdPart(leadId)}_${dateYmd}`;
  }
  return `auto_${sanitizeIdPart(input.jobType)}_${sanitizeIdPart(input.leadId)}_${String(input.dateYmd).trim()}`;
}

export interface AutomationIndexDescriptor {
  collection: string;
  fields: Array<{ field: string; order: "ASCENDING" | "DESCENDING" }>;
  note?: string;
}

/** Indexes Agents 1–3 need before overdue FU / visit crons. */
export function describeAutomationQueryIndexes(): AutomationIndexDescriptor[] {
  return [
    {
      collection: "leads",
      fields: [
        { field: "followUpDate", order: "ASCENDING" },
        { field: "assignedTo", order: "ASCENDING" },
      ],
      note: "Deployed in firestore.indexes.json (Phase 2A)",
    },
    {
      collection: "leads",
      fields: [{ field: "followUpDate", order: "ASCENDING" }],
      note: "Overdue range: followUpDate < today",
    },
    {
      collection: "leads",
      fields: [{ field: "siteVisit.date", order: "ASCENDING" }],
      note: "Site-visit reminder — add before visit cron deploy",
    },
  ];
}
