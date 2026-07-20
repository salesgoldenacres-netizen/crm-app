const admin = require('firebase-admin');
const { initFunctionsSentry } = require('./helpers/sentry');

// Optional Sentry (SENTRY_DSN) — warn if missing; never a deploy blocker.
initFunctionsSentry();

// Initialize Admin SDK once for all submodules to reuse
admin.initializeApp();
const db = admin.firestore();

// Import services/utilities
const { sendFcm } = require('./services/fcm');
const { registerSiteVisitJobs, registerSlaBreachJobs } = require('./automation');

// Export triggers
const { onLeadCreated, onLeadCallLogUpdated } = require('./triggers/leads');
const { onUserCreated } = require('./triggers/users');
const { onCallLogCreated } = require('./triggers/callLogs');
const { onRemoteConfigSettingsUpdated } = require('./triggers/remoteConfig');

exports.onLeadCreated = onLeadCreated;
exports.onLeadCallLogUpdated = onLeadCallLogUpdated;
exports.onUserCreated = onUserCreated;
exports.onCallLogCreated = onCallLogCreated;
exports.onRemoteConfigSettingsUpdated = onRemoteConfigSettingsUpdated;

// Export callables
const { aiComplete } = require('./ai/complete');
const { setManagerialClaim, linkUserProfile } = require('./auth/claims');
const { sendFcmNotification } = require('./services/fcm');
const { triggerOutboundCall } = require('./services/ivr');

exports.aiComplete = aiComplete;
exports.setManagerialClaim = setManagerialClaim;
exports.linkUserProfile = linkUserProfile;
exports.sendFcmNotification = sendFcmNotification;
exports.triggerOutboundCall = triggerOutboundCall;

// Export messaging callables
const {
  messagingStatus,
  messagingTestConnection,
  messagingInstanceAction,
  messagingSend
} = require('./services/messaging');

exports.messagingStatus = messagingStatus;
exports.messagingTestConnection = messagingTestConnection;
exports.messagingInstanceAction = messagingInstanceAction;
exports.messagingSend = messagingSend;

// Export API / Webhooks Express App
const { api } = require('./routes');
exports.api = api;

// Export cron jobs
const { scheduledFollowUpReminders, scheduledOverdueFollowUps } = require('./jobs/reminders');
const { cleanupOldAuditLogs } = require('./jobs/cleanup');
const { scheduledAgentIdleCheck } = require('./jobs/idleCheck');

exports.scheduledFollowUpReminders = scheduledFollowUpReminders;
exports.scheduledOverdueFollowUps = scheduledOverdueFollowUps;
exports.cleanupOldAuditLogs = cleanupOldAuditLogs;
exports.scheduledAgentIdleCheck = scheduledAgentIdleCheck;

// Register dynamic jobs mutating exports (site-visit, SLA breaches)
registerSiteVisitJobs({ db, sendFcm, exports });
registerSlaBreachJobs({ db, sendFcm, exports });
