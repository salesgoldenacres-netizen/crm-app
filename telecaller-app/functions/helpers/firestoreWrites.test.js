const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  isAlreadyExistsError,
  claimIngestEvent,
  updateIngestEvent,
  releaseIngestEvent,
} = require("./firestoreWrites");

/** @returns {Map<string, Record<string, unknown>>} */
function createDocStore() {
  return new Map();
}

/**
 * Minimal Firestore mock supporting create/get/update/delete for ingestEvents.
 * @param {Map<string, Record<string, unknown>>} [store]
 */
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
            async get() {
              const data = store.get(key);
              return {
                exists: Boolean(data),
                data: () => data,
              };
            },
            async update(fields) {
              if (!store.has(key)) {
                throw new Error("Document not found");
              }
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

describe("isAlreadyExistsError", () => {
  it("recognizes Firestore already-exists codes", () => {
    assert.equal(isAlreadyExistsError({ code: 6 }), true);
    assert.equal(isAlreadyExistsError({ code: "already-exists" }), true);
    assert.equal(isAlreadyExistsError({ code: "ALREADY_EXISTS" }), true);
    assert.equal(isAlreadyExistsError({ code: "not-found" }), false);
  });
});

describe("claimIngestEvent", () => {
  it("creates on first claim and rejects duplicate", async () => {
    const db = createMockFirestore();
    const first = await claimIngestEvent(db, "meta_leadgen_lg-1", {
      type: "meta_leadgen",
      leadgenId: "lg-1",
      status: "processing",
    });
    const second = await claimIngestEvent(db, "meta_leadgen_lg-1", {
      type: "meta_leadgen",
      leadgenId: "lg-1",
      status: "processing",
    });

    assert.deepEqual(first, { created: true });
    assert.deepEqual(second, { created: false });
    assert.equal(db._store.size, 1);
  });

  it("allows only one winner under concurrent claims", async () => {
    const db = createMockFirestore();
    const eventId = "meta_leadgen_lg-race";
    const payload = {
      type: "meta_leadgen",
      leadgenId: "lg-race",
      status: "processing",
    };

    const results = await Promise.all(
      Array.from({ length: 8 }, () => claimIngestEvent(db, eventId, payload)),
    );

    const winners = results.filter((r) => r.created);
    assert.equal(winners.length, 1);
    assert.equal(results.filter((r) => !r.created).length, 7);
    assert.equal(db._store.size, 1);
  });
});

describe("updateIngestEvent", () => {
  it("finalizes a claimed event", async () => {
    const db = createMockFirestore();
    await claimIngestEvent(db, "meta_leadgen_lg-2", {
      type: "meta_leadgen",
      leadgenId: "lg-2",
      status: "processing",
    });

    await updateIngestEvent(db, "meta_leadgen_lg-2", {
      status: "completed",
      outcome: "created",
      leadId: "lead-99",
    });

    const doc = db._store.get("ingestEvents/meta_leadgen_lg-2");
    assert.equal(doc.status, "completed");
    assert.equal(doc.outcome, "created");
    assert.equal(doc.leadId, "lead-99");
    assert.ok(doc.updatedAt);
  });
});

describe("releaseIngestEvent", () => {
  it("deletes claim so a retriable failure can be reprocessed", async () => {
    const db = createMockFirestore();
    await claimIngestEvent(db, "meta_leadgen_lg-3", {
      type: "meta_leadgen",
      leadgenId: "lg-3",
      status: "processing",
    });

    await releaseIngestEvent(db, "meta_leadgen_lg-3");
    assert.equal(db._store.size, 0);

    const retry = await claimIngestEvent(db, "meta_leadgen_lg-3", {
      type: "meta_leadgen",
      leadgenId: "lg-3",
      status: "processing",
    });
    assert.deepEqual(retry, { created: true });
  });
});
