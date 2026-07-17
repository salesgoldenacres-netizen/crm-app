/**
 * Automation job type constants + idempotency key helpers (Cloud Functions).
 *
 * Key strategy (document for Agents 1–3):
 *   leadId + jobType + IST date (YYYY-MM-DD)
 * → notification doc id: auto_{jobType}_{leadId}_{ymd}
 *
 * Same cron run (or retry) must not double-notify: use create-only writes.
 */

/** @typedef {'follow_up'|'follow_up_overdue'|'sla_breach'|'site_visit_reminder'|'site_visit_reminder_day_before'|'site_visit_reminder_same_day'|'site_visit_no_show'|'stuck_lead'|'lead_assigned'} AutomationJobType */

/** Canonical automation job / notification type keys. */
const AUTOMATION_JOB_TYPES = Object.freeze({
  FOLLOW_UP: "follow_up",
  FOLLOW_UP_OVERDUE: "follow_up_overdue",
  SLA_BREACH: "sla_breach",
  /** Notification `type` for site-visit reminders (shared across D-1 / D-0). */
  SITE_VISIT_REMINDER: "site_visit_reminder",
  /** Idempotency job types — distinct so D-1 and D-0 can both fire for one visit date. */
  SITE_VISIT_REMINDER_DAY_BEFORE: "site_visit_reminder_day_before",
  SITE_VISIT_REMINDER_SAME_DAY: "site_visit_reminder_same_day",
  /** No-show framework (Agent 3 — disabled by default until product approves). */
  SITE_VISIT_NO_SHOW: "site_visit_no_show",
  STUCK_LEAD: "stuck_lead",
  LEAD_ASSIGNED: "lead_assigned",
});

/**
 * Sanitize a fragment for use in a Firestore document id.
 * @param {string} value
 * @returns {string}
 */
function sanitizeIdPart(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 120);
}

/**
 * Build the canonical idempotency key: `{jobType}:{leadId}:{ymd}`.
 * @param {{ jobType: string, leadId: string, dateYmd: string }} input
 * @returns {string}
 */
function buildAutomationIdempotencyKey(input) {
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

/**
 * Deterministic notifications doc id derived from the idempotency key.
 * @param {{ jobType: string, leadId: string, dateYmd: string } | string} input
 *   Either the key parts object or an already-built key string.
 * @returns {string}
 */
function buildAutomationNotificationId(input) {
  if (typeof input === "string") {
    const parts = input.split(":");
    if (parts.length < 3) {
      return `auto_${sanitizeIdPart(input)}`;
    }
    const jobType = parts[0];
    const dateYmd = parts[parts.length - 1];
    const leadId = parts.slice(1, -1).join(":");
    return `auto_${sanitizeIdPart(jobType)}_${sanitizeIdPart(leadId)}_${dateYmd}`;
  }
  return `auto_${sanitizeIdPart(input.jobType)}_${sanitizeIdPart(input.leadId)}_${String(input.dateYmd).trim()}`;
}

module.exports = {
  AUTOMATION_JOB_TYPES,
  sanitizeIdPart,
  buildAutomationIdempotencyKey,
  buildAutomationNotificationId,
};
