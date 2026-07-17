/**
 * Wave 6 Phase 2C Agent 1 — Follow-up reminder job handlers.
 *
 * Consumes Agent 0 automation APIs only (IST, predicates, queries, notify).
 * Does not modify Agent 0 contracts.
 *
 * Jobs:
 *  - Same-day + optional N-day-before (Remote Config `follow_up_reminder_days`)
 *  - Overdue daily digest (FOLLOW_UP_OVERDUE)
 */

const { AUTOMATION_JOB_TYPES } = require("../automation");

/** Cap advance window so a bad RC value cannot fan out unbounded queries. */
const MAX_FOLLOW_UP_REMINDER_DAYS = 14;

/** Bound overdue range scans (Agent 0 query helper supports limit). */
const OVERDUE_QUERY_LIMIT = 500;

/**
 * Read advance reminder window from Firestore settings (synced to Remote Config).
 * Agent 0 `AUTOMATION_THRESHOLDS` has no FU days-before key yet — product setting
 * `follow_up_reminder_days` is the existing SoR (default 1 = also remind tomorrow's FUs).
 *
 * @param {FirebaseFirestore.Firestore} db
 * @returns {Promise<number>} days before follow-up date to also remind (0 = same-day only)
 */
async function resolveFollowUpReminderDays(db) {
  try {
    const snap = await db.doc("settings/remoteConfig").get();
    const raw =
      snap.exists && snap.data()
        ? snap.data().follow_up_reminder_days
        : undefined;
    const parsed = parseInt(String(raw ?? 1), 10);
    if (!Number.isFinite(parsed) || parsed < 0) return 1;
    return Math.min(parsed, MAX_FOLLOW_UP_REMINDER_DAYS);
  } catch (err) {
    console.warn(
      "[followUpReminders] failed to read follow_up_reminder_days; defaulting to 1",
      err && err.message,
    );
    return 1;
  }
}

/**
 * @param {object} lead
 * @param {string} runDateYmd
 * @param {string} followUpYmd
 */
function buildFollowUpCopy(lead, runDateYmd, followUpYmd) {
  const name = lead.name || "Lead";
  const phone = lead.phone ? ` (${lead.phone})` : "";
  if (followUpYmd === runDateYmd) {
    return {
      title: "Follow-up Reminder",
      body: `Today is your scheduled follow-up with ${name}${phone}.`,
      message: `Follow-up due today: ${name}${phone}`,
    };
  }
  return {
    title: "Upcoming Follow-up",
    body: `Follow-up with ${name}${phone} is scheduled for ${followUpYmd}.`,
    message: `Upcoming follow-up (${followUpYmd}): ${name}${phone}`,
  };
}

/**
 * Notify assignee once per lead per IST run day (FOLLOW_UP).
 * @returns {Promise<'notified' | 'skipped' | 'none'>}
 */
async function notifyFollowUp(ctx, lead, followUpYmd) {
  if (!lead.assignedTo) return "skipped";

  if (followUpYmd === ctx.runDateYmd) {
    if (!ctx.predicates.isFollowUpDueToday(lead, ctx.runDateYmd)) {
      return "skipped";
    }
  } else {
    if (ctx.predicates.isTerminalForReminders(lead.status)) return "skipped";
    if (ctx.predicates.getFollowUpDate(lead) !== followUpYmd) return "skipped";
  }

  const copy = buildFollowUpCopy(lead, ctx.runDateYmd, followUpYmd);
  const result = await ctx.publishAutomationNotification(ctx.db, ctx.sendFcm, {
    userId: lead.assignedTo,
    leadId: lead.id,
    jobType: AUTOMATION_JOB_TYPES.FOLLOW_UP,
    dateYmd: ctx.runDateYmd,
    title: copy.title,
    body: copy.body,
    message: copy.message,
    type: AUTOMATION_JOB_TYPES.FOLLOW_UP,
    sendPush: true,
    data: {
      leadId: lead.id,
      type: AUTOMATION_JOB_TYPES.FOLLOW_UP,
      followUpDate: followUpYmd,
    },
  });
  if (!result) return "none";
  if (result.skipped) return "skipped";
  return "notified";
}

/**
 * Same-day follow-ups + optional N-day-before window.
 * Idempotency: follow_up:{leadId}:{runDateYmd} — one alert per lead per IST day.
 *
 * @param {object} ctx automation job context from createScheduledJob
 */
async function runSameDayFollowUpReminders(ctx) {
  const todayStr = ctx.runDateYmd;
  const reminderDays = await resolveFollowUpReminderDays(ctx.db);

  /** @type {Map<string, { lead: object, followUpYmd: string }>} */
  const byId = new Map();

  const todaySnap = await ctx.queries.queryLeadsByFollowUpDate(ctx.db, todayStr);
  for (const docSnap of todaySnap.docs) {
    byId.set(docSnap.id, {
      lead: { ...docSnap.data(), id: docSnap.id },
      followUpYmd: todayStr,
    });
  }

  for (let offset = 1; offset <= reminderDays; offset++) {
    const targetYmd = ctx.ist.addIstDays(todayStr, offset);
    const snap = await ctx.queries.queryLeadsByFollowUpDate(ctx.db, targetYmd);
    for (const docSnap of snap.docs) {
      if (byId.has(docSnap.id)) continue;
      byId.set(docSnap.id, {
        lead: { ...docSnap.data(), id: docSnap.id },
        followUpYmd: targetYmd,
      });
    }
  }

  let notified = 0;
  let skipped = 0;
  for (const { lead, followUpYmd } of byId.values()) {
    const outcome = await notifyFollowUp(ctx, lead, followUpYmd);
    if (outcome === "notified") notified++;
    else skipped++;
  }

  return {
    notified,
    skipped,
    scanned: byId.size,
    reminderDays,
  };
}

/**
 * Overdue follow-ups: followUpDate < IST today.
 * Idempotency: follow_up_overdue:{leadId}:{runDateYmd} — one digest per lead per IST day.
 *
 * @param {object} ctx automation job context from createScheduledJob
 */
async function runOverdueFollowUpReminders(ctx) {
  const todayStr = ctx.runDateYmd;
  const snap = await ctx.queries.queryLeadsFollowUpBefore(
    ctx.db,
    todayStr,
    OVERDUE_QUERY_LIMIT,
  );

  let notified = 0;
  let skipped = 0;

  for (const docSnap of snap.docs) {
    const lead = { ...docSnap.data(), id: docSnap.id };
    if (!lead.assignedTo || !ctx.predicates.isFollowUpOverdue(lead, todayStr)) {
      skipped++;
      continue;
    }

    const fuDate = ctx.predicates.getFollowUpDate(lead) || "unknown";
    const name = lead.name || "Lead";
    const phone = lead.phone ? ` (${lead.phone})` : "";

    const result = await ctx.publishAutomationNotification(ctx.db, ctx.sendFcm, {
      userId: lead.assignedTo,
      leadId: lead.id,
      jobType: AUTOMATION_JOB_TYPES.FOLLOW_UP_OVERDUE,
      dateYmd: todayStr,
      title: "Overdue Follow-up",
      body: `${name}${phone} follow-up was due on ${fuDate}.`,
      message: `Overdue follow-up: ${name}${phone} (due ${fuDate})`,
      type: AUTOMATION_JOB_TYPES.FOLLOW_UP_OVERDUE,
      sendPush: true,
      data: {
        leadId: lead.id,
        type: AUTOMATION_JOB_TYPES.FOLLOW_UP_OVERDUE,
        followUpDate: fuDate,
      },
    });

    if (result && result.skipped) skipped++;
    else if (result) notified++;
    else skipped++;
  }

  return { notified, skipped, scanned: snap.size };
}

module.exports = {
  MAX_FOLLOW_UP_REMINDER_DAYS,
  OVERDUE_QUERY_LIMIT,
  resolveFollowUpReminderDays,
  runSameDayFollowUpReminders,
  runOverdueFollowUpReminders,
};
