/**
 * Shared automation thresholds (server).
 * Keep aligned with client `src/shared/contracts/automation.ts`.
 * Agent 4 health (Phase 2D) should consume these — do not fork magic numbers in feature jobs.
 */

const AUTOMATION_THRESHOLDS = Object.freeze({
  /** First-touch SLA: hours since createdAt/createdTime with no agent call. */
  SLA_FIRST_TOUCH_HOURS: 24,
  /** Stuck / status escalation: days since updatedAt (skips terminal won/lost). */
  STUCK_LEAD_DAYS: 5,
  /** Lead idle filter (UI); automations may reference later. */
  LEAD_IDLE_DAYS: 3,
  /** Agent productivity idle warning (existing cron). */
  AGENT_IDLE_MINUTES: 45,
  /** Site-visit reminder: days before visit date (0 = morning-of). */
  SITE_VISIT_REMINDER_DAYS_BEFORE: 1,
});

/** callLogs.agent values that do not count as first-touch agent activity. */
const SYSTEM_CALL_AGENTS = Object.freeze([
  "system",
  "System (Auto)",
  "system_webhook",
]);

module.exports = {
  AUTOMATION_THRESHOLDS,
  SYSTEM_CALL_AGENTS,
};
