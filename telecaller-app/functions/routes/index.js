const express = require('express');
const { onRequest } = require('firebase-functions/v2/https');
const {
  handleGetLeads,
  handlePostLeads,
  handlePostBulkLeads,
  handlePostIvr,
  handleWhatsAppWebhook,
} = require('../controllers/webhooks');
const { createRateLimiter } = require('../helpers/rateLimit');

const app = express();
// Capture the exact raw bytes so Meta's X-Hub-Signature-256 HMAC can be
// verified against the unparsed body (SEC-4). Cloud Functions also exposes
// req.rawBody, but the verify hook guarantees availability behind Express.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

// SEC-8: throttle bulk imports (best-effort, per warm instance). Legitimate
// bulk jobs are infrequent, so a small burst allowance is plenty.
const bulkRateLimiter = createRateLimiter({
  windowMs: 60_000,
  max: Number(process.env.BULK_RATE_LIMIT_MAX) || 10,
});

// Main webhook routes
app.get('/leads', handleGetLeads);
app.post('/leads', handlePostLeads);
app.post('/leads/bulk', bulkRateLimiter, handlePostBulkLeads);
app.post('/ivr', handlePostIvr);

// /api prefixed fallback routes
app.get('/api/webhooks/leads', handleGetLeads);
app.post('/api/webhooks/leads', handlePostLeads);
app.post('/api/webhooks/leads/bulk', bulkRateLimiter, handlePostBulkLeads);
app.post('/api/webhooks/ivr', handlePostIvr);

// WhatsApp / Evolution routes
app.get('/webhooks/whatsapp', handleWhatsAppWebhook);
app.post('/webhooks/whatsapp', handleWhatsAppWebhook);
app.get('/api/webhooks/whatsapp', handleWhatsAppWebhook);
app.post('/api/webhooks/whatsapp', handleWhatsAppWebhook);

const api = onRequest({ region: 'us-central1' }, app);

module.exports = {
  api,
};
