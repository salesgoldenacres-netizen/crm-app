const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  collectLeadgenEntries,
  parseMetaFieldData,
  buildMetaIngestLog,
} = require("./metaLeadgen");
const {
  claimIngestEvent,
  updateIngestEvent,
  releaseIngestEvent,
} = require("../helpers/firestoreWrites");

/** @returns {Map<string, Record<string, unknown>>} */
function createDocStore() {
  return new Map();
}

function createMockFirestore(store = createDocStore()) {
  return {
    collection(collectionName) {
      return {
        doc(docId) {
          const key = `${collectionName}/${docId}`;
          return {
            async create(data) {
              if (store.has(key)) {
                const err = new Error("Document already exists");
                err.code = 6;
                throw err;
              }
              store.set(key, { ...data });
            },
            async update(fields) {
              if (!store.has(key)) throw new Error("Document not found");
              store.set(key, { ...store.get(key), ...fields });
            },
            async delete() {
              store.delete(key);
            },
          };
        },
      };
    },
    _store: store,
  };
}

/**
 * Simulates Meta ingest idempotency gate: claim before work, finalize or release.
 * Mirrors controllers/webhooks.js Meta loop semantics without Graph/lead writes.
 */
async function simulateMetaLeadgenIngest(db, leadgenId, work) {
  const eventId = `meta_leadgen_${leadgenId}`;
  let leadWritten = false;
  let claimHeld = false;

  const claim = await claimIngestEvent(db, eventId, {
    type: "meta_leadgen",
    leadgenId,
    status: "processing",
  });
  if (!claim.created) {
    return { action: "idempotent_skip", duplicate: true };
  }
  claimHeld = true;

  try {
    const result = await work();
    if (result.leadWritten) {
      leadWritten = true;
      await updateIngestEvent(db, eventId, {
        status: "completed",
        outcome: "created",
        leadId: result.leadId,
      });
      claimHeld = false;
      return { action: "created", leadId: result.leadId };
    }

    await updateIngestEvent(db, eventId, {
      status: "failed",
      outcome: result.outcome || "failed",
    });
    claimHeld = false;
    return { action: "failed", outcome: result.outcome };
  } catch (err) {
    if (claimHeld && !leadWritten) {
      await releaseIngestEvent(db, eventId);
    }
    throw err;
  }
}

describe("collectLeadgenEntries", () => {
  it("returns empty for non-page / missing entry", () => {
    assert.deepEqual(collectLeadgenEntries(null), []);
    assert.deepEqual(collectLeadgenEntries({}), []);
    assert.deepEqual(collectLeadgenEntries({ entry: "nope" }), []);
  });

  it("collects one leadgen per change across multiple entries", () => {
    const body = {
      object: "page",
      entry: [
        {
          id: "page-1",
          changes: [
            { field: "leadgen", value: { leadgen_id: "lg-1", form_id: "f-1" } },
            { field: "feed", value: {} },
          ],
        },
        {
          id: "page-1",
          changes: [
            { field: "leadgen", value: { leadgen_id: "lg-2", form_id: 99 } },
            { field: "leadgen", value: { leadgen_id: "lg-3" } },
          ],
        },
      ],
    };
    assert.deepEqual(collectLeadgenEntries(body), [
      { leadgenId: "lg-1", formId: "f-1", pageId: "page-1" },
      { leadgenId: "lg-2", formId: "99", pageId: "page-1" },
      { leadgenId: "lg-3", formId: null, pageId: "page-1" },
    ]);
  });

  it("skips leadgen changes without leadgen_id", () => {
    const body = {
      entry: [{ changes: [{ field: "leadgen", value: { form_id: "f" } }] }],
    };
    assert.deepEqual(collectLeadgenEntries(body), []);
  });
});

describe("parseMetaFieldData", () => {
  it("maps name / phone / email field names", () => {
    const parsed = parseMetaFieldData([
      { name: "full_name", values: ["Ada Lovelace"] },
      { name: "phone_number", values: ["9876543210"] },
      { name: "email", values: ["ada@example.com"] },
    ]);
    assert.deepEqual(parsed, {
      name: "Ada Lovelace",
      phone: "9876543210",
      email: "ada@example.com",
    });
  });

  it("returns empty strings for missing field_data", () => {
    assert.deepEqual(parseMetaFieldData(undefined), {
      name: "",
      phone: "",
      email: "",
    });
  });
});

describe("buildMetaIngestLog", () => {
  it("emits structured meta_ingest event fields", () => {
    assert.deepEqual(
      buildMetaIngestLog({
        entriesReceived: 3,
        leadsCreated: 1,
        duplicates: 1,
        failed: 1,
        durationMs: 42,
        requestId: "req-1",
      }),
      {
        event: "meta_ingest",
        entriesReceived: 3,
        leadsCreated: 1,
        duplicates: 1,
        failed: 1,
        durationMs: 42,
        requestId: "req-1",
      },
    );
  });
});

describe("Meta ingest idempotency gate", () => {
  it("prevents duplicate leadgen_id from creating two leads under concurrency", async () => {
    const db = createMockFirestore();
    const leadsCreated = [];

    const run = () =>
      simulateMetaLeadgenIngest(db, "lg-concurrent", async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        const leadId = `lead-${leadsCreated.length + 1}`;
        leadsCreated.push(leadId);
        return { leadWritten: true, leadId };
      });

    const [first, second] = await Promise.all([run(), run()]);

    const actions = [first.action, second.action].sort();
    assert.deepEqual(actions, ["created", "idempotent_skip"]);
    assert.equal(leadsCreated.length, 1);
    assert.equal(db._store.size, 1);
    assert.equal(db._store.get("ingestEvents/meta_leadgen_lg-concurrent").outcome, "created");
  });

  it("releases claim on transient failure so Meta can retry", async () => {
    const db = createMockFirestore();
    let attempts = 0;

    await assert.rejects(
      () =>
        simulateMetaLeadgenIngest(db, "lg-retry", async () => {
          attempts += 1;
          throw new Error("graph timeout");
        }),
      /graph timeout/,
    );
    assert.equal(attempts, 1);
    assert.equal(db._store.size, 0);

    const retry = await simulateMetaLeadgenIngest(db, "lg-retry", async () => ({
      leadWritten: true,
      leadId: "lead-retry",
    }));
    assert.deepEqual(retry, { action: "created", leadId: "lead-retry" });
    assert.equal(db._store.size, 1);
  });
});
