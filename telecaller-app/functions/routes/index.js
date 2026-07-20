const express = require('express');
const { onRequest } = require('firebase-functions/v2/https');
const {
  handleGetLeads,
  handlePostLeads,
  handlePostBulkLeads,
  handlePostIvr,
  handleWhatsAppWebhook,
} = require('../controllers/webhooks');

const app = express();
app.use(express.json());

// Main webhook routes
app.get('/leads', handleGetLeads);
app.post('/leads', handlePostLeads);
app.post('/leads/bulk', handlePostBulkLeads);
app.post('/ivr', handlePostIvr);

// /api prefixed fallback routes
app.get('/api/webhooks/leads', handleGetLeads);
app.post('/api/webhooks/leads', handlePostLeads);
app.post('/api/webhooks/leads/bulk', handlePostBulkLeads);
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
