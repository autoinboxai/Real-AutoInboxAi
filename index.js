const express = require("express");
const fetch = require("node-fetch");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

let WEBHOOK_URL = "https://hook.eu2.make.com/tnoc53juwpz8ozheiwcdkz1etab8jekr";

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_API_KEY;
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_API_SECRET;
const APP_URL = process.env.APP_URL;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static contact form script
app.use("/contact-form.js", express.static(__dirname + "/public/contactform.js"));

// ===========================================
// Root dashboard (shown inside Shopify Admin)
// ===========================================
app.get("/", (req, res) => {
  res.send(`
    <html>
      <body style="font-family:Arial,sans-serif; text-align:center; padding:50px;">
        <h1>🚀 AutoInboxAI App Installed</h1>
        <p>This app is now connected to your store.</p>
        <p>➡️ Configure your webhook at <a href="/hook">/hook</a>.</p>
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
      <head><title>Webhook Config</title></head>
      <body>
        <h1>Webhook Configuration</h1>
        <form method="POST" action="/hook/update">
          <input type="text" name="webhook" value="${WEBHOOK_URL}" style="width:400px;" />
          <button type="submit">Save</button>
        </form>
      </body>
    </html>
  `);
});

// Update webhook URL
app.post("/hook/update", (req, res) => {
  const newUrl = req.body.webhook;
  if (newUrl) {
    WEBHOOK_URL = newUrl;
    console.log(`✅ Webhook URL updated to: ${WEBHOOK_URL}`);
    res.redirect("/hook");
  } else {
    res.status(400).send("Invalid Webhook URL.");
  }
});

// ===========================================
// Shopify OAuth start
// ===========================================
app.get("/auth", (req, res) => {
  const shop = req.query.shop;
  if (!shop) return res.status(400).send("Missing shop parameter ?shop=your-store.myshopify.com");

  const redirectUri = `${APP_URL}/auth/callback`;
  const installUrl =
    `https://${shop}/admin/oauth/authorize` +
    `?client_id=${SHOPIFY_CLIENT_ID}` +
    `&scope=write_script_tags` +
    `&redirect_uri=${redirectUri}`;

  res.redirect(installUrl);
});

// Shopify OAuth callback
app.get("/auth/callback", async (req, res) => {
  const { shop, code } = req.query;
  if (!shop || !code) return res.status(400).send("Missing shop or code parameter");

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

    if (!accessToken) {
      console.error("❌ OAuth failed:", tokenData);
      return res.status(400).send("OAuth failed. Check logs.");
    }

    console.log(`✅ App installed on ${shop}`);
    console.log(`Access Token: ${accessToken}`);

    // Create ScriptTag
    await fetch(`https://${shop}/admin/api/2025-01/script_tags.json`, {
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

    res.send("✅ App installed and ScriptTag injected successfully.");
  } catch (err) {
    console.error("❌ OAuth callback error:", err);
    res.status(500).send("Server error during OAuth callback.");
  }
});

// ===========================================
// GDPR Compliance Endpoints
// ===========================================
app.post("/gdpr/customers/data_request", (req, res) => {
  console.log("GDPR data request:", req.body);
  res.sendStatus(200);
});

app.post("/gdpr/customers/redact", (req, res) => {
  console.log("GDPR customer redact:", req.body);
  res.sendStatus(200);
});

app.post("/gdpr/shop/redact", (req, res) => {
  console.log("GDPR shop redact:", req.body);
  res.sendStatus(200);
});

// ===========================================
// Export webhook URL for hook.js
// ===========================================
module.exports = { WEBHOOK_URL };

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AutoInboxAI running on port ${PORT}`);
});
