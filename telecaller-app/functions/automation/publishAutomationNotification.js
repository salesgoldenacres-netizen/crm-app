/**
 * Idempotent automation notification helper.
 * Wraps publishNotification with leadId+type+date key strategy.
 */

const { publishNotification } = require("../notifications/publishNotification");
const {
  buildAutomationIdempotencyKey,
  buildAutomationNotificationId,
} = require("./idempotency");

/**
 * Publish in-app + optional FCM once per (jobType, leadId, dateYmd).
 *
 * @param {FirebaseFirestore.Firestore} db
 * @param {(userId: string, payload: object) => Promise<void>} sendFcm
 * @param {{
 *   userId: string,
 *   leadId: string,
 *   jobType: string,
 *   dateYmd: string,
 *   message: string,
 *   title?: string,
 *   body?: string,
 *   type?: string,
 *   sendPush?: boolean,
 *   data?: Record<string, string>,
 * }} input
 * @returns {Promise<{ id: string, skipped?: boolean, idempotencyKey: string } | null>}
 */
async function publishAutomationNotification(db, sendFcm, input) {
  const userId = String((input && input.userId) || "").trim();
  const leadId = String((input && input.leadId) || "").trim();
  if (!userId || !leadId) return null;

  const idempotencyKey = buildAutomationIdempotencyKey({
    jobType: input.jobType,
    leadId,
    dateYmd: input.dateYmd,
  });
  const id = buildAutomationNotificationId({
    jobType: input.jobType,
    leadId,
    dateYmd: input.dateYmd,
  });

  const result = await publishNotification(db, sendFcm, {
    userId,
    leadId,
    message: input.message,
    title: input.title,
    body: input.body,
    type: input.type || input.jobType,
    sendPush: input.sendPush !== false,
    data: input.data,
    id,
    idempotencyKey,
    createOnly: true,
  });

  if (!result) return null;
  return { ...result, idempotencyKey };
}

module.exports = {
  publishAutomationNotification,
};
