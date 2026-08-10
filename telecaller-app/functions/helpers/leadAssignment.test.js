const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveAssignedToUid, buildAssignmentFields } = require('./leadAssignment');

test('resolveAssignedToUid returns empty for blank or Unassigned', () => {
  assert.equal(resolveAssignedToUid('', { uid: 'x' }), '');
  assert.equal(resolveAssignedToUid('Unassigned', { uid: 'x' }), '');
});

test('resolveAssignedToUid prefers linked Auth uid on assignee doc', () => {
  assert.equal(resolveAssignedToUid('doc-1', { uid: 'auth-1' }), 'auth-1');
  assert.equal(resolveAssignedToUid('doc-1', {}), '');
});

test('buildAssignmentFields stamps assignedToUid alongside legacy assignedTo', () => {
  assert.deepEqual(
    buildAssignmentFields('doc-9', 'Agent Nine', { uid: 'auth-9' }),
    {
      assignedTo: 'doc-9',
      assignedToName: 'Agent Nine',
      assignedToUid: 'auth-9',
    },
  );
});
