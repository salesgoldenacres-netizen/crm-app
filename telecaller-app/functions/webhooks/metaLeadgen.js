/**
 * Pure helpers for Meta leadgen webhook multi-entry ingest.
 * Keep side-effect-free so unit tests can cover parsing / collection without Firestore.
 */

/**
 * @typedef {{ leadgenId: string, formId: string|null, pageId: string|null }} LeadgenEntry
 */

/**
 * Collect every leadgen change from a Meta page webhook body.
 * Preserves order; does not dedupe (caller handles ingestEvents idempotency).
 *
 * @param {unknown} body
 * @returns {LeadgenEntry[]}
 */
function collectLeadgenEntries(body) {
  if (!body || typeof body !== "object") return [];
  const entries = /** @type {{ entry?: unknown }} */ (body).entry;
  if (!Array.isArray(entries)) return [];

  /** @type {LeadgenEntry[]} */
  const out = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    const pageId =
      typeof /** @type {{ id?: unknown }} */ (entry).id === "string"
        ? /** @type {{ id: string }} */ (entry).id
        : null;
    const changes = /** @type {{ changes?: unknown }} */ (entry).changes;
    if (!Array.isArray(changes)) continue;

    for (const change of changes) {
      if (!change || typeof change !== "object") continue;
      if (/** @type {{ field?: unknown }} */ (change).field !== "leadgen") continue;
      const value = /** @type {{ value?: unknown }} */ (change).value;
      if (!value || typeof value !== "object") continue;
      const leadgenId = /** @type {{ leadgen_id?: unknown }} */ (value).leadgen_id;
      if (typeof leadgenId !== "string" || !leadgenId.trim()) continue;
      const formIdRaw = /** @type {{ form_id?: unknown }} */ (value).form_id;
      const formId =
        typeof formIdRaw === "string" || typeof formIdRaw === "number"
          ? String(formIdRaw)
          : null;
      out.push({ leadgenId: String(leadgenId), formId, pageId });
    }
  }
  return out;
}

/**
 * Map Meta Graph `field_data` into name / phone / email.
 *
 * @param {unknown} fieldData
 * @returns {{ name: string, phone: string, email: string }}
 */
function parseMetaFieldData(fieldData) {
  let name = "";
  let phone = "";
  let email = "";
  if (!Array.isArray(fieldData)) {
    return { name, phone, email };
  }

  for (const field of fieldData) {
    if (!field || typeof field !== "object") continue;
    const fieldName = String(/** @type {{ name?: unknown }} */ (field).name || "");
    const values = /** @type {{ values?: unknown }} */ (field).values;
    const val = Array.isArray(values) ? String(values[0] || "") : "";

    if (/name/i.test(fieldName)) name = val;
    else if (/phone/i.test(fieldName)) phone = val;
    else if (/email/i.test(fieldName)) email = val;
  }

  return { name, phone, email };
}

/**
 * Build structured meta_ingest log payload (pure).
 *
 * @param {{
 *   entriesReceived: number,
 *   leadsCreated: number,
 *   duplicates: number,
 *   failed: number,
 *   durationMs: number,
 *   requestId?: string|null,
 * }} stats
 */
function buildMetaIngestLog(stats) {
  return {
    event: "meta_ingest",
    entriesReceived: stats.entriesReceived,
    leadsCreated: stats.leadsCreated,
    duplicates: stats.duplicates,
    failed: stats.failed,
    durationMs: stats.durationMs,
    requestId: stats.requestId || null,
  };
}

module.exports = {
  collectLeadgenEntries,
  parseMetaFieldData,
  buildMetaIngestLog,
};
