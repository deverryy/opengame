const fs = require('fs');
const path = require('path');

/* ===============================
   CONFIG
=============================== */

const SCRIPT_DIR = __dirname;
const GAMES_FOLDER = path.join(SCRIPT_DIR, 'games');
const BACKUP_FOLDER = path.join(SCRIPT_DIR, 'games_backup');
const LIST_FILE = path.join(SCRIPT_DIR, 'list.json');

const ALLOWED_DOMAINS = [
    'portal.dever.pro',
    'www.portal.dever.pro',
    'localhost',
    '127.0.0.1',
    'gam12.netlify.app',
    'www.gam12.netlify.app'
];

/* ===============================
   INJECTED PROTECTION SCRIPT
=============================== */

const PROTECTION_SCRIPT = `
<!-- DOMAIN PROTECTION SCRIPT - AUTO-GENERATED -->
<script>
(function() {
    'use strict';

    const ALLOWED_DOMAINS = ${JSON.stringify(ALLOWED_DOMAINS, null, 8)};

    if (window.location.protocol === 'file:') {
        blockAccess('This game cannot be run from a local file.');
        return;
    }

    const currentDomain = window.location.hostname;
    const isAllowed = ALLOWED_DOMAINS.some(domain =>
        currentDomain === domain || currentDomain.endsWith('.' + domain)
    );

    if (!isAllowed) {
        blockAccess('This game can only be played on the official website.');
        return;
    }

    if (window.top === window.self) {
        blockAccess('This game must be launched from the official portal.');
        return;
    }

    try {
        const parentDomain = new URL(window.top.location.href).hostname;
        const isParentAllowed = ALLOWED_DOMAINS.some(domain =>
            parentDomain === domain || parentDomain.endsWith('.' + domain)
        );
        if (!isParentAllowed) throw 0;
    } catch {
        blockAccess('This game must be launched from the official portal.');
        return;
    }

    function blockAccess(message) {
        document.body.innerHTML = '';
        const overlay = document.createElement('div');
        overlay.innerHTML = \`
            <div style="display:flex;align-items:center;justify-content:center;height:100vh;
            background:#000;color:#fff;font-family:Arial;text-align:center;">
                <div>
                    <h1 style="color:#d70000;font-size:2.5em;">🚫 Access Denied</h1>
                    <p style="font-size:1.2em;">\${message}</p>
                </div>
            </div>\`;
        overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;';
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';
        throw new Error('Blocked');
    }

    // ❌ PAUSE SYSTEM REMOVED
})();
</script>
`;

const PROTECTION_MARKER = '<!-- DOMAIN PROTECTION SCRIPT - AUTO-GENERATED -->';

/* ===============================
   UTILITIES
=============================== */

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function backupFile(file) {
    ensureDir(BACKUP_FOLDER);
    fs.copyFileSync(file, path.join(BACKUP_FOLDER, path.basename(file)));
}

function filenameToDisplayName(file) {
    return file
        .replace('.html', '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

/* ===============================
   PROTECTION HANDLING
=============================== */

function addProtection(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(PROTECTION_MARKER)) return false;

    backupFile(filePath);
    content = content.replace(/(<body[^>]*>)/i, `$1${PROTECTION_SCRIPT}`);
    fs.writeFileSync(filePath, content);
    return true;
}

function removeProtection(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes(PROTECTION_MARKER)) return false;

    backupFile(filePath);
    content = content.replace(
        /\s*<!-- DOMAIN PROTECTION SCRIPT - AUTO-GENERATED -->[\s\S]*?<\/script>/,
        ''
    );
    fs.writeFileSync(filePath, content);
    return true;
}

/* ===============================
   GAME LIST GENERATION
=============================== */

function generateGameList() {
    const games = fs.readdirSync(GAMES_FOLDER)
        .filter(f => f.endsWith('.html'))
        .map(file => ({
            name: file.replace('.html', ''),
            display: filenameToDisplayName(file)
        }));

    fs.writeFileSync(LIST_FILE, JSON.stringify(games, null, 2));
    console.log(`📄 list.json generated (${games.length} games)`);
}

/* ===============================
   MAIN PROCESS
=============================== */

function processGames(action = 'add') {
    ensureDir(GAMES_FOLDER);

    const files = fs.readdirSync(GAMES_FOLDER).filter(f => f.endsWith('.html'));

    let processed = 0;
    files.forEach(file => {
        const fp = path.join(GAMES_FOLDER, file);
        const ok = action === 'add' ? addProtection(fp) : removeProtection(fp);
        if (ok) processed++;
    });

    generateGameList();
    console.log(`✅ Done | ${processed} file(s) ${action === 'add' ? 'protected' : 'cleaned'}`);
}

/* ===============================
   CLI
=============================== */

const args = process.argv.slice(2);

if (args.includes('--remove') || args.includes('-r')) {
    processGames('remove');
} else if (args.includes('--help') || args.includes('-h')) {
    console.log(`
USAGE:
  node manage-games.js
  node manage-games.js --remove
  node manage-games.js --help
`);
} else {
    processGames('add');
}
