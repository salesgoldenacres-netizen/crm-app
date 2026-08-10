/**
 * Phase D — batched bulk lead import for webhook / API path.
 *
 * Flow per chunk:
 *  1. Clean + validate rows
 *  2. Parallel phone lookups (controlled concurrency)
 *  3. writeBatch create new lead docs
 *  4. CallLogsRepository appends (create + merge) with concurrency
 *  5. Notifications for pre-assigned rows only
 *
 * Failures return index + phone so clients can retry without a full re-run.
 */

const { chunkArray, resolveBulkChunkSize } = require("../helpers/chunk");
const { mapWithConcurrency } = require("../helpers/parallel");
const { generateUlid } = require("../helpers/ulid");
const { buildAssignmentFields } = require("../helpers/leadAssignment");

const DEFAULT_LOOKUP_CONCURRENCY = 15;
const DEFAULT_CALLLOG_CONCURRENCY = 10;
const DEFAULT_NOTIFY_CONCURRENCY = 8;

/**
 * @param {{
 *   received: number,
 *   created: number,
 *   duplicates: number,
 *   failed: number,
 *   durationMs: number,
 *   chunkSize: number,
 *   chunks: number,
 * }} stats
 */
function buildBulkImportLog(stats) {
  return {
    event: "bulk_import",
    received: stats.received,
    created: stats.created,
    duplicates: stats.duplicates,
    failed: stats.failed,
    durationMs: stats.durationMs,
    chunkSize: stats.chunkSize,
    chunks: stats.chunks,
  };
}

/**
 * Find an existing lead by normalized phone (limit 1).
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} phone
 * @returns {Promise<{ id: string, data: object } | null>}
 */
async function findLeadByPhone(db, phone) {
  const snap = await db.collection("leads").where("phone", "==", phone).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, data: doc.data() || {} };
}

/**
 * Process one chunk of bulk leads.
 * @param {object} deps
 * @param {FirebaseFirestore.Firestore} deps.db
 * @param {typeof import('../helpers/firestoreWrites').appendCallLog} deps.appendCallLog
 * @param {Function} deps.publishNotification
 * @param {Function} deps.sendFcm
 * @param {Function} deps.cleanLeadData
 * @param {object} deps.settings
 * @param {Array<{ index: number, lead: object }>} indexedLeads
 * @param {{
 *   lookupConcurrency?: number,
 *   callLogConcurrency?: number,
 *   notifyConcurrency?: number,
 * }} [options]
 */
async function processBulkImportChunk(deps, indexedLeads, options = {}) {
  const {
    db,
    appendCallLog,
    publishNotification,
    sendFcm,
    cleanLeadData,
    settings,
  } = deps;
  const lookupConcurrency = options.lookupConcurrency ?? DEFAULT_LOOKUP_CONCURRENCY;
  const callLogConcurrency = options.callLogConcurrency ?? DEFAULT_CALLLOG_CONCURRENCY;
  const notifyConcurrency = options.notifyConcurrency ?? DEFAULT_NOTIFY_CONCURRENCY;
  const duplicateRule = settings.duplicateHandlingRule || "merge";

  /** @type {Array<{ index: number, action: string, phone?: string, leadId?: string, error?: string }>} */
  const rowResults = [];
  let created = 0;
  let duplicates = 0;
  let failed = 0;

  /** @type {Array<{ index: number, lead: object, cleaned: object }>} */
  const candidates = [];

  for (const { index, lead } of indexedLeads) {
    try {
      const cleaned = cleanLeadData({
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
      });
      if (!cleaned.phone || cleaned.phone === "+") {
        failed += 1;
        rowResults.push({
          index,
          action: "failed",
          phone: String(lead.phone || ""),
          error: "invalid_phone",
        });
        continue;
      }
      candidates.push({ index, lead, cleaned });
    } catch (err) {
      failed += 1;
      rowResults.push({
        index,
        action: "failed",
        phone: String(lead.phone || ""),
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const lookups = await mapWithConcurrency(
    candidates,
    lookupConcurrency,
    async (row) => {
      if (duplicateRule === "create") {
        return { ...row, existing: null };
      }
      try {
        const existing = await findLeadByPhone(db, row.cleaned.phone);
        return { ...row, existing };
      } catch (err) {
        return {
          ...row,
          existing: null,
          lookupError: err instanceof Error ? err.message : String(err),
        };
      }
    },
  );

  /** @type {typeof lookups} */
  const toCreate = [];
  /** @type {Array<{ index: number, lead: object, cleaned: object, existing: { id: string, data: object } }>} */
  const toMerge = [];
  /** In-chunk phone → first create leadId (avoid double-create on same phone). */
  const pendingPhones = new Map();

  for (const row of lookups) {
    if (row.lookupError) {
      failed += 1;
      rowResults.push({
        index: row.index,
        action: "failed",
        phone: row.cleaned.phone,
        error: row.lookupError,
      });
      continue;
    }

    if (row.existing) {
      if (duplicateRule === "skip") {
        duplicates += 1;
        rowResults.push({
          index: row.index,
          action: "skipped",
          phone: row.cleaned.phone,
          leadId: row.existing.id,
        });
        continue;
      }
      toMerge.push(row);
      continue;
    }

    if (pendingPhones.has(row.cleaned.phone)) {
      // Same phone later in this chunk — treat as merge into the pending create.
      toMerge.push({
        ...row,
        existing: {
          id: pendingPhones.get(row.cleaned.phone),
          data: { status: row.lead.status || "new" },
        },
        inChunkDuplicate: true,
      });
      continue;
    }

    const leadRef = db.collection("leads").doc();
    pendingPhones.set(row.cleaned.phone, leadRef.id);
    toCreate.push({ ...row, leadRef, newLeadId: leadRef.id });
  }

  // --- writeBatch create lead docs ---
  if (toCreate.length > 0) {
    const assigneeIds = [
      ...new Set(
        toCreate
          .map((row) => row.lead.assignedTo)
          .filter((id) => typeof id === "string" && id),
      ),
    ];
    const assigneeDocs = new Map();
    await Promise.all(
      assigneeIds.map(async (assigneeId) => {
        const snap = await db.collection("users").doc(assigneeId).get();
        if (snap.exists) assigneeDocs.set(assigneeId, snap.data());
      }),
    );

    const batch = db.batch();
    const now = new Date().toISOString();
    for (const row of toCreate) {
      const assignedToRaw = row.lead.assignedTo || "";
      const assignedToNameRaw = assignedToRaw
        ? row.lead.assignedToName || "Agent"
        : "Unassigned";
      const { assignedTo, assignedToName, assignedToUid } = buildAssignmentFields(
        assignedToRaw,
        assignedToNameRaw,
        assigneeDocs.get(assignedToRaw),
      );
      const leadRecord = {
        id: row.newLeadId,
        leadReference: generateUlid(),
        name: row.cleaned.name,
        phone: row.cleaned.phone,
        email: row.cleaned.email,
        projectId: row.lead.projectId || "",
        plotId: row.lead.plotId || "",
        assignedTo,
        assignedToName,
        assignedToUid,
        status: row.lead.status || "new",
        priority: row.lead.priority || "warm",
        notes: row.lead.notes || "CSV Bulk imported lead.",
        createdAt: now,
        updatedAt: now,
        callCount: 0,
        hasAgentCall: false,
      };
      batch.set(row.leadRef, leadRecord);
      row.leadRecord = leadRecord;
    }
    try {
      await batch.commit();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      for (const row of toCreate) {
        failed += 1;
        rowResults.push({
          index: row.index,
          action: "failed",
          phone: row.cleaned.phone,
          error: `batch_create: ${message}`,
        });
      }
      // Still attempt merges that target pre-existing leads (not in-chunk).
      const externalMerges = toMerge.filter((r) => !r.inChunkDuplicate);
      const mergeOutcomes = await mapWithConcurrency(
        externalMerges,
        callLogConcurrency,
        async (row) => {
          try {
            await appendCallLog(db, row.existing.id, {
              date: new Date().toISOString(),
              note: `Duplicate lead attempt merged from bulk upload. Notes: ${row.lead.notes || "Bulk imported lead."}`,
              status: row.existing.data.status || "new",
              agent: "system",
            });
            return { ok: true, row };
          } catch (mergeErr) {
            return {
              ok: false,
              row,
              error: mergeErr instanceof Error ? mergeErr.message : String(mergeErr),
            };
          }
        },
      );
      for (const outcome of mergeOutcomes) {
        if (outcome.ok) {
          duplicates += 1;
          rowResults.push({
            index: outcome.row.index,
            action: "merged",
            phone: outcome.row.cleaned.phone,
            leadId: outcome.row.existing.id,
          });
        } else {
          failed += 1;
          rowResults.push({
            index: outcome.row.index,
            action: "failed",
            phone: outcome.row.cleaned.phone,
            leadId: outcome.row.existing.id,
            error: outcome.error,
          });
        }
      }
      return { created, duplicates, failed, rowResults };
    }
  }

  // --- Call log appends (creates + merges) via CallLogsRepository path ---
  const callLogJobs = [
    ...toCreate.map((row) => ({
      kind: "create",
      row,
      leadId: row.newLeadId,
      entry: {
        date: new Date().toISOString(),
        note: "Lead created via CSV Bulk Upload.",
        status: row.lead.status || "new",
        agent: "system",
      },
    })),
    ...toMerge.map((row) => ({
      kind: "merge",
      row,
      leadId: row.existing.id,
      entry: {
        date: new Date().toISOString(),
        note: `Duplicate lead attempt merged from bulk upload. Notes: ${row.lead.notes || "Bulk imported lead."}`,
        status: row.existing.data.status || row.lead.status || "new",
        agent: "system",
      },
    })),
  ];

  const callLogOutcomes = await mapWithConcurrency(
    callLogJobs,
    callLogConcurrency,
    async (job) => {
      try {
        await appendCallLog(db, job.leadId, job.entry);
        return { ok: true, job };
      } catch (err) {
        return {
          ok: false,
          job,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },
  );

  /** @type {typeof toCreate} */
  const createdOk = [];
  for (const outcome of callLogOutcomes) {
    const { job } = outcome;
    if (job.kind === "create") {
      if (outcome.ok) {
        created += 1;
        createdOk.push(job.row);
        rowResults.push({
          index: job.row.index,
          action: "created",
          phone: job.row.cleaned.phone,
          leadId: job.leadId,
        });
      } else {
        // Lead doc exists; treat as created for retry safety, surface warning in error field.
        created += 1;
        createdOk.push(job.row);
        rowResults.push({
          index: job.row.index,
          action: "created",
          phone: job.row.cleaned.phone,
          leadId: job.leadId,
          error: `call_log_failed: ${outcome.error}`,
        });
      }
    } else if (outcome.ok) {
      duplicates += 1;
      rowResults.push({
        index: job.row.index,
        action: "merged",
        phone: job.row.cleaned.phone,
        leadId: job.leadId,
      });
    } else {
      failed += 1;
      rowResults.push({
        index: job.row.index,
        action: "failed",
        phone: job.row.cleaned.phone,
        leadId: job.leadId,
        error: outcome.error,
      });
    }
  }

  // --- Notifications for pre-assigned bulk rows only ---
  const notifyRows = createdOk.filter((row) => row.lead.assignedTo);
  await mapWithConcurrency(notifyRows, notifyConcurrency, async (row) => {
    try {
      await publishNotification(db, sendFcm, {
        userId: row.lead.assignedTo,
        message: `📥 New Lead Assigned: ${row.cleaned.name} (${row.cleaned.phone})`,
        type: "lead_assigned",
        title: "📥 New Lead Assigned",
        body: `${row.cleaned.name} (${row.cleaned.phone})`,
        leadId: row.newLeadId,
        sendPush: false,
      });
    } catch (err) {
      console.error(
        JSON.stringify({
          event: "bulk_import_notify_failed",
          leadId: row.newLeadId,
          reason: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  });

  return { created, duplicates, failed, rowResults };
}

/**
 * Full bulk import: chunk → process → aggregate.
 * @param {object} deps
 * @param {object[]} rawLeads
 * @param {{ chunkSize?: number }} [options]
 */
async function runBulkImport(deps, rawLeads, options = {}) {
  const startedAt = Date.now();
  const chunkSize = resolveBulkChunkSize(options.chunkSize);
  const indexed = rawLeads.map((lead, index) => ({ index, lead }));
  const chunks = chunkArray(indexed, chunkSize);

  let created = 0;
  let duplicates = 0;
  let failed = 0;
  /** @type {Array<object>} */
  const failures = [];
  /** @type {Array<object>} */
  const results = [];

  for (const chunk of chunks) {
    const part = await processBulkImportChunk(deps, chunk, options);
    created += part.created;
    duplicates += part.duplicates;
    failed += part.failed;
    results.push(...part.rowResults);
    for (const row of part.rowResults) {
      if (row.action === "failed") {
        failures.push({
          index: row.index,
          phone: row.phone || "",
          error: row.error || "unknown",
          leadId: row.leadId || null,
        });
      }
    }
  }

  const summary = buildBulkImportLog({
    received: rawLeads.length,
    created,
    duplicates,
    failed,
    durationMs: Date.now() - startedAt,
    chunkSize,
    chunks: chunks.length,
  });

  return { summary, results, failures };
}

module.exports = {
  DEFAULT_LOOKUP_CONCURRENCY,
  DEFAULT_CALLLOG_CONCURRENCY,
  DEFAULT_NOTIFY_CONCURRENCY,
  buildBulkImportLog,
  findLeadByPhone,
  processBulkImportChunk,
  runBulkImport,
};
