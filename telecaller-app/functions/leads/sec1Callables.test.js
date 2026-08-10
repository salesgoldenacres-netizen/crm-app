const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  handleFindLeadsByPhone,
  handleGetLeadPipelineCounts,
  leadVisibleToCaller,
} = require('./sec1Callables');

function mockDb({ leads = [], countByQuery = () => 0 } = {}) {
  const leadDocs = leads.map((row) => ({
    id: row.id,
    data: () => ({ ...row.data }),
  }));

  return {
    collection(name) {
      if (name !== 'leads') throw new Error(`unexpected collection ${name}`);
      return {
        where(field, _op, value) {
          const filters = [[field, value]];
          const chain = {
            where(f, _o, v) {
              filters.push([f, v]);
              return chain;
            },
            limit(n) {
              return {
                async get() {
                  const matched = leadDocs.filter((doc) => {
                    const data = doc.data();
                    return filters.every(([f, v]) => data[f] === v);
                  });
                  return {
                    forEach(fn) {
                      matched.slice(0, n).forEach(fn);
                    },
                  };
                },
              };
            },
            count() {
              return {
                async get() {
                  const matched = leadDocs.filter((doc) => {
                    const data = doc.data();
                    return filters.every(([f, v]) => data[f] === v);
                  });
                  return { data: () => ({ count: countByQuery(filters, matched.length) }) };
                },
              };
            },
          };
          return chain;
        },
      };
    },
  };
}

describe('sec1Callables — leadVisibleToCaller', () => {
  it('allows managerial visibility', () => {
    assert.equal(
      leadVisibleToCaller({ assignedToUid: 'other', assignedTo: 'u2' }, 'agent-1', true),
      true,
    );
  });

  it('allows agent own assignedToUid', () => {
    assert.equal(
      leadVisibleToCaller({ assignedToUid: 'agent-1', assignedTo: 'doc-1' }, 'agent-1', false),
      true,
    );
  });

  it('allows agent unassigned leads', () => {
    assert.equal(
      leadVisibleToCaller({ assignedTo: '', assignedToUid: '' }, 'agent-1', false),
      true,
    );
  });

  it('denies cross-owner leads for agents', () => {
    assert.equal(
      leadVisibleToCaller({ assignedToUid: 'other', assignedTo: 'doc-2' }, 'agent-1', false),
      false,
    );
  });
});

describe('sec1Callables — findLeadsByPhone', () => {
  it('filters out other agents leads', async () => {
    const db = mockDb({
      leads: [
        { id: 'l1', data: { phone: '999', assignedToUid: 'agent-1', assignedTo: 'a1' } },
        { id: 'l2', data: { phone: '999', assignedToUid: 'agent-2', assignedTo: 'a2' } },
      ],
    });

    const res = await handleFindLeadsByPhone(
      { auth: { uid: 'agent-1', token: {} }, data: { phone: '999', max: 10 } },
      db,
    );

    assert.equal(res.leads.length, 1);
    assert.equal(res.leads[0].id, 'l1');
  });
});

describe('sec1Callables — getLeadPipelineCounts', () => {
  it('scopes agent counts to assignedToUid', async () => {
    const db = mockDb({
      leads: [
        { id: 'l1', data: { status: 'new', assignedToUid: 'agent-1', projectId: 'p1' } },
        { id: 'l2', data: { status: 'new', assignedToUid: 'agent-2', projectId: 'p1' } },
        { id: 'l3', data: { status: 'contacted', assignedToUid: 'agent-1', projectId: 'p1' } },
      ],
      countByQuery: (_filters, matchedLen) => matchedLen,
    });

    const res = await handleGetLeadPipelineCounts(
      { auth: { uid: 'agent-1', token: {} }, data: { projectId: 'p1' } },
      db,
    );

    assert.equal(res.newCount, 1);
    assert.equal(res.contactedCount, 1);
    assert.equal(res.totalCount, 2);
  });
});
