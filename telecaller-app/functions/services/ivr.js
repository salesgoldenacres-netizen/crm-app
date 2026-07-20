const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const axios = require('axios');
const { cleanLeadData } = require('../leads/cleanLeadData');

const triggerOutboundCall = onCall(
  { region: 'us-central1' },
  async (request) => {
    const db = admin.firestore();
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

module.exports = {
  triggerOutboundCall,
};
