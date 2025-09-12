const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");

const BUSINESS_NAME = "RapidWeb";
let WEBHOOK_URL = require("../index").WEBHOOK_URL;

function extractFormData(reqBody) {
  return {
    first_name: reqBody.first_name || '',
    email: reqBody.email || '',
    message: reqBody.message || ''
  };
}

async function sendToWebhook(data) {
  try {
    const formData = new URLSearchParams();
    formData.append("first_name", data.first_name);
    formData.append("email", data.email);
    formData.append("message", data.message);
    formData.append("timestamp", new Date().toISOString());
    formData.append("source", BUSINESS_NAME);

    const response = await fetch(WEBHOOK_URL, { method: "POST", body: formData });
    console.log("✅ Form data sent to webhook:", data);
    return response.ok;
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return false;
  }
}

router.post("/send", async (req, res) => {
  const formData = extractFormData(req.body);
  if (!formData.email || !formData.first_name) return res.status(400).send("Missing required fields");

  const sent = await sendToWebhook(formData);
  if (sent) res.status(200).send("Form data received and sent");
  else res.status(500).send("Failed to send form data");
});

module.exports = router;
