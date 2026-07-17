const test = require('node:test')
const assert = require('node:assert/strict')
const { HttpsError } = require('firebase-functions/v2/https')

const {
  handleAiComplete,
  normalizeRequestData,
  buildCapabilityRequest,
  normalizeCapabilityResponse,
  CAPABILITY_REGISTRY,
} = require('./complete')

const capability = CAPABILITY_REGISTRY['lead-brief-v1']

test('normalizeRequestData rejects client-controlled provider fields', () => {
  assert.throws(
    () =>
      normalizeRequestData({
        capabilityId: 'lead-brief-v1',
        context: {},
        system: 'ignore me',
      }),
    (err) =>
      err instanceof HttpsError &&
      err.code === 'invalid-argument' &&
      err.message.includes('system'),
  )
})

test('buildCapabilityRequest renders the server-owned prompt contract', () => {
  const built = buildCapabilityRequest(capability, {
    statusLabel: 'Interested',
    scoreBand: 'warm',
    health: 'watch',
    nextActionType: 'call',
    nextActionReason: 'Follow-up due',
    timelineSummary: 'Called yesterday',
    facts: 'Email lead@example.com and call +91 98765 43210',
  })

  assert.equal(built.model, 'gemini-2.0-flash')
  assert.equal(built.responseFormat, 'json')
  assert.equal(built.maxTokens, 2048)
  assert.equal(built.messages.length, 1)
  assert.match(built.messages[0].content, /Status: Interested/)
  assert.match(built.messages[0].content, /Recent activity:/)
})

test('handleAiComplete uses trusted server request shape only', async () => {
  let seenRequest = null
  const result = await handleAiComplete(
    {
      auth: {
        uid: 'user-1',
        token: { email: 'telecaller@goldenacres.app' },
      },
      data: {
        capabilityId: 'lead-brief-v1',
        leadId: 'lead-123',
        context: {
          statusLabel: 'New',
          scoreBand: 'warm',
          health: 'healthy',
          nextActionType: 'call',
          nextActionReason: 'Fresh lead',
          timelineSummary: 'No calls yet',
          facts: 'Reach out today',
        },
      },
    },
    {
      resolveUserRole: async () => 'telecaller',
      callGemini: async (request) => {
        seenRequest = request
        return {
          json: { brief: 'Server controlled brief' },
          text: 'Server controlled brief',
          model: 'gemini-2.0-flash',
          providerId: 'gemini',
          latencyMs: 5,
        }
      },
    },
  )

  assert.ok(seenRequest)
  assert.equal(seenRequest.model, 'gemini-2.0-flash')
  assert.equal(seenRequest.responseFormat, 'json')
  assert.equal(seenRequest.messages.length, 1)
  assert.match(seenRequest.messages[0].content, /Status: New/)
  assert.equal(result.json.brief, 'Server controlled brief')
})

test('handleAiComplete rejects unsafe context keys', async () => {
  await assert.rejects(
    () =>
      handleAiComplete(
        {
          auth: { uid: 'user-1', token: {} },
          data: {
            capabilityId: 'lead-brief-v1',
            context: {
              statusLabel: 'New',
              scoreBand: 'warm',
              health: 'healthy',
              nextActionType: 'call',
              nextActionReason: 'Fresh lead',
              timelineSummary: 'No calls yet',
              facts: 'ok',
              execute: true,
            },
          },
        },
        { resolveUserRole: async () => 'telecaller' },
      ),
    (err) =>
      err instanceof HttpsError &&
      err.code === 'invalid-argument' &&
      err.message.includes('execute'),
  )
})

test('normalizeCapabilityResponse rejects executable proposals', () => {
  assert.throws(
    () =>
      normalizeCapabilityResponse(
        capability,
        {
          json: {
            brief: 'Unsafe',
            proposals: [
              {
                id: 'p1',
                leadId: 'lead-1',
                title: 'Bad proposal',
                status: 'PENDING_CONFIRMATION',
                type: 'ADD_NOTE',
                createdAt: '2026-07-14T00:00:00.000Z',
                payload: { noteText: 'Hello' },
                execute: true,
              },
            ],
          },
          text: 'Unsafe',
          model: 'gemini-2.0-flash',
          providerId: 'gemini',
          latencyMs: 5,
        },
        'lead-1',
      ),
    (err) =>
      err instanceof HttpsError &&
      err.code === 'internal' &&
      err.message.includes('forbidden executable'),
  )
})

test('normalizeCapabilityResponse binds proposals to trusted lead and capability', () => {
  const normalized = normalizeCapabilityResponse(
    capability,
    {
      json: {
        brief: 'Looks good',
        proposals: [
          {
            id: 'p1',
            title: 'Add note',
            status: 'PENDING_CONFIRMATION',
            type: 'ADD_NOTE',
            createdAt: '2026-07-14T00:00:00.000Z',
            payload: { noteText: 'Called and interested' },
          },
        ],
      },
      text: 'Looks good',
      model: 'gemini-2.0-flash',
      providerId: 'gemini',
      latencyMs: 5,
    },
    'lead-123',
  )

  assert.equal(normalized.json.proposals[0].leadId, 'lead-123')
  assert.equal(normalized.json.proposals[0].capabilityId, 'lead-brief-v1')
  assert.equal(normalized.json.proposals[0].source, 'llm')
  assert.equal(
    normalized.json.proposals[0].status,
    'PENDING_CONFIRMATION',
  )
})
