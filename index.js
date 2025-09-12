const express = require("express");
const fetch = require("node-fetch");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_API_KEY;
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_API_SECRET;
const APP_URL = process.env.APP_URL;

// In-memory storage for access tokens per shop
const SHOP_TOKENS = {};
let WEBHOOK_URL = process.env.WEBHOOK_URL;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve contactform.js
app.use("/contact-form.js", express.static(__dirname + "/public/contactform.js"));

// ===========================================
// Root page
// ===========================================
app.get("/", (req, res) => {
  res.send(`
    <html>
      <body style="font-family:Arial,sans-serif; text-align:center; padding:50px;">
        <h1>🚀 AutoInboxAI App is Live!</h1>
        <p>Go to <a href="/hook">/hook</a> to configure your webhook URL.</p>
      </body>
    </html>
  `);
});

// ===========================================
// Webhook admin page
// ===========================================
app.get("/hook", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Webhook Configuration</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; background: #f5f5f5; }
          .container { max-width: 600px; margin: auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
          h1 { color: #333; }
          input[type="text"] { width: 100%; padding: 10px; margin: 10px 0 20px 0; border-radius: 4px; border: 1px solid #ccc; }
          button { padding: 10px 20px; background: #007bff; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
          button:hover { background: #0056b3; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Webhook Configuration</h1>
          <form method="POST" action="/hook/update">
            <label for="webhook">Current Webhook URL:</label>
            <input type="text" id="webhook" name="webhook" value="${WEBHOOK_URL}" />
            <button type="submit">Save Webhook URL</button>
          </form>
        </div>
      </body>
    </html>
  `);
});

app.post("/hook/update", (req, res) => {
  const newUrl = req.body.webhook;
  if (newUrl) {
    WEBHOOK_URL = newUrl;
    console.log(`✅ Webhook URL updated to: ${WEBHOOK_URL}`);
    res.send(`
      <html>
        <body style="font-family:Arial,sans-serif; text-align:center; padding:50px;">
          <p>✅ Webhook URL updated successfully!</p>
          <a href="/hook">Back to Webhook Page</a>
        </body>
      </html>
    `);
  } else {
    res.status(400).send("Invalid Webhook URL.");
  }
});

// ===========================================
// Shopify OAuth
// ===========================================
app.get("/auth", (req, res) => {
  const shop = req.query.shop;
  if (!shop) return res.status(400).send("Missing shop parameter");
  const redirectUri = `${APP_URL}/auth/callback`;
  const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${SHOPIFY_CLIENT_ID}&scope=write_script_tags&redirect_uri=${redirectUri}`;
  res.redirect(installUrl);
});

app.get("/auth/callback", async (req, res) => {
  const { shop, code } = req.query;
  if (!shop || !code) return res.status(400).send("Missing shop or code");

  try {
    // Exchange code for access token
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
    SHOP_TOKENS[shop] = accessToken;
    console.log(`✅ App installed on ${shop}`);
    console.log(`Access Token: ${accessToken}`);

    // Create ScriptTag
    const scriptRes = await fetch(`https://${shop}/admin/api/2025-07/script_tags.json`, {
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

    const scriptData = await scriptRes.json();
    console.log("📌 ScriptTag response:", scriptData);

    if (scriptData.errors) {
      return res.status(400).send("❌ Failed to create ScriptTag: " + JSON.stringify(scriptData.errors));
    }

    res.send(`
      <html>
        <body style="font-family:Arial,sans-serif; text-align:center; padding:50px;">
          <h1>🚀 AutoInboxAI Installed!</h1>
          <p>✅ ScriptTag created and injected into your storefront</p>
          <a href="/hook">Configure webhook</a>
        </body>
      </html>
    `);
  } catch (err) {
    console.error("❌ OAuth Callback Error:", err);
    res.status(500).send("OAuth error: " + err.message);
  }
});

// ===========================================
// Export webhook URL for hook.js
// ===========================================
module.exports = { WEBHOOK_URL };

// ===========================================
// Start server
// ===========================================
app.listen(PORT, () => {
  console.log(`🚀 App running on port ${PORT}`);
});
