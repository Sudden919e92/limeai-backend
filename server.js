// server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Allow both possible frontend origins (no trailing spaces!)
const ALLOWED_FRONTENDS = [
  'https://limeroolon.pages.dev',
  'https://limerool.pages.dev'  // ← This covers https://limerool.pages.dev/ai
];

const isNgrokOrigin = (origin) => {
  return origin && origin.endsWith('.ngrok.io');
};

const LOG_DIR = path.join(__dirname, 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_FRONTENDS.includes(origin) || isNgrokOrigin(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked origin: ${origin}`);
      callback(new Error('Forbidden by CORS policy'));
    }
  }
}));

app.use(express.json({ limit: '1mb' }));

app.post('/ping', (req, res) => {
  try {
    const data = req.body;
    if (!data || typeof data !== 'object' || !data.target) {
      console.warn('[LimeAI] ❌ Invalid payload received');
      return res.status(400).end();
    }

    const logEntry = {
      receivedAt: new Date().toISOString(),
      ...data
    };

    console.log('\n[LimeAI] 📡 Telemetry received:');
    console.log(JSON.stringify(logEntry, null, 2));

    const dateStr = new Date().toISOString().split('T')[0];
    const logPath = path.join(LOG_DIR, `telemetry-${dateStr}.jsonl`);
    fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');

    res.status(200).end();
  } catch (err) {
    console.error('[LimeAI] 🔥 Error processing ping:', err.message);
    res.status(500).end();
  }
});

app.get('/', (req, res) => {
  res.json({
    status: 'LimeAI Backend Active ✅',
    allowedFrontends: ALLOWED_FRONTENDS,
    ping: 'POST /ping'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ LimeAI backend running on port ${PORT}`);
  console.log(`🌐 Accepting pings from:`);
  ALLOWED_FRONTENDS.forEach(url => console.log(`   - ${url}`));
  console.log(`   - *.ngrok.io`);
  console.log(`📡 Endpoint: POST /ping\n`);
});
