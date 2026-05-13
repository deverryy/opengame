const express    = require('express');
const http       = require('http');
const { WebSocketServer } = require('ws');
const fs         = require('fs');
const path       = require('path');

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocketServer({ server });

const PORT        = process.env.PORT || 3000;
const PUBLIC_DIR  = path.join(__dirname, '..'); // site root (index.html, list.json, games/)
const DATA_FILE   = path.join(__dirname, 'data.json');

/* ─── Persistent data (click counts) ─── */
function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (_) {}
    return { clicks: {} };
}
function saveData() {
    try { fs.writeFileSync(DATA_FILE, JSON.stringify(siteData, null, 2)); } catch (_) {}
}

let siteData = loadData();
// Debounced save — don't hammer disk on every click
let saveTimer = null;
function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveData, 2000);
}

/* ─── Online users tracking ─── */
const clients = new Set();

function broadcastStats() {
    const payload = JSON.stringify({
        type:   'stats',
        online: clients.size,
        popular: getTopGames(15)
    });
    clients.forEach(ws => {
        if (ws.readyState === ws.OPEN) ws.send(payload);
    });
}

function getTopGames(n) {
    return Object.entries(siteData.clicks)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([name, clicks]) => ({ name, clicks }));
}

/* ─── WebSocket ─── */
wss.on('connection', ws => {
    clients.add(ws);
    broadcastStats();

    ws.on('message', raw => {
        let msg;
        try { msg = JSON.parse(raw); } catch (_) { return; }

        if (msg.type === 'click' && typeof msg.name === 'string') {
            // Sanitise: only allow names that exist in list.json
            const name = msg.name.slice(0, 120).replace(/[^a-zA-Z0-9 _'\-.,!()]/g, '');
            siteData.clicks[name] = (siteData.clicks[name] || 0) + 1;
            scheduleSave();
            broadcastStats();
        }
    });

    ws.on('close', () => {
        clients.delete(ws);
        broadcastStats();
    });

    ws.on('error', () => {
        clients.delete(ws);
        broadcastStats();
    });
});

/* ─── Middleware ─── */
app.use(express.json());

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'no-referrer');
    // Prevent browsers caching JS/HTML so protection code is always fresh
    if (req.path.endsWith('.js') || req.path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-store');
    }
    next();
});

/* ─── API routes ─── */

// GET /api/stats — current online count + top games
app.get('/api/stats', (req, res) => {
    res.json({
        online:  clients.size,
        popular: getTopGames(15)
    });
});

// POST /api/click — record a game click (fallback for non-WS clients)
app.post('/api/click', (req, res) => {
    const { name } = req.body;
    if (!name || typeof name !== 'string') return res.status(400).json({ error: 'bad name' });
    const clean = name.slice(0, 120).replace(/[^a-zA-Z0-9 _'\-.,!()]/g, '');
    siteData.clicks[clean] = (siteData.clicks[clean] || 0) + 1;
    scheduleSave();
    broadcastStats();
    res.json({ ok: true, clicks: siteData.clicks[clean] });
});

// GET /api/popular — top N games by clicks
app.get('/api/popular', (req, res) => {
    const n = Math.min(parseInt(req.query.n) || 15, 50);
    res.json(getTopGames(n));
});

/* ─── Static files (serve site root) ─── */
app.use(express.static(PUBLIC_DIR, {
    extensions: ['html'],
    index: 'index.html'
}));

// 404 fallback
app.use((req, res) => res.status(404).send('Not found'));

/* ─── Start ─── */
server.listen(PORT, () => {
    console.log(`\n🌴  Library server running at http://localhost:${PORT}`);
    console.log(`   WebSocket ready on ws://localhost:${PORT}`);
    console.log(`   Serving files from: ${PUBLIC_DIR}\n`);
});