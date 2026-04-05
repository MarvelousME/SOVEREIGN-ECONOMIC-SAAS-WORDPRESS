'use strict';

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const signals = require('../Services/envFileSignals');

const ENABLED =
    process.env.ENABLE_ADMIN_ENV_EDITOR === '1' ||
    process.env.ENABLE_ADMIN_ENV_EDITOR === 'true';

/** Monorepo root: api/src/Controllers -> ../../../ */
const DEFAULT_ROOT = path.resolve(__dirname, '../../..');
const ENV_ROOT = path.resolve(process.env.UBI_ENV_FILES_ROOT || DEFAULT_ROOT);

/** Allowed relative paths (forward slashes). No traversal. */
const ALLOWED_IDS = [
    '.env',
    '.env.example',
    '.env.local',
    'api/.env',
    'api/.env.local',
    'frontend/portal-ui/.env.local',
    'frontend/portal-ui/.env.development',
    'frontend/portal-ui/.env.production',
    'docker/.env',
];

let watchTimer = null;
let watchStarted = false;

function isEnabled() {
    return ENABLED;
}

function gate(req, res, next) {
    if (!ENABLED) {
        return res.status(404).json({
            error: 'Env file manager is disabled. Set ENABLE_ADMIN_ENV_EDITOR=1 on the API.',
        });
    }
    next();
}

function resolveId(rawId) {
    const id = String(rawId || '')
        .replace(/\\/g, '/')
        .replace(/^\/+/, '')
        .trim();
    if (!ALLOWED_IDS.includes(id)) {
        const e = new Error('Unknown or disallowed env file id');
        e.statusCode = 400;
        throw e;
    }
    const full = path.resolve(ENV_ROOT, id);
    const rel = path.relative(ENV_ROOT, full);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
        const e = new Error('Invalid path');
        e.statusCode = 400;
        throw e;
    }
    return { id, full };
}

function bumpSignals(reason) {
    signals.emit('change', { reason, at: Date.now() });
}

function scheduleWatchEmit() {
    if (watchTimer) clearTimeout(watchTimer);
    watchTimer = setTimeout(() => bumpSignals('fs-watch'), 350);
}

/**
 * Watch likely directories for external edits (best-effort; platform-dependent).
 */
function startWatching(logger) {
    if (!ENABLED || watchStarted) return;
    watchStarted = true;
    const dirs = [
        ENV_ROOT,
        path.join(ENV_ROOT, 'api'),
        path.join(ENV_ROOT, 'frontend', 'portal-ui'),
        path.join(ENV_ROOT, 'docker'),
    ];
    for (const dir of dirs) {
        try {
            if (!fsSync.existsSync(dir)) continue;
            fsSync.watch(dir, { persistent: true }, () => scheduleWatchEmit());
        } catch (e) {
            logger?.warn?.(`[admin-env] watch skipped for ${dir}: ${e.message}`);
        }
    }
    logger?.info?.('[admin-env] filesystem watch enabled for env manifest');
}

async function manifest(req, res) {
    try {
        const files = [];
        for (const id of ALLOWED_IDS) {
            const { full } = resolveId(id);
            try {
                const st = await fs.stat(full);
                files.push({
                    id,
                    exists: true,
                    mtimeMs: st.mtimeMs,
                    size: st.size,
                });
            } catch {
                files.push({ id, exists: false, mtimeMs: null, size: null });
            }
        }
        res.json({
            root: ENV_ROOT,
            enabled: true,
            files,
        });
    } catch (e) {
        res.status(e.statusCode || 500).json({ error: e.message });
    }
}

async function getFile(req, res) {
    try {
        const { id } = req.query;
        const { full } = resolveId(id);
        const buf = await fs.readFile(full, 'utf8');
        const st = await fs.stat(full);
        res.json({
            id,
            content: buf,
            mtimeMs: st.mtimeMs,
            size: st.size,
        });
    } catch (e) {
        if (e.code === 'ENOENT') {
            return res.status(404).json({ error: 'File does not exist' });
        }
        res.status(e.statusCode || 500).json({ error: e.message });
    }
}

async function putFile(req, res) {
    try {
        const { id, content } = req.body || {};
        if (typeof id !== 'string' || typeof content !== 'string') {
            return res.status(400).json({ error: 'id and content (string) required' });
        }
        const { full } = resolveId(id);
        const dir = path.dirname(full);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(full, content, 'utf8');
        const st = await fs.stat(full);
        bumpSignals('save');
        res.json({
            ok: true,
            id,
            mtimeMs: st.mtimeMs,
            size: st.size,
        });
    } catch (e) {
        res.status(e.statusCode || 500).json({ error: e.message });
    }
}

/**
 * Merge KEY=VALUE pairs from file into process.env (API process only).
 * Does not reconnect DB/Redis; restart still required for many settings.
 */
async function applyRuntime(req, res) {
    try {
        const { id } = req.body || {};
        if (typeof id !== 'string') {
            return res.status(400).json({ error: 'id required' });
        }
        const { full } = resolveId(id);
        const raw = await fs.readFile(full, 'utf8');
        const parsed = dotenv.parse(raw);
        let n = 0;
        for (const [k, v] of Object.entries(parsed)) {
            if (k) {
                process.env[k] = v;
                n += 1;
            }
        }
        bumpSignals('apply-runtime');
        res.json({
            ok: true,
            keysApplied: n,
            warning:
                'Values merged into this API process only. Restart the API for DB/Redis/JWT pool changes. ' +
                'Next.js needs its own dev-server restart for NEXT_PUBLIC_*.',
        });
    } catch (e) {
        if (e.code === 'ENOENT') {
            return res.status(404).json({ error: 'File does not exist' });
        }
        res.status(e.statusCode || 500).json({ error: e.message });
    }
}

function stream(req, res) {
    if (!ENABLED) {
        return res.status(404).json({ error: 'Env file manager is disabled' });
    }

    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
    });
    res.flushHeaders?.();

    const send = (obj) => {
        res.write(`data: ${JSON.stringify(obj)}\n\n`);
    };

    const onChange = (payload) => send({ type: 'change', ...payload });
    signals.on('change', onChange);

    const ping = setInterval(() => send({ type: 'ping', t: Date.now() }), 25000);

    send({ type: 'connected', t: Date.now() });

    req.on('close', () => {
        clearInterval(ping);
        signals.removeListener('change', onChange);
    });
}

module.exports = {
    isEnabled,
    gate,
    startWatching,
    manifest,
    getFile,
    putFile,
    applyRuntime,
    stream,
};
