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
  res.send("✅ AutoInboxAI is live and running! Welcome to your Shopify contact form app.");
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

// Serve the injected JavaScript explicitly (backup route)
app.get("/contact-form.js", (req, res) => {
  res.type("application/javascript");
  res.sendFile(path.join(__dirname, "public", "contactform.js"));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 App running on port ${PORT}`);
});
