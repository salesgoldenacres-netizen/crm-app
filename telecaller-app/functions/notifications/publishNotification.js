/**
 * Unified notification publisher (Wave 6 Agent 0).
 * Writes `notifications` doc and optionally sends FCM via existing sendFcm.
 *
 * Usage (Cloud Functions):
 *   const { publishNotification } = require("./notifications/publishNotification");
 *   await publishNotification(db, sendFcm, { userId, message, type, sendPush: true, title, body });
 *
 * Idempotent automation:
 *   await publishNotification(db, sendFcm, {
 *     userId, message, type: "follow_up", leadId, sendPush: true,
 *     idempotencyKey: "follow_up:lead123:2026-07-14",
 *   });
 * When `idempotencyKey` (or createOnly) is set, uses create-once semantics so
 * the same cron retry does not double-notify / double-push.
 */

/**
 * Firestore already-exists error codes (admin SDK variants).
 * @param {unknown} err
 * @returns {boolean}
 */
function isAlreadyExistsError(err) {
  if (!err || typeof err !== "object") return false;
  const code = /** @type {{ code?: string|number }} */ (err).code;
  return code === 6 || code === "already-exists" || code === "ALREADY_EXISTS";
}

/**
 * @param {FirebaseFirestore.Firestore} db
 * @param {(userId: string, payload: { notification: { title: string, body: string }, data?: Record<string, string> }) => Promise<void>} sendFcm
 * @param {{
 *   userId: string,
 *   message: string,
 *   type?: string,
 *   title?: string,
 *   body?: string,
 *   leadId?: string,
 *   id?: string,
 *   idempotencyKey?: string,
 *   createOnly?: boolean,
 *   sendPush?: boolean,
 *   data?: Record<string, string>,
 * }} input
 * @returns {Promise<{ id: string, skipped?: boolean } | null>}
 */
async function publishNotification(db, sendFcm, input) {
  const userId = String((input && input.userId) || "").trim();
  if (!userId) return null;

  const title = input.title || "";
  const body = input.body || input.message || "";
  const message =
    input.message ||
    (title && body ? `${title}: ${body}` : title || body || "");
  if (!message) return null;

  const createOnly = !!(input.createOnly || input.idempotencyKey);
  let id = input.id;
  if (!id && input.idempotencyKey) {
    // Prefer deterministic id from automation helper when callers pass raw key.
    try {
      const {
        buildAutomationNotificationId,
      } = require("../automation/idempotency");
      id = buildAutomationNotificationId(String(input.idempotencyKey));
    } catch (_) {
      id = `auto_${String(input.idempotencyKey).replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    }
  }
  if (!id) {
    id = `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  const doc = {
    id,
    userId,
    message,
    type: input.type || "info",
    read: false,
    createdAt: new Date().toISOString(),
  };
  if (input.leadId) doc.leadId = input.leadId;
  if (input.idempotencyKey) doc.idempotencyKey = String(input.idempotencyKey);

  const ref = db.collection("notifications").doc(id);

  if (createOnly) {
    try {
      await ref.create(doc);
    } catch (err) {
      if (isAlreadyExistsError(err)) {
        return { id, skipped: true };
      }
      throw err;
    }
  } else {
    await ref.set(doc);
  }

  if (input.sendPush && typeof sendFcm === "function") {
    await sendFcm(userId, {
      notification: {
        title: title || "Golden Acres CRM",
        body: body || message,
      },
      data: {
        type: String(input.type || "info"),
        ...(input.leadId ? { leadId: String(input.leadId) } : {}),
        ...(input.data || {}),
      },
    });
  }

  return { id };
}

module.exports = {
  publishNotification,
  isAlreadyExistsError,
};
