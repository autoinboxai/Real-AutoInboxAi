const express = require('express');
const bodyParser = require('body-parser');
const hook = require('./api/hook');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
const cors = require('cors');
app.use(cors());

// Parse URL-encoded and JSON bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve public JS files
app.use(express.static('public'));

// Webhook endpoint
app.use('/webhook', hook);

// Endpoint to create Shopify ScriptTag
app.post('/create-script-tag', async (req, res) => {
  const { shop, accessToken } = req.body;

  try {
    const response = await fetch(`https://${shop}/admin/api/2025-07/script_tags.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken
      },
      body: JSON.stringify({
        script_tag: {
          event: 'onload',
          src: `https://${req.headers.host}/contactform.js`,
          display_scope: 'online_store'
        }
      })
    });

    const data = await response.json();
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error creating ScriptTag:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Default route
app.get('/', (req, res) => {
  res.send('✅ AutoInboxAI Webhook Server is running.');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
