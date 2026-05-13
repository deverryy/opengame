/* ══════════════════════════════════════════════════════
   CONFIG — paste your Railway backend URL here
   e.g. "https://your-app.up.railway.app"
   Leave as empty string to disable live features
   (site still works, just no online count or click tracking)
══════════════════════════════════════════════════════ */
const BACKEND_URL = '';   // ← PASTE YOUR RAILWAY URL HERE

/* ══════════════════════════════════════════════════════
   SEED — shown in featured section until real click
   data arrives from the backend
══════════════════════════════════════════════════════ */
const SEED_POPULAR = [
    'Minecraft', 'slope', '1v1.lol', 'Among Us', 'Retro Bowl',
    'Brawl Stars', 'Bloons TD6', 'run3', 'BitLife', 'Basketball Stars',
    'Cuphead', 'Terraria', 'DOOM', 'Hollow Knight', 'geodash'
];

/* ══════════════════════════════════════════════════════
   STATE
══════════════════════════════════════════════════════ */
let allGames     = [];
let popularNames = [];   // server-ranked, updated live
let ws           = null;
let wsReady      = false;

/* ══════════════════════════════════════════════════════
   BOOT
══════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    loadGames();
    if (BACKEND_URL) initWebSocket();
    else             showOfflinePill();
    initProtection();
});

/* ══════════════════════════════════════════════════════
   WEBSOCKET
══════════════════════════════════════════════════════ */
function initWebSocket() {
    const wsUrl = BACKEND_URL.replace(/^http/, 'ws');

    function connect() {
        try { ws = new WebSocket(wsUrl); } catch { scheduleReconnect(); return; }

        ws.onopen = () => { wsReady = true; };

        ws.onmessage = evt => {
            let msg;
            try { msg = JSON.parse(evt.data); } catch { return; }
            if (msg.type !== 'stats') return;

            setOnlineCount(msg.online);

            if (Array.isArray(msg.popular) && msg.popular.length) {
                popularNames = msg.popular.map(g => g.name);
                if (allGames.length) {
                    renderFeatured();
                    renderAllGames();
                }
            }
        };

        ws.onclose = () => { wsReady = false; scheduleReconnect(); };
        ws.onerror = () => { wsReady = false; };
    }

    function scheduleReconnect() { setTimeout(connect, 5000); }

    connect();

    // HTTP fallback if WS stays down for 6 seconds
    setTimeout(() => { if (!wsReady) pollFallback(); }, 6000);
}

function pollFallback() {
    fetch(`${BACKEND_URL}/api/stats`)
        .then(r => r.json())
        .then(d => {
            setOnlineCount(d.online);
            if (Array.isArray(d.popular) && d.popular.length) {
                popularNames = d.popular.map(g => g.name);
                if (allGames.length) { renderFeatured(); renderAllGames(); }
            }
        })
        .catch(() => {})
        .finally(() => setTimeout(pollFallback, 10000));
}

function setOnlineCount(n) {
    const pill  = document.getElementById('onlinePill');
    const count = document.getElementById('onlineCount');
    if (!pill || !count) return;
    pill.classList.remove('connecting');
    count.textContent = `${n} online now`;
}

function showOfflinePill() {
    const pill  = document.getElementById('onlinePill');
    const count = document.getElementById('onlineCount');
    if (!pill || !count) return;
    count.textContent = '–';
}

/* ══════════════════════════════════════════════════════
   RECORD CLICK
══════════════════════════════════════════════════════ */
function recordClick(name) {
    if (!BACKEND_URL) return;
    if (wsReady && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'click', name }));
    } else {
        fetch(`${BACKEND_URL}/api/click`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        }).catch(() => {});
    }
}

/* ══════════════════════════════════════════════════════
   LOAD GAMES FROM list.json (Vercel serves this)
══════════════════════════════════════════════════════ */
async function loadGames() {
    function setDetail(msg) {
        const el = document.getElementById('loadDetail');
        if (el) el.textContent = msg;
    }

    try {
        setDetail('Fetching list.json…');
        let response;
        try {
            response = await fetch('/list.json');
        } catch (e) {
            throw new Error(`Network error: ${e.message}`);
        }
        if (!response.ok) throw new Error(`HTTP ${response.status} fetching list.json`);

        setDetail('Parsing game data…');
        const text = await response.text();
        let parsed;
        try { parsed = JSON.parse(text); }
        catch (e) { throw new Error(`list.json is invalid JSON — ${e.message}`); }

        if (!Array.isArray(parsed)) throw new Error('list.json must be a JSON array');

        allGames = parsed;
        document.getElementById('gameCountLabel').textContent =
            `${allGames.length} games available`;

        renderFeatured();
        renderAllGames();

    } catch (err) {
        document.getElementById('gamesList').innerHTML = `
            <div class="load-placeholder" style="grid-column:1/-1">
                <div style="font-size:2em;margin-bottom:10px">⚠️</div>
                <strong style="color:var(--coral)">Failed to load games</strong>
                <div style="color:var(--coral);opacity:.8;margin-top:6px;font-size:.88em">${err.message}</div>
                <div style="margin-top:12px;color:var(--text-soft);font-size:.8em;line-height:1.6">
                    Make sure <code style="background:rgba(0,0,0,.06);padding:1px 6px;border-radius:4px">list.json</code>
                    is in the root of your Vercel project.
                </div>
                <button onclick="loadGames()" style="margin-top:16px;padding:9px 24px;background:var(--ocean);color:#fff;border:none;border-radius:10px;cursor:pointer;font-family:inherit;font-weight:600;font-size:.88em;box-shadow:0 4px 14px rgba(0,147,196,.35);">
                    Retry
                </button>
            </div>`;
    }
}

/* ══════════════════════════════════════════════════════
   RENDER FEATURED — ranked by real clicks, seeded initially
══════════════════════════════════════════════════════ */
function renderFeatured() {
    const list  = document.getElementById('featuredList');
    const label = document.getElementById('featuredLabel');
    if (!list) return;

    const ranked   = popularNames.length ? popularNames : SEED_POPULAR;
    const isLive   = popularNames.length > 0;
    const featured = [];

    ranked.forEach(rname => {
        if (featured.length >= 15) return;
        const g = allGames.find(g =>
            g.name.toLowerCase() === rname.toLowerCase() ||
            g.display.toLowerCase() === rname.toLowerCase()
        );
        if (g) featured.push(g);
    });

    // Pad with seed entries if needed
    if (featured.length < 15) {
        SEED_POPULAR.forEach(sname => {
            if (featured.length >= 15) return;
            const g = allGames.find(g =>
                g.name.toLowerCase() === sname.toLowerCase() ||
                g.display.toLowerCase() === sname.toLowerCase()
            );
            if (g && !featured.includes(g)) featured.push(g);
        });
    }

    if (label) label.textContent = isLive ? '🔥 Popular Right Now' : '⭐ Featured Games';

    list.innerHTML = '';
    featured.forEach((game, i) => list.appendChild(makeCard(game, i, true)));
}

/* ══════════════════════════════════════════════════════
   RENDER ALL GAMES — alphabetical, excludes featured
══════════════════════════════════════════════════════ */
function renderAllGames() {
    const list    = document.getElementById('gamesList');
    const noGames = document.getElementById('noGames');
    if (!list) return;

    const featuredSet = new Set(
        (popularNames.length ? popularNames : SEED_POPULAR).map(n => n.toLowerCase())
    );

    const rest = allGames
        .filter(g =>
            !featuredSet.has(g.name.toLowerCase()) &&
            !featuredSet.has(g.display.toLowerCase())
        )
        .sort((a, b) => a.display.localeCompare(b.display));

    document.getElementById('allLabel').textContent = `All Games (${rest.length})`;
    noGames.classList.add('hidden');
    list.innerHTML = '';
    rest.forEach((game, i) => list.appendChild(makeCard(game, i, false)));
}

/* ── Make a card DOM node ── */
function makeCard(game, index, isFeatured) {
    const card = document.createElement('div');
    card.className = 'game-card' + (isFeatured ? ' featured-card' : '');
    card.style.animationDelay = `${Math.min(index * 0.03, 0.6)}s`;
    card.onclick = () => openGame(game.name, game.display);
    card.innerHTML = `
        ${isFeatured ? '<div class="featured-badge">Hot</div>' : ''}
        ${isFeatured && index < 3 ? `<div class="rank-badge">#${index + 1}</div>` : ''}
        <h3>${game.display}</h3>
        <p>Click to play</p>`;
    return card;
}

/* ══════════════════════════════════════════════════════
   SEARCH
══════════════════════════════════════════════════════ */
function filterGames() {
    const q             = document.getElementById('searchInput').value.trim().toLowerCase();
    const featuredPanel = document.getElementById('featuredPanel');
    const allLabel      = document.getElementById('allLabel');
    const noGames       = document.getElementById('noGames');
    const list          = document.getElementById('gamesList');

    if (!q) {
        featuredPanel.classList.remove('hidden');
        renderAllGames();
        return;
    }

    featuredPanel.classList.add('hidden');

    const results = allGames.filter(g =>
        g.display.toLowerCase().includes(q) || g.name.toLowerCase().includes(q)
    );

    allLabel.textContent = `Results (${results.length})`;
    list.innerHTML = '';
    noGames.classList.add('hidden');

    if (!results.length) { noGames.classList.remove('hidden'); return; }
    results.forEach((game, i) => list.appendChild(makeCard(game, i, false)));
}

/* ══════════════════════════════════════════════════════
   OPEN GAME
   iframe fix: overlay is position:fixed on top (z-index 100),
   iframe is always in the DOM at z-index 1.
   Overlay fades out via CSS transition — no display:none flash.
══════════════════════════════════════════════════════ */
function openGame(gameName, displayName) {
    recordClick(gameName);

    const gameUrl   = `games/${encodeURIComponent(gameName)}.html`;
    const sessionId = Math.floor(10000 + Math.random() * 90000);
    const blocked   = JSON.parse(localStorage.getItem('blockedSessions') || '[]');

    if (blocked.find(s => s.id === sessionId.toString())) {
        const win = window.open('', '_blank');
        if (win) { win.document.write(blockedPage(sessionId)); win.document.close(); }
        return;
    }

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(gamePage(gameName, displayName || gameName, gameUrl, sessionId));
    win.document.close();
}

function blockedPage(sid) {
    return `<!DOCTYPE html><html><head><title>Access Denied</title><style>body{margin:0;background:linear-gradient(168deg,#87CEEB,#FFD59E,#FFAC6A);font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;}.box{background:rgba(255,255,255,.30);backdrop-filter:blur(20px);border:1.5px solid rgba(255,255,255,.55);border-radius:24px;padding:56px 48px;max-width:460px;}h1{color:#FF6B6B;font-size:1.9em;margin-bottom:14px;}p{color:#1A2A3A;opacity:.72;}</style></head><body><div class="box"><h1>Access Denied</h1><p>This session has been blocked.</p></div></body></html>`;
}

function gamePage(name, displayName, url, sid) {
    const safe = displayName.replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const safeUrl = url.replace(/"/g,'%22');

    return `<!DOCTYPE html>
<html><head><title>${safe}</title><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@900&family=DM+Sans:wght@300;400;600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:100%;height:100%;overflow:hidden;background:#000;}

/* iframe always in DOM behind overlay — no flash when overlay fades */
#gameFrame{position:fixed;inset:0;width:100%;height:100%;border:none;z-index:1;display:block;}

/* Overlay fades out via opacity transition, then removed from layout */
#overlay{
    position:fixed;inset:0;z-index:100;
    background:linear-gradient(168deg,#5FB8E8 0%,#87CEEB 22%,#B8E4FF 42%,#FFD59E 68%,#FFAC6A 85%,#F5895A 100%);
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    opacity:1;pointer-events:auto;
    transition:opacity .5s ease;
}
#overlay.fading{opacity:0;pointer-events:none;}

/* sky dressing */
.ov-cloud{position:absolute;background:rgba(255,255,255,.82);border-radius:50px;filter:blur(1.5px);pointer-events:none;}
.ov-cloud::before,.ov-cloud::after{content:'';position:absolute;background:rgba(255,255,255,.82);border-radius:50%;}
.cc1{width:130px;height:40px;top:52px;left:-150px;animation:drift 30s linear infinite;}
.cc1::before{width:72px;height:56px;top:-30px;left:20px;}.cc1::after{width:52px;height:44px;top:-22px;left:60px;}
.cc2{width:85px;height:26px;top:120px;left:-100px;animation:drift 42s linear infinite 7s;opacity:.7;}
.cc2::before{width:50px;height:38px;top:-20px;left:13px;}.cc2::after{width:36px;height:30px;top:-15px;left:38px;}
@keyframes drift{from{left:-200px;}to{left:110vw;}}
.ov-sun{position:absolute;top:32px;right:12%;width:80px;height:80px;
    background:radial-gradient(circle,#FFF176 20%,#FFD740 50%,#FFB830 75%,transparent 100%);
    border-radius:50%;box-shadow:0 0 50px 16px rgba(255,200,60,.32);
    animation:sp 7s ease-in-out infinite;pointer-events:none;}
@keyframes sp{0%,100%{transform:scale(1);}50%{transform:scale(1.04);}}
.ov-waves{position:absolute;bottom:0;left:0;width:100%;height:100px;pointer-events:none;overflow:hidden;}
.ov-wave{position:absolute;bottom:0;left:-25%;width:150%;height:100%;
    background:linear-gradient(180deg,rgba(0,147,196,.48) 0%,rgba(0,80,130,.70) 100%);
    border-radius:55% 45% 0 0/70px 50px 0 0;}
.ow1{animation:wv1 8s ease-in-out infinite;}
.ow2{background:linear-gradient(180deg,rgba(0,190,220,.28) 0%,rgba(0,110,160,.46) 100%);animation:wv2 11s ease-in-out infinite;}
.ow3{background:rgba(255,255,255,.12);border-radius:42% 58% 0 0/50px 70px 0 0;animation:wv1 15s ease-in-out infinite reverse;}
@keyframes wv1{0%,100%{transform:translateX(0) scaleY(1);}50%{transform:translateX(-6%) scaleY(1.08);}}
@keyframes wv2{0%,100%{transform:translateX(-4%) scaleY(1);}50%{transform:translateX(4%) scaleY(.93);}}

.lcard{
    background:rgba(255,255,255,.26);
    backdrop-filter:blur(24px) saturate(1.6);-webkit-backdrop-filter:blur(24px) saturate(1.6);
    border:1.5px solid rgba(255,255,255,.60);border-radius:28px;
    padding:40px 46px 36px;text-align:center;
    width:90%;max-width:400px;
    box-shadow:0 24px 64px rgba(0,60,120,.18),0 1.5px 0 rgba(255,255,255,.55) inset;
    position:relative;z-index:2;
}
.ring{width:48px;height:48px;border:4px solid rgba(0,147,196,.18);
    border-top-color:#0093C4;border-radius:50%;
    animation:spin .75s linear infinite;margin:0 auto 16px;}
@keyframes spin{to{transform:rotate(360deg);}}
.lcard h1{font-family:'Playfair Display',serif;font-size:1.5em;color:#0F1E2E;margin-bottom:6px;}
.lcard .sub{color:#5A7A96;font-size:.84em;margin-bottom:22px;font-weight:300;}
.pwrap{background:rgba(255,255,255,.38);border:1.5px solid rgba(255,255,255,.65);border-radius:13px;padding:14px 18px;}
.plabel{font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#5A7A96;margin-bottom:7px;text-align:left;font-weight:600;}
.pbg{width:100%;height:8px;background:rgba(0,0,0,.08);border-radius:4px;overflow:hidden;}
.pfill{height:100%;background:linear-gradient(90deg,#0093C4,#00C9A7);border-radius:4px;width:0%;
    transition:width .25s ease;box-shadow:0 0 10px rgba(0,147,196,.40);}
.ptxt{font-family:'Courier New',monospace;font-size:12px;color:#0093C4;margin-top:8px;text-align:left;font-weight:600;}
.sess{position:fixed;bottom:7px;right:10px;opacity:.12;font-size:10px;z-index:200;color:#333;user-select:none;}
</style></head><body>

<iframe id="gameFrame" src="${safeUrl}" allowfullscreen></iframe>

<div id="overlay">
    <div class="ov-cloud cc1"></div>
    <div class="ov-cloud cc2"></div>
    <div class="ov-sun"></div>
    <div class="ov-waves">
        <div class="ov-wave ow1"></div>
        <div class="ov-wave ow2"></div>
        <div class="ov-wave ow3"></div>
    </div>
    <div class="lcard">
        <div class="ring"></div>
        <h1>${safe}</h1>
        <p class="sub" id="lmsg">Loading game…</p>
        <div class="pwrap">
            <div class="plabel">Loading Progress</div>
            <div class="pbg"><div class="pfill" id="pf"></div></div>
            <div class="ptxt" id="pt">0%</div>
        </div>
    </div>
</div>

<div class="sess">sess: ${sid}</div>

<script>
(function(){
    var msgs = ['Loading game…','Fetching assets…','Almost there…','Ready!'];
    var prog = 0, mi = 0;
    var pf = document.getElementById('pf');
    var pt = document.getElementById('pt');
    var lm = document.getElementById('lmsg');
    var ov = document.getElementById('overlay');

    var iv = setInterval(function(){
        prog += Math.random() * 7 + 3;
        if (prog > 100) prog = 100;
        pf.style.width = prog + '%';
        var ni = Math.min(Math.floor(prog / 26), msgs.length - 1);
        if (ni !== mi){ mi = ni; lm.textContent = msgs[mi]; }
        pt.textContent = Math.floor(prog) + '%';
        if (prog >= 100){
            clearInterval(iv);
            pt.textContent = 'Ready!';
            // Step 1: start fade (iframe is already rendering behind)
            setTimeout(function(){
                ov.classList.add('fading');
                // Step 2: fully remove after transition completes
                setTimeout(function(){ ov.style.display = 'none'; }, 550);
            }, 350);
        }
    }, 110);

    // Session block check
    setInterval(function(){
        var b = localStorage.getItem('blockedSessions');
        if (!b) return;
        try {
            if (JSON.parse(b).find(function(s){ return s.id === '${sid}'; })){
                document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:linear-gradient(168deg,#87CEEB,#FFD59E);font-family:sans-serif;text-align:center"><div style="background:rgba(255,255,255,.3);backdrop-filter:blur(20px);border-radius:24px;padding:56px 48px;"><h1 style="color:#FF6B6B;margin-bottom:12px;">Session Terminated</h1><p style="color:#1A2A3A;opacity:.7;">Blocked by administrator.</p></div></div>';
            }
        } catch(e){}
    }, 2000);
})();
<\/script>
</body></html>`;
}

/* ══════════════════════════════════════════════════════
   PROTECTION
══════════════════════════════════════════════════════ */
function initProtection() {
    // 1 — No right-click
    document.addEventListener('contextmenu', e => e.preventDefault());

    // 2 — Block keyboard shortcuts
    document.addEventListener('keydown', e => {
        const k = e.key.toLowerCase();
        if ((e.ctrlKey||e.metaKey) && ['s','u','a','c','p'].includes(k)){ e.preventDefault(); return false; }
        if ((e.ctrlKey||e.metaKey) && e.shiftKey && ['i','j','c'].includes(k)){ e.preventDefault(); return false; }
        if (e.key==='F12'){ e.preventDefault(); return false; }
    }, true);

    // 3 — No drag
    document.addEventListener('dragstart', e => e.preventDefault());

    // 4 — DevTools timing detection
    (function devLoop(){
        setInterval(() => {
            const t = performance.now();
            // eslint-disable-next-line no-debugger
            debugger;
            if (performance.now() - t > 160){
                document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#000;color:#fff;font-family:sans-serif;text-align:center;flex-direction:column;gap:16px;"><div style="font-size:3em">🚫</div><div style="font-size:1.3em;font-weight:600">Developer tools are not allowed.</div><div style="opacity:.4;font-size:.85em">Close DevTools and refresh.</div></div>';
            }
        }, 1000);
    })();

    // 5 — Console poison
    const noop = () => {};
    try {
        Object.defineProperty(window,'console',{
            get:()=>({log:noop,warn:noop,error:noop,info:noop,debug:noop,table:noop,dir:noop})
        });
    } catch(_){}

    // 6 — Decoy globals
    window._siteKey = btoa(Math.random().toString()).slice(0,24);
    window._assetManifest = Array.from({length:40},(_,i)=>({id:i,src:`/assets/decoy_${Math.random().toString(36).slice(2)}.bin`}));
    window._cfg = {v:'3.1.4',build:Math.floor(Math.random()*9e5+1e5),obf:true};

    // 7 — No text selection except search
    document.addEventListener('selectstart', e => {
        if (e.target.id==='searchInput') return;
        e.preventDefault();
    });

    // 8 — Block iframe embedding
    if (window.top !== window.self) window.top.location = window.self.location;

    // 9 — Honeypot
    const honey = document.createElement('a');
    honey.href = '#honeypot';
    honey.textContent = 'Download All Games';
    honey.style.cssText = 'position:absolute;left:-9999px;top:-9999px;opacity:0;pointer-events:none;';
    honey.setAttribute('aria-hidden','true');
    honey.addEventListener('click',()=>{
        document.body.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#000;color:#fff;font-family:sans-serif;text-align:center;flex-direction:column;gap:12px;"><div style="font-size:3em">🍯</div><div style="font-size:1.3em;font-weight:600">Nice try.</div><div style="opacity:.4;font-size:.85em">This action has been logged.</div></div>';
    });
    document.body.appendChild(honey);

    // 10 — MutationObserver blocks injected scripts
    new MutationObserver(muts => {
        muts.forEach(m => m.addedNodes.forEach(n => {
            if (n.tagName==='SCRIPT'||n.tagName==='LINK') n.remove();
        }));
    }).observe(document.body,{childList:true,subtree:true});

    // 11 — Rate-limit window.open
    const _orig = window.open.bind(window);
    let _cnt=0, _reset=Date.now();
    window.open = function(u,t,f){
        const now=Date.now();
        if(now-_reset>5000){_cnt=0;_reset=now;}
        if(++_cnt>10) return null;
        return _orig(u,t,f);
    };
}