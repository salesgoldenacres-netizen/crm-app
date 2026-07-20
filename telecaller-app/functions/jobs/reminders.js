const admin = require('firebase-admin');
const {
  createScheduledJob,
  AUTOMATION_JOB_TYPES,
} = require('../automation');
const { sendFcm } = require('../services/fcm');
const {
  runSameDayFollowUpReminders,
  runOverdueFollowUpReminders,
} = require('./followUpReminders');

const scheduledFollowUpReminders = createScheduledJob({
  name: AUTOMATION_JOB_TYPES.FOLLOW_UP,
  schedule: '0 9 * * *',
  get db() { return admin.firestore(); },
  sendFcm,
  handler: runSameDayFollowUpReminders,
});

const scheduledOverdueFollowUps = createScheduledJob({
  name: AUTOMATION_JOB_TYPES.FOLLOW_UP_OVERDUE,
  schedule: '15 9 * * *',
  get db() { return admin.firestore(); },
  sendFcm,
  handler: runOverdueFollowUpReminders,
});

module.exports = {
  scheduledFollowUpReminders,
  scheduledOverdueFollowUps,
};
