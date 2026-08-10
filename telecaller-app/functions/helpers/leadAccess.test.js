const test = require('node:test');
const assert = require('node:assert/strict');
const {
  tokenIsManagerial,
  collectCallerLeadIds,
  callerOwnsLead,
  assertCallerCanContactLead,
} = require('./leadAccess');

test('tokenIsManagerial only true for exact managerial claim', () => {
  assert.equal(tokenIsManagerial({ token: { managerial: true } }), true);
  assert.equal(tokenIsManagerial({ token: { managerial: 'true' } }), false);
  assert.equal(tokenIsManagerial({ token: {} }), false);
  assert.equal(tokenIsManagerial(null), false);
});

test('collectCallerLeadIds gathers uid, doc id and doc uid field', () => {
  const agentDoc = { id: 'doc-123', data: () => ({ uid: 'auth-abc' }) };
  const ids = collectCallerLeadIds({ uid: 'auth-abc' }, agentDoc);
  assert.equal(ids.has('auth-abc'), true);
  assert.equal(ids.has('doc-123'), true);
});

test('callerOwnsLead matches only on a present assignedTo', () => {
  const ids = new Set(['auth-abc', 'doc-123']);
  assert.equal(callerOwnsLead({ assignedTo: 'doc-123' }, ids), true);
  assert.equal(callerOwnsLead({ assignedTo: 'someone-else' }, ids), false);
  assert.equal(callerOwnsLead({ assignedTo: '' }, ids), false);
  assert.equal(callerOwnsLead({}, ids), false);
});

test('assertCallerCanContactLead allows managers for any lead', async () => {
  await assertCallerCanContactLead({
    auth: { uid: 'mgr', token: { managerial: true } },
    lead: { assignedTo: 'someone-else' },
  });
});

test('assertCallerCanContactLead allows the assigned agent', async () => {
  const agentDoc = { id: 'doc-1', data: () => ({ uid: 'auth-1' }) };
  await assertCallerCanContactLead({
    auth: { uid: 'auth-1', token: {} },
    lead: { assignedTo: 'doc-1' },
    agentDoc,
  });
});

test('assertCallerCanContactLead denies an unrelated agent', async () => {
  const agentDoc = { id: 'doc-1', data: () => ({ uid: 'auth-1' }) };
  await assert.rejects(
    () =>
      assertCallerCanContactLead({
        auth: { uid: 'auth-1', token: {} },
        lead: { assignedTo: 'doc-999' },
        agentDoc,
      }),
    /permission/i,
  );
});

test('assertCallerCanContactLead resolves doc id from db when not provided', async () => {
  const db = {
    collection() {
      return {
        where() {
          return {
            limit() {
              return {
                async get() {
                  return {
                    empty: false,
                    docs: [{ id: 'doc-77', data: () => ({ uid: 'auth-x' }) }],
                  };
                },
              };
            },
          };
        },
      };
    },
  };
  await assertCallerCanContactLead({
    db,
    auth: { uid: 'auth-x', token: {} },
    lead: { assignedTo: 'doc-77' },
  });
});

test('assertCallerCanContactLead requires auth', async () => {
  await assert.rejects(
    () => assertCallerCanContactLead({ auth: null, lead: { assignedTo: 'x' } }),
    /sign in/i,
  );
});
