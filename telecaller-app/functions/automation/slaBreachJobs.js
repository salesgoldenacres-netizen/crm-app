/**
 * Wave 6 Phase 2C Agent 2 — First-touch SLA breach notify + manager escalation.
 *
 * - Cron scans a bounded createdAt window; gates with shared `isSlaBreached`
 * - Notifies assignee (publishAutomationNotification) + managerial users
 * - No scoring / follow-up / visit / stuck / AI jobs
 * - Timeline skipped: no `sla_breach` TimelineEventType without contract redesign
 */

const { AUTOMATION_JOB_TYPES } = require("./idempotency");
const { AUTOMATION_THRESHOLDS } = require("./thresholds");
const {
  isSlaBreached,
  isTerminalForReminders,
} = require("./leadPredicates");
const {
  publishAutomationNotification,
} = require("./publishAutomationNotification");
const { publishNotification } = require("../notifications/publishNotification");
const { createScheduledJob } = require("./createScheduledJob");

/** Preset managerial roles — mirrors client `roleUtils.DEFAULT_MANAGERIAL_ROLES`. */
const DEFAULT_MANAGERIAL_ROLES = Object.freeze([
  "admin",
  "upper_management",
  "middle_management",
  "lower_management",
]);

/**
 * Scan bound only (not a product SLA threshold).
 * Leads older than this lookback are ignored to keep the daily scan bounded.
 */
const SLA_SCAN_LOOKBACK_DAYS = 14;

/** Max docs per cron run. */
const SLA_SCAN_LIMIT = 500;

/**
 * @param {string} roleCode
 * @param {Array<{ id?: string, isManagerial?: boolean }>} customRoles
 * @returns {boolean}
 */
function isManagerialRole(roleCode, customRoles) {
  const code = String(roleCode || "").trim();
  if (!code) return false;
  const found = (customRoles || []).find((r) => r && r.id === code);
  if (found) return !!found.isManagerial;
  return DEFAULT_MANAGERIAL_ROLES.includes(code);
}

/**
 * Load managerial user ids (Firestore `users` + `customRoles`).
 * @param {FirebaseFirestore.Firestore} db
 * @returns {Promise<string[]>}
 */
async function loadManagerUserIds(db) {
  const [rolesSnap, usersSnap] = await Promise.all([
    db.collection("customRoles").get(),
    db.collection("users").get(),
  ]);
  const customRoles = rolesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const ids = [];
  for (const doc of usersSnap.docs) {
    const data = doc.data() || {};
    const role = data.role;
    if (!isManagerialRole(role, customRoles)) continue;
    // Prefer document id; fall back to embedded id/uid (matches client notify patterns).
    const userId = String(data.id || data.uid || doc.id || "").trim();
    if (userId) ids.push(userId);
  }
  return [...new Set(ids)];
}

/**
 * Bounded candidates: createdAt in [now - lookback, now - SLA hours).
 * @param {FirebaseFirestore.Firestore} db
 * @param {{ now?: Date, slaHours?: number, lookbackDays?: number, limit?: number }} [options]
 * @returns {Promise<FirebaseFirestore.QuerySnapshot>}
 */
async function querySlaCandidateLeads(db, options) {
  const now = (options && options.now) || new Date();
  const slaHours =
    options && options.slaHours != null
      ? options.slaHours
      : AUTOMATION_THRESHOLDS.SLA_FIRST_TOUCH_HOURS;
  const lookbackDays =
    options && options.lookbackDays != null
      ? options.lookbackDays
      : SLA_SCAN_LOOKBACK_DAYS;
  const limit =
    options && options.limit != null ? options.limit : SLA_SCAN_LIMIT;

  const cutoffMs = now.getTime() - slaHours * 60 * 60 * 1000;
  const lowerMs = now.getTime() - lookbackDays * 24 * 60 * 60 * 1000;
  const cutoffIso = new Date(cutoffMs).toISOString();
  const lowerIso = new Date(lowerMs).toISOString();

  return db
    .collection("leads")
    .where("createdAt", ">=", lowerIso)
    .where("createdAt", "<", cutoffIso)
    .orderBy("createdAt", "asc")
    .limit(limit)
    .get();
}

/**
 * Notify one managerial user for an SLA breach (unique idempotency per user).
 * Uses shared publishNotification — do not fork FCM writers.
 *
 * @param {FirebaseFirestore.Firestore} db
 * @param {Function} sendFcm
 * @param {{
 *   userId: string,
 *   lead: object,
 *   dateYmd: string,
 *   assigneeName?: string,
 * }} input
 */
async function publishManagerSlaNotification(db, sendFcm, input) {
  const userId = String(input.userId || "").trim();
  const lead = input.lead || {};
  const leadId = String(lead.id || "").trim();
  const dateYmd = input.dateYmd;
  if (!userId || !leadId || !dateYmd) return null;

  const name = lead.name || "Lead";
  const phone = lead.phone ? ` (${lead.phone})` : "";
  const assigneeLabel = input.assigneeName
    ? ` — assignee: ${input.assigneeName}`
    : lead.assignedToName
      ? ` — assignee: ${lead.assignedToName}`
      : !lead.assignedTo
        ? " — unassigned"
        : "";

  const hours = AUTOMATION_THRESHOLDS.SLA_FIRST_TOUCH_HOURS;
  const title = "SLA breach — first touch";
  const body = `${name}${phone} has no agent call after ${hours}h${assigneeLabel}.`;
  const message = `SLA breach: ${name}${phone}${assigneeLabel}`;

  // Key includes manager userId so multi-recipient does not collide on notif doc id.
  const idempotencyKey = `${AUTOMATION_JOB_TYPES.SLA_BREACH}:${leadId}:mgr:${userId}:${dateYmd}`;

  return publishNotification(db, sendFcm, {
    userId,
    leadId,
    message,
    title,
    body,
    type: AUTOMATION_JOB_TYPES.SLA_BREACH,
    sendPush: true,
    idempotencyKey,
    createOnly: true,
    data: {
      leadId,
      type: AUTOMATION_JOB_TYPES.SLA_BREACH,
      escalation: "manager",
    },
  });
}

/**
 * @param {import('./createScheduledJob').AutomationJobContext} ctx
 * @returns {Promise<{ notified: number, skipped: number, scanned: number, managers: number }>}
 */
async function handleSlaBreachNotify(ctx) {
  const snap = await querySlaCandidateLeads(ctx.db, {
    slaHours: ctx.thresholds.AUTOMATION_THRESHOLDS.SLA_FIRST_TOUCH_HOURS,
  });

  if (snap.empty) {
    return { notified: 0, skipped: 0, scanned: 0, managers: 0 };
  }

  const managerIds = await loadManagerUserIds(ctx.db);
  let notified = 0;
  let skipped = 0;

  for (const doc of snap.docs) {
    const lead = { ...doc.data(), id: doc.id };

    if (isTerminalForReminders(lead.status)) {
      skipped++;
      continue;
    }
    if (!isSlaBreached(lead)) {
      skipped++;
      continue;
    }

    let leadNotified = false;

    // Assignee notification (canonical automation idempotency: jobType+leadId+runDate)
    const assignee = String(lead.assignedTo || "").trim();
    if (assignee) {
      const result = await publishAutomationNotification(ctx.db, ctx.sendFcm, {
        userId: assignee,
        leadId: lead.id,
        jobType: AUTOMATION_JOB_TYPES.SLA_BREACH,
        dateYmd: ctx.runDateYmd,
        title: "First-touch SLA breached",
        body: `${lead.name || "Lead"}${lead.phone ? ` (${lead.phone})` : ""} has no agent call after ${AUTOMATION_THRESHOLDS.SLA_FIRST_TOUCH_HOURS}h. Call now.`,
        message: `SLA breach: ${lead.name || "Lead"}${lead.phone ? ` (${lead.phone})` : ""} — first touch overdue`,
        type: AUTOMATION_JOB_TYPES.SLA_BREACH,
        sendPush: true,
        data: {
          leadId: lead.id,
          type: AUTOMATION_JOB_TYPES.SLA_BREACH,
          escalation: "assignee",
        },
      });
      if (result && result.skipped) skipped++;
      else if (result) {
        notified++;
        leadNotified = true;
      } else skipped++;
    }

    // Manager escalation (skip assignee if they are also managerial)
    for (const managerId of managerIds) {
      if (assignee && managerId === assignee) continue;
      const result = await publishManagerSlaNotification(ctx.db, ctx.sendFcm, {
        userId: managerId,
        lead,
        dateYmd: ctx.runDateYmd,
      });
      if (result && result.skipped) skipped++;
      else if (result) {
        notified++;
        leadNotified = true;
      } else skipped++;
    }

    if (!assignee && managerIds.length === 0) {
      skipped++;
    } else if (!leadNotified && !assignee && managerIds.length > 0) {
      // managers all skipped (already-exists) — counted above
    }
  }

  return {
    notified,
    skipped,
    scanned: snap.size,
    managers: managerIds.length,
  };
}

/**
 * Register SLA scheduled export on the Functions module.
 * @param {{ db: FirebaseFirestore.Firestore, sendFcm: Function, exports: Record<string, unknown> }} deps
 */
function registerSlaBreachJobs(deps) {
  const { db, sendFcm, exports: fnExports } = deps;

  // 10:15 IST — after same-day FU (09:00) and site-visit day-before (10:00)
  fnExports.scheduledSlaBreachNotify = createScheduledJob({
    name: AUTOMATION_JOB_TYPES.SLA_BREACH,
    schedule: "15 10 * * *",
    db,
    sendFcm,
    handler: handleSlaBreachNotify,
  });
}

module.exports = {
  DEFAULT_MANAGERIAL_ROLES,
  SLA_SCAN_LOOKBACK_DAYS,
  SLA_SCAN_LIMIT,
  isManagerialRole,
  loadManagerUserIds,
  querySlaCandidateLeads,
  publishManagerSlaNotification,
  handleSlaBreachNotify,
  registerSlaBreachJobs,
};
