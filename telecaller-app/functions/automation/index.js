/**
 * Wave 6 Phase 2C — Automation infrastructure (Architecture Owner).
 *
 * Feature agents (follow-up / SLA / site-visit) consume these APIs.
 * Do not invent a parallel rules engine.
 *
 * @example
 *   const { createScheduledJob, AUTOMATION_JOB_TYPES } = require('./automation');
 *   exports.scheduledSlaBreachNotify = createScheduledJob({
 *     name: AUTOMATION_JOB_TYPES.SLA_BREACH,
 *     schedule: '0 10 * * *',
 *     db,
 *     sendFcm,
 *     handler: async (ctx) => { ... use ctx.publishAutomationNotification ... },
 *   });
 */

const ist = require("./ist");
const idempotency = require("./idempotency");
const thresholds = require("./thresholds");
const leadPredicates = require("./leadPredicates");
const siteVisit = require("./siteVisit");
const leadQueries = require("./leadQueries");
const {
  publishAutomationNotification,
} = require("./publishAutomationNotification");
const { createScheduledJob, buildJobContext } = require("./createScheduledJob");
const siteVisitJobs = require("./siteVisitJobs");
const slaBreachJobs = require("./slaBreachJobs");

module.exports = {
  // IST
  IST_TIME_ZONE: ist.IST_TIME_ZONE,
  getIstDateString: ist.getIstDateString,
  addIstDays: ist.addIstDays,
  compareYmd: ist.compareYmd,
  isYmdBefore: ist.isYmdBefore,
  isYmdToday: ist.isYmdToday,
  hoursSince: ist.hoursSince,
  calendarDaysBetween: ist.calendarDaysBetween,

  // Idempotency
  AUTOMATION_JOB_TYPES: idempotency.AUTOMATION_JOB_TYPES,
  buildAutomationIdempotencyKey: idempotency.buildAutomationIdempotencyKey,
  buildAutomationNotificationId: idempotency.buildAutomationNotificationId,

  // Thresholds
  AUTOMATION_THRESHOLDS: thresholds.AUTOMATION_THRESHOLDS,
  SYSTEM_CALL_AGENTS: thresholds.SYSTEM_CALL_AGENTS,

  // Predicates
  getFollowUpDate: leadPredicates.getFollowUpDate,
  isTerminalForReminders: leadPredicates.isTerminalForReminders,
  hasAgentCallLog: leadPredicates.hasAgentCallLog,
  isSlaBreached: leadPredicates.isSlaBreached,
  isStuckLead: leadPredicates.isStuckLead,
  isFollowUpOverdue: leadPredicates.isFollowUpOverdue,
  isFollowUpDueToday: leadPredicates.isFollowUpDueToday,

  // Site visit
  SITE_VISIT_STATUSES: siteVisit.SITE_VISIT_STATUSES,
  normalizeSiteVisitStatus: siteVisit.normalizeSiteVisitStatus,
  isRemindableSiteVisit: siteVisit.isRemindableSiteVisit,
  getSiteVisitDate: siteVisit.getSiteVisitDate,

  // Site-visit reminder jobs (Agent 3)
  SITE_VISIT_AUTOMATION: siteVisitJobs.SITE_VISIT_AUTOMATION,
  SITE_VISIT_JOB_TYPES: siteVisitJobs.SITE_VISIT_JOB_TYPES,
  isEligibleSiteVisitReminder: siteVisitJobs.isEligibleSiteVisitReminder,
  registerSiteVisitJobs: siteVisitJobs.registerSiteVisitJobs,

  // SLA breach jobs (Agent 2)
  registerSlaBreachJobs: slaBreachJobs.registerSlaBreachJobs,
  handleSlaBreachNotify: slaBreachJobs.handleSlaBreachNotify,
  SLA_SCAN_LOOKBACK_DAYS: slaBreachJobs.SLA_SCAN_LOOKBACK_DAYS,

  // Queries
  queryLeadsByFollowUpDate: leadQueries.queryLeadsByFollowUpDate,
  queryLeadsFollowUpBefore: leadQueries.queryLeadsFollowUpBefore,
  queryLeadsBySiteVisitDate: leadQueries.queryLeadsBySiteVisitDate,
  describeAutomationQueryIndexes: leadQueries.describeAutomationQueryIndexes,

  // Notify + scheduler
  publishAutomationNotification,
  createScheduledJob,
  buildJobContext,
};
