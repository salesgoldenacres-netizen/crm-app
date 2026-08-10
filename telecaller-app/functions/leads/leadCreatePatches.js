/**
 * Pure decision logic for the onLeadCreated trigger.
 *
 * Kept free of Firebase/admin imports so the write-consolidation contract
 * (leadReference backfill + round-robin assignment) is unit-testable without an
 * emulator. The trigger owns the impure parts: ULID generation, the allocation
 * transaction, `updatedAt` stamping, and the Firestore write itself.
 */

/**
 * Compute the minimal patch set to apply to a freshly created lead, plus the
 * effective assignment used for notification routing.
 *
 * @param {object} input
 * @param {object|null|undefined} input.lead - The created lead document data.
 * @param {string} input.leadReference - Resolved reference (existing or newly generated ULID).
 * @param {{ assignedTo?: string, assignedToName?: string }|null} [input.allocation]
 *   - Round-robin allocation result, or null when allocation was not run
 *     (lead already had an explicit assignee).
 * @returns {{ patches: Record<string, unknown>, assignedTo: string|undefined, assignedToName: string|undefined, assignedToUid: string|undefined }}
 */
function buildLeadCreatePatches({ lead, leadReference, allocation }) {
  const source = lead || {};
  const currentReference = source.leadReference || "";
  // Never clear an existing reference; fall back to it if none was resolved.
  const resolvedReference = leadReference || currentReference;

  let assignedTo = source.assignedTo;
  let assignedToName = source.assignedToName;
  let assignedToUid = source.assignedToUid || "";

  const isUnassigned = !assignedTo || assignedTo === "Unassigned";
  if (isUnassigned && allocation && allocation.assignedTo) {
    assignedTo = allocation.assignedTo;
    assignedToName = allocation.assignedToName;
    assignedToUid = allocation.assignedToUid || "";
  }

  const patches = {};
  if (resolvedReference !== currentReference) {
    patches.leadReference = resolvedReference;
  }
  if (assignedTo !== source.assignedTo) {
    patches.assignedTo = assignedTo;
    patches.assignedToName = assignedToName;
    patches.assignedToUid = assignedToUid;
  } else if (assignedTo && assignedToUid && assignedToUid !== source.assignedToUid) {
    patches.assignedToUid = assignedToUid;
  }

  return { patches, assignedTo, assignedToName, assignedToUid: assignedToUid || undefined };
}

module.exports = {
  buildLeadCreatePatches,
};
