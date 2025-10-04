// server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Your frontend domain (Cloudflare Pages)
const FRONTEND_ORIGIN = 'https://limeroolon.pages.dev';

// Ensure logs directory exists
const LOG_DIR = path.join(__dirname, 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// CORS: Allow only your frontend + handle sendBeacon (which may send null origin)
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests from your site OR requests with no origin (common with sendBeacon)
    if (!origin || origin === FRONTEND_ORIGIN) {
      callback(null, true);
    } else {
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

    // Validate minimal payload
    if (!data || typeof data !== 'object' || !data.target) {
      console.warn('[LimeAI] ❌ Invalid payload received');
      return res.status(400).end(); // sendBeacon prefers no body
    }

    // Add server-side timestamp
    const logEntry = {
      receivedAt: new Date().toISOString(),
      ...data
    };

    // Log to console (for debugging)
    console.log('\n[LimeAI] 📡 Telemetry received:');
    console.log(JSON.stringify(logEntry, null, 2));

    // Save to daily JSONL log file (one JSON per line)
    const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const logPath = path.join(LOG_DIR, `telemetry-${dateStr}.jsonl`);
    fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');

    // Respond quickly with 200 OK (required for sendBeacon success)
    res.status(200).end();
  } catch (err) {
    console.error('[LimeAI] 🔥 Error processing ping:', err.message);
    res.status(500).end();
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'LimeAI Backend Active ✅',
    frontend: FRONTEND_ORIGIN,
    ping: 'POST /ping'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ LimeAI backend running on port ${PORT}`);
  console.log(`🌐 Accepting pings from: ${FRONTEND_ORIGIN}`);
  console.log(`📡 Endpoint: POST /ping\n`);
});