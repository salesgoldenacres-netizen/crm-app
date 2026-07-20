/**
 * Shared lead predicates for automation jobs (server).
 * Feature agents compose these inside cron handlers — do not fork SLA/stuck math.
 */

const {
  AUTOMATION_THRESHOLDS,
  SYSTEM_CALL_AGENTS,
} = require("./thresholds");
const { hoursSince, getIstDateString, isYmdBefore } = require("./ist");

/**
 * Prefer followUpDate; dual-read followUpOn for legacy rows.
 * @param {{ followUpDate?: string, followUpOn?: string }} lead
 * @returns {string | null}
 */
function getFollowUpDate(lead) {
  const primary = String((lead && lead.followUpDate) || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(primary)) return primary;
  const legacy = String((lead && lead.followUpOn) || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(legacy)) return legacy;
  // Sometimes stored as full ISO — take date portion in UTC (legacy); callers should migrate to YMD.
  if (primary.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(primary)) {
    return primary.slice(0, 10);
  }
  if (legacy.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(legacy)) {
    return legacy.slice(0, 10);
  }
  return null;
}

/**
 * Statuses that should skip follow-up / visit reminder jobs.
 * Note: legacy cron used `sold`; canonical won statuses are booked/reserved.
 * @param {string | null | undefined} status
 * @returns {boolean}
 */
function isTerminalForReminders(status) {
  const s = String(status || "").trim().toLowerCase();
  return (
    s === "booked" ||
    s === "reserved" ||
    s === "not-interested" ||
    s === "sold" ||
    s === "converted"
  );
}

/**
 * Dual-read during Phase C migration:
 * 1) sticky `hasAgentCall` summary
 * 2) non-system `lastCallAgent`
 * 3) embedded `callLogs[]` fallback (until backfill + flag off)
 *
 * @param {{
 *   hasAgentCall?: boolean,
 *   lastCallAgent?: string,
 *   callLogs?: Array<{ agent?: string }>
 * }} lead
 * @returns {boolean}
 */
function hasAgentCallLog(lead) {
  if (!lead) return false;
  if (lead.hasAgentCall === true) return true;
  const system = new Set(SYSTEM_CALL_AGENTS);
  if (lead.lastCallAgent && !system.has(String(lead.lastCallAgent))) {
    return true;
  }
  const logs = lead.callLogs || [];
  return logs.some((log) => log && log.agent && !system.has(String(log.agent)));
}

/**
 * First-touch SLA breach: older than threshold AND no non-system agent call.
 * Mirrors admin `checkSlaBreach` (useAdminLeads).
 * @param {{
 *   createdAt?: string,
 *   createdTime?: string,
 *   hasAgentCall?: boolean,
 *   lastCallAgent?: string,
 *   callLogs?: Array<{ agent?: string }>
 * }} lead
 * @param {{ now?: Date, hours?: number }} [options]
 * @returns {boolean}
 */
function isSlaBreached(lead, options) {
  const hours =
    options && options.hours != null
      ? options.hours
      : AUTOMATION_THRESHOLDS.SLA_FIRST_TOUCH_HOURS;
  const created = (lead && (lead.createdTime || lead.createdAt)) || null;
  const elapsed = hoursSince(created, options && options.now);
  if (elapsed == null) return false;
  if (elapsed <= hours) return false;
  return !hasAgentCallLog(lead);
}

/**
 * Stuck / status escalation: no update beyond threshold days; skip terminal.
 * Mirrors admin `checkStatusEscalation`.
 * @param {{ status?: string, updatedAt?: string, createdAt?: string }} lead
 * @param {{ now?: Date, days?: number }} [options]
 * @returns {boolean}
 */
function isStuckLead(lead, options) {
  const days =
    options && options.days != null
      ? options.days
      : AUTOMATION_THRESHOLDS.STUCK_LEAD_DAYS;
  const status = String((lead && lead.status) || "").trim().toLowerCase();
  if (status === "booked" || status === "reserved" || status === "not-interested") {
    return false;
  }
  const stamp = (lead && (lead.updatedAt || lead.createdAt)) || null;
  const elapsedHours = hoursSince(stamp, options && options.now);
  if (elapsedHours == null) return false;
  return elapsedHours > days * 24;
}

/**
 * Follow-up overdue relative to IST today (strictly before today).
 * @param {{ followUpDate?: string, followUpOn?: string, status?: string }} lead
 * @param {string} [todayYmd]
 * @returns {boolean}
 */
function isFollowUpOverdue(lead, todayYmd) {
  if (isTerminalForReminders(lead && lead.status)) return false;
  const ymd = getFollowUpDate(lead);
  if (!ymd) return false;
  return isYmdBefore(ymd, todayYmd || getIstDateString());
}

/**
 * Same-day follow-up due (IST).
 * @param {{ followUpDate?: string, followUpOn?: string, status?: string }} lead
 * @param {string} [todayYmd]
 * @returns {boolean}
 */
function isFollowUpDueToday(lead, todayYmd) {
  if (isTerminalForReminders(lead && lead.status)) return false;
  const ymd = getFollowUpDate(lead);
  if (!ymd) return false;
  return ymd === (todayYmd || getIstDateString());
}

module.exports = {
  getFollowUpDate,
  isTerminalForReminders,
  hasAgentCallLog,
  isSlaBreached,
  isStuckLead,
  isFollowUpOverdue,
  isFollowUpDueToday,
};
