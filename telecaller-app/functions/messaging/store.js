/**
 * Provider-agnostic Firestore store for conversations, messages, and timeline.
 * Providers never write CRM collections directly — they call these helpers.
 */

const { digitsOnly, normalizePhoneE164 } = require("./phone");

const CONVERSATIONS = "whatsappConversations";
const MESSAGES = "whatsappMessages";
const TIMELINE = "timelineEvents";

const TIMELINE_ICONS = {
  whatsapp_inbound: "message",
  whatsapp_outbound: "message",
  call_completed: "phone",
  note_added: "note",
  lead_status_changed: "status",
  lead_assigned: "user",
  lead_reassigned: "user",
  followup_created: "calendar",
  followup_completed: "check",
  lead_created: "plus",
  lead_converted: "star",
  lead_booked: "star",
  site_visit_scheduled: "map",
  site_visit_completed: "map",
  site_visit_cancelled: "map",
  site_visit_no_show: "map",
  discount_requested: "tag",
  discount_approved: "tag",
  discount_rejected: "tag",
  lead_merged: "merge",
};

/**
 * @param {FirebaseFirestore.Firestore} db
 */
function createMessagingStore(db) {
  async function findConversationByLead(leadId) {
    // Fail loud if composite index missing — do not silently drop orderBy.
    const snap = await db
      .collection(CONVERSATIONS)
      .where("leadId", "==", leadId)
      .orderBy("lastMessageAt", "desc")
      .limit(1)
      .get();

    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  async function findConversationByPhone(phone) {
    const digits = digitsOnly(phone);
    if (!digits) return null;

    const tryEquality = async (field, value) => {
      if (!value) return null;
      const snap = await db
        .collection(CONVERSATIONS)
        .where(field, "==", value)
        .limit(1)
        .get();
      if (snap.empty) return null;
      const doc = snap.docs[0];
      return { id: doc.id, ...doc.data() };
    };

    // Prefer indexed equality lookups — no capped collection scan.
    const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
    return (
      (await tryEquality("phoneNumber", digits)) ||
      (await tryEquality("phoneLast10", last10)) ||
      (last10 !== digits ? await tryEquality("phoneNumber", last10) : null) ||
      (await tryEquality("waId", digits)) ||
      null
    );
  }

  /**
   * Ensure an open conversation exists for lead + phone.
   */
  async function ensureConversation({
    leadId,
    phone,
    waId,
    provider,
    assignedTo,
    assignedToName,
  }) {
    const existing =
      (await findConversationByLead(leadId)) ||
      (phone ? await findConversationByPhone(phone) : null);

    const phoneDigits = digitsOnly(phone) || "";
    const last10 =
      phoneDigits.length >= 10 ? phoneDigits.slice(-10) : phoneDigits;

    if (existing) {
      const patch = {
        leadId: existing.leadId || leadId,
        updatedAt: new Date().toISOString(),
      };
      if (waId) patch.waId = digitsOnly(waId);
      if (phone) {
        patch.phoneNumber = phoneDigits || existing.phoneNumber;
        if (last10) patch.phoneLast10 = last10;
      }
      await db.collection(CONVERSATIONS).doc(existing.id).set(patch, { merge: true });
      return { ...existing, ...patch, id: existing.id };
    }

    const now = new Date().toISOString();
    const ref = db.collection(CONVERSATIONS).doc();
    const row = {
      leadId,
      phoneNumber: phoneDigits || normalizePhoneE164(phone),
      phoneLast10: last10 || "",
      waId: digitsOnly(waId || phone) || "",
      provider: provider || "evolution",
      status: "open",
      lastMessageAt: null,
      lastMessagePreview: "",
      lastMessageDirection: null,
      unreadCount: 0,
      assignedTo: assignedTo || "",
      assignedToName: assignedToName || "",
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(row);
    return { id: ref.id, ...row };
  }

  async function recordTimelineEvent({
    leadId,
    type,
    source,
    sourceId,
    conversationId,
    messageId,
    summary,
    icon,
    actorId,
    actorName,
    metadata,
    timestamp,
    idempotencyKey,
  }) {
    if (!leadId || !type) return null;
    const now = new Date().toISOString();
    const event = {
      leadId,
      type,
      source: source || "system",
      sourceId: sourceId || null,
      conversationId: conversationId || null,
      messageId: messageId || null,
      summary: String(summary || type).slice(0, 200),
      icon: icon || TIMELINE_ICONS[type] || "note",
      actorId: actorId || null,
      actorName: actorName || null,
      metadata: metadata || null,
      timestamp: timestamp || now,
      createdAt: now,
    };
    if (idempotencyKey) {
      const safeKey = String(idempotencyKey).replace(/[^\w.-]/g, "_").slice(0, 120);
      const id = `tl_${safeKey}`;
      event.idempotencyKey = String(idempotencyKey);
      await db.collection(TIMELINE).doc(id).set(event, { merge: true });
      return { id, ...event };
    }
    const ref = db.collection(TIMELINE).doc();
    await ref.set(event);
    return { id: ref.id, ...event };
  }

  /**
   * Write a message to top-level collections + timeline event.
   * Does NOT write callLogs or lead-nested whatsappMessages.
   */
  async function writeMessage(leadId, message, leadHints = {}) {
    const now = message.timestamp || new Date().toISOString();
    const conversation = await ensureConversation({
      leadId,
      phone: leadHints.phone || message.waId || "",
      waId: message.waId,
      provider: message.provider,
      assignedTo: leadHints.assignedTo,
      assignedToName: leadHints.assignedToName,
    });

    const msgRef = db.collection(MESSAGES).doc();
    const payload = {
      conversationId: conversation.id,
      leadId,
      provider: message.provider || "evolution",
      providerMessageId: message.providerMessageId || "",
      direction: message.direction,
      type: message.type || "text",
      text: message.text || "",
      mediaUrl: message.mediaUrl || "",
      mediaMimeType: message.mediaMimeType || "",
      mediaFileName: message.mediaFileName || "",
      templateId: message.templateId || "",
      status: message.status || "pending",
      error: message.error || "",
      timestamp: now,
      updatedAt: now,
      agentId: message.agentId || "",
      agentName: message.agentName || "",
      waId: message.waId || conversation.waId || "",
    };
    await msgRef.set(payload);

    const preview =
      message.text ||
      (message.type === "image"
        ? "[Image]"
        : message.type === "document"
          ? "[Document]"
          : message.type === "audio"
            ? "[Voice note]"
            : "[Message]");

    const unreadBump = message.direction === "inbound" ? 1 : 0;
    const nextUnread =
      message.direction === "inbound"
        ? (conversation.unreadCount || 0) + unreadBump
        : conversation.unreadCount || 0;

    await db
      .collection(CONVERSATIONS)
      .doc(conversation.id)
      .set(
        {
          lastMessageAt: now,
          lastMessagePreview: String(preview).slice(0, 120),
          lastMessageDirection: message.direction,
          unreadCount: nextUnread,
          updatedAt: now,
        },
        { merge: true },
      );

    // Lightweight lead pointers only — no message history on lead doc
    await db.collection("leads").doc(leadId).set(
      {
        updatedAt: now,
        whatsappLastMessageAt: now,
        whatsappConversationId: conversation.id,
      },
      { merge: true },
    );

    const timelineType =
      message.direction === "inbound" ? "whatsapp_inbound" : "whatsapp_outbound";
    await recordTimelineEvent({
      leadId,
      type: timelineType,
      source: "whatsapp",
      sourceId: msgRef.id,
      conversationId: conversation.id,
      messageId: msgRef.id,
      summary: String(preview).slice(0, 120),
      actorId: message.agentId,
      actorName:
        message.direction === "inbound"
          ? "Customer"
          : message.agentName || "Agent",
      timestamp: now,
    });

    return {
      id: msgRef.id,
      conversationId: conversation.id,
      ...payload,
    };
  }

  async function updateMessageStatus(providerMessageId, status) {
    if (!providerMessageId) return;
    try {
      const q = await db
        .collection(MESSAGES)
        .where("providerMessageId", "==", providerMessageId)
        .limit(5)
        .get();
      const batch = db.batch();
      const now = new Date().toISOString();
      q.forEach((doc) => {
        batch.update(doc.ref, { status, updatedAt: now });
      });
      await batch.commit();
    } catch (err) {
      console.warn("updateMessageStatus failed:", err.message);
    }
  }

  async function updateMessageDoc(messageId, fields) {
    if (!messageId) return;
    await db
      .collection(MESSAGES)
      .doc(messageId)
      .set({ ...fields, updatedAt: new Date().toISOString() }, { merge: true });
  }

  async function markConversationRead(conversationId) {
    if (!conversationId) return;
    await db.collection(CONVERSATIONS).doc(conversationId).set(
      {
        unreadCount: 0,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  }

  return {
    CONVERSATIONS,
    MESSAGES,
    TIMELINE,
    findConversationByLead,
    findConversationByPhone,
    ensureConversation,
    writeMessage,
    updateMessageStatus,
    updateMessageDoc,
    markConversationRead,
    recordTimelineEvent,
  };
}

module.exports = {
  createMessagingStore,
  CONVERSATIONS,
  MESSAGES,
  TIMELINE,
  TIMELINE_ICONS,
};
