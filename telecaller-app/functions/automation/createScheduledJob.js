/**
 * Thin scheduled-job factory — extends existing onSchedule patterns.
 * Not a rules engine. Feature agents register one handler per job.
 */

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { IST_TIME_ZONE, getIstDateString } = require("./ist");

const DEFAULT_REGION = "us-central1";

/**
 * @typedef {object} AutomationJobContext
 * @property {FirebaseFirestore.Firestore} db
 * @property {string} runDateYmd IST YYYY-MM-DD for this invocation
 * @property {string} jobName
 * @property {(userId: string, payload: object) => Promise<void>} sendFcm
 * @property {typeof import('../notifications/publishNotification').publishNotification} publishNotification
 * @property {typeof import('./publishAutomationNotification').publishAutomationNotification} publishAutomationNotification
 * @property {typeof import('./ist')} ist
 * @property {typeof import('./idempotency')} idempotency
 * @property {typeof import('./thresholds')} thresholds
 * @property {typeof import('./leadPredicates')} predicates
 * @property {typeof import('./siteVisit')} siteVisit
 * @property {typeof import('./leadQueries')} queries
 */

/**
 * Build the shared context object injected into every automation handler.
 * @param {{
 *   db: FirebaseFirestore.Firestore,
 *   sendFcm: Function,
 *   jobName: string,
 *   runDateYmd?: string,
 * }} deps
 * @returns {AutomationJobContext}
 */
function buildJobContext(deps) {
  const ist = require("./ist");
  const idempotency = require("./idempotency");
  const thresholds = require("./thresholds");
  const predicates = require("./leadPredicates");
  const siteVisit = require("./siteVisit");
  const queries = require("./leadQueries");
  const { publishNotification } = require("../notifications/publishNotification");
  const {
    publishAutomationNotification,
  } = require("./publishAutomationNotification");

  return {
    db: deps.db,
    sendFcm: deps.sendFcm,
    jobName: deps.jobName,
    runDateYmd: deps.runDateYmd || ist.getIstDateString(),
    publishNotification,
    publishAutomationNotification,
    ist,
    idempotency,
    thresholds,
    predicates,
    siteVisit,
    queries,
  };
}

/**
 * Register a Cloud Scheduler cron using the standard IST / region defaults.
 *
 * @param {{
 *   name: string,
 *   schedule: string,
 *   timeZone?: string,
 *   region?: string,
 *   db: FirebaseFirestore.Firestore,
 *   sendFcm: Function,
 *   handler: (ctx: AutomationJobContext) => Promise<{ notified?: number, skipped?: number, scanned?: number } | void>,
 * }} options
 * @returns {ReturnType<typeof onSchedule>}
 */
function createScheduledJob(options) {
  const name = options.name;
  const schedule = options.schedule;
  const timeZone = options.timeZone || IST_TIME_ZONE;
  const region = options.region || DEFAULT_REGION;

  return onSchedule({ schedule, timeZone, region }, async () => {
    const runDateYmd = getIstDateString();
    console.log(`[automation:${name}] start runDate=${runDateYmd}`);
    const ctx = buildJobContext({
      db: options.db,
      sendFcm: options.sendFcm,
      jobName: name,
      runDateYmd,
    });
    try {
      const result = (await options.handler(ctx)) || {};
      console.log(
        `[automation:${name}] done notified=${result.notified ?? 0} skipped=${result.skipped ?? 0} scanned=${result.scanned ?? 0}`,
      );
      return result;
    } catch (err) {
      console.error(`[automation:${name}] failed`, err);
      throw err;
    }
  });
}

module.exports = {
  DEFAULT_REGION,
  buildJobContext,
  createScheduledJob,
};
