/**
 * Evolution API messaging plugin.
 * Implements MessagingProvider contract — CRM must not import this from UI.
 */

const axios = require("axios");
const { NotConnectedError, UnsupportedCapabilityError } = require("../errors");
const { normalizePhoneE164, digitsOnly } = require("../phone");
const { createMessagingStore } = require("../store");

async function loadProviderConfig(db) {
  const publicSnap = await db.doc("settings/integrations").get();
  const secretSnap = await db.doc("settings/integrations_secrets").get();
  const pub = publicSnap.exists ? publicSnap.data() : {};
  const sec = secretSnap.exists ? secretSnap.data() : {};

  const enabled =
    pub.messagingEnabled !== undefined
      ? !!pub.messagingEnabled
      : !!pub.evolutionEnabled;
  const baseUrl = String(
    pub.messagingBaseUrl || pub.evolutionBaseUrl || "",
  ).replace(/\/$/, "");
  const instanceName = String(
    pub.messagingInstanceName || pub.evolutionInstanceName || "",
  );

  return {
    enabled,
    baseUrl,
    instanceName,
    apiKey: String(sec.evolutionApiKey || sec.messagingApiKey || ""),
    instanceToken: String(sec.evolutionInstanceToken || ""),
    webhookSecret: String(
      sec.evolutionWebhookSecret || sec.messagingWebhookSecret || "",
    ),
    connectionStatus:
      pub.messagingConnectionStatus ||
      pub.evolutionConnectionStatus ||
      "not_configured",
    qrStatus: pub.messagingQrStatus || pub.evolutionQrStatus || "n/a",
    connectedPhone:
      pub.messagingConnectedPhone || pub.evolutionConnectedPhone || "",
    instanceStatus:
      pub.messagingInstanceStatus || pub.evolutionInstanceStatus || "not_configured",
    lastSyncAt: pub.messagingLastSyncAt || pub.evolutionLastSyncAt || "",
    lastError: pub.messagingLastError || pub.evolutionLastError || "",
    lastWebhookAt:
      pub.messagingLastWebhookAt || pub.evolutionLastWebhookAt || "",
    webhookHealth:
      pub.messagingWebhookHealth || pub.evolutionWebhookHealth || "unknown",
  };
}

/** Persist both generic messaging* and legacy evolution* keys for V1 compatibility. */
async function patchPublicStatus(db, fields) {
  const now = new Date().toISOString();
  const mapped = { ...fields, messagingLastSyncAt: now, evolutionLastSyncAt: now };

  if (fields.messagingConnectionStatus) {
    mapped.evolutionConnectionStatus =
      fields.messagingConnectionStatus === "waiting_qr"
        ? "qr"
        : fields.messagingConnectionStatus;
  }
  if (fields.messagingQrStatus !== undefined) {
    mapped.evolutionQrStatus = fields.messagingQrStatus;
  }
  if (fields.messagingConnectedPhone !== undefined) {
    mapped.evolutionConnectedPhone = fields.messagingConnectedPhone;
  }
  if (fields.messagingInstanceStatus !== undefined) {
    mapped.evolutionInstanceStatus = fields.messagingInstanceStatus;
  }
  if (fields.messagingLastError !== undefined) {
    mapped.evolutionLastError = fields.messagingLastError;
  }
  if (fields.messagingLastWebhookAt !== undefined) {
    mapped.evolutionLastWebhookAt = fields.messagingLastWebhookAt;
  }
  if (fields.messagingWebhookHealth !== undefined) {
    mapped.evolutionWebhookHealth = fields.messagingWebhookHealth;
  }

  await db.doc("settings/integrations").set(mapped, { merge: true });
}

function webhookUrlForProject() {
  return "https://us-central1-golden-acres-projects.cloudfunctions.net/api/api/webhooks/whatsapp";
}

function mapStateToStatus(state) {
  const s = String(state || "").toLowerCase();
  if (s === "open") return { connected: true, status: "connected" };
  if (s === "connecting") return { connected: false, status: "connecting" };
  return { connected: false, status: "disconnected" };
}

class EvolutionProvider {
  /**
   * @param {FirebaseFirestore.Firestore} db
   */
  constructor(db) {
    this.db = db;
    this.id = "evolution";
    this.store = createMessagingStore(db);
  }

  async getConfig() {
    return loadProviderConfig(this.db);
  }

  isConfigured(cfg) {
    return !!(cfg.enabled && cfg.baseUrl && cfg.apiKey && cfg.instanceName);
  }

  headers(cfg) {
    const h = {
      apikey: cfg.apiKey,
      "Content-Type": "application/json",
    };
    if (cfg.instanceToken) {
      h.Authorization = `Bearer ${cfg.instanceToken}`;
    }
    return h;
  }

  async getStatus() {
    const cfg = await this.getConfig();
    const base = {
      provider: this.id,
      webhookUrl: webhookUrlForProject(),
      instanceName: cfg.instanceName,
      connectedPhone: cfg.connectedPhone,
      instanceStatus: cfg.instanceStatus,
      qrStatus: cfg.qrStatus,
      lastSyncAt: cfg.lastSyncAt,
      lastError: cfg.lastError,
      lastWebhookAt: cfg.lastWebhookAt,
      webhookHealth: cfg.webhookHealth,
      supportsCreateInstance: true,
    };

    if (!cfg.enabled) {
      return {
        ...base,
        connected: false,
        status: "disabled",
        message:
          "Messaging integration is disabled. Enable it in Admin → Integrations.",
      };
    }

    if (!cfg.baseUrl || !cfg.apiKey || !cfg.instanceName) {
      return {
        ...base,
        connected: false,
        status: "not_configured",
        message: "Set Base URL, API Key, and Instance Name, then Test Connection.",
      };
    }

    try {
      const url = `${cfg.baseUrl}/instance/connectionState/${encodeURIComponent(cfg.instanceName)}`;
      const res = await axios.get(url, {
        headers: this.headers(cfg),
        timeout: 8000,
        validateStatus: () => true,
      });

      if (res.status >= 200 && res.status < 300) {
        const state =
          res.data?.instance?.state ||
          res.data?.state ||
          res.data?.status ||
          "unknown";
        const mapped = mapStateToStatus(state);
        await patchPublicStatus(this.db, {
          messagingConnectionStatus: mapped.status,
          messagingInstanceStatus: String(state),
          messagingLastError: "",
        });
        return {
          ...base,
          connected: mapped.connected,
          status: mapped.status,
          instanceStatus: String(state),
          message: mapped.connected
            ? "Messaging provider is connected."
            : `Instance state: ${state}`,
        };
      }

      const errMsg = `Provider responded HTTP ${res.status}`;
      await patchPublicStatus(this.db, {
        messagingConnectionStatus: "error",
        messagingLastError: errMsg,
        messagingInstanceStatus: "error",
      });
      return {
        ...base,
        connected: false,
        status: "error",
        message: errMsg,
        lastError: errMsg,
      };
    } catch (err) {
      const errMsg = err.message || "Failed to reach messaging provider";
      await patchPublicStatus(this.db, {
        messagingConnectionStatus: "disconnected",
        messagingLastError: errMsg,
        messagingInstanceStatus: "unreachable",
      });
      return {
        ...base,
        connected: false,
        status: "disconnected",
        message: `${errMsg}. Ensure the provider server is reachable from Cloud Functions.`,
        lastError: errMsg,
      };
    }
  }

  async testConnection() {
    return this.getStatus();
  }

  async getQr() {
    const cfg = await this.getConfig();
    if (!this.isConfigured(cfg)) {
      throw new NotConnectedError("Messaging provider is not configured");
    }
    try {
      const url = `${cfg.baseUrl}/instance/connect/${encodeURIComponent(cfg.instanceName)}`;
      const res = await axios.get(url, {
        headers: this.headers(cfg),
        timeout: 15000,
        validateStatus: () => true,
      });
      const qr =
        res.data?.base64 ||
        res.data?.qrcode?.base64 ||
        res.data?.qr?.base64 ||
        null;
      await patchPublicStatus(this.db, {
        messagingQrStatus: qr ? "available" : "unavailable",
        messagingConnectionStatus: qr ? "waiting_qr" : cfg.connectionStatus,
      });
      const status = await this.getStatus();
      return { ...status, qrBase64: qr };
    } catch (err) {
      await patchPublicStatus(this.db, {
        messagingLastError: err.message,
        messagingQrStatus: "error",
      });
      throw err;
    }
  }

  async reconnect() {
    const cfg = await this.getConfig();
    if (!this.isConfigured(cfg)) {
      throw new NotConnectedError("Messaging provider is not configured");
    }
    try {
      const url = `${cfg.baseUrl}/instance/restart/${encodeURIComponent(cfg.instanceName)}`;
      await axios.put(
        url,
        {},
        {
          headers: this.headers(cfg),
          timeout: 15000,
          validateStatus: () => true,
        },
      );
      await patchPublicStatus(this.db, {
        messagingConnectionStatus: "connecting",
        messagingInstanceStatus: "restarting",
      });
      return this.getQr();
    } catch {
      return this.getQr();
    }
  }

  async disconnect() {
    const cfg = await this.getConfig();
    if (!this.isConfigured(cfg)) {
      throw new NotConnectedError("Messaging provider is not configured");
    }
    const url = `${cfg.baseUrl}/instance/logout/${encodeURIComponent(cfg.instanceName)}`;
    await axios.delete(url, {
      headers: this.headers(cfg),
      timeout: 15000,
      validateStatus: () => true,
    });
    await patchPublicStatus(this.db, {
      messagingConnectionStatus: "disconnected",
      messagingConnectedPhone: "",
      messagingInstanceStatus: "logged_out",
      messagingQrStatus: "n/a",
    });
    return this.getStatus();
  }

  /**
   * Optional: create Evolution instance when API supports it.
   */
  async createInstance({ instanceName, webhookUrl } = {}) {
    const cfg = await this.getConfig();
    if (!cfg.baseUrl || !cfg.apiKey) {
      throw new NotConnectedError("Base URL and API Key required to create instance");
    }
    const name = instanceName || cfg.instanceName;
    if (!name) {
      throw new NotConnectedError("Instance name is required");
    }

    const url = `${cfg.baseUrl}/instance/create`;
    const res = await axios.post(
      url,
      {
        instanceName: name,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
        webhook: webhookUrl
          ? {
              url: webhookUrl,
              byEvents: false,
              base64: true,
              events: [
                "MESSAGES_UPSERT",
                "MESSAGES_UPDATE",
                "CONNECTION_UPDATE",
              ],
            }
          : undefined,
      },
      {
        headers: this.headers(cfg),
        timeout: 20000,
        validateStatus: () => true,
      },
    );

    if (res.status < 200 || res.status >= 300) {
      const msg =
        res.data?.message ||
        res.data?.error ||
        `Create instance failed (HTTP ${res.status})`;
      if (res.status === 404 || res.status === 501) {
        throw new UnsupportedCapabilityError("createInstance", msg);
      }
      throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
    }

    await patchPublicStatus(this.db, {
      messagingInstanceName: name,
      evolutionInstanceName: name,
      messagingConnectionStatus: "waiting_qr",
      messagingInstanceStatus: "created",
      messagingLastError: "",
    });

    return this.getQr();
  }

  async sendText({ number, text }) {
    const cfg = await this.getConfig();
    if (!this.isConfigured(cfg)) throw new NotConnectedError();
    const status = await this.getStatus();
    if (!status.connected) {
      throw new NotConnectedError(status.message || "Instance not connected");
    }

    const url = `${cfg.baseUrl}/message/sendText/${encodeURIComponent(cfg.instanceName)}`;
    const res = await axios.post(
      url,
      { number: normalizePhoneE164(number), text },
      { headers: this.headers(cfg), timeout: 20000 },
    );

    const providerMessageId =
      res.data?.key?.id || res.data?.messageId || res.data?.id || null;
    return { providerMessageId, raw: res.data };
  }

  async sendMedia({ number, mediaUrl, mediaMimeType, fileName, caption }) {
    const cfg = await this.getConfig();
    if (!this.isConfigured(cfg)) throw new NotConnectedError();
    const status = await this.getStatus();
    if (!status.connected) {
      throw new NotConnectedError(status.message || "Instance not connected");
    }

    const isImage = (mediaMimeType || "").startsWith("image/");
    const url = `${cfg.baseUrl}/message/sendMedia/${encodeURIComponent(cfg.instanceName)}`;
    const res = await axios.post(
      url,
      {
        number: normalizePhoneE164(number),
        mediatype: isImage ? "image" : "document",
        mimetype: mediaMimeType || "application/octet-stream",
        caption: caption || "",
        media: mediaUrl,
        fileName: fileName || "file",
      },
      { headers: this.headers(cfg), timeout: 30000 },
    );

    const providerMessageId =
      res.data?.key?.id || res.data?.messageId || res.data?.id || null;
    return { providerMessageId, raw: res.data };
  }

  async findLeadByPhone(waIdOrPhone) {
    const target = digitsOnly(waIdOrPhone);
    if (!target) return null;

    // Prefer indexed equality (same path as webhook ingest in functions/index.js).
    // Leads are typically stored as +E164 (e.g. +9198...).
    const e164 = normalizePhoneE164(waIdOrPhone);
    const last10 = target.length >= 10 ? target.slice(-10) : target;
    const candidates = [
      `+${e164}`,
      e164,
      `+91${last10}`,
      `91${last10}`,
      `+${target}`,
      target,
    ];
    const tried = new Set();
    for (const phone of candidates) {
      if (!phone || tried.has(phone)) continue;
      tried.add(phone);
      const snap = await this.db
        .collection("leads")
        .where("phone", "==", phone)
        .limit(1)
        .get();
      if (!snap.empty) {
        const doc = snap.docs[0];
        return { id: doc.id, ...doc.data() };
      }
    }

    // Soft fallback for legacy/unnormalized phones — capped scan, not full collection.
    const snap = await this.db.collection("leads").limit(100).get();
    let match = null;
    snap.forEach((doc) => {
      const phone = digitsOnly(doc.data().phone || "");
      if (
        phone &&
        (phone === target ||
          phone.endsWith(last10) ||
          target.endsWith(phone.slice(-10)))
      ) {
        match = { id: doc.id, ...doc.data() };
      }
    });
    return match;
  }

  async ensureLeadForInbound(waId, pushName) {
    const existing = await this.findLeadByPhone(waId);
    if (existing) return existing;

    const ref = this.db.collection("leads").doc();
    const now = new Date().toISOString();
    let p = digitsOnly(waId);
    if (p.length === 10) p = "91" + p;
    const lead = {
      name: pushName || "WhatsApp Lead",
      phone: "+" + p,
      status: "raw",
      leadSource: "whatsapp",
      assignedTo: "",
      assignedToName: "Unassigned",
      callLogs: [],
      createdAt: now,
      updatedAt: now,
      createdTime: now,
    };
    await ref.set(lead);
    await this.store.recordTimelineEvent({
      leadId: ref.id,
      type: "lead_created",
      source: "lead",
      sourceId: ref.id,
      summary: `Lead created from WhatsApp (${pushName || p})`,
      actorName: "System",
      timestamp: now,
    });
    return { id: ref.id, ...lead };
  }

  /** CRM persistence — delegates to shared store (not Evolution-specific). */
  async writeMessage(leadId, message, leadHints) {
    return this.store.writeMessage(leadId, message, leadHints);
  }

  async updateMessageStatus(providerMessageId, status) {
    return this.store.updateMessageStatus(providerMessageId, status);
  }

  async touchWebhookHealth(ok = true) {
    const now = new Date().toISOString();
    await patchPublicStatus(this.db, {
      messagingLastWebhookAt: now,
      messagingWebhookHealth: ok ? "healthy" : "error",
    });
  }

  async handleWebhook(body) {
    const event = body?.event || body?.type || "";
    const data = body?.data || body;

    await this.touchWebhookHealth(true);

    if (
      String(event).includes("connection.update") ||
      event === "connection.update"
    ) {
      const state = data?.state || data?.instance?.state || data?.status;
      const mapped = mapStateToStatus(state);
      await patchPublicStatus(this.db, {
        messagingConnectionStatus: mapped.status,
        messagingInstanceStatus: String(state || "unknown"),
        messagingConnectedPhone:
          data?.instance?.owner || data?.wuid || data?.phone || "",
      });
      return { ok: true, handled: "connection.update" };
    }

    if (
      String(event).includes("messages.update") ||
      event === "messages.update"
    ) {
      const updates = Array.isArray(data) ? data : [data];
      for (const u of updates) {
        const id = u?.key?.id || u?.id;
        const st = u?.status || u?.update?.status;
        let mapped = "sent";
        const s = String(st || "").toUpperCase();
        if (s.includes("READ") || s === "READ") mapped = "read";
        else if (s.includes("DELIV") || s === "DELIVERY_ACK") mapped = "delivered";
        else if (s.includes("FAIL")) mapped = "failed";
        await this.updateMessageStatus(id, mapped);
      }
      return { ok: true, handled: "messages.update" };
    }

    const messages = Array.isArray(data?.messages)
      ? data.messages
      : data?.key
        ? [data]
        : Array.isArray(data)
          ? data
          : [];

    for (const msg of messages) {
      const key = msg.key || {};
      const fromMe = !!key.fromMe;
      if (fromMe) continue;

      const remoteJid = key.remoteJid || msg.remoteJid || "";
      const waId = digitsOnly(String(remoteJid).split("@")[0]);
      if (!waId) continue;

      const messageContent = msg.message || {};
      let type = "text";
      let text =
        messageContent.conversation ||
        messageContent.extendedTextMessage?.text ||
        "";
      let mediaUrl = "";
      let mediaMimeType = "";
      let mediaFileName = "";

      if (messageContent.imageMessage) {
        type = "image";
        text = messageContent.imageMessage.caption || text;
        mediaMimeType = messageContent.imageMessage.mimetype || "image/jpeg";
        mediaUrl = messageContent.imageMessage.url || "";
      } else if (messageContent.documentMessage) {
        type = "document";
        text = messageContent.documentMessage.caption || text;
        mediaMimeType =
          messageContent.documentMessage.mimetype || "application/pdf";
        mediaFileName = messageContent.documentMessage.fileName || "document";
        mediaUrl = messageContent.documentMessage.url || "";
      } else if (messageContent.audioMessage) {
        type = "audio";
        mediaMimeType = messageContent.audioMessage.mimetype || "audio/ogg";
        mediaUrl = messageContent.audioMessage.url || "";
        text = text || "[Voice note]";
      }

      const pushName = msg.pushName || data?.pushName || "";
      const lead = await this.ensureLeadForInbound(waId, pushName);

      await this.writeMessage(
        lead.id,
        {
          provider: this.id,
          providerMessageId: key.id || "",
          direction: "inbound",
          type,
          text,
          mediaUrl,
          mediaMimeType,
          mediaFileName,
          status: "delivered",
          waId,
          agentName: "Customer",
        },
        {
          phone: lead.phone,
          assignedTo: lead.assignedTo,
          assignedToName: lead.assignedToName,
        },
      );
    }

    await patchPublicStatus(this.db, { messagingLastError: "" });
    return { ok: true, handled: event || "messages" };
  }
}

module.exports = {
  EvolutionProvider,
  loadProviderConfig,
  loadEvolutionConfig: loadProviderConfig,
  patchPublicStatus,
  webhookUrlForProject,
};
