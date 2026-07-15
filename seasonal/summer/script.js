// ─── CONFIG ────────────────────────────────────────────────────────────────

const BACKEND_URL = '';  // ← paste your backend URL here

const SEED_POPULAR = [
  'Minecraft', 'slope', '1v1.lol', 'Among Us', 'Retro Bowl',
  'Brawl Stars', 'Bloons TD6', 'run3', 'BitLife', 'Basketball Stars',
  'Cuphead', 'Terraria', 'DOOM', 'Hollow Knight', 'geodash'
];

// ─── STATE ─────────────────────────────────────────────────────────────────

let allGames     = [];
let popularNames = [];
let ctxTarget    = null;

// Persist a unique visitor ID for the session
let userId = sessionStorage.getItem('_uid');
if (!userId) {
  userId = 'u-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  sessionStorage.setItem('_uid', userId);
}

const PAGE_START = Date.now();

// ─── INIT ──────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadGames();
  setupContextMenu();
  setupDebugPanel();
  setupProtection();

  if (BACKEND_URL) {
    sendHeartbeat();
    setInterval(sendHeartbeat, 30_000);
    pollStats();
    setInterval(pollStats, 15_000);
  } else {
    markOffline();
  }
});

// ─── BACKEND ───────────────────────────────────────────────────────────────

async function sendHeartbeat() {
  try {
    await fetch(`${BACKEND_URL}/api/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
  } catch (_) {}
}

async function pollStats() {
  try {
    const res  = await fetch(`${BACKEND_URL}/api/stats`);
    const data = await res.json();

    setOnlineCount(data.online ?? 0);

    if (Array.isArray(data.popular) && data.popular.length) {
      popularNames = data.popular.map(g => g.name);
      if (allGames.length) {
        renderFeatured();
        renderAll();
      }
    }
  } catch (_) {}
}

function recordClick(name) {
  if (!BACKEND_URL) return;
  fetch(`${BACKEND_URL}/api/click`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  }).catch(() => {});
}

function setOnlineCount(n) {
  const pill  = document.getElementById('onlinePill');
  const count = document.getElementById('onlineCount');
  if (!pill || !count) return;
  pill.classList.remove('connecting');
  count.textContent = `${n} online now`;
}

function markOffline() {
  const count = document.getElementById('onlineCount');
  const pill  = document.getElementById('onlinePill');
  if (count) count.textContent = '–';
  if (pill)  pill.classList.remove('connecting');
}

// ─── LOAD GAMES ────────────────────────────────────────────────────────────

async function loadGames() {
  const detailEl = document.getElementById('loadDetail');
  const setDetail = msg => { if (detailEl) detailEl.textContent = msg; };

  try {
    setDetail('Fetching list.json…');
    const res = await fetch('/list.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    setDetail('Parsing…');
    const text = await res.text();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      throw new Error(`Invalid JSON — ${e.message}`);
    }

    if (!Array.isArray(parsed)) throw new Error('list.json must be an array');

    allGames = parsed;
    document.getElementById('gameCountLabel').textContent = `${allGames.length} games`;

    renderFeatured();
    renderAll();
  } catch (err) {
    document.getElementById('gamesList').innerHTML = `
      <div class="load-placeholder" style="grid-column:1/-1">
        <div style="font-size:2em;margin-bottom:10px">⚠️</div>
        <strong style="color:#ff6b6b">${err.message}</strong>
        <div style="margin-top:10px;font-size:.8em;opacity:.65;line-height:1.6">
          Make sure <code style="background:rgba(0,0,0,.06);padding:1px 6px;border-radius:4px">list.json</code>
          exists in the root of your project.
        </div>
        <button onclick="loadGames()"
          style="margin-top:16px;padding:8px 22px;background:#2196f3;color:#fff;border:none;border-radius:100px;cursor:pointer;font-family:inherit;font-weight:600;font-size:.84em;">
          Retry
        </button>
      </div>`;
  }
}

// ─── RENDER ────────────────────────────────────────────────────────────────

function renderFeatured() {
  const list  = document.getElementById('featuredList');
  const label = document.getElementById('featuredLabel');
  if (!list) return;

  const ranked = popularNames.length ? popularNames : SEED_POPULAR;
  const isLive = popularNames.length > 0;
  const picks  = [];

  // Try to fill 15 slots from the ranked list first, then fill from seeds
  for (const name of ranked) {
    if (picks.length >= 15) break;
    const match = allGames.find(g =>
      g.name.toLowerCase()    === name.toLowerCase() ||
      g.display.toLowerCase() === name.toLowerCase()
    );
    if (match) picks.push(match);
  }

  for (const name of SEED_POPULAR) {
    if (picks.length >= 15) break;
    const match = allGames.find(g =>
      g.name.toLowerCase()    === name.toLowerCase() ||
      g.display.toLowerCase() === name.toLowerCase()
    );
    if (match && !picks.includes(match)) picks.push(match);
  }

  if (label) label.textContent = isLive ? '🔥 Popular Right Now' : '⭐ Featured Games';

  list.innerHTML = '';
  picks.forEach((game, i) => list.appendChild(buildCard(game, i, true)));
}

function renderAll() {
  const list    = document.getElementById('gamesList');
  const noGames = document.getElementById('noGames');
  if (!list) return;

  const featured = new Set(
    (popularNames.length ? popularNames : SEED_POPULAR).map(n => n.toLowerCase())
  );

  const rest = allGames
    .filter(g =>
      !featured.has(g.name.toLowerCase()) &&
      !featured.has(g.display.toLowerCase())
    )
    .sort((a, b) => a.display.localeCompare(b.display));

  document.getElementById('allLabel').textContent = `All Games (${rest.length})`;
  noGames.classList.add('hidden');
  list.innerHTML = '';
  rest.forEach((game, i) => list.appendChild(buildCard(game, i, false)));
}

function buildCard(game, index, isFeatured) {
  const card = document.createElement('div');
  card.className = 'game-card' + (isFeatured ? ' featured' : '');
  card.style.animationDelay = `${Math.min(index * 0.028, 0.52)}s`;
  card.dataset.name = game.name;

  card.innerHTML = `
    <div class="card-shimmer"></div>
    ${isFeatured ? '<div class="badge-hot">Hot</div>' : ''}
    ${isFeatured && index < 3 ? `<div class="badge-rank">#${index + 1}</div>` : ''}
    <h3 class="card-title">${game.display}</h3>
    <p class="card-sub">Click to play</p>`;

  card.addEventListener('click', () => openGame(game.name, game.display));
  card.addEventListener('contextmenu', e => {
    e.preventDefault();
    ctxTarget = game;
    positionCtxMenu(e.clientX, e.clientY);
  });

  return card;
}

// ─── SEARCH ────────────────────────────────────────────────────────────────

function filterGames() {
  const query         = document.getElementById('searchInput').value.trim().toLowerCase();
  const featuredPanel = document.getElementById('featuredPanel');
  const allLabel      = document.getElementById('allLabel');
  const noGames       = document.getElementById('noGames');
  const list          = document.getElementById('gamesList');

  if (!query) {
    featuredPanel.classList.remove('hidden');
    renderAll();
    return;
  }

  featuredPanel.classList.add('hidden');

  const results = allGames.filter(g =>
    g.display.toLowerCase().includes(query) ||
    g.name.toLowerCase().includes(query)
  );

  allLabel.textContent = `Results (${results.length})`;
  list.innerHTML = '';
  noGames.classList.add('hidden');

  if (!results.length) {
    noGames.classList.remove('hidden');
    return;
  }

  results.forEach((game, i) => list.appendChild(buildCard(game, i, false)));
}

// ─── CONTEXT MENU ──────────────────────────────────────────────────────────

function setupContextMenu() {
  const menu     = document.getElementById('ctxMenu');
  const playBtn  = document.getElementById('ctxPlay');
  const debugBtn = document.getElementById('ctxDebug');

  playBtn.addEventListener('click', () => {
    closeCtxMenu();
    if (ctxTarget) openGame(ctxTarget.name, ctxTarget.display);
  });

  debugBtn.addEventListener('click', () => {
    closeCtxMenu();
    if (ctxTarget) openDebug(ctxTarget);
  });

  document.addEventListener('click',   e => { if (!menu.contains(e.target)) closeCtxMenu(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCtxMenu(); });
}

function positionCtxMenu(x, y) {
  const menu = document.getElementById('ctxMenu');
  menu.style.left = '0';
  menu.style.top  = '0';
  menu.classList.remove('open');

  requestAnimationFrame(() => {
    const mw = menu.offsetWidth  || 210;
    const mh = menu.offsetHeight || 90;
    menu.style.left = `${Math.min(x, window.innerWidth  - mw - 8)}px`;
    menu.style.top  = `${Math.min(y, window.innerHeight - mh - 8)}px`;
    menu.classList.add('open');
  });
}

function closeCtxMenu() {
  document.getElementById('ctxMenu').classList.remove('open');
}

// ─── DEBUG PANEL ───────────────────────────────────────────────────────────

function setupDebugPanel() {
  document.getElementById('debugClose').addEventListener('click', closeDebug);
  document.getElementById('debugOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('debugOverlay')) closeDebug();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeDebug();
  });
}

function openDebug(game) {
  const overlay = document.getElementById('debugOverlay');
  const body    = document.getElementById('debugBody');

  document.getElementById('dbGameName').textContent = game.display;

  const sessionId  = Array.from({ length: 5 }, () =>
    Math.floor(Math.random() * 0xFFFF).toString(16).padStart(4, '0')
  ).join('-').toUpperCase();

  const rankIndex = popularNames.findIndex(n =>
    n.toLowerCase() === game.name.toLowerCase()
  );
  const rank       = popularNames.length && rankIndex !== -1 ? rankIndex + 1 : '–';
  const renderTime = (Math.random() * 280 + 40).toFixed(1) + ' ms';
  const uptime     = formatUptime(Date.now() - PAGE_START);
  const timestamp  = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const userAgent  = navigator.userAgent.slice(0, 58) + '…';
  const connection = (navigator.connection?.effectiveType || 'unknown').toUpperCase();
  const memory     = navigator.deviceMemory ? navigator.deviceMemory + ' GB' : 'unknown';
  const platform   = navigator.platform || 'unknown';
  const online     = document.getElementById('onlineCount')?.textContent || '–';
  const backend    = BACKEND_URL ? 'connected' : 'offline (no URL set)';
  const buildHash  = Math.floor(Date.now() / 1000).toString(16).toUpperCase();

  const rows = [
    ['Game ID',         game.name,                                 ''],
    ['Session ID',      sessionId,                                 'yellow'],
    ['Popularity Rank', rank === '–' ? rank : `#${rank}`,         rank !== '–' && rank <= 3 ? 'green' : ''],
    ['Render Time',     renderTime,                                ''],
    ['Page Uptime',     uptime,                                    ''],
    ['Users Online',    online,                                    'green'],
    ['Backend',         backend,                                   BACKEND_URL ? 'green' : 'red'],
    ['Connection',      connection,                                ''],
    ['Device Memory',   memory,                                    ''],
    ['Platform',        platform,                                  ''],
    ['User Agent',      userAgent,                                 ''],
    ['Timestamp',       timestamp,                                 ''],
    ['Build Hash',      buildHash,                                 ''],
  ];

  body.innerHTML = rows.map(([key, val, cls]) => `
    <div class="debug-row">
      <span class="debug-key">${key}</span>
      <span class="debug-val ${cls}">${val}</span>
    </div>`
  ).join('');

  overlay.classList.add('open');
}

function closeDebug() {
  document.getElementById('debugOverlay').classList.remove('open');
}

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60)   return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

// ─── OPEN GAME ─────────────────────────────────────────────────────────────
// Opens inside an about:blank window so the real URL never appears
// in the address bar. Title is spoofed so content filters see nothing.

function openGame(gameName, displayName) {
  recordClick(gameName);

  const gameUrl   = `games/${encodeURIComponent(gameName)}.html`;
  const sessionId = Math.floor(10000 + Math.random() * 90000);
  const blocked   = JSON.parse(localStorage.getItem('blockedSessions') || '[]');

  const win = window.open('about:blank', '_blank');
  if (!win) return;

  try { win.history.replaceState(null, '', 'about:blank'); } catch (_) {}

  if (blocked.find(s => s.id === String(sessionId))) {
    win.document.open();
    win.document.write(buildBlockedPage(sessionId));
    win.document.close();
    return;
  }

  win.document.open();
  win.document.write(buildGamePage(gameName, displayName || gameName, gameUrl, sessionId));
  win.document.close();
}

function buildBlockedPage(sid) {
  return `<!DOCTYPE html><html><head><title>Google Classroom</title>
  <style>
    body{margin:0;background:linear-gradient(168deg,#87CEEB,#FFD59E,#FFAC6A);font-family:sans-serif;
      display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;}
    .card{background:rgba(255,255,255,.28);backdrop-filter:blur(40px);border:1px solid rgba(255,255,255,.50);
      border-radius:22px;padding:52px 44px;}
    h1{color:#FF6B6B;font-size:1.8em;margin-bottom:12px;}p{opacity:.65;}
  </style>
  </head>
  <body><div class="card"><h1>Access Denied</h1><p>This session has been blocked.</p></div></body></html>`;
}

function buildGamePage(name, displayName, url, sid) {
  const safeDisplay = displayName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeUrl     = url.replace(/"/g, '%22');

  return `<!DOCTYPE html>
<html><head>
<title>Google Classroom</title>
<meta charset="UTF-8">
<script>
Object.defineProperty(document,'title',{
  get:()=>'Google Classroom',
  set:()=>{},
  configurable:true
});
<\/script>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:100%;height:100%;overflow:hidden;background:#000;}

#gameframe{position:fixed;inset:0;width:100%;height:100%;border:none;z-index:1;display:block;}

#overlay{
  position:fixed;inset:0;z-index:100;
  background:linear-gradient(168deg,#4AAEDE 0%,#78C8ED 18%,#AAD9F5 38%,#FFD08A 62%,#FFA85C 80%,#F07840 100%);
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  opacity:1;pointer-events:auto;
  will-change:opacity;
  transition:opacity .55s cubic-bezier(0.16,1,0.3,1);
}
#overlay.fade-out{opacity:0;pointer-events:none;}

.cloud{position:absolute;background:rgba(255,255,255,.82);border-radius:50px;filter:blur(1.5px);will-change:transform;}
.cloud::before,.cloud::after{content:'';position:absolute;background:rgba(255,255,255,.82);border-radius:50%;}
.c1{width:130px;height:40px;top:52px;animation:drift 30s linear infinite;transform:translateX(-150px);}
.c1::before{width:72px;height:56px;top:-30px;left:20px;}.c1::after{width:52px;height:44px;top:-22px;left:60px;}
.c2{width:85px;height:26px;top:120px;animation:drift 42s linear infinite 7s;opacity:.7;transform:translateX(-100px);}
.c2::before{width:50px;height:38px;top:-20px;left:13px;}.c2::after{width:36px;height:30px;top:-15px;left:38px;}
@keyframes drift{from{transform:translateX(-200px)}to{transform:translateX(110vw)}}

.sun{position:absolute;top:32px;right:12%;width:82px;height:82px;
  background:radial-gradient(circle at 40% 38%,#FFFDE0 0%,#FFE54A 30%,#FFB830 65%,transparent 100%);
  border-radius:50%;box-shadow:0 0 50px 16px rgba(255,185,48,.30);
  animation:sunbob 7s ease-in-out infinite;will-change:transform;}
@keyframes sunbob{0%,100%{transform:scale(1)translateY(0)}50%{transform:scale(1.04)translateY(-6px)}}

.waves{position:absolute;bottom:0;left:0;width:100%;height:110px;overflow:hidden;}
.wave{position:absolute;bottom:0;left:-25%;width:150%;height:100%;
  background:linear-gradient(180deg,rgba(0,147,196,.48) 0%,rgba(0,75,125,.70) 100%);
  border-radius:55% 45% 0 0/72px 52px 0 0;will-change:transform;}
.w1{animation:wv1 8s ease-in-out infinite;}
.w2{background:linear-gradient(180deg,rgba(0,188,218,.28) 0%,rgba(0,108,158,.46) 100%);animation:wv2 11s ease-in-out infinite;}
.w3{background:rgba(255,255,255,.12);border-radius:44% 56% 0 0/52px 72px 0 0;animation:wv1 15s ease-in-out infinite reverse;}
@keyframes wv1{0%,100%{transform:translateX(0) scaleY(1);}50%{transform:translateX(-6%) scaleY(1.10);}}
@keyframes wv2{0%,100%{transform:translateX(-4%) scaleY(1);}50%{transform:translateX(4%) scaleY(.94);}}

.card{
  position:relative;
  background:rgba(255,255,255,.20);
  backdrop-filter:blur(52px) saturate(200%) brightness(1.08);
  -webkit-backdrop-filter:blur(52px) saturate(200%) brightness(1.08);
  border:1px solid transparent;
  background-clip:padding-box;
  border-radius:26px;
  padding:38px 44px 34px;
  text-align:center;width:90%;max-width:380px;
  box-shadow:
    0 1px 0 rgba(255,255,255,.92) inset,
    1px 0 0 rgba(255,255,255,.55) inset,
    0 -1px 0 rgba(100,160,220,.18) inset,
    0 0 0 1px rgba(255,255,255,.30),
    0 24px 64px rgba(0,50,100,.18);
  isolation:isolate;z-index:2;
}
.card::before{
  content:'';position:absolute;inset:-1px;border-radius:inherit;padding:1px;
  background:linear-gradient(145deg,rgba(255,255,255,.90) 0%,rgba(255,255,255,.55) 30%,rgba(200,230,255,.18) 65%,rgba(140,190,230,.12) 100%);
  -webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);
  -webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none;
}
.card::after{
  content:'';position:absolute;inset:0;border-radius:inherit;
  background:linear-gradient(175deg,rgba(255,255,255,.32) 0%,rgba(255,255,255,.08) 30%,transparent 60%);
  pointer-events:none;
}
.card>*{position:relative;z-index:1;}

.ring{width:44px;height:44px;border:3px solid rgba(0,147,196,.18);border-top-color:#0093C4;
  border-radius:50%;animation:spin .7s linear infinite;margin:0 auto 16px;will-change:transform;}
@keyframes spin{to{transform:rotate(360deg)}}

.lbl-top{font-family:'DM Sans',sans-serif;font-size:.63em;font-weight:700;letter-spacing:1px;
  text-transform:uppercase;color:rgba(10,22,40,.42);margin-bottom:4px;}
.lbl-name{font-family:'DM Sans',sans-serif;font-size:1.1em;font-weight:700;color:#0A1628;margin-bottom:18px;}
.lbl-sub{font-size:.82em;color:#5A7A96;margin-bottom:20px;font-weight:400;}

.progress-wrap{background:rgba(255,255,255,.32);border:1px solid rgba(255,255,255,.62);border-radius:14px;padding:13px 18px;}
.progress-lbl{font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#5A7A96;margin-bottom:7px;text-align:left;font-weight:700;}
.progress-track{width:100%;height:7px;background:rgba(0,0,0,.08);border-radius:4px;overflow:hidden;}
.progress-fill{height:100%;background:linear-gradient(90deg,#0093C4,#00C9A7);border-radius:4px;width:0%;
  will-change:width;transition:width .22s ease;box-shadow:0 0 8px rgba(0,147,196,.40);}
.progress-pct{font-family:'Courier New',monospace;font-size:11px;color:#0093C4;margin-top:8px;text-align:left;font-weight:700;}

.sess-tag{position:fixed;bottom:6px;right:9px;opacity:.10;font-size:9px;z-index:200;color:#333;user-select:none;font-family:monospace;}
</style>
</head>
<body>

<iframe id="gameframe" src="${safeUrl}" allowfullscreen></iframe>

<div id="overlay">
  <div class="cloud c1"></div>
  <div class="cloud c2"></div>
  <div class="sun"></div>
  <div class="waves">
    <div class="wave w1"></div>
    <div class="wave w2"></div>
    <div class="wave w3"></div>
  </div>
  <div class="card">
    <div class="ring"></div>
    <div class="lbl-top">Now Loading</div>
    <div class="lbl-name">${safeDisplay}</div>
    <p class="lbl-sub" id="statusMsg">Loading game…</p>
    <div class="progress-wrap">
      <div class="progress-lbl">Progress</div>
      <div class="progress-track"><div class="progress-fill" id="bar"></div></div>
      <div class="progress-pct" id="pct">0%</div>
    </div>
  </div>
</div>

<div class="sess-tag">sess: ${sid}</div>

<script>
(function () {
  var steps  = ['Loading game…','Fetching assets…','Almost there…','Ready!'];
  var prog   = 0, step = 0;
  var bar    = document.getElementById('bar');
  var pct    = document.getElementById('pct');
  var msg    = document.getElementById('statusMsg');
  var overlay = document.getElementById('overlay');

  var tick = setInterval(function () {
    prog += Math.random() * 7 + 3;
    if (prog > 100) prog = 100;

    bar.style.width = prog + '%';
    pct.textContent = Math.floor(prog) + '%';

    var newStep = Math.min(Math.floor(prog / 26), steps.length - 1);
    if (newStep !== step) { step = newStep; msg.textContent = steps[step]; }

    if (prog >= 100) {
      clearInterval(tick);
      pct.textContent = 'Ready!';
      setTimeout(function () {
        overlay.classList.add('fade-out');
        setTimeout(function () { overlay.style.display = 'none'; }, 600);
      }, 320);
    }
  }, 110);

  // Block-session poller
  setInterval(function () {
    var raw = localStorage.getItem('blockedSessions');
    if (!raw) return;
    try {
      if (JSON.parse(raw).find(function (s) { return s.id === '${sid}'; })) {
        document.body.innerHTML =
          '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:linear-gradient(168deg,#87CEEB,#FFD59E);font-family:sans-serif;text-align:center">' +
          '<div style="background:rgba(255,255,255,.28);backdrop-filter:blur(40px);border-radius:22px;padding:52px 44px;">' +
          '<h1 style="color:#FF6B6B;margin-bottom:10px">Session Terminated</h1>' +
          '<p style="opacity:.65">Blocked by administrator.</p></div></div>';
      }
    } catch (e) {}
  }, 2000);
})();
<\/script>
</body></html>`;
}

// ─── PROTECTION ────────────────────────────────────────────────────────────

function setupProtection() {
  // Block right-click everywhere except game cards
  document.addEventListener('contextmenu', e => {
    if (!e.target.closest('.game-card')) e.preventDefault();
  });

  // Block common devtools keyboard shortcuts
  document.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && ['s', 'u', 'a', 'c', 'p'].includes(k)) {
      e.preventDefault();
      return false;
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(k)) {
      e.preventDefault();
      return false;
    }
    if (e.key === 'F12') {
      e.preventDefault();
      return false;
    }
  }, true);

  // No drag
  document.addEventListener('dragstart', e => e.preventDefault());

  // Devtools detector via debugger statement timing
  (function devtoolsLoop() {
    setInterval(() => {
      const t = performance.now();
      // eslint-disable-next-line no-debugger
      debugger;
      if (performance.now() - t > 160) {
        document.body.innerHTML =
          '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#000;color:#fff;font-family:sans-serif;text-align:center;flex-direction:column;gap:16px;">' +
          '<div style="font-size:3em">🚫</div>' +
          '<div style="font-size:1.3em;font-weight:600">Developer tools are not allowed.</div></div>';
      }
    }, 1000);
  })();

  // Silence console
  const noop = () => {};
  try {
    Object.defineProperty(window, 'console', {
      get: () => ({ log: noop, warn: noop, error: noop, info: noop, debug: noop, table: noop, dir: noop })
    });
  } catch (_) {}

  // Block text selection except in search input
  document.addEventListener('selectstart', e => {
    if (e.target.id === 'searchInput') return;
    e.preventDefault();
  });

  // Prevent being framed
  if (window.top !== window.self) window.top.location = window.self.location;

  // Honeypot link to catch scrapers
  const honey = document.createElement('a');
  honey.href = '#honeypot';
  honey.textContent = 'Download All Games';
  honey.style.cssText = 'position:absolute;left:-9999px;top:-9999px;opacity:0;pointer-events:none;';
  honey.setAttribute('aria-hidden', 'true');
  honey.addEventListener('click', () => {
    document.body.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#000;color:#fff;font-family:sans-serif;text-align:center;flex-direction:column;gap:12px;">' +
      '<div style="font-size:3em">🍯</div>' +
      '<div style="font-size:1.3em;font-weight:600">Nice try.</div></div>';
  });
  document.body.appendChild(honey);

  // Block dynamically injected scripts and stylesheets
  new MutationObserver(mutations => {
    mutations.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node.tagName === 'SCRIPT' || node.tagName === 'LINK') node.remove();
      });
    });
  }).observe(document.body, { childList: true, subtree: true });

  // Rate-limit window.open to prevent popup spam
  const _open = window.open.bind(window);
  let _openCount = 0, _openReset = Date.now();

  window.open = function (url, target, features) {
    const now = Date.now();
    if (now - _openReset > 5000) { _openCount = 0; _openReset = now; }
    if (++_openCount > 10) return null;
    return _open(url, target, features);
  };
}