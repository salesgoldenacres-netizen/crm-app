const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const { generateUlid } = require('../helpers/ulid');
const { determineAllocation } = require('../leads/allocation');
const { buildLeadCreatePatches } = require('../leads/leadCreatePatches');
const { resolveAssignedToUid } = require('../helpers/leadAssignment');
const { publishNotification } = require('../notifications/publishNotification');
const { sendFcm } = require('../services/fcm');

const onLeadCreated = onDocumentCreated(
  { document: 'leads/{leadId}', region: 'us-central1' },
  async (event) => {
    const db = admin.firestore();
    const lead = event.data.data();
    if (!lead) return;

    // --- (a) Stateless time-sortable leadReference assignment (no write hotspot) ---
    // ULID generation is impure, so resolve it here (only when missing).
    const leadReference = lead.leadReference || generateUlid();

    // --- (b) Auto round-robin assignment (transactional I/O stays in the trigger) ---
    let allocation = null;
    if (!lead.assignedTo || lead.assignedTo === 'Unassigned') {
      allocation = await determineAllocation(db);
    }

    // Pure decision: consolidate reference + assignment into a single write.
    const { patches, assignedTo } = buildLeadCreatePatches({
      lead,
      leadReference,
      allocation,
    });

    // SEC-1 increment: backfill assignedToUid when assignee is known but uid missing.
    const effectiveAssignee = assignedTo || lead.assignedTo;
    if (
      effectiveAssignee &&
      effectiveAssignee !== 'Unassigned' &&
      !lead.assignedToUid &&
      !patches.assignedToUid
    ) {
      try {
        const userSnap = await db.collection('users').doc(effectiveAssignee).get();
        if (userSnap.exists) {
          const uid = resolveAssignedToUid(effectiveAssignee, userSnap.data());
          if (uid) patches.assignedToUid = uid;
        }
      } catch (err) {
        console.error('[onLeadCreated] assignedToUid backfill failed:', err.message || err);
      }
    }

    if (Object.keys(patches).length > 0) {
      patches.updatedAt = new Date().toISOString();
      await event.data.ref.update(patches);
    }

    // --- (c) In-app + FCM via shared notification helper ---
    if (assignedTo) {
      await publishNotification(db, sendFcm, {
        userId: assignedTo,
        title: '📥 New Lead Assigned',
        body: `${lead.name} has been assigned to you.`,
        message: `📥 New Lead Assigned: ${lead.name}`,
        type: 'lead_assigned',
        leadId: event.params.leadId,
        sendPush: true,
        data: {
          leadId: event.params.leadId,
          type: 'lead_assigned',
        },
      });
    }
  }
);

const onLeadCallLogUpdated = onDocumentUpdated(
  { document: 'leads/{leadId}', region: 'us-central1' },
  async () => null,
);

module.exports = {
  onLeadCreated,
  onLeadCallLogUpdated,
};
