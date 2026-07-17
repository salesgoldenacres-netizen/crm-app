const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated, onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const express = require('express');
const axios = require('axios');
const {
  createMessagingProvider,
  NotConnectedError,
  UnsupportedCapabilityError,
  webhookUrlForProject,
} = require('./messaging');
const { publishNotification } = require('./notifications/publishNotification');
const {
  getIstDateString,
  createScheduledJob,
  AUTOMATION_JOB_TYPES,
  registerSiteVisitJobs,
  registerSlaBreachJobs,
} = require('./automation');
const {
  runSameDayFollowUpReminders,
  runOverdueFollowUpReminders,
} = require('./jobs/followUpReminders');
const { handleAiComplete } = require('./ai/complete');
const {
  loadIntegrationSettings,
  assertWebhookSecret,
  isSecretConfigured,
  resolveWhatsAppWebhookSecret,
  normalizePresentedSecret,
} = require('./webhooks/secrets');
const {
  handleSetManagerialClaim,
  handleLinkUserProfile,
} = require('./auth/claims');

admin.initializeApp();
const db = admin.firestore();
const messagingProvider = createMessagingProvider(db);

const app = express();
app.use(express.json());

// Integration settings — secrets fail closed (no hardcoded defaults).
async function getIntegrationSettings() {
  return loadIntegrationSettings(db);
}

// Helper function to clean and normalize inbound lead data
function cleanLeadData(data) {
  let name = data.name || '';
  name = name.trim().replace(/\s+/g, ' ');
  name = name.split(' ').map(word => {
    if (!word) return '';
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
  if (!name) name = 'Unknown Customer';

  let email = data.email || '';
  email = email.trim().toLowerCase();

  let phone = data.phone || '';
  let cleanedPhone = phone.replace(/[^0-9]/g, '');
  
  if (cleanedPhone.length === 11 && cleanedPhone.startsWith('0')) {
    cleanedPhone = '+91' + cleanedPhone.slice(1);
  } else if (cleanedPhone.length === 10) {
    cleanedPhone = '+91' + cleanedPhone;
  } else if (cleanedPhone.length === 12 && cleanedPhone.startsWith('91')) {
    cleanedPhone = '+' + cleanedPhone;
  } else if (cleanedPhone.length > 0 && !cleanedPhone.startsWith('+')) {
    cleanedPhone = '+' + cleanedPhone;
  }
  
  return { name, email, phone: cleanedPhone };
}

// Helper to determine round-robin telecaller allocation
async function determineAllocation() {
  let assignedTo = '';
  let assignedToName = 'Unassigned';

  try {
    const routingSnap = await db.doc('settings/routing').get();
    const routingSettings = routingSnap.exists ? routingSnap.data() : { enableRoundRobin: false, activeAgents: [] };

    if (routingSettings.enableRoundRobin) {
      const usersSnap = await db.collection('users').get();
      const telecallers = [];
      usersSnap.forEach(d => {
        const u = d.data();
        if (u.role === 'telecaller') {
          telecallers.push(u);
        }
      });

      const pool = (routingSettings.activeAgents && routingSettings.activeAgents.length > 0)
        ? telecallers.filter(tc => routingSettings.activeAgents.includes(tc.id))
        : telecallers;

      if (pool.length > 0) {
        // Query active statuses from agentStatus collection
        const statusesSnap = await db.collection('agentStatus').get();
        const activeAgentIds = new Set();
        statusesSnap.forEach(d => {
          const s = d.data();
          if (s.status === 'available' || s.status === 'working_from_home') {
            activeAgentIds.add(d.id);
          }
        });

        // Filter pool to only include active/WFH agents
        const activePool = pool.filter(tc => activeAgentIds.has(tc.id));

        if (activePool.length > 0) {
          const lastLeadSnap = await db.collection('leads').orderBy('createdAt', 'desc').limit(1).get();
          let lastAgentId = '';
          if (!lastLeadSnap.empty) {
            lastAgentId = lastLeadSnap.docs[0].data().assignedTo || '';
          }

          const lastIndex = activePool.findIndex(tc => tc.id === lastAgentId);
          const nextIndex = (lastIndex + 1) % activePool.length;
          const targetAgent = activePool[nextIndex];
          assignedTo = targetAgent.id;
          assignedToName = targetAgent.username;
        } else {
          console.log("No active or WFH agents found in agentStatus. Lead will remain Unassigned.");
        }
      }
    }
  } catch (err) {
    console.error("Error determining round-robin allocation: ", err);
  }

  return { assignedTo, assignedToName };
}

// Helper to send FCM notification
async function sendFcm(userId, payload) {
  try {
    const userDoc = await db.doc(`users/${userId}`).get();
    if (!userDoc.exists) {
      console.warn(`User ${userId} not found in Firestore. Skipping FCM.`);
      return;
    }
    const userData = userDoc.data();
    const token = userData.fcmToken;
    if (!token) {
      console.log(`User ${userId} has no FCM token registered. Skipping FCM.`);
      return;
    }

    const message = {
      token: token,
      notification: payload.notification,
      data: payload.data || {}
    };

    const response = await admin.messaging().send(message);
    console.log(`Successfully sent FCM notification to user ${userId}:`, response);
  } catch (err) {
    console.error(`Error sending FCM notification to user ${userId}:`, err);
  }
}

// Handles verification (GET) and lead ingestion (POST)
const handleGetLeads = async (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const settings = await getIntegrationSettings();
  const authResult = assertWebhookSecret({
    presented: token,
    expected: settings.metaVerifyToken,
    context: 'meta_verify',
  });

  if (mode === 'subscribe' && authResult.ok) {
    console.log('Webhook subscription verified successfully.');
    return res.status(200).send(challenge);
  }

  console.warn('Webhook verification rejected (fail-closed).');
  return res.status(401).send('Unauthorized');
};

const handlePostLeads = async (req, res) => {
  try {
    const settings = await getIntegrationSettings();
    let name = '';
    let phone = '';
    let email = '';
    let notes = '';
    let isGoogle = false;

    const googleKey = req.body.google_key || req.query.google_key || req.body.googleKey;
    if (googleKey) {
      const googleAuth = assertWebhookSecret({
        presented: googleKey,
        expected: settings.googleWebhookKey,
        context: 'google_leads',
      });
      if (!googleAuth.ok) {
        return res.status(googleAuth.status).send(googleAuth.message);
      }

      name = req.body.name || req.body.FULL_NAME || req.body.full_name || 'Google Customer';
      phone = req.body.phone || req.body.PHONE_NUMBER || req.body.phone_number || '';
      email = req.body.email || req.body.EMAIL_ADDRESS || req.body.email_address || '';
      const campaignId = req.body.campaign_id || req.body.campaignId || 'Unknown';
      notes = `Google Ads Webhook Ingest. Campaign ID: ${campaignId}. Source: Google_Ads_Lead_Form`;
      isGoogle = true;

    } else if (req.body.object === 'page' && req.body.entry) {
      if (!isSecretConfigured(settings.metaAccessToken)) {
        console.warn('[webhook-auth] REJECTED meta_leads: access token not configured');
        return res.status(401).send('Unauthorized');
      }

      const entries = req.body.entry;
      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          if (change.field === 'leadgen') {
            const leadgenId = change.value.leadgen_id;
            const formId = change.value.form_id;

            const graphUrl = `https://graph.facebook.com/v18.0/${leadgenId}?access_token=${settings.metaAccessToken}`;
            const fbResponse = await axios.get(graphUrl);
            const fieldData = fbResponse.data.field_data || [];

            fieldData.forEach(field => {
              const fieldName = field.name;
              const values = field.values || [];
              const val = values[0] || '';

              if (/name/i.test(fieldName)) name = val;
              else if (/phone/i.test(fieldName)) phone = val;
              else if (/email/i.test(fieldName)) email = val;
            });

            if (!name) name = 'Meta Customer';
            notes = `Meta Webhook Ingest. Leadgen ID: ${leadgenId}. Form ID: ${formId}. Source: Meta_Lead_Ads`;
          }
        }
      }
    } else {
      const authHeader =
        req.headers['authorization'] ||
        req.headers['x-api-key'] ||
        req.query.api_key ||
        req.body.apiKey;
      const genericAuth = assertWebhookSecret({
        presented: authHeader,
        expected: settings.apiWebhookKey,
        context: 'generic_leads',
      });
      if (!genericAuth.ok) {
        return res.status(genericAuth.status).send(genericAuth.message);
      }

      name = req.body.name || req.body.full_name || 'Generic Webhook Lead';
      phone = req.body.phone || req.body.phone_number || '';
      email = req.body.email || '';
      notes = req.body.notes || 'Ingested via Generic API Webhook endpoint.';
    }

    const cleaned = cleanLeadData({ name, email, phone });
    name = cleaned.name;
    email = cleaned.email;
    phone = cleaned.phone;

    if (!phone || phone === '+') {
      console.warn('Webhook ingested lead has no valid phone number. Skipping.');
      return res.status(400).send('Phone number field is required.');
    }

    const duplicateRule = settings.duplicateHandlingRule || 'merge';
    let existingLead = null;

    if (duplicateRule !== 'create') {
      const existingLeadsSnap = await db.collection('leads')
        .where('phone', '==', phone)
        .limit(1)
        .get();

      if (!existingLeadsSnap.empty) {
        existingLead = existingLeadsSnap.docs[0].data();
      }
    }

    if (existingLead) {
      if (duplicateRule === 'skip') {
        console.log(`Duplicate lead found: ${phone}. Rule is set to 'skip'. Ingestion ignored.`);
        
        const auditId = 'audit-' + Date.now();
        await db.collection('auditLogs').doc(auditId).set({
          id: auditId,
          timestamp: new Date().toISOString(),
          action: isGoogle ? 'Duplicate Lead Skipped (Google Ads)' : 'Duplicate Lead Skipped (Meta/Generic)',
          details: `Customer: ${name}, Phone: ${phone} matched existing lead ID: ${existingLead.id}. Ingestion skipped.`,
          user: 'api_webhook'
        });

        return res.status(200).json({ success: true, leadId: existingLead.id, duplicate: true, action: 'skipped' });
      } else {
        // default: merge
        console.log(`Duplicate lead found: ${phone}. Rule is set to 'merge'. Merging notes into existing lead ID: ${existingLead.id}`);

        const updatedLogs = existingLead.callLogs || [];
        updatedLogs.push({
          date: new Date().toISOString(),
          note: `Duplicate lead attempt detected via Webhook Ingestion. Notes merged: ${notes}`,
          status: existingLead.status || 'new',
          agent: 'system'
        });

        await db.collection('leads').doc(existingLead.id).update({
          updatedAt: new Date().toISOString(),
          callLogs: updatedLogs
        });

        const auditId = 'audit-' + Date.now();
        await db.collection('auditLogs').doc(auditId).set({
          id: auditId,
          timestamp: new Date().toISOString(),
          action: isGoogle ? 'Duplicate Lead Blocked (Google Ads)' : 'Duplicate Lead Blocked (Meta/Generic)',
          details: `Customer: ${name}, Phone: ${phone} matched existing lead ID: ${existingLead.id}. Merged logs.`,
          user: 'api_webhook'
        });

        return res.status(200).json({ success: true, leadId: existingLead.id, duplicate: true, action: 'merged' });
      }
    }

    const { assignedTo, assignedToName } = await determineAllocation();

    const newLeadId = 'lead-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const leadRecord = {
      id: newLeadId,
      name,
      phone,
      email,
      projectId: '',
      plotId: '',
      assignedTo,
      assignedToName,
      status: 'raw',
      priority: 'warm',
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      callLogs: [
        {
          date: new Date().toISOString(),
          note: `Lead created via Webhook Ingestion. Source: ${googleKey ? 'Google' : 'Meta/Generic'}`,
          status: 'raw',
          agent: 'system'
        }
      ]
    };

    await db.collection('leads').doc(newLeadId).set(leadRecord);

    const auditId = 'audit-' + Date.now();
    await db.collection('auditLogs').doc(auditId).set({
      id: auditId,
      timestamp: new Date().toISOString(),
      action: googleKey ? 'Ingest Lead (Google Ads)' : 'Ingest Lead (Meta/Generic)',
      details: `Customer: ${name}, Phone: ${phone}, Allocated to: ${assignedToName}`,
      user: 'api_webhook'
    });

    if (assignedTo) {
      await publishNotification(db, sendFcm, {
        userId: assignedTo,
        message: `📥 New Lead Assigned: ${name} (${phone})`,
        type: 'lead_assigned',
        title: '📥 New Lead Assigned',
        body: `${name} (${phone})`,
        leadId: newLeadId,
        sendPush: false,
      });
    }

    return res.status(201).json({ success: true, leadId: newLeadId });

  } catch (err) {
    console.error('Failed to ingest lead: ', err);
    return res.status(500).send('Ingestion error: ' + err.message);
  }
};

const handlePostBulkLeads = async (req, res) => {
  try {
    const settings = await getIntegrationSettings();
    const authHeader =
      req.headers['authorization'] ||
      req.headers['x-api-key'] ||
      req.query.api_key ||
      req.body.apiKey;
    const bulkAuth = assertWebhookSecret({
      presented: authHeader,
      expected: settings.apiWebhookKey,
      context: 'bulk_leads',
    });
    if (!bulkAuth.ok) {
      return res.status(bulkAuth.status).send(bulkAuth.message);
    }

    const rawLeads = req.body.leads || [];
    if (!Array.isArray(rawLeads) || rawLeads.length === 0) {
      return res.status(400).send('Expected an array of leads in the "leads" field.');
    }

    let successCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    for (const lead of rawLeads) {
      try {
        const cleaned = cleanLeadData({
          name: lead.name,
          email: lead.email,
          phone: lead.phone
        });

        if (!cleaned.phone || cleaned.phone === '+') {
          errorCount++;
          continue;
        }

        const duplicateRule = settings.duplicateHandlingRule || 'merge';
        let existingLead = null;

        if (duplicateRule !== 'create') {
          const existingLeadsSnap = await db.collection('leads')
            .where('phone', '==', cleaned.phone)
            .limit(1)
            .get();

          if (!existingLeadsSnap.empty) {
            existingLead = existingLeadsSnap.docs[0].data();
          }
        }

        if (existingLead) {
          if (duplicateRule === 'skip') {
            duplicateCount++;
            continue;
          } else {
            // merge
            const updatedLogs = existingLead.callLogs || [];
            updatedLogs.push({
              date: new Date().toISOString(),
              note: `Duplicate lead attempt merged from bulk upload. Notes: ${lead.notes || 'Bulk imported lead.'}`,
              status: existingLead.status || 'new',
              agent: 'system'
            });

            await db.collection('leads').doc(existingLead.id).update({
              updatedAt: new Date().toISOString(),
              callLogs: updatedLogs
            });

            duplicateCount++;
            continue;
          }
        }

        let assignedTo = lead.assignedTo || '';
        let assignedToName = lead.assignedToName || 'Unassigned';

        if (!assignedTo) {
          const alloc = await determineAllocation();
          assignedTo = alloc.assignedTo;
          assignedToName = alloc.assignedToName;
        }

        const newLeadId = 'lead-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        const leadRecord = {
          id: newLeadId,
          name: cleaned.name,
          phone: cleaned.phone,
          email: cleaned.email,
          projectId: lead.projectId || '',
          plotId: lead.plotId || '',
          assignedTo,
          assignedToName,
          status: lead.status || 'new',
          priority: lead.priority || 'warm',
          notes: lead.notes || 'CSV Bulk imported lead.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          callLogs: [
            {
              date: new Date().toISOString(),
              note: `Lead created via CSV Bulk Upload.`,
              status: lead.status || 'new',
              agent: 'system'
            }
          ]
        };

        await db.collection('leads').doc(newLeadId).set(leadRecord);

        if (assignedTo) {
          await publishNotification(db, sendFcm, {
            userId: assignedTo,
            message: `📥 New Lead Assigned: ${cleaned.name} (${cleaned.phone})`,
            type: 'lead_assigned',
            title: '📥 New Lead Assigned',
            body: `${cleaned.name} (${cleaned.phone})`,
            leadId: newLeadId,
            sendPush: false,
          });
        }

        successCount++;
      } catch (err) {
        console.error('Failed to import single bulk lead: ', err);
        errorCount++;
      }
    }

    const auditId = 'audit-' + Date.now();
    await db.collection('auditLogs').doc(auditId).set({
      id: auditId,
      timestamp: new Date().toISOString(),
      action: 'Bulk Upload Clean & Import',
      details: `Imported ${successCount} leads, merged ${duplicateCount} duplicates, failed ${errorCount} records.`,
      user: req.body.operator || 'bulk_api_webhook'
    });

    return res.status(200).json({
      success: true,
      imported: successCount,
      duplicates: duplicateCount,
      errors: errorCount
    });

  } catch (err) {
    console.error('Failed to process bulk upload: ', err);
    return res.status(500).send('Bulk upload error: ' + err.message);
  }
};

const handlePostIvr = async (req, res) => {
  try {
    const settings = await getIntegrationSettings();
    const authHeader =
      req.headers['authorization'] ||
      req.headers['x-api-key'] ||
      req.query.api_key ||
      req.body.apiKey;
    const ivrAuth = assertWebhookSecret({
      presented: authHeader,
      expected: settings.apiWebhookKey,
      context: 'ivr',
    });
    if (!ivrAuth.ok) {
      return res.status(ivrAuth.status).send(ivrAuth.message);
    }

    const callerPhone = req.body.callerPhone || req.body.From || req.query.callerPhone;
    if (!callerPhone) {
      return res.status(400).send('Missing callerPhone field');
    }

    let callerName = req.body.callerName || req.body.Name || 'Unknown Caller';
    let leadId = '';
    let assignedTo = '';

    // Normalize caller phone number to standard E.164
    const normalizedCaller = cleanLeadData({ phone: callerPhone });
    const normalizedCallerPhone = normalizedCaller.phone;

    let matchedLead = null;
    if (normalizedCallerPhone) {
      const leadsSnap = await db.collection('leads')
        .where('phone', '==', normalizedCallerPhone)
        .limit(1)
        .get();

      if (!leadsSnap.empty) {
        matchedLead = leadsSnap.docs[0].data();
      }
    }

    if (matchedLead) {
      callerName = matchedLead.name;
      leadId = matchedLead.id;
      assignedTo = matchedLead.assignedTo || '';
    }

    let targetAgentId = req.body.ivrAgentId || req.query.ivrAgentId || assignedTo;

    if (!targetAgentId) {
      const { assignedTo: rrAgent } = await determineAllocation();
      targetAgentId = rrAgent;
    }

    if (!targetAgentId) {
      const usersSnap = await db.collection('users').get();
      usersSnap.forEach(d => {
        const u = d.data();
        if (u.role === 'admin' && !targetAgentId) {
          targetAgentId = u.id;
        }
      });
    }

    if (!targetAgentId) {
      return res.status(404).send('No available agent to route the call.');
    }

    await db.collection('ivrCalls').doc(targetAgentId).set({
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      callerPhone,
      callerName,
      leadId,
      status: 'ringing'
    });

    const auditId = 'audit-' + Date.now();
    await db.collection('auditLogs').doc(auditId).set({
      id: auditId,
      timestamp: new Date().toISOString(),
      action: 'Inbound IVR Call',
      details: `Caller: ${callerName} (${callerPhone}) routed to telecaller agent: ${targetAgentId}`,
      user: 'ivr_webhook'
    });

    return res.status(200).json({ success: true, routedTo: targetAgentId });

  } catch (err) {
    console.error('Failed to trigger IVR Call: ', err);
    return res.status(500).send('IVR triggering error: ' + err.message);
  }
};

// Map express endpoints
app.get('/leads', handleGetLeads);
app.post('/leads', handlePostLeads);
app.post('/leads/bulk', handlePostBulkLeads);
app.post('/ivr', handlePostIvr);

app.get('/api/webhooks/leads', handleGetLeads);
app.post('/api/webhooks/leads', handlePostLeads);
app.post('/api/webhooks/leads/bulk', handlePostBulkLeads);
app.post('/api/webhooks/ivr', handlePostIvr);

// --- WhatsApp / Evolution webhooks (always require configured secret) ---
async function handleWhatsAppWebhook(req, res) {
  try {
    const settings = await getIntegrationSettings();
    const expected = resolveWhatsAppWebhookSecret(settings);

    if (req.method === 'GET') {
      const token = req.query['hub.verify_token'] || req.query.verify_token;
      const challenge = req.query['hub.challenge'] || req.query.challenge || 'ok';
      const waAuth = assertWebhookSecret({
        presented: token,
        expected,
        context: 'whatsapp_verify',
      });
      if (!waAuth.ok) {
        return res.status(waAuth.status).send(waAuth.message);
      }
      return res.status(200).send(challenge);
    }

    const headerSecret =
      req.get('x-evolution-secret') ||
      req.get('x-webhook-secret') ||
      req.get('apikey') ||
      req.headers['authorization'] ||
      '';
    const waAuth = assertWebhookSecret({
      presented: normalizePresentedSecret(headerSecret),
      expected,
      context: 'whatsapp_webhook',
    });
    if (!waAuth.ok) {
      return res.status(waAuth.status).json({ error: waAuth.message });
    }

    const result = await messagingProvider.handleWebhook(req.body || {});
    return res.status(200).json(result);
  } catch (err) {
    console.error('WhatsApp webhook error:', err);
    return res.status(500).json({ error: err.message });
  }
}

app.get('/webhooks/whatsapp', handleWhatsAppWebhook);
app.post('/webhooks/whatsapp', handleWhatsAppWebhook);
app.get('/api/webhooks/whatsapp', handleWhatsAppWebhook);
app.post('/api/webhooks/whatsapp', handleWhatsAppWebhook);

// v2: HTTPS onRequest wraps the express app
exports.api = onRequest({ region: 'us-central1' }, app);

/** Callable: active messaging provider status (provider-agnostic). */
/**
 * Wave 7 Phase 2C — AI completion proxy (Gemini).
 * Auth required. Server key: GEMINI_API_KEY (or GOOGLE_AI_API_KEY).
 * Fail-closed when unset. Does not persist prompts/responses.
 */
exports.aiComplete = onCall({ region: 'us-central1' }, handleAiComplete);

/**
 * Phase 0.1 — set/clear `{ managerial: true }` custom claim (Admin SDK).
 * Callable only by existing managerial callers (claim or Firestore role bootstrap).
 */
exports.setManagerialClaim = onCall({ region: 'us-central1' }, async (request) => {
  return handleSetManagerialClaim(request, db);
});

/**
 * Phase 0.1 — link Auth UID to Firestore users doc (replaces client uid/password writes).
 */
exports.linkUserProfile = onCall({ region: 'us-central1' }, async (request) => {
  return handleLinkUserProfile(request, db);
});

exports.messagingStatus = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required');
  }
  return messagingProvider.getStatus();
});

/** Callable: probe provider connectivity and persist status fields. */
exports.messagingTestConnection = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required');
  }
  return messagingProvider.testConnection();
});

/** Callable: qr | reconnect | disconnect | createInstance */
exports.messagingInstanceAction = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required');
  }
  const action = request.data?.action;
  try {
    if (action === 'qr') return await messagingProvider.getQr();
    if (action === 'reconnect') return await messagingProvider.reconnect();
    if (action === 'disconnect') return await messagingProvider.disconnect();
    if (action === 'createInstance') {
      if (typeof messagingProvider.createInstance !== 'function') {
        throw new HttpsError(
          'unimplemented',
          'Active provider does not support Create Instance',
        );
      }
      return await messagingProvider.createInstance({
        instanceName: request.data?.instanceName,
        webhookUrl: webhookUrlForProject(),
      });
    }
    throw new HttpsError(
      'invalid-argument',
      'action must be qr|reconnect|disconnect|createInstance',
    );
  } catch (err) {
    if (err instanceof NotConnectedError || err.code === 'not_connected') {
      throw new HttpsError('failed-precondition', err.message);
    }
    if (err instanceof UnsupportedCapabilityError || err.code === 'unsupported_capability') {
      throw new HttpsError('unimplemented', err.message);
    }
    if (err instanceof HttpsError) throw err;
    throw new HttpsError('internal', err.message || 'Instance action failed');
  }
});

/**
 * Callable: send WhatsApp message via MessagingProvider abstraction.
 * Writes top-level whatsappMessages + timelineEvents (no callLogs bridge).
 */
exports.messagingSend = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required');
  }

  const {
    leadId,
    type = 'text',
    text = '',
    mediaUrl = '',
    mediaMimeType = '',
    mediaFileName = '',
    templateId = '',
  } = request.data || {};

  if (!leadId) {
    throw new HttpsError('invalid-argument', 'leadId is required');
  }

  const leadSnap = await db.collection('leads').doc(leadId).get();
  if (!leadSnap.exists) {
    throw new HttpsError('not-found', 'Lead not found');
  }
  const lead = leadSnap.data();
  const providerId = messagingProvider.id || 'evolution';
  const leadHints = {
    phone: lead.phone,
    assignedTo: lead.assignedTo,
    assignedToName: lead.assignedToName,
  };
  const agentName =
    request.auth.token?.name || request.auth.token?.email || 'Agent';

  const status = await messagingProvider.getStatus();
  if (!status.connected) {
    const written = await messagingProvider.writeMessage(
      leadId,
      {
        provider: providerId,
        direction: 'outbound',
        type,
        text,
        mediaUrl,
        mediaMimeType,
        mediaFileName,
        templateId,
        status: 'failed',
        error: status.message || 'Provider not connected',
        agentId: request.auth.uid,
        agentName,
      },
      leadHints,
    );
    return {
      ok: false,
      connected: false,
      messageId: written.id,
      conversationId: written.conversationId,
      status: 'failed',
      error:
        status.message ||
        'WhatsApp is not connected. Configure the messaging provider in Integrations.',
      webhookUrl: webhookUrlForProject(),
    };
  }

  const pending = await messagingProvider.writeMessage(
    leadId,
    {
      provider: providerId,
      direction: 'outbound',
      type,
      text,
      mediaUrl,
      mediaMimeType,
      mediaFileName,
      templateId,
      status: 'pending',
      agentId: request.auth.uid,
      agentName,
    },
    leadHints,
  );

  try {
    let result;
    if (type === 'image' || type === 'document') {
      result = await messagingProvider.sendMedia({
        number: lead.phone,
        mediaUrl,
        mediaMimeType,
        fileName: mediaFileName,
        caption: text,
      });
    } else if (type === 'audio') {
      throw new HttpsError('unimplemented', 'Voice notes coming soon');
    } else {
      result = await messagingProvider.sendText({
        number: lead.phone,
        text,
      });
    }

    await db.collection('whatsappMessages').doc(pending.id).set(
      {
        status: 'sent',
        providerMessageId: result.providerMessageId || '',
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    return {
      ok: true,
      connected: true,
      messageId: pending.id,
      conversationId: pending.conversationId,
      status: 'sent',
      providerMessageId: result.providerMessageId || null,
    };
  } catch (err) {
    await db.collection('whatsappMessages').doc(pending.id).set(
      {
        status: 'failed',
        error: err.message || 'Send failed',
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    if (err instanceof NotConnectedError || err.code === 'not_connected') {
      throw new HttpsError('failed-precondition', err.message);
    }
    if (err instanceof HttpsError) throw err;
    throw new HttpsError('internal', err.message || 'Send failed');
  }
});

/**
 * 1. onLeadCreated Trigger
 * Triggers when a new lead doc is created. Handles:
 *   a) Atomic sequential leadNumber assignment via settings/counters transaction
 *   b) Auto round-robin agent allocation
 *   c) FCM push notification to assigned agent
 */
exports.onLeadCreated = onDocumentCreated(
  { document: 'leads/{leadId}', region: 'us-central1' },
  async (event) => {
    const lead = event.data.data();
    if (!lead) return;

    // --- (a) Atomic lead number assignment ---
    let assignedLeadNumber = lead.leadNumber || '';

    if (!assignedLeadNumber) {
      const counterRef = db.doc('settings/counters');

      try {
        assignedLeadNumber = await db.runTransaction(async (txn) => {
          const counterSnap = await txn.get(counterRef);

          let nextNumber;
          if (counterSnap.exists && counterSnap.data().nextLeadNumber) {
            nextNumber = counterSnap.data().nextLeadNumber;
          } else {
            // Auto-initialize: scan existing leads for the highest numeric leadNumber
            const leadsSnap = await db.collection('leads')
              .orderBy('leadNumber', 'desc')
              .limit(50)
              .get();

            let maxFound = 1000;
            leadsSnap.forEach(d => {
              const num = parseInt(d.data().leadNumber, 10);
              if (!isNaN(num) && num > maxFound) {
                maxFound = num;
              }
            });
            nextNumber = maxFound + 1;
          }

          // Increment counter atomically
          txn.set(counterRef, { nextLeadNumber: nextNumber + 1 }, { merge: true });
          return String(nextNumber);
        });
      } catch (err) {
        console.error('Failed to assign leadNumber via transaction:', err);
        // Fallback: timestamp-based unique number so the lead isn't left blank
        assignedLeadNumber = 'L-' + Date.now();
      }
    }

    // --- (b) Auto round-robin assignment ---
    let assignedTo = lead.assignedTo;
    let assignedToName = lead.assignedToName;

    if (!assignedTo || assignedTo === 'Unassigned') {
      const alloc = await determineAllocation();
      if (alloc.assignedTo) {
        assignedTo = alloc.assignedTo;
        assignedToName = alloc.assignedToName;
      }
    }

    // Consolidate all patches into a single write
    const patches = {};
    if (assignedLeadNumber !== (lead.leadNumber || '')) {
      patches.leadNumber = assignedLeadNumber;
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

/**
 * 2. sendFcmNotification HTTPS Callable
 * Allows direct call from client side to send manual push notifications.
 */
exports.sendFcmNotification = onCall(
  { region: 'us-central1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Method must be called authenticated.');
    }

    const { targetUserId, title, body, extraData } = request.data;
    if (!targetUserId || !title || !body) {
      throw new HttpsError('invalid-argument', 'Missing parameters.');
    }

    await sendFcm(targetUserId, {
      notification: { title, body },
      data: extraData || {}
    });

    return { success: true };
  }
);

/**
 * 3. onUserCreated Firestore Trigger
 * When a new user doc is created in Firestore (via addUser()), checks if a matching
 * Firebase Auth UID exists by email and patches it in. This replaces the v1 Auth
 * onCreate trigger which requires Identity Platform (GCIP) in v2.
 */
exports.onUserCreated = onDocumentCreated(
  { document: 'users/{userId}', region: 'us-central1' },
  async (event) => {
    const userData = event.data.data();
    if (!userData) return;

    // Only process if not yet migrated and has an email
    if (userData.isMigrated || !userData.email) return;

    const email = userData.email.toLowerCase();

    try {
      // Look up the Firebase Auth user by email
      const authUser = await admin.auth().getUserByEmail(email);
      if (authUser && authUser.uid) {
        await event.data.ref.update({
          uid: authUser.uid,
          isMigrated: true,
          updatedAt: new Date().toISOString()
        });
        // Also set the userRole doc
        await db.collection('userRoles').doc(authUser.uid).set({
          role: userData.role || 'telecaller'
        }, { merge: true });
        console.log(`Patched Auth UID ${authUser.uid} into Firestore user doc ${event.params.userId}`);
      }
    } catch (err) {
      // Auth user may not exist yet — that's fine, addUser() handles this
      console.log(`No Auth user found for email ${email} yet: ${err.message}`);
    }
  }
);

/**
 * 4. scheduledFollowUpReminders (Daily 9:00 AM IST Cron)
 * Same-day + N-day-before window (settings/remoteConfig.follow_up_reminder_days).
 * Agent 1 Phase 2C — extends Agent 0 scaffolding; overdue is a sibling cron below.
 */
exports.scheduledFollowUpReminders = createScheduledJob({
  name: AUTOMATION_JOB_TYPES.FOLLOW_UP,
  schedule: '0 9 * * *',
  db,
  sendFcm,
  handler: runSameDayFollowUpReminders,
});

/**
 * 4b. scheduledOverdueFollowUps (Daily 9:15 AM IST Cron)
 * Overdue digest: followUpDate < IST today. Avoids colliding with same-day at :00.
 */
exports.scheduledOverdueFollowUps = createScheduledJob({
  name: AUTOMATION_JOB_TYPES.FOLLOW_UP_OVERDUE,
  schedule: '15 9 * * *',
  db,
  sendFcm,
  handler: runOverdueFollowUpReminders,
});

/**
 * 4b. Site-visit reminders (Wave 6 Phase 2C Agent 3)
 * - Day-before (10:00 IST) + same-day (08:00 IST) — enabled
 * - No-show framework (11:30 IST) — DISABLED by default (SITE_VISIT_AUTOMATION.NO_SHOW_ENABLED)
 * Canonical gate: lead.status === site-visit-confirmed + isRemindableSiteVisit
 */
registerSiteVisitJobs({ db, sendFcm, exports });

/**
 * 4c. First-touch SLA breach notify (Wave 6 Phase 2C Agent 2)
 * Daily 10:15 IST — assignee + managerial escalation via shared automation APIs.
 */
registerSlaBreachJobs({ db, sendFcm, exports });

/**
 * 5. cleanupOldAuditLogs (Weekly Cron)
 * Deletes audit logs older than 90 days.
 */
exports.cleanupOldAuditLogs = onSchedule(
  { schedule: '0 0 * * 0', timeZone: 'Asia/Kolkata', region: 'us-central1' },
  async () => {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    console.log(`Cleaning audit logs older than: ${ninetyDaysAgo}`);
    
    const logsSnap = await db.collection('auditLogs')
      .where('timestamp', '<', ninetyDaysAgo)
      .get();
      
    if (logsSnap.empty) {
      console.log('No old audit logs found to cleanup.');
      return;
    }
    
    const batch = db.batch();
    logsSnap.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`Successfully purged ${logsSnap.size} old audit log entries.`);
  }
);

/**
 * 6. onRemoteConfigSettingsUpdated Firestore Trigger
 * Triggers when settings/remoteConfig doc is modified, automatically updating the Firebase Remote Config parameters.
 */
exports.onRemoteConfigSettingsUpdated = onDocumentWritten(
  { document: 'settings/remoteConfig', region: 'us-central1' },
  async (event) => {
    const data = event.data.after.data();
    if (!data) return;
    
    console.log("Firestore settings/remoteConfig updated. Syncing to Remote Config Console...");
    
    try {
      const rc = admin.remoteConfig();
      const template = await rc.getTemplate();
      
      template.parameters['announcement_text'] = {
        defaultValue: { value: data.announcement_text || '' },
        valueType: 'STRING'
      };
      template.parameters['show_announcement'] = {
        defaultValue: { value: String(!!data.show_announcement) },
        valueType: 'BOOLEAN'
      };
      template.parameters['default_rate_per_sqft'] = {
        defaultValue: { value: String(data.default_rate_per_sqft || 3500) },
        valueType: 'NUMERIC'
      };
      template.parameters['follow_up_reminder_days'] = {
        defaultValue: { value: String(data.follow_up_reminder_days || 1) },
        valueType: 'NUMERIC'
      };
      
      await rc.validateTemplate(template);
      await rc.publishTemplate(template);
      console.log("Successfully pushed updates to live Remote Config Console!");
    } catch (err) {
      console.error("Failed to sync template to Remote Config:", err);
    }
  }
);

/**
 * 7. triggerOutboundCall HTTPS Callable
 * Triggers outbound call using the configured IVR provider (custom, Twilio, or Exotel).
 */
exports.triggerOutboundCall = onCall(
  { region: 'us-central1' },
  async (request) => {
    // 1. Authenticate user
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated.');
    }

    const { leadId } = request.data;
    if (!leadId) {
      throw new HttpsError('invalid-argument', 'Missing leadId parameter.');
    }

    const agentUid = request.auth.uid;

    try {
      // 2. Fetch agent document
      const usersSnap = await db.collection('users').where('uid', '==', agentUid).limit(1).get();
      if (usersSnap.empty) {
        throw new HttpsError('not-found', 'Agent profile not found.');
      }
      const agentDoc = usersSnap.docs[0];
      const agent = agentDoc.data();
      const agentPhone = agent.phone || '';

      // 3. Fetch lead document
      const leadSnap = await db.collection('leads').doc(leadId).get();
      if (!leadSnap.exists) {
        throw new HttpsError('not-found', 'Lead not found.');
      }
      const lead = leadSnap.data();
      const clientPhone = lead.phone || '';

      if (!clientPhone) {
        throw new HttpsError('invalid-argument', 'Lead has no phone number.');
      }

      // 4. Fetch IVR integrations settings
      const configSnap = await db.doc('settings/integrations').get();
      if (!configSnap.exists) {
        throw new HttpsError('failed-precondition', 'IVR integration settings are not configured.');
      }
      const config = configSnap.data();

      if (!config.enableIvr) {
        throw new HttpsError('failed-precondition', 'IVR dialing is currently disabled.');
      }

      const provider = config.ivrProvider || 'mock';
      const virtualNumber = config.ivrVirtualNumber || '';

      console.log(`Triggering outbound call via provider: ${provider}. Agent: ${agentPhone}, Customer: ${clientPhone}`);

      if (provider === 'mock') {
        return { success: true, message: 'Simulated outbound call successfully triggered.' };
      }

      if (provider === 'custom') {
        const urlTemplate = config.ivrCustomOutboundUrl || '';
        const method = (config.ivrCustomMethod || 'POST').toUpperCase();
        const authHeader = config.ivrCustomAuthHeader || '';
        const headersJsonStr = config.ivrCustomHeaders || '{}';
        const payloadTemplateStr = config.ivrCustomPayload || '{}';

        if (!urlTemplate) {
          throw new HttpsError('invalid-argument', 'Custom Outbound URL is not configured.');
        }

        // Helper to format phone numbers dynamically
        const getPhoneFormats = (phone) => {
          const raw = (phone || '').replace(/[^0-9]/g, '');
          const tenDigit = raw.length > 10 ? raw.slice(-10) : raw;
          return {
            e164: phone,
            tenDigit: tenDigit,
            noPlus: raw
          };
        };

        const clientFormats = getPhoneFormats(clientPhone);
        const agentFormats = getPhoneFormats(agentPhone);

        // Variable substitution helper
        const replaceVars = (str) => {
          return str
            .replace(/\{\{agentPhone\}\}/g, agentFormats.e164)
            .replace(/\{\{agentPhone10Digit\}\}/g, agentFormats.tenDigit)
            .replace(/\{\{agentPhoneNoPlus\}\}/g, agentFormats.noPlus)
            .replace(/\{\{clientPhone\}\}/g, clientFormats.e164)
            .replace(/\{\{clientPhone10Digit\}\}/g, clientFormats.tenDigit)
            .replace(/\{\{clientPhoneNoPlus\}\}/g, clientFormats.noPlus)
            .replace(/\{\{virtualNumber\}\}/g, virtualNumber);
        };

        const finalUrl = replaceVars(urlTemplate);

        let headers = {};
        try {
          const parsedHeaders = JSON.parse(headersJsonStr);
          Object.keys(parsedHeaders).forEach(key => {
            if (typeof parsedHeaders[key] === 'string') {
              headers[key] = replaceVars(parsedHeaders[key]);
            } else {
              headers[key] = parsedHeaders[key];
            }
          });
        } catch (e) {
          console.error("Failed to parse custom headers JSON:", e);
        }

        if (authHeader) {
          headers['Authorization'] = replaceVars(authHeader);
        }

        let requestConfig = {
          method: method,
          url: finalUrl,
          headers: headers
        };

        if (method !== 'GET') {
          let payload = {};
          try {
            const parsedPayload = JSON.parse(payloadTemplateStr);
            const substituteObject = (obj) => {
              let res = {};
              Object.keys(obj).forEach(key => {
                if (typeof obj[key] === 'string') {
                  res[key] = replaceVars(obj[key]);
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                  res[key] = substituteObject(obj[key]);
                } else {
                  res[key] = obj[key];
                }
              });
              return res;
            };
            payload = substituteObject(parsedPayload);
          } catch (e) {
            console.error("Failed to parse custom payload JSON template:", e);
          }
          requestConfig.data = payload;
        }

        console.log(`Sending custom IVR API request to: ${finalUrl} [${method}]`);
        const response = await axios(requestConfig);
        console.log(`Custom IVR API responded with status: ${response.status}`);
        return { success: true, statusCode: response.status, data: response.data };
      }

      if (provider === 'exotel') {
        const sid = config.exotelSid;
        const token = config.exotelToken;
        const vNum = config.exotelVirtualNumber || virtualNumber;

        if (!sid || !token || !vNum) {
          throw new HttpsError('invalid-argument', 'Exotel SID, Token, or Virtual Number is missing.');
        }

        const url = `https://api.exotel.com/v1/Accounts/${sid}/Calls/connect.json`;
        const auth = Buffer.from(`${sid}:${token}`).toString('base64');

        const params = new URLSearchParams();
        params.append('From', agentPhone);
        params.append('To', clientPhone);
        params.append('CallerId', vNum);

        console.log(`Calling Exotel API: ${url}`);
        const response = await axios.post(url, params.toString(), {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });

        console.log('Exotel call response:', response.data);
        return { success: true, data: response.data };
      }

      if (provider === 'twilio') {
        const sid = config.twilioAccountSid;
        const token = config.twilioAuthToken;
        const tNum = config.twilioPhoneNumber || virtualNumber;

        if (!sid || !token || !tNum) {
          throw new HttpsError('invalid-argument', 'Twilio SID, Token, or Phone Number is missing.');
        }

        const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`;
        const auth = Buffer.from(`${sid}:${token}`).toString('base64');

        const params = new URLSearchParams();
        params.append('From', tNum);
        params.append('To', clientPhone);
        const twiml = `<Response><Dial><Number>${agentPhone}</Number></Dial></Response>`;
        params.append('Twiml', twiml);

        console.log(`Calling Twilio API: ${url}`);
        const response = await axios.post(url, params.toString(), {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });

        console.log('Twilio call response:', response.data);
        return { success: true, data: response.data };
      }

      throw new HttpsError('unimplemented', `Unsupported IVR provider: ${provider}`);

    } catch (err) {
      console.error('Outbound call triggering failed:', err);
      throw new HttpsError('internal', err.message || 'Failed to trigger outbound call.');
    }
  }
);

/* --- TELECALLER PRODUCTIVITY MONITORING FUNCTIONS --- */

// Helper to parse duration (MM:SS or HH:MM:SS) to seconds
function parseDuration(note) {
  const match = note.match(/Duration:\s*(\d+):(\d+)(?::(\d+))?/i);
  if (!match) return 0;
  if (match[3] !== undefined) {
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const s = parseInt(match[3], 10);
    return h * 3600 + m * 60 + s;
  } else {
    const m = parseInt(match[1], 10);
    const s = parseInt(match[2], 10);
    return m * 60 + s;
  }
}

// Prefer shared automation IST helper (Asia/Kolkata YYYY-MM-DD)
function getKolkataDateString() {
  return getIstDateString();
}

/**
 * 8. onLeadCallLogUpdated Firestore Trigger
 * Aggregates daily agent call count, talk time, and booked/interested statistics.
 */
exports.onLeadCallLogUpdated = onDocumentUpdated(
  { document: 'leads/{leadId}', region: 'us-central1' },
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    if (!before || !after) return null;

    const beforeLogs = before.callLogs || [];
    const afterLogs = after.callLogs || [];

    if (afterLogs.length <= beforeLogs.length) {
      return null;
    }

    const newLogs = afterLogs.slice(beforeLogs.length);

    for (const log of newLogs) {
      const agentUsername = log.agent;
      if (!agentUsername || agentUsername === 'system') {
        continue;
      }

      const note = log.note || '';
      const duration = parseDuration(note);

      let agentId = null;
      let agentName = agentUsername;

      if (agentUsername === before.assignedToName || agentUsername === after.assignedToName) {
        agentId = after.assignedTo || before.assignedTo;
      }

      if (!agentId) {
        const userSnap = await db.collection('users').where('username', '==', agentUsername).limit(1).get();
        if (!userSnap.empty) {
          agentId = userSnap.docs[0].id;
          agentName = userSnap.docs[0].data().username || agentUsername;
        }
      }

      if (!agentId) {
        agentId = agentUsername;
      }

      const dateStr = getKolkataDateString();
      const docRef = db.collection('agentProductivity').doc(`${agentId}_${dateStr}`);

      await db.runTransaction(async (transaction) => {
        const docSnap = await transaction.get(docRef);
        const nowStr = new Date().toISOString();
        
        const isBooked = log.status === 'booked' || log.status === 'reserved';
        const isInterested = log.status === 'interested';

        if (!docSnap.exists) {
          transaction.set(docRef, {
            agentId,
            agentName,
            date: dateStr,
            totalCalls: 1,
            totalTalkTimeSeconds: duration,
            lastActiveTime: nowStr,
            idleWarning: false,
            bookedCount: isBooked ? 1 : 0,
            interestedCount: isInterested ? 1 : 0,
            createdAt: nowStr,
            updatedAt: nowStr
          });
        } else {
          const data = docSnap.data();
          transaction.update(docRef, {
            totalCalls: (data.totalCalls || 0) + 1,
            totalTalkTimeSeconds: (data.totalTalkTimeSeconds || 0) + duration,
            lastActiveTime: nowStr,
            idleWarning: false,
            bookedCount: (data.bookedCount || 0) + (isBooked ? 1 : 0),
            interestedCount: (data.interestedCount || 0) + (isInterested ? 1 : 0),
            updatedAt: nowStr
          });
        }
      });

      const statusRef = db.collection('agentStatus').doc(agentId);
      await statusRef.set({
        agentId,
        agentName,
        lastActiveTime: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
    return null;
  }
);

/**
 * 9. scheduledAgentIdleCheck Cron (Every 30 minutes)
 * Scans active telecallers ('available' or 'on-call') and flags them as idle if inactive for 45+ minutes.
 */
exports.scheduledAgentIdleCheck = onSchedule(
  { schedule: '*/30 * * * *', timeZone: 'Asia/Kolkata', region: 'us-central1' },
  async () => {
    const activeStatusesSnap = await db.collection('agentStatus')
      .where('status', 'in', ['available', 'on-call'])
      .get();

    if (activeStatusesSnap.empty) {
      console.log('No active agents found in agentStatus.');
      return;
    }

    const dateStr = getKolkataDateString();
    const now = new Date();
    const thresholdMs = 45 * 60 * 1000; // 45 minutes

    for (const doc of activeStatusesSnap.docs) {
      const statusData = doc.data();
      const agentId = doc.id;
      const username = statusData.username || 'Unknown';
      const statusUpdatedAt = statusData.updatedAt;

      const prodDocId = `${agentId}_${dateStr}`;
      const prodRef = db.collection('agentProductivity').doc(prodDocId);
      const prodSnap = await prodRef.get();

      let lastActiveTime = null;
      let alreadyWarned = false;

      if (prodSnap.exists) {
        const prodData = prodSnap.data();
        lastActiveTime = prodData.lastActiveTime;
        alreadyWarned = !!prodData.idleWarning;
      } else {
        lastActiveTime = statusUpdatedAt;
      }

      if (!lastActiveTime) {
        lastActiveTime = now.toISOString();
      }

      const elapsedMs = now.getTime() - new Date(lastActiveTime).getTime();

      if (elapsedMs > thresholdMs) {
        if (prodSnap.exists) {
          await prodRef.update({
            idleWarning: true,
            updatedAt: now.toISOString()
          });
        } else {
          await prodRef.set({
            agentId,
            agentName: username,
            date: dateStr,
            totalCalls: 0,
            totalTalkTimeSeconds: 0,
            lastActiveTime,
            idleWarning: true,
            bookedCount: 0,
            interestedCount: 0,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
          });
        }

        if (!alreadyWarned) {
          const auditId = 'audit-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
          await db.collection('auditLogs').doc(auditId).set({
            id: auditId,
            timestamp: now.toISOString(),
            action: 'Agent Idle Warning',
            details: `[System Warning] Telecaller ${username} is currently idle (no call activity for 45+ minutes).`,
            user: 'system'
          });
          console.log(`Flagged agent ${username} (${agentId}) as idle.`);
        }
      }
    }
  }
);
