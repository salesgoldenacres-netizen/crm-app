/**
 * SEC-1: denormalize Auth uid for future Firestore read rules (`assignedToUid`).
 * `assignedTo` remains the users/{docId} key for legacy queries and ownership checks.
 */

/**
 * @param {string|undefined|null} assignedTo
 * @param {{ uid?: string }|null|undefined} assigneeDoc
 * @returns {string}
 */
function resolveAssignedToUid(assignedTo, assigneeDoc) {
  if (!assignedTo || assignedTo === 'Unassigned') return '';
  if (assigneeDoc && typeof assigneeDoc.uid === 'string' && assigneeDoc.uid) {
    return assigneeDoc.uid;
  }
  return '';
}

/**
 * @param {string} assignedTo
 * @param {string} assignedToName
 * @param {{ uid?: string }|null|undefined} assigneeDoc
 */
function buildAssignmentFields(assignedTo, assignedToName, assigneeDoc) {
  return {
    assignedTo: assignedTo || '',
    assignedToName: assignedToName || 'Unassigned',
    assignedToUid: resolveAssignedToUid(assignedTo, assigneeDoc),
  };
}

module.exports = {
  resolveAssignedToUid,
  buildAssignmentFields,
};
