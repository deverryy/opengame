#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

/* ===============================
   CONFIG
=============================== */

const SCRIPT_DIR = __dirname;
const GAMES_FOLDER = path.join(SCRIPT_DIR, 'games');
const BACKUP_FOLDER = path.join(SCRIPT_DIR, 'games_backup');
const LIST_FILE = path.join(SCRIPT_DIR, 'list.json');
const LOG_FILE = path.join(SCRIPT_DIR, 'manage-games.log');

// External config override: if config.json exists next to this script, it is merged in.
// Lets you add ad hosts / allowed domains without touching code.
const CONFIG_FILE = path.join(SCRIPT_DIR, 'config.json');

const DEFAULT_CONFIG = {
    allowedDomains: [
        'https://github.com/deverryy/opengame',
        'github.com/deverryy/opengame',
    ],
    adHostPatterns: [
        'googlesyndication\\.com',
        'googletagservices\\.com',
        'doubleclick\\.net',
        'adsafeprotected\\.com',
        'adnxs\\.com',
        'taboola\\.com',
        'outbrain\\.com',
        'popads\\.net',
        'propellerads\\.com',
        'exoclick\\.com',
        'juicyads\\.com',
        'adcolony\\.com',
        'unityads\\.unity3d\\.com',
        'applovin\\.com',
        'ironsrc\\.com',
        'mgid\\.com',
        'revcontent\\.com',
        'adsterra\\.com'
    ],
    adContainerPatterns: [
        'ad-?container',
        'ad-?banner',
        'ad-?slot',
        'google_ads',
        'adsbygoogle',
        'ad-wrapper',
        'advert(?:isement)?'
    ],
    maxFileSizeMB: 20,
    keepBackupVersions: 5
};

function loadConfig() {
    if (!fs.existsSync(CONFIG_FILE)) return DEFAULT_CONFIG;
    try {
        const userConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        return {
            ...DEFAULT_CONFIG,
            ...userConfig,
            allowedDomains: userConfig.allowedDomains ?? DEFAULT_CONFIG.allowedDomains,
            adHostPatterns: [...DEFAULT_CONFIG.adHostPatterns, ...(userConfig.extraAdHostPatterns || [])],
            adContainerPatterns: [...DEFAULT_CONFIG.adContainerPatterns, ...(userConfig.extraAdContainerPatterns || [])]
        };
    } catch (err) {
        log('warn', `Failed to parse config.json, falling back to defaults: ${err.message}`);
        return DEFAULT_CONFIG;
    }
}

/* ===============================
   LOGGING
=============================== */

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const LOG_LEVEL = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;

function log(level, message) {
    if (LEVELS[level] > LOG_LEVEL) return;
    const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`;
    const icons = { error: '❌', warn: '⚠️ ', info: 'ℹ️ ', debug: '🔍' };
    console.log(`${icons[level] || ''}${message}`);
    try {
        fs.appendFileSync(LOG_FILE, line + '\n');
    } catch {
        // Non-fatal: logging to disk failing shouldn't crash the run.
    }
}

const CONFIG = loadConfig();
const ALLOWED_DOMAINS = new Set(CONFIG.allowedDomains);
const MAX_FILE_SIZE = CONFIG.maxFileSizeMB * 1024 * 1024;

/* ===============================
   AD REMOVAL PATTERNS (compiled once)
=============================== */

const AD_HOST_REGEX = new RegExp(CONFIG.adHostPatterns.join('|'), 'i');

// Matches whole <script>/<iframe>/<ins> blocks, or self-closing <iframe/> tags.
const TAG_BLOCK_REGEX = /<(script|iframe|ins)\b[^>]*>[\s\S]*?<\/\1>|<iframe\b[^>]*\/>/gi;

const AD_CONTAINER_REGEX = new RegExp(
    `<div\\b[^>]*(?:id|class)=["'][^"']*\\b(${CONFIG.adContainerPatterns.join('|')})\\b[^"']*["'][^>]*>[\\s\\S]*?<\\/div>`,
    'gi'
);

/* ===============================
   PROTECTION SCRIPT
=============================== */

const PROTECTION_MARKER = '<!-- DOMAIN PROTECTION SCRIPT - AUTO-GENERATED -->';
const PROTECTION_MARKER_END = '<!-- END DOMAIN PROTECTION SCRIPT -->';

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildProtectionScript() {
    return `
${PROTECTION_MARKER}
<script>
(function() {
    'use strict';

    const ALLOWED_DOMAINS = ${JSON.stringify([...ALLOWED_DOMAINS])};

    function blockAccess(message) {
        try {
            document.body.innerHTML = '';
            const overlay = document.createElement('div');
            overlay.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#000;color:#fff;font-family:Arial;text-align:center;"><div><h1 style="color:#d70000;font-size:2.5em;">🚫 Access Denied</h1><p style="font-size:1.2em;">' + message + '</p></div></div>';
            overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;';
            document.body.appendChild(overlay);
            document.body.style.overflow = 'hidden';
        } catch (e) {
            // document.body may not exist yet; fall back to a hard stop.
        }
        throw new Error('Blocked');
    }

    try {
        if (window.location.protocol === 'file:') {
            blockAccess('This game cannot be run from a local file.');
        }

        const currentDomain = window.location.hostname;
        const isAllowed = ALLOWED_DOMAINS.some(function(domain) {
            return currentDomain === domain || currentDomain.endsWith('.' + domain);
        });

        if (!isAllowed) {
            blockAccess('This game can only be played on the official website.');
        }

        if (window.top === window.self) {
            blockAccess('This game must be launched from the official portal.');
        }

        const parentDomain = new URL(window.top.location.href).hostname;
        const isParentAllowed = ALLOWED_DOMAINS.some(function(domain) {
            return parentDomain === domain || parentDomain.endsWith('.' + domain);
        });
        if (!isParentAllowed) {
            blockAccess('This game must be launched from the official portal.');
        }
    } catch (err) {
        if (err && err.message === 'Blocked') throw err;
        blockAccess('This game must be launched from the official portal.');
    }
})();
</script>
${PROTECTION_MARKER_END}
`;
}

const PROTECTION_SCRIPT = buildProtectionScript();
const PROTECTION_BLOCK_REGEX = new RegExp(
    `\\s*${escapeRegex(PROTECTION_MARKER)}[\\s\\S]*?${escapeRegex(PROTECTION_MARKER_END)}`
);

/* ===============================
   UTILITIES
=============================== */

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function filenameToDisplayName(file) {
    return file
        .replace(/\.html$/i, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Timestamped, rotating backup. Keeps at most CONFIG.keepBackupVersions
 * copies per file so games_backup doesn't grow unbounded.
 */
function backupFile(file) {
    ensureDir(BACKUP_FOLDER);
    const base = path.basename(file, '.html');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dest = path.join(BACKUP_FOLDER, `${base}.${stamp}.html`);
    fs.copyFileSync(file, dest);

    const versions = fs.readdirSync(BACKUP_FOLDER)
        .filter(f => f.startsWith(`${base}.`) && f.endsWith('.html'))
        .sort()
        .reverse();

    for (const old of versions.slice(CONFIG.keepBackupVersions)) {
        fs.unlinkSync(path.join(BACKUP_FOLDER, old));
    }

    return dest;
}

/* ===============================
   AD REMOVAL
=============================== */

function stripAds(content) {
    let removed = 0;

    content = content.replace(TAG_BLOCK_REGEX, (match) => {
        if (AD_HOST_REGEX.test(match)) {
            removed++;
            return '';
        }
        return match;
    });

    content = content.replace(AD_CONTAINER_REGEX, () => {
        removed++;
        return '';
    });

    return { content, removed };
}

/* ===============================
   PROTECTION HANDLING
=============================== */

function addProtection(filePath, { dryRun = false } = {}) {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalLength = content.length;

    const { content: cleaned, removed } = stripAds(content);
    content = cleaned;

    const alreadyProtected = PROTECTION_BLOCK_REGEX.test(content) || content.includes(PROTECTION_MARKER);
    const willAddProtection = !alreadyProtected;

    if (!willAddProtection && removed === 0) {
        return { changed: false, adsRemoved: 0, protectionAdded: false };
    }

    if (willAddProtection) {
        if (!/<body[^>]*>/i.test(content)) {
            throw new Error('No <body> tag found — cannot inject protection script');
        }
        content = content.replace(/(<body[^>]*>)/i, `$1${PROTECTION_SCRIPT}`);
    }

    if (!dryRun) {
        backupFile(filePath);
        fs.writeFileSync(filePath, content);
    }

    return {
        changed: true,
        adsRemoved: removed,
        protectionAdded: willAddProtection,
        bytesDelta: content.length - originalLength
    };
}

function removeProtection(filePath, { dryRun = false } = {}) {
    let content = fs.readFileSync(filePath, 'utf8');

    const { content: cleaned, removed } = stripAds(content);
    content = cleaned;

    const hasProtection = PROTECTION_BLOCK_REGEX.test(content) || content.includes(PROTECTION_MARKER);

    if (!hasProtection && removed === 0) {
        return { changed: false, adsRemoved: 0, protectionRemoved: false };
    }

    if (hasProtection) {
        if (PROTECTION_BLOCK_REGEX.test(content)) {
            content = content.replace(PROTECTION_BLOCK_REGEX, '');
        } else {
            // Fallback for legacy-format protection blocks without the end marker.
            content = content.replace(
                /\s*<!-- DOMAIN PROTECTION SCRIPT - AUTO-GENERATED -->[\s\S]*?<\/script>/,
                ''
            );
        }
    }

    if (!dryRun) {
        backupFile(filePath);
        fs.writeFileSync(filePath, content);
    }

    return { changed: true, adsRemoved: removed, protectionRemoved: hasProtection };
}

/* ===============================
   GAME LIST GENERATION
=============================== */

function generateGameList(files, { dryRun = false } = {}) {
    const games = files.map(file => ({
        name: file.replace(/\.html$/i, ''),
        display: filenameToDisplayName(file)
    }));

    if (!dryRun) {
        fs.writeFileSync(LIST_FILE, JSON.stringify(games, null, 2));
    }
    log('info', `list.json ${dryRun ? 'would be generated' : 'generated'} (${games.length} games)`);
    return games;
}

/* ===============================
   MAIN PROCESS
=============================== */

function processGames(action = 'add', options = {}) {
    const { dryRun = false } = options;

    ensureDir(GAMES_FOLDER);

    let files;
    try {
        files = fs.readdirSync(GAMES_FOLDER).filter(f => f.toLowerCase().endsWith('.html'));
    } catch (err) {
        log('error', `Cannot read games folder (${GAMES_FOLDER}): ${err.message}`);
        process.exitCode = 1;
        return;
    }

    if (files.length === 0) {
        log('warn', `No .html files found in ${GAMES_FOLDER}`);
    }

    const summary = { touched: 0, adsRemoved: 0, skipped: 0, failed: 0 };

    for (const file of files) {
        const fp = path.join(GAMES_FOLDER, file);

        try {
            const stat = fs.statSync(fp);
            if (stat.size > MAX_FILE_SIZE) {
                log('warn', `${file}: skipped (${(stat.size / 1024 / 1024).toFixed(1)}MB exceeds ${CONFIG.maxFileSizeMB}MB limit)`);
                summary.skipped++;
                continue;
            }

            const result = action === 'add'
                ? addProtection(fp, { dryRun })
                : removeProtection(fp, { dryRun });

            summary.adsRemoved += result.adsRemoved;

            if (result.changed) {
                summary.touched++;
                const bits = [];
                if (result.adsRemoved > 0) bits.push(`${result.adsRemoved} ad block(s) stripped`);
                if (result.protectionAdded) bits.push('protection added');
                if (result.protectionRemoved) bits.push('protection removed');
                log('info', `${file}: ${bits.join(', ')}${dryRun ? ' [dry-run]' : ''}`);
            } else {
                log('debug', `${file}: no changes needed`);
            }
        } catch (err) {
            summary.failed++;
            log('error', `${file}: failed — ${err.message}`);
        }
    }

    generateGameList(files, { dryRun });

    log('info', `Done | ${summary.touched} touched | ${summary.adsRemoved} ad block(s) removed | ${summary.skipped} skipped | ${summary.failed} failed${dryRun ? ' [DRY RUN — no files written]' : ''}`);

    if (summary.failed > 0) process.exitCode = 1;
}

/* ===============================
   CLI
=============================== */

function parseArgs(argv) {
    return {
        remove: argv.includes('--remove') || argv.includes('-r'),
        dryRun: argv.includes('--dry-run') || argv.includes('-n'),
        help: argv.includes('--help') || argv.includes('-h')
    };
}

function main() {
    const args = parseArgs(process.argv.slice(2));

    if (args.help) {
        console.log(`
USAGE:
  node manage-games.js                 Strip ads + add protection to all games
  node manage-games.js --remove, -r    Strip ads + remove protection from all games
  node manage-games.js --dry-run, -n   Preview changes without writing any files
  node manage-games.js --help, -h      Show this help

CONFIG:
  Optional config.json next to this script can override allowedDomains,
  add extraAdHostPatterns / extraAdContainerPatterns, maxFileSizeMB, keepBackupVersions.

ENV:
  LOG_LEVEL=error|warn|info|debug      Controls console/log verbosity (default: info)
`);
        return;
    }

    processGames(args.remove ? 'remove' : 'add', { dryRun: args.dryRun });
}

if (require.main === module) {
    main();
}

module.exports = { stripAds, addProtection, removeProtection, processGames, loadConfig };
