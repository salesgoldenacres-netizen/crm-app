const test = require("node:test");
const assert = require("node:assert/strict");
const { buildBulkImportLog, processBulkImportChunk, runBulkImport } = require("./bulkImport");

test("buildBulkImportLog emits structured bulk_import fields", () => {
  assert.deepEqual(
    buildBulkImportLog({
      received: 10,
      created: 7,
      duplicates: 2,
      failed: 1,
      durationMs: 123,
      chunkSize: 200,
      chunks: 1,
    }),
    {
      event: "bulk_import",
      received: 10,
      created: 7,
      duplicates: 2,
      failed: 1,
      durationMs: 123,
      chunkSize: 200,
      chunks: 1,
    },
  );
});

function makeFakeDb(existingByPhone = {}) {
  const created = [];
  return {
    created,
    collection(name) {
      if (name === "leads") {
        return {
          where(field, _op, value) {
            assert.equal(field, "phone");
            return {
              limit() {
                return {
                  async get() {
                    const hit = existingByPhone[value];
                    if (!hit) return { empty: true, docs: [] };
                    return {
                      empty: false,
                      docs: [
                        {
                          id: hit.id,
                          data: () => hit.data,
                        },
                      ],
                    };
                  },
                };
              },
            };
          },
          doc(id) {
            const docId = id || `auto_${created.length + 1}`;
            const ref = {
              id: docId,
              path: `leads/${docId}`,
            };
            return ref;
          },
        };
      }
      throw new Error(`unexpected collection ${name}`);
    },
    batch() {
      /** @type {Array<{ ref: { id: string }, data: object }>} */
      const ops = [];
      return {
        set(ref, data) {
          ops.push({ ref, data });
        },
        async commit() {
          for (const op of ops) {
            created.push(op);
            existingByPhone[op.data.phone] = { id: op.ref.id, data: op.data };
          }
        },
      };
    },
  };
}

test("processBulkImportChunk creates, merges, and reports failures by index", async () => {
  const db = makeFakeDb({
    "+919999999999": { id: "existing1", data: { status: "new", phone: "+919999999999" } },
  });
  const callLogs = [];
  const notifications = [];

  const cleanLeadData = ({ name, email, phone }) => ({
    name: name || "",
    email: email || "",
    phone: phone || "",
  });

  const { created, duplicates, failed, rowResults } = await processBulkImportChunk(
    {
      db,
      appendCallLog: async (_db, leadId, entry) => {
        callLogs.push({ leadId, entry });
        return `log_${callLogs.length}`;
      },
      publishNotification: async (_db, _sendFcm, payload) => {
        notifications.push(payload);
      },
      sendFcm: async () => {},
      cleanLeadData,
      settings: { duplicateHandlingRule: "merge" },
    },
    [
      { index: 0, lead: { name: "A", phone: "+911111111111", assignedTo: "agent1" } },
      { index: 1, lead: { name: "B", phone: "+919999999999", notes: "dup" } },
      { index: 2, lead: { name: "C", phone: "+" } },
    ],
  );

  assert.equal(created, 1);
  assert.equal(duplicates, 1);
  assert.equal(failed, 1);
  assert.equal(db.created.length, 1);
  assert.equal(callLogs.length, 2);
  assert.equal(notifications.length, 1);
  assert.equal(rowResults.find((r) => r.index === 2).action, "failed");
  assert.equal(rowResults.find((r) => r.index === 1).action, "merged");
  assert.equal(rowResults.find((r) => r.index === 0).action, "created");
});

test("runBulkImport chunks and aggregates failures for retry", async () => {
  const db = makeFakeDb();
  const cleanLeadData = ({ name, email, phone }) => ({
    name: name || "",
    email: email || "",
    phone: phone || "",
  });

  const leads = Array.from({ length: 5 }, (_, i) => ({
    name: `L${i}`,
    phone: i === 3 ? "+" : `+91000000000${i}`,
  }));

  const { summary, failures } = await runBulkImport(
    {
      db,
      appendCallLog: async () => "log",
      publishNotification: async () => {},
      sendFcm: async () => {},
      cleanLeadData,
      settings: { duplicateHandlingRule: "merge" },
    },
    leads,
    { chunkSize: 100 },
  );

  assert.equal(summary.received, 5);
  assert.equal(summary.created, 4);
  assert.equal(summary.failed, 1);
  assert.equal(summary.chunkSize, 100);
  assert.equal(failures.length, 1);
  assert.equal(failures[0].index, 3);
});
