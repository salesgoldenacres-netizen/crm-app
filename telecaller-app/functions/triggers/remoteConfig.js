const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

const onRemoteConfigSettingsUpdated = onDocumentWritten(
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

module.exports = {
  onRemoteConfigSettingsUpdated,
};
