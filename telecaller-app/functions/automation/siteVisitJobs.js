/**
 * Wave 6 Phase 2C Agent 3 — Site-visit reminder cron logic.
 *
 * Enabled:
 *   - Day-before (D-1) reminder
 *   - Same-day (D-0) morning reminder
 *
 * Disabled by default (product not approved):
 *   - No-show follow-up framework (scaffold only; flip SITE_VISIT_AUTOMATION.NO_SHOW_ENABLED)
 *
 * Consumes canonical lead.status === `site-visit-confirmed` only.
 * No new workflow states. No SLA / FU jobs. No AI.
 */

const {
  AUTOMATION_JOB_TYPES,
} = require("./idempotency");
const { addIstDays } = require("./ist");
const { AUTOMATION_THRESHOLDS } = require("./thresholds");
const {
  isRemindableSiteVisit,
  getSiteVisitDate,
} = require("./siteVisit");
const { queryLeadsBySiteVisitDate } = require("./leadQueries");
const {
  publishAutomationNotification,
} = require("./publishAutomationNotification");
const { createScheduledJob } = require("./createScheduledJob");

/**
 * Feature switches for site-visit automation.
 * NO_SHOW stays off until product explicitly approves.
 */
const SITE_VISIT_AUTOMATION = Object.freeze({
  DAY_BEFORE_ENABLED: true,
  SAME_DAY_ENABLED: true,
  /** Product not approved — framework present, cron no-ops until flipped. */
  NO_SHOW_ENABLED: false,
});

/** Distinct job types so D-1 and D-0 can both fire for the same visit date. */
const SITE_VISIT_JOB_TYPES = Object.freeze({
  DAY_BEFORE: AUTOMATION_JOB_TYPES.SITE_VISIT_REMINDER_DAY_BEFORE,
  SAME_DAY: AUTOMATION_JOB_TYPES.SITE_VISIT_REMINDER_SAME_DAY,
  NO_SHOW: AUTOMATION_JOB_TYPES.SITE_VISIT_NO_SHOW,
});

/** Canonical pipeline status required for visit reminders (Agent 3 scope). */
const CANONICAL_SITE_VISIT_STATUS = "site-visit-confirmed";

/**
 * Agent 3 gate: remindable nested visit + canonical confirmed pipeline status only.
 * @param {{ status?: string, siteVisit?: object | null, assignedTo?: string }} lead
 * @returns {boolean}
 */
function isEligibleSiteVisitReminder(lead) {
  if (!lead || !lead.assignedTo) return false;
  if (!isRemindableSiteVisit(lead)) return false;
  const status = String(lead.status || "").trim().toLowerCase();
  return status === CANONICAL_SITE_VISIT_STATUS;
}

/**
 * @param {object} lead
 * @returns {string[]}
 */
function buildRecipientIds(lead) {
  const ids = [];
  const assignee = String(lead.assignedTo || "").trim();
  if (assignee) ids.push(assignee);
  // siteVisit.coordinator is a free-text name today, not a userId — cannot FCM.
  return ids;
}

/**
 * Shared scan + notify loop for a visit-date equality query.
 * Idempotency: dateYmd = visit date; jobType distinguishes day-before / same-day / no-show.
 *
 * @param {import('./createScheduledJob').AutomationJobContext} ctx
 * @param {{
 *   visitDateYmd: string,
 *   jobType: string,
 *   title: string,
 *   bodyFor: (lead: object) => string,
 *   messageFor: (lead: object) => string,
 *   kind: string,
 * }} opts
 * @returns {Promise<{ notified: number, skipped: number, scanned: number }>}
 */
async function runSiteVisitReminderPass(ctx, opts) {
  const snap = await queryLeadsBySiteVisitDate(ctx.db, opts.visitDateYmd);
  if (snap.empty) {
    return { notified: 0, skipped: 0, scanned: 0 };
  }

  let notified = 0;
  let skipped = 0;

  for (const doc of snap.docs) {
    const lead = { ...doc.data(), id: doc.id };
    if (!isEligibleSiteVisitReminder(lead)) {
      skipped++;
      continue;
    }

    const visitDate = getSiteVisitDate(lead) || opts.visitDateYmd;
    const recipients = buildRecipientIds(lead);
    if (recipients.length === 0) {
      skipped++;
      continue;
    }

    for (const userId of recipients) {
      const result = await publishAutomationNotification(ctx.db, ctx.sendFcm, {
        userId,
        leadId: lead.id,
        jobType: opts.jobType,
        dateYmd: visitDate,
        title: opts.title,
        body: opts.bodyFor(lead),
        message: opts.messageFor(lead),
        type: AUTOMATION_JOB_TYPES.SITE_VISIT_REMINDER,
        sendPush: true,
        data: {
          leadId: lead.id,
          type: AUTOMATION_JOB_TYPES.SITE_VISIT_REMINDER,
          reminderKind: opts.kind,
          visitDate,
        },
      });
      if (result && result.skipped) skipped++;
      else if (result) notified++;
      else skipped++;
    }
  }

  return { notified, skipped, scanned: snap.size };
}

function formatVisitWhen(lead) {
  const date = getSiteVisitDate(lead) || "scheduled date";
  const time = lead.siteVisit && lead.siteVisit.time
    ? String(lead.siteVisit.time).trim()
    : "";
  return time ? `${date} at ${time}` : date;
}

/**
 * Day-before: query visits for tomorrow (runDate + SITE_VISIT_REMINDER_DAYS_BEFORE).
 * @param {import('./createScheduledJob').AutomationJobContext} ctx
 */
async function handleDayBeforeReminder(ctx) {
  if (!SITE_VISIT_AUTOMATION.DAY_BEFORE_ENABLED) {
    console.log(
      `[automation:${SITE_VISIT_JOB_TYPES.DAY_BEFORE}] disabled via SITE_VISIT_AUTOMATION.DAY_BEFORE_ENABLED`,
    );
    return { notified: 0, skipped: 0, scanned: 0 };
  }

  const daysBefore =
    ctx.thresholds.AUTOMATION_THRESHOLDS.SITE_VISIT_REMINDER_DAYS_BEFORE ??
    AUTOMATION_THRESHOLDS.SITE_VISIT_REMINDER_DAYS_BEFORE;
  const visitDateYmd = addIstDays(ctx.runDateYmd, daysBefore);

  return runSiteVisitReminderPass(ctx, {
    visitDateYmd,
    jobType: SITE_VISIT_JOB_TYPES.DAY_BEFORE,
    kind: "day_before",
    title: "Site visit tomorrow",
    bodyFor: (lead) =>
      `${lead.name || "Lead"} has a site visit tomorrow (${formatVisitWhen(lead)}).`,
    messageFor: (lead) =>
      `Site visit tomorrow: ${lead.name || "Lead"} (${formatVisitWhen(lead)})`,
  });
}

/**
 * Same-day: query visits for runDate (morning-of).
 * @param {import('./createScheduledJob').AutomationJobContext} ctx
 */
async function handleSameDayReminder(ctx) {
  if (!SITE_VISIT_AUTOMATION.SAME_DAY_ENABLED) {
    console.log(
      `[automation:${SITE_VISIT_JOB_TYPES.SAME_DAY}] disabled via SITE_VISIT_AUTOMATION.SAME_DAY_ENABLED`,
    );
    return { notified: 0, skipped: 0, scanned: 0 };
  }

  return runSiteVisitReminderPass(ctx, {
    visitDateYmd: ctx.runDateYmd,
    jobType: SITE_VISIT_JOB_TYPES.SAME_DAY,
    kind: "same_day",
    title: "Site visit today",
    bodyFor: (lead) =>
      `${lead.name || "Lead"} has a site visit today (${formatVisitWhen(lead)}).`,
    messageFor: (lead) =>
      `Site visit today: ${lead.name || "Lead"} (${formatVisitWhen(lead)})`,
  });
}

/**
 * No-show framework: visits whose date was yesterday, still confirmed / remindable.
 * DISABLED by default — does not notify until SITE_VISIT_AUTOMATION.NO_SHOW_ENABLED = true.
 * Does not change lead status / nested siteVisit.status.
 *
 * @param {import('./createScheduledJob').AutomationJobContext} ctx
 */
async function handleNoShowReminder(ctx) {
  if (!SITE_VISIT_AUTOMATION.NO_SHOW_ENABLED) {
    console.log(
      `[automation:${SITE_VISIT_JOB_TYPES.NO_SHOW}] DISABLED (product not approved). Set SITE_VISIT_AUTOMATION.NO_SHOW_ENABLED=true to enable.`,
    );
    return { notified: 0, skipped: 0, scanned: 0, disabled: true };
  }

  const visitDateYmd = addIstDays(ctx.runDateYmd, -1);

  return runSiteVisitReminderPass(ctx, {
    visitDateYmd,
    jobType: SITE_VISIT_JOB_TYPES.NO_SHOW,
    kind: "no_show",
    title: "Possible site-visit no-show",
    bodyFor: (lead) =>
      `${lead.name || "Lead"} had a site visit yesterday (${formatVisitWhen(lead)}) and is still confirmed — follow up.`,
    messageFor: (lead) =>
      `Possible no-show: ${lead.name || "Lead"} (visit ${formatVisitWhen(lead)})`,
  });
}

/**
 * Register all site-visit scheduled exports on the Functions module.
 * @param {{ db: FirebaseFirestore.Firestore, sendFcm: Function, exports: Record<string, unknown> }} deps
 */
function registerSiteVisitJobs(deps) {
  const { db, sendFcm, exports: fnExports } = deps;

  // Day-before at 10:00 IST (after same-day FU at 09:00)
  fnExports.scheduledSiteVisitDayBeforeReminders = createScheduledJob({
    name: SITE_VISIT_JOB_TYPES.DAY_BEFORE,
    schedule: "0 10 * * *",
    db,
    sendFcm,
    handler: handleDayBeforeReminder,
  });

  // Same-day morning at 08:00 IST (before FU)
  fnExports.scheduledSiteVisitSameDayReminders = createScheduledJob({
    name: SITE_VISIT_JOB_TYPES.SAME_DAY,
    schedule: "0 8 * * *",
    db,
    sendFcm,
    handler: handleSameDayReminder,
  });

  // No-show scaffold at 11:30 IST — no-ops while NO_SHOW_ENABLED is false
  fnExports.scheduledSiteVisitNoShowReminders = createScheduledJob({
    name: SITE_VISIT_JOB_TYPES.NO_SHOW,
    schedule: "30 11 * * *",
    db,
    sendFcm,
    handler: handleNoShowReminder,
  });
}

module.exports = {
  SITE_VISIT_AUTOMATION,
  SITE_VISIT_JOB_TYPES,
  CANONICAL_SITE_VISIT_STATUS,
  isEligibleSiteVisitReminder,
  handleDayBeforeReminder,
  handleSameDayReminder,
  handleNoShowReminder,
  runSiteVisitReminderPass,
  registerSiteVisitJobs,
};
