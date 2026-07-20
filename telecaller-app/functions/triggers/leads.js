const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const { generateUlid } = require('../helpers/ulid');
const { determineAllocation } = require('../leads/allocation');
const { publishNotification } = require('../notifications/publishNotification');
const { sendFcm } = require('../services/fcm');

const onLeadCreated = onDocumentCreated(
  { document: 'leads/{leadId}', region: 'us-central1' },
  async (event) => {
    const db = admin.firestore();
    const lead = event.data.data();
    if (!lead) return;

    // --- (a) Stateless time-sortable leadReference assignment (no write hotspot) ---
    let assignedLeadReference = lead.leadReference || '';
    if (!assignedLeadReference) {
      assignedLeadReference = generateUlid();
    }

    // --- (b) Auto round-robin assignment ---
    let assignedTo = lead.assignedTo;
    let assignedToName = lead.assignedToName;

    if (!assignedTo || assignedTo === 'Unassigned') {
      const alloc = await determineAllocation(db);
      if (alloc.assignedTo) {
        assignedTo = alloc.assignedTo;
        assignedToName = alloc.assignedToName;
      }
    }

    // Consolidate all patches into a single write
    const patches = {};
    if (assignedLeadReference !== (lead.leadReference || '')) {
      patches.leadReference = assignedLeadReference;
    }
    if (assignedTo !== lead.assignedTo) {
      patches.assignedTo = assignedTo;
      patches.assignedToName = assignedToName;
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
