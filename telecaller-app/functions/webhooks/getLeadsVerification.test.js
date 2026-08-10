const test = require('node:test');
const assert = require('node:assert/strict');

/** Minimal firebase-admin stub so controller module loads in node:test. */
const adminPath = require.resolve('firebase-admin');
require.cache[adminPath] = {
  id: adminPath,
  filename: adminPath,
  loaded: true,
  exports: {
    firestore: () => ({
      doc: () => ({
        get: async () => ({ exists: false, data: () => ({}) }),
      }),
    }),
  },
};

const { handleGetLeads } = require('../controllers/webhooks');

function mockRes() {
  const state = { statusCode: null, body: null };
  return {
    status(code) {
      state.statusCode = code;
      return this;
    },
    send(body) {
      state.body = body;
      return this;
    },
    _state: state,
  };
}

test('handleGetLeads returns challenge when Meta verify token matches', async () => {
  const prev = process.env.META_VERIFY_TOKEN;
  process.env.META_VERIFY_TOKEN = 'verify-token-123';

  try {
    const res = mockRes();
    await handleGetLeads(
      {
        query: {
          'hub.mode': 'subscribe',
          'hub.verify_token': 'verify-token-123',
          'hub.challenge': 'challenge-42',
        },
      },
      res,
    );

    assert.equal(res._state.statusCode, 200);
    assert.equal(res._state.body, 'challenge-42');
  } finally {
    if (prev === undefined) delete process.env.META_VERIFY_TOKEN;
    else process.env.META_VERIFY_TOKEN = prev;
  }
});

test('handleGetLeads rejects invalid verify token (fail-closed)', async () => {
  const prev = process.env.META_VERIFY_TOKEN;
  process.env.META_VERIFY_TOKEN = 'expected-token';

  try {
    const res = mockRes();
    await handleGetLeads(
      {
        query: {
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong-token',
          'hub.challenge': 'challenge-99',
        },
      },
      res,
    );

    assert.equal(res._state.statusCode, 401);
    assert.equal(res._state.body, 'Unauthorized');
  } finally {
    if (prev === undefined) delete process.env.META_VERIFY_TOKEN;
    else process.env.META_VERIFY_TOKEN = prev;
  }
});

test('handleGetLeads rejects non-subscribe mode', async () => {
  const prev = process.env.META_VERIFY_TOKEN;
  process.env.META_VERIFY_TOKEN = 'verify-token-123';

  try {
    const res = mockRes();
    await handleGetLeads(
      {
        query: {
          'hub.mode': 'unsubscribe',
          'hub.verify_token': 'verify-token-123',
          'hub.challenge': 'challenge-42',
        },
      },
      res,
    );

    assert.equal(res._state.statusCode, 401);
  } finally {
    if (prev === undefined) delete process.env.META_VERIFY_TOKEN;
    else process.env.META_VERIFY_TOKEN = prev;
  }
});
