const admin = require('firebase-admin');
const axios = require('axios');
const {
  loadIntegrationSettings,
  assertWebhookSecret,
  isSecretConfigured,
  resolveWhatsAppWebhookSecret,
  normalizePresentedSecret,
} = require('../webhooks/secrets');
const {
  collectLeadgenEntries,
  parseMetaFieldData,
  buildMetaIngestLog,
} = require('../webhooks/metaLeadgen');
const { cleanLeadData } = require('../leads/cleanLeadData');
const { determineAllocation } = require('../leads/allocation');
const { runBulkImport } = require('../leads/bulkImport');
const {
  appendCallLog,
  writeAuditLog,
  claimIngestEvent,
  updateIngestEvent,
  releaseIngestEvent,
} = require('../helpers/firestoreWrites');
const { publishNotification } = require('../notifications/publishNotification');
const { sendFcm } = require('../services/fcm');
const { getMessagingProvider } = require('../services/messaging');
const { generateUlid } = require('../helpers/ulid');

// Helper to load integration settings
async function getIntegrationSettings() {
  return loadIntegrationSettings(admin.firestore());
}

// Helper to determine allocation
async function allocateRoundRobin() {
  return determineAllocation(admin.firestore());
}

// GET /leads (webhook verification)
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

// POST /leads (ingestion)
const handlePostLeads = async (req, res) => {
  const db = admin.firestore();
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

      const startedAt = Date.now();
      const requestId =
        req.headers['x-request-id'] ||
        req.headers['x-cloud-trace-context'] ||
        null;
      const leadgenEntries = collectLeadgenEntries(req.body);
      let leadsCreated = 0;
      let duplicates = 0;
      let failed = 0;
      const results = [];

      for (const { leadgenId, formId } of leadgenEntries) {
        const eventId = `meta_leadgen_${leadgenId}`;
        let leadWritten = false;
        let claimHeld = false;
        try {
          const claim = await claimIngestEvent(db, eventId, {
            type: 'meta_leadgen',
            leadgenId,
            formId: formId || null,
            status: 'processing',
          });
          if (!claim.created) {
            duplicates += 1;
            results.push({ leadgenId, action: 'idempotent_skip', duplicate: true });
            continue;
          }
          claimHeld = true;

          const graphUrl = `https://graph.facebook.com/v18.0/${leadgenId}?access_token=${settings.metaAccessToken}`;
          const fbResponse = await axios.get(graphUrl);
          const parsed = parseMetaFieldData(fbResponse.data.field_data || []);
          let entryName = parsed.name || 'Meta Customer';
          let entryEmail = parsed.email;
          let entryPhone = parsed.phone;
          const entryNotes = `Meta Webhook Ingest. Leadgen ID: ${leadgenId}. Form ID: ${formId}. Source: Meta_Lead_Ads`;

          const cleaned = cleanLeadData({
            name: entryName,
            email: entryEmail,
            phone: entryPhone,
          });
          entryName = cleaned.name;
          entryEmail = cleaned.email;
          entryPhone = cleaned.phone;

          if (!entryPhone || entryPhone === '+') {
            await updateIngestEvent(db, eventId, {
              status: 'failed',
              outcome: 'missing_phone',
            });
            claimHeld = false;
            failed += 1;
            results.push({
              leadgenId,
              action: 'failed',
              error: 'Phone number field is required.',
            });
            console.error(
              JSON.stringify({
                event: 'meta_ingest_entry_failed',
                leadgenId,
                reason: 'missing_phone',
                requestId,
              }),
            );
            continue;
          }

          const duplicateRule = settings.duplicateHandlingRule || 'merge';
          let existingLead = null;
          let existingLeadId = null;

          if (duplicateRule !== 'create') {
            const existingLeadsSnap = await db
              .collection('leads')
              .where('phone', '==', entryPhone)
              .limit(1)
              .get();

            if (!existingLeadsSnap.empty) {
              existingLeadId = existingLeadsSnap.docs[0].id;
              existingLead = { id: existingLeadId, ...existingLeadsSnap.docs[0].data() };
            }
          }

          if (existingLead && existingLeadId) {
            if (duplicateRule === 'skip') {
              await writeAuditLog(db, {
                action: 'Duplicate Lead Skipped (Meta)',
                details: `Customer: ${entryName}, Phone: ${entryPhone} matched existing lead ID: ${existingLeadId}. Ingestion skipped.`,
                user: 'api_webhook',
              });
              await updateIngestEvent(db, eventId, {
                status: 'completed',
                outcome: 'phone_duplicate_skip',
                leadId: existingLeadId,
              });
              claimHeld = false;
              duplicates += 1;
              results.push({
                leadgenId,
                leadId: existingLeadId,
                action: 'skipped',
                duplicate: true,
              });
              continue;
            }

            await appendCallLog(db, existingLeadId, {
              date: new Date().toISOString(),
              note: `Duplicate lead attempt detected via Webhook Ingestion. Notes merged: ${entryNotes}`,
              status: existingLead.status || 'new',
              agent: 'system',
            });
            await writeAuditLog(db, {
              action: 'Duplicate Lead Blocked (Meta)',
              details: `Customer: ${entryName}, Phone: ${entryPhone} matched existing lead ID: ${existingLeadId}. Merged logs.`,
              user: 'api_webhook',
            });
            await updateIngestEvent(db, eventId, {
              status: 'completed',
              outcome: 'phone_duplicate_merge',
              leadId: existingLeadId,
            });
            claimHeld = false;
            duplicates += 1;
            results.push({
              leadgenId,
              leadId: existingLeadId,
              action: 'merged',
              duplicate: true,
            });
            continue;
          }

          const leadRef = db.collection('leads').doc();
          const newLeadId = leadRef.id;
          await leadRef.set({
            id: newLeadId,
            leadReference: generateUlid(),
            name: entryName,
            phone: entryPhone,
            email: entryEmail,
            projectId: '',
            plotId: '',
            assignedTo: '',
            assignedToName: 'Unassigned',
            status: 'raw',
            priority: 'warm',
            notes: entryNotes,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            callCount: 0,
            hasAgentCall: false,
          });
          leadWritten = true;
          await appendCallLog(db, newLeadId, {
            date: new Date().toISOString(),
            note: 'Lead created via Webhook Ingestion. Source: Meta',
            status: 'raw',
            agent: 'system',
          });
          await writeAuditLog(db, {
            action: 'Ingest Lead (Meta)',
            details: `Customer: ${entryName}, Phone: ${entryPhone}. Leadgen: ${leadgenId}. Awaiting onLeadCreated allocation.`,
            user: 'api_webhook',
          });
          await updateIngestEvent(db, eventId, {
            status: 'completed',
            outcome: 'created',
            leadId: newLeadId,
          });
          claimHeld = false;
          leadsCreated += 1;
          results.push({ leadgenId, leadId: newLeadId, action: 'created' });
        } catch (entryErr) {
          if (claimHeld && !leadWritten) {
            try {
              await releaseIngestEvent(db, eventId);
            } catch (releaseErr) {
              console.error(
                JSON.stringify({
                  event: 'meta_ingest_claim_release_failed',
                  leadgenId,
                  reason: releaseErr.message || String(releaseErr),
                  requestId,
                }),
              );
            }
          }
          failed += 1;
          results.push({
            leadgenId,
            action: 'failed',
            error: entryErr.message || String(entryErr),
          });
          console.error(
            JSON.stringify({
              event: 'meta_ingest_entry_failed',
              leadgenId,
              reason: entryErr.message || String(entryErr),
              requestId,
            }),
          );
        }
      }

      const summary = buildMetaIngestLog({
        entriesReceived: leadgenEntries.length,
        leadsCreated,
        duplicates,
        failed,
        durationMs: Date.now() - startedAt,
        requestId,
      });
      console.log(JSON.stringify(summary));

      if (leadgenEntries.length === 0) {
        return res.status(200).json({ success: true, ...summary, results });
      }
      if (leadsCreated + duplicates === 0 && failed > 0) {
        return res.status(500).json({
          success: false,
          ...summary,
          results,
        });
      }
      return res.status(leadsCreated > 0 ? 201 : 200).json({
        success: true,
        ...summary,
        results,
      });
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
    let existingLeadId = null;

    if (duplicateRule !== 'create') {
      const existingLeadsSnap = await db.collection('leads')
        .where('phone', '==', phone)
        .limit(1)
        .get();

      if (!existingLeadsSnap.empty) {
        existingLeadId = existingLeadsSnap.docs[0].id;
        existingLead = { id: existingLeadId, ...existingLeadsSnap.docs[0].data() };
      }
    }

    if (existingLead && existingLeadId) {
      if (duplicateRule === 'skip') {
        console.log(`Duplicate lead found: ${phone}. Rule is set to 'skip'. Ingestion ignored.`);

        await writeAuditLog(db, {
          action: isGoogle ? 'Duplicate Lead Skipped (Google Ads)' : 'Duplicate Lead Skipped (Meta/Generic)',
          details: `Customer: ${name}, Phone: ${phone} matched existing lead ID: ${existingLeadId}. Ingestion skipped.`,
          user: 'api_webhook',
        });

        return res.status(200).json({ success: true, leadId: existingLeadId, duplicate: true, action: 'skipped' });
      } else {
        console.log(`Duplicate lead found: ${phone}. Rule is set to 'merge'. Merging notes into existing lead ID: ${existingLeadId}`);

        await appendCallLog(db, existingLeadId, {
          date: new Date().toISOString(),
          note: `Duplicate lead attempt detected via Webhook Ingestion. Notes merged: ${notes}`,
          status: existingLead.status || 'new',
          agent: 'system',
        });

        await writeAuditLog(db, {
          action: isGoogle ? 'Duplicate Lead Blocked (Google Ads)' : 'Duplicate Lead Blocked (Meta/Generic)',
          details: `Customer: ${name}, Phone: ${phone} matched existing lead ID: ${existingLeadId}. Merged logs.`,
          user: 'api_webhook',
        });

        return res.status(200).json({ success: true, leadId: existingLeadId, duplicate: true, action: 'merged' });
      }
    }

    const leadRef = db.collection('leads').doc();
    const newLeadId = leadRef.id;
    const leadRecord = {
      id: newLeadId,
      leadReference: generateUlid(),
      name,
      phone,
      email,
      projectId: '',
      plotId: '',
      assignedTo: '',
      assignedToName: 'Unassigned',
      status: 'raw',
      priority: 'warm',
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      callCount: 0,
      hasAgentCall: false,
    };

    await leadRef.set(leadRecord);
    await appendCallLog(db, newLeadId, {
      date: new Date().toISOString(),
      note: `Lead created via Webhook Ingestion. Source: ${googleKey ? 'Google' : 'Meta/Generic'}`,
      status: 'raw',
      agent: 'system',
    });

    await writeAuditLog(db, {
      action: googleKey ? 'Ingest Lead (Google Ads)' : 'Ingest Lead (Meta/Generic)',
      details: `Customer: ${name}, Phone: ${phone}. Awaiting onLeadCreated allocation.`,
      user: 'api_webhook',
    });

    return res.status(201).json({ success: true, leadId: newLeadId });

  } catch (err) {
    console.error('Failed to ingest lead: ', err);
    return res.status(500).send('Ingestion error: ' + err.message);
  }
};

// POST /leads/bulk
const handlePostBulkLeads = async (req, res) => {
  const db = admin.firestore();
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

    const { summary, results, failures } = await runBulkImport(
      {
        db,
        appendCallLog,
        publishNotification,
        sendFcm,
        cleanLeadData,
        settings,
      },
      rawLeads,
      { chunkSize: req.body.chunkSize },
    );

    console.log(JSON.stringify(summary));

    await writeAuditLog(db, {
      action: 'Bulk Upload Clean & Import',
      details: `Imported ${summary.created} leads, merged ${summary.duplicates} duplicates, failed ${summary.failed} records (chunkSize=${summary.chunkSize}, ${summary.durationMs}ms).`,
      user: req.body.operator || 'bulk_api_webhook',
    });

    const payload = {
      success: summary.failed === 0 || summary.created + summary.duplicates > 0,
      imported: summary.created,
      created: summary.created,
      duplicates: summary.duplicates,
      errors: summary.failed,
      failed: summary.failed,
      received: summary.received,
      durationMs: summary.durationMs,
      chunkSize: summary.chunkSize,
      chunks: summary.chunks,
      failures,
      results,
    };

    if (summary.created + summary.duplicates === 0 && summary.failed > 0) {
      return res.status(500).json(payload);
    }
    return res.status(200).json(payload);
  } catch (err) {
    console.error(
      JSON.stringify({
        event: 'bulk_import_failed',
        message: err && err.message ? err.message : String(err),
      }),
    );
    return res.status(500).send('Bulk upload error: ' + err.message);
  }
};

// POST /ivr
const handlePostIvr = async (req, res) => {
  const db = admin.firestore();
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

    const normalizedCaller = cleanLeadData({ phone: callerPhone });
    const normalizedCallerPhone = normalizedCaller.phone;

    let matchedLead = null;
    let matchedLeadId = null;
    if (normalizedCallerPhone) {
      const leadsSnap = await db.collection('leads')
        .where('phone', '==', normalizedCallerPhone)
        .limit(1)
        .get();

      if (!leadsSnap.empty) {
        matchedLeadId = leadsSnap.docs[0].id;
        matchedLead = { id: matchedLeadId, ...leadsSnap.docs[0].data() };
      }
    }

    if (matchedLead) {
      callerName = matchedLead.name;
      leadId = matchedLeadId || matchedLead.id || '';
      assignedTo = matchedLead.assignedTo || '';
    }

    let targetAgentId = req.body.ivrAgentId || req.query.ivrAgentId || assignedTo;

    if (!targetAgentId) {
      const { assignedTo: rrAgent } = await allocateRoundRobin();
      targetAgentId = rrAgent;
    }

    if (!targetAgentId) {
      const adminsSnap = await db.collection('users').where('role', '==', 'admin').limit(1).get();
      if (!adminsSnap.empty) {
        targetAgentId = adminsSnap.docs[0].id;
      }
    }

    if (!targetAgentId) {
      return res.status(404).send('No available agent to route the call.');
    }

    const ivrRef = db.collection('ivrCalls').doc();
    await ivrRef.set({
      id: ivrRef.id,
      agentId: targetAgentId,
      timestamp: new Date().toISOString(),
      callerPhone,
      callerName,
      leadId,
      status: 'ringing'
    });

    await writeAuditLog(db, {
      action: 'Inbound IVR Call',
      details: `Caller: ${callerName} (${callerPhone}) routed to telecaller agent: ${targetAgentId}`,
      user: 'ivr_webhook',
    });

    return res.status(200).json({ success: true, routedTo: targetAgentId, callId: ivrRef.id });

  } catch (err) {
    console.error('Failed to trigger IVR Call: ', err);
    return res.status(500).send('IVR triggering error: ' + err.message);
  }
};

// GET/POST /webhooks/whatsapp
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

    const result = await getMessagingProvider().handleWebhook(req.body || {});
    return res.status(200).json(result);
  } catch (err) {
    console.error('WhatsApp webhook error:', err);
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  handleGetLeads,
  handlePostLeads,
  handlePostBulkLeads,
  handlePostIvr,
  handleWhatsAppWebhook,
};
