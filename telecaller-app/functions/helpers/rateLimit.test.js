const test = require('node:test');
const assert = require('node:assert/strict');
const { createRateLimiter, clientKeyFromRequest } = require('./rateLimit');

function mockReqRes(key) {
  const req = { headers: { 'x-forwarded-for': key }, ip: key };
  const res = {
    statusCode: null,
    body: null,
    headers: {},
    set(k, v) {
      this.headers[k] = v;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
  };
  return { req, res };
}

test('createRateLimiter allows up to max then rejects with 429', () => {
  const limiter = createRateLimiter({ windowMs: 10_000, max: 3 });
  let allowed = 0;
  for (let i = 0; i < 3; i++) {
    const { req, res } = mockReqRes('1.1.1.1');
    limiter(req, res, () => {
      allowed += 1;
    });
    assert.equal(res.statusCode, null);
  }
  assert.equal(allowed, 3);

  const { req, res } = mockReqRes('1.1.1.1');
  let nextCalled = false;
  limiter(req, res, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 429);
  assert.ok(res.headers['Retry-After']);
});

test('createRateLimiter isolates counts per key', () => {
  const limiter = createRateLimiter({ windowMs: 10_000, max: 1 });
  const a = mockReqRes('a');
  const b = mockReqRes('b');
  let aOk = false;
  let bOk = false;
  limiter(a.req, a.res, () => {
    aOk = true;
  });
  limiter(b.req, b.res, () => {
    bOk = true;
  });
  assert.equal(aOk, true);
  assert.equal(bOk, true);
});

test('clientKeyFromRequest prefers first x-forwarded-for hop', () => {
  assert.equal(
    clientKeyFromRequest({ headers: { 'x-forwarded-for': '9.9.9.9, 10.0.0.1' } }),
    '9.9.9.9',
  );
  assert.equal(
    clientKeyFromRequest({ headers: {}, ip: '2.2.2.2' }),
    '2.2.2.2',
  );
});
