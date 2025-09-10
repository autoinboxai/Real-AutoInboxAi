const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");

// ===========================================
// CLIENT CONFIGURATION
// ===========================================
const BUSINESS_NAME = "RapidWeb";

// This will be updated dynamically from index.js
let WEBHOOK_URL = require("../index").WEBHOOK_URL;

// Extract form data
function extractFormData(reqBody) {
  const data = {};
  if (reqBody.name) data.first_name = reqBody.name;
  if (reqBody.email) data.email = reqBody.email;
  if (reqBody.message) data.message = reqBody.message;
  return data;
}

// Send data to Make.com webhook
async function sendToWebhook(data) {
  try {
    const formData = new URLSearchParams();
    formData.append("first_name", data.first_name || "");
    formData.append("email", data.email || "");
    formData.append("message", data.message || "");
    formData.append("timestamp", new Date().toISOString());
    formData.append("source", BUSINESS_NAME);

    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      body: formData,
    });

    console.log("✅ Form data sent to webhook:", data);
    return response.ok;
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return false;
  }
}

// Shopify contact form webhook endpoint
router.post("/", async (req, res) => {
  const referer = req.headers.referer || "";
  if (!referer.includes("/contact")) {
    return res.status(200).send("Not a contact form submission.");
  }

  const formData = extractFormData(req.body);
  if (!formData.email || !formData.first_name) {
    return res.status(400).send("Missing required fields.");
  }

  const sent = await sendToWebhook(formData);
  if (sent) res.status(200).send("Form data received and sent.");
  else res.status(500).send("Failed to send form data.");
});

module.exports = router;
