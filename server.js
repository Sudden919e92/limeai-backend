// server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ FIXED: Removed trailing space in origin
const FRONTEND_ORIGIN = 'https://limeroolon.pages.dev';

// ✅ Allow ngrok domains dynamically (since they change on every restart)
// You can also hardcode your current ngrok URL if preferred
const isNgrokOrigin = (origin) => {
  return origin && origin.endsWith('.ngrok.io');
};

// Ensure logs directory exists
const LOG_DIR = path.join(__dirname, 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// ✅ Enhanced CORS: allow Cloudflare Pages, ngrok, and no-origin requests
app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin || // e.g., sendBeacon or same-origin
      origin === FRONTEND_ORIGIN ||
      isNgrokOrigin(origin)
    ) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked origin: ${origin}`);
      callback(new Error('Forbidden by CORS policy'));
    }
  }
}));

// Parse JSON bodies (up to 1MB)
app.use(express.json({ limit: '1mb' }));

// POST /ping — receives telemetry from LimeAI frontend
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

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'LimeAI Backend Active ✅',
    frontend: FRONTEND_ORIGIN,
    ping: 'POST /ping',
    logs: LOG_DIR
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ LimeAI backend running on port ${PORT}`);
  console.log(`🌐 Accepting pings from:`);
  console.log(`   - ${FRONTEND_ORIGIN}`);
  console.log(`   - *.ngrok.io (dynamic)`);
  console.log(`📡 Endpoint: POST /ping`);
  console.log(`📁 Logs: ${LOG_DIR}\n`);
});
