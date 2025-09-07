const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

const BUSINESS_NAME = 'RapidWeb';
const WEBHOOK_URL = 'https://hook.eu2.make.com/tnoc53juwpz8ozheiwcdkz1etab8jekr';

function extractFormData(reqBody) {
  return {
    first_name: reqBody.name || '',
    email: reqBody.email || '',
    message: reqBody.message || ''
  };
}

async function sendToWebhook(data) {
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        timestamp: new Date().toISOString(),
        source: BUSINESS_NAME
      })
    });

    console.log('✅ Form data sent to webhook:', data);
    return response.ok;
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return false;
  }
}

router.post('/', async (req, res) => {
  const referer = req.headers.referer || '';
  if (!referer.includes('/contact')) return res.status(200).send('Not a contact form submission.');

  const formData = extractFormData(req.body);
  if (!formData.email || !formData.first_name) return res.status(400).send('Missing required fields.');

  const sent = await sendToWebhook(formData);
  if (sent) res.status(200).send('Form data received and sent.');
  else res.status(500).send('Failed to send form data.');
});

module.exports = router;
