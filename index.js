const express = require("express");
const fetch = require("node-fetch");
const bodyParser = require("body-parser");
const path = require("path");
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_API_KEY;
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_API_SECRET;
const APP_URL = process.env.APP_URL;

// Default webhook URL (can be updated via /hook page)
let WEBHOOK_URL = 'https://hook.eu2.make.com/tnoc53juwpz8ozheiwcdkz1etab8jekr';

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from public/
app.use(express.static(path.join(__dirname, 'public')));

// Mount hook route
const hookRouter = require("./api/hook");
app.use("/hook", hookRouter);

// Root route - homepage
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>AutoInboxAI</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f4f7f8; color: #333; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .container { text-align: center; background: #fff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); width: 100%; max-width: 500px; }
        input { width: 100%; padding: 12px; margin: 12px 0; border-radius: 6px; border: 1px solid #ccc; font-size: 1rem; }
        button { padding: 12px 24px; border: none; border-radius: 6px; background-color: #0070f3; color: #fff; font-size: 1rem; cursor: pointer; }
        button:hover { background-color: #005ecb; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>AutoInboxAI Webhook Configuration</h1>
        <p>Update the webhook URL that receives Shopify form submissions:</p>
        <input type="text" id="webhookInput" value="${WEBHOOK_URL}" />
        <button onclick="updateWebhook()">Save Webhook URL</button>
        <p id="status" style="color: green;"></p>

        <script>
          function updateWebhook() {
            const newUrl = document.getElementById('webhookInput').value;
            fetch('/hook/update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ webhook: newUrl })
            })
            .then(res => res.text())
            .then(msg => {
              document.getElementById('status').innerText = msg;
            })
            .catch(err => {
              document.getElementById('status').innerText = '❌ Error updating webhook';
            });
          }
        </script>
      </div>
    </body>
    </html>
  `);
});

// Route to update webhook URL dynamically
app.post("/hook/update", (req, res) => {
  const newWebhook = req.body.webhook;
  if (!newWebhook) return res.status(400).send('Webhook URL cannot be empty.');

  WEBHOOK_URL = newWebhook; // Update in memory
  console.log(`✅ Webhook URL updated to: ${WEBHOOK_URL}`);
  res.send('✅ Webhook URL updated successfully!');
});

// Shopify OAuth start
app.get("/auth", (req, res) => {
  const shop = req.query.shop;
  const redirectUri = `${APP_URL}/auth/callback`;
  const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${SHOPIFY_CLIENT_ID}&scope=write_script_tags&redirect_uri=${redirectUri}`;

  res.redirect(installUrl);
});

// Shopify OAuth callback
app.get("/auth/callback", async (req, res) => {
  const { shop, code } = req.query;

  try {
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: SHOPIFY_CLIENT_ID,
        client_secret: SHOPIFY_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    console.log(`✅ App installed on ${shop}`);
    console.log(`Access Token: ${accessToken}`);

    // Create ScriptTag
    await fetch(`https://${shop}/admin/api/2025-07/script_tags.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        script_tag: {
          event: "onload",
          src: `${APP_URL}/contact-form.js`,
        },
      }),
    });

    res.send("✅ App installed and ScriptTag added!");
  } catch (error) {
    console.error("❌ Shopify OAuth error:", error);
    res.status(500).send("❌ Something went wrong during Shopify OAuth.");
  }
});

// Serve the injected JavaScript explicitly
app.get("/contact-form.js", (req, res) => {
  res.type("application/javascript");
  res.sendFile(path.join(__dirname, "public", "contactform.js"));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 App running on port ${PORT}`);
});

// Export WEBHOOK_URL for hook.js to use dynamically if needed
module.exports = { WEBHOOK_URL };
