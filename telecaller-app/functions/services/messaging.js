const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const {
  createMessagingProvider,
  NotConnectedError,
  UnsupportedCapabilityError,
  webhookUrlForProject,
} = require('../messaging');
const {
  assertCallerCanContactLead,
  tokenIsManagerial,
} = require('../helpers/leadAccess');

// enforceAppCheck: client initializes App Check (ReCaptcha v3); require a valid
// App Check token on every messaging callable (SEC-7).
const CALLABLE_OPTS = { region: 'us-central1', enforceAppCheck: true };

// Use lazy initialization or dynamic getter to ensure admin.initializeApp() is run before calling this
let providerInstance = null;
function getMessagingProvider() {
  if (!providerInstance) {
    providerInstance = createMessagingProvider(admin.firestore());
  }
  return providerInstance;
}

const messagingStatus = onCall(CALLABLE_OPTS, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required');
  }
  return getMessagingProvider().getStatus();
});

const messagingTestConnection = onCall(CALLABLE_OPTS, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required');
  }
  // SEC-MSG-R: provider credential probe is admin-only (fail closed).
  if (!tokenIsManagerial(request.auth)) {
    throw new HttpsError(
      'permission-denied',
      'Only managerial users can test messaging connections.',
    );
  }
  return getMessagingProvider().testConnection();
});

const messagingInstanceAction = onCall(CALLABLE_OPTS, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required');
  }
  // SEC-MSG-1: instance lifecycle (QR / connect / disconnect) is admin-only.
  if (!tokenIsManagerial(request.auth)) {
    throw new HttpsError(
      'permission-denied',
      'Only managerial users can manage messaging instances.',
    );
  }
  const action = request.data?.action;
  const provider = getMessagingProvider();
  try {
    if (action === 'qr') return await provider.getQr();
    if (action === 'reconnect') return await provider.reconnect();
    if (action === 'disconnect') return await provider.disconnect();
    if (action === 'createInstance') {
      if (typeof provider.createInstance !== 'function') {
        throw new HttpsError(
          'unimplemented',
          'Active provider does not support Create Instance',
        );
      }
      return await provider.createInstance({
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

const messagingSend = onCall(CALLABLE_OPTS, async (request) => {
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

  const db = admin.firestore();
  const leadSnap = await db.collection('leads').doc(leadId).get();
  if (!leadSnap.exists) {
    throw new HttpsError('not-found', 'Lead not found');
  }
  const lead = leadSnap.data();

  // Authorize: caller must own the lead or be managerial (SEC-3 IDOR).
  await assertCallerCanContactLead({ db, auth: request.auth, lead });

  const provider = getMessagingProvider();
  const providerId = provider.id || 'evolution';
  const leadHints = {
    phone: lead.phone,
    assignedTo: lead.assignedTo,
    assignedToName: lead.assignedToName,
  };
  const agentName =
    request.auth.token?.name || request.auth.token?.email || 'Agent';

  const status = await provider.getStatus();
  if (!status.connected) {
    const written = await provider.writeMessage(
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

  const pending = await provider.writeMessage(
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
      result = await provider.sendMedia({
        number: lead.phone,
        mediaUrl,
        mediaMimeType,
        fileName: mediaFileName,
        caption: text,
      });
    } else if (type === 'audio') {
      throw new HttpsError('unimplemented', 'Voice notes coming soon');
    } else {
      result = await provider.sendText({
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

module.exports = {
  messagingStatus,
  messagingTestConnection,
  messagingInstanceAction,
  messagingSend,
  getMessagingProvider,
};
