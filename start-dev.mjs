/**
 * UBI-CMS Development Stack Starter (ESM)
 *
 * Starts embedded PostgreSQL, initializes the database,
 * then launches the API and prints connection details.
 *
 * Usage: node start-dev.mjs
 */

import { createRequire }                from 'module';
import { spawn }                        from 'child_process';
import path                             from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { readFileSync, existsSync }     from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_DIR   = path.join(__dirname, 'api');
const require   = createRequire(import.meta.url);

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────
function errMsg(e) {
  if (!e) return 'unknown error';
  if (typeof e === 'string') return e;
  return e.message ?? e.stderr ?? JSON.stringify(e);
}

async function waitForPort(port, timeoutMs = 15_000) {
  const { createConnection } = await import('net');
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 300));
    const ok = await new Promise(r => {
      const s = createConnection(port, '127.0.0.1');
      s.once('connect', () => { s.destroy(); r(true); });
      s.once('error',   () => { s.destroy(); r(false); });
    });
    if (ok) return true;
  }
  return false;
}

// ──────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀  UBI-CMS Dev Stack Starting...\n');

  // ── 1. Load embedded-postgres ──────────────────────────
  let EmbeddedPostgres;
  try {
    const epPath = path.join(
      API_DIR, 'node_modules', 'embedded-postgres', 'dist', 'index.js'
    );
    const ep = await import(pathToFileURL(epPath).href);
    EmbeddedPostgres = ep.default ?? ep;
  } catch (e) {
    console.error('❌  Cannot load embedded-postgres:', errMsg(e));
    process.exit(1);
  }

  // ── 2. Init + start PostgreSQL ─────────────────────────
  const pgDataDir  = path.join(__dirname, '.pgdata');
  const pgVersion  = path.join(pgDataDir, 'PG_VERSION');  // exists after first init
  const alreadyInit = existsSync(pgVersion);

  const pg = new EmbeddedPostgres({
    databaseDir: pgDataDir,
    user:        'postgres',
    password:    'devpassword123',
    port:        5432,
    persistent:  true,
  });

  // Check if Postgres is already listening before we try to start it
  const alreadyListening = await waitForPort(5432, 500);

  if (alreadyListening) {
    console.log('ℹ️   PostgreSQL already running on port 5432\n');
  } else {
    console.log('📦  Starting embedded PostgreSQL on port 5432 …');
    try {
      if (!alreadyInit) {
        // First run: initialise creates the data cluster
        await pg.initialise();
      }
      await pg.start();

      // Wait for the port to be ready (up to 15 s)
      const ready = await waitForPort(5432, 15_000);
      if (!ready) throw new Error('PostgreSQL did not open port 5432 within 15 s');

      console.log('✅  PostgreSQL started\n');
    } catch (e) {
      console.error('❌  PostgreSQL failed:', errMsg(e));
      // Dump extra context when available
      if (e && e.stderr) console.error('    stderr:', e.stderr);
      process.exit(1);
    }
  }

  // ── 3. Create database & load schema / seed ────────────
  const { Client } = require(path.join(API_DIR, 'node_modules', 'pg'));

  const connect = async (database = 'postgres') => {
    const c = new Client({
      host: 'localhost', port: 5432,
      user: 'postgres', password: 'devpassword123',
      database,
    });
    await c.connect();
    return c;
  };

  let admin;
  try {
    admin = await connect();
    const { rowCount } = await admin.query(
      "SELECT 1 FROM pg_database WHERE datname = 'ubi_dev'"
    );

    if (rowCount === 0) {
      console.log('📋  Creating ubi_dev database …');
      await admin.query('CREATE DATABASE ubi_dev');
      await admin.end();
      admin = null;

      const schema = readFileSync(path.join(API_DIR, 'dev-schema.sql'), 'utf8');
      const seed   = readFileSync(path.join(API_DIR, 'dev-seed.sql'),   'utf8');

      const db = await connect('ubi_dev');
      console.log('📋  Loading schema …');
      await db.query(schema);
      console.log('📋  Loading seed data …');
      await db.query(seed);
      await db.end();
      console.log('✅  Schema + seed loaded\n');
    } else {
      await admin.end();
      admin = null;
      console.log('ℹ️   Database ubi_dev already exists – skipping full schema\n');
    }

    // Idempotent patches (marketplace, notifications, extra users) — every startup
    const patchPath = path.join(API_DIR, 'dev-patch.sql');
    if (existsSync(patchPath)) {
      const patchSql = readFileSync(patchPath, 'utf8');
      const pdb = await connect('ubi_dev');
      try {
        await pdb.query(patchSql);
        console.log('✅  dev-patch.sql applied\n');
      } catch (pe) {
        await pdb.end().catch(() => {});
        console.error('❌  dev-patch.sql failed:', errMsg(pe));
        process.exit(1);
      }
      await pdb.end();
    }
  } catch (e) {
    if (admin) await admin.end().catch(() => {});
    console.error('❌  Database setup failed:', errMsg(e));
    process.exit(1);
  }

  // ── 4. Start the API (skip if already running) ────────
  const apiAlreadyUp = await waitForPort(3000, 500);
  let api = null;

  if (apiAlreadyUp) {
    console.log('ℹ️   API already running on port 3000\n');
  } else {
    console.log('🔧  Starting API on http://localhost:3000 …');
    const apiEnv = {
      ...process.env,
      NODE_ENV:    'development',
      PORT:        '3000',
      DB_HOST:     'localhost',
      DB_PORT:     '5432',
      DB_NAME:     'ubi_dev',
      DB_USER:     'postgres',
      DB_PASSWORD: 'devpassword123',
      JWT_SECRET:  'dev-jwt-secret-change-in-production-must-be-at-least-32-chars',
      JWT_EXPIRY:  '24h',
      CORS_ORIGIN: 'http://localhost:3001,http://localhost:3000',
      LOG_LEVEL:   'info',
    };

    api = spawn(process.execPath, ['src/index.js'], {
      cwd:   API_DIR,
      env:   apiEnv,
      stdio: 'inherit',
    });

    api.on('exit', code => {
      console.log(`\nAPI process exited (code ${code})`);
      pg.stop().catch(() => {});
    });

    // ── 5. Wait for API to be ready ────────────────────────
    const apiReady = await waitForPort(3000, 12_000);
    if (!apiReady) {
      console.warn('⚠️   API did not open port 3000 within 12 s – check logs above');
    }
  }

  // ── 6. Banner ──────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('🟢  Stack is UP!');
  console.log('');
  console.log('  API health : http://localhost:3000/health');
  console.log('  API ready  : http://localhost:3000/ready');
  console.log('');
  console.log('  ▶  Frontend (open a NEW terminal and run):');
  console.log('       cd frontend/portal-ui && npm run dev');
  console.log('       → http://localhost:3001');
  console.log('');
  console.log('  Accounts:');
  console.log('    admin  / Admin@123456    (admin role)');
  console.log('    demo   / Demo@Platform1  (demo – no backend needed)');
  console.log('    alice  / Admin@123456    (subscriber)');
  console.log('═'.repeat(60));
  console.log('\nPress Ctrl+C to stop.\n');

  process.on('SIGINT', async () => {
    console.log('\n🛑  Shutting down …');
    if (api) api.kill('SIGINT');
    await pg.stop().catch(() => {});
    process.exit(0);
  });
}

main().catch(e => {
  console.error('\nFatal error:', errMsg(e));
  process.exit(1);
});
