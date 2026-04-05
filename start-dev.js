#!/usr/bin/env node
/**
 * UBI-CMS Development Stack Starter
 * 
 * Starts an embedded PostgreSQL server, initializes the database,
 * then launches the API. Run this from the project root.
 * 
 * Usage: node start-dev.js
 */

const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = __dirname;
const API_DIR = path.join(ROOT, 'api');

async function main() {
  console.log('🚀 UBI-CMS Dev Stack Starting...\n');

  // ──────────────────────────────────────────────
  // 1. Start embedded PostgreSQL
  // ──────────────────────────────────────────────
  let EmbeddedPostgres;
  try {
    EmbeddedPostgres = require(path.join(API_DIR, 'node_modules', 'embedded-postgres'));
    // Handle both default and named export
    if (EmbeddedPostgres.default) EmbeddedPostgres = EmbeddedPostgres.default;
  } catch (e) {
    console.error('❌  embedded-postgres not found. Run: npm install embedded-postgres --prefix api');
    process.exit(1);
  }

  const pgDataDir = path.join(ROOT, '.pgdata');
  const pg = new EmbeddedPostgres({
    databaseDir: pgDataDir,
    user: 'postgres',
    password: 'devpassword123',
    port: 5432,
    persistent: true,
  });

  console.log('📦 Starting embedded PostgreSQL on port 5432...');
  try {
    await pg.initialise();
    await pg.start();
    console.log('✅  PostgreSQL started');
  } catch (e) {
    if (e.message && e.message.includes('already running')) {
      console.log('ℹ️  PostgreSQL already running');
    } else {
      console.error('❌  PostgreSQL start failed:', e.message);
      process.exit(1);
    }
  }

  // ──────────────────────────────────────────────
  // 2. Create database & load schema/seed
  // ──────────────────────────────────────────────
  const { Client } = require(path.join(API_DIR, 'node_modules', 'pg'));

  async function pgConnect(database = 'postgres') {
    const client = new Client({
      host: 'localhost', port: 5432,
      user: 'postgres', password: 'devpassword123',
      database,
    });
    await client.connect();
    return client;
  }

  // Create ubi_dev database if it doesn't exist
  let adminClient;
  try {
    adminClient = await pgConnect('postgres');
    const res = await adminClient.query("SELECT 1 FROM pg_database WHERE datname = 'ubi_dev'");
    if (res.rowCount === 0) {
      console.log('📋 Creating ubi_dev database...');
      await adminClient.query('CREATE DATABASE ubi_dev');
      console.log('✅  Database created');

      // Load schema
      const schemaSQL = fs.readFileSync(path.join(API_DIR, 'dev-schema.sql'), 'utf8');
      const seedSQL   = fs.readFileSync(path.join(API_DIR, 'dev-seed.sql'),   'utf8');
      await adminClient.end();

      const dbClient = await pgConnect('ubi_dev');
      console.log('📋 Loading schema...');
      await dbClient.query(schemaSQL);
      console.log('📋 Loading seed data...');
      await dbClient.query(seedSQL);
      console.log('✅  Schema + seed loaded');
      console.log('   Login: admin / Admin@123456');
      console.log('   Demo:  demo  / Demo@Platform1');
      await dbClient.end();
    } else {
      console.log('ℹ️  Database ubi_dev already exists – skipping schema load');
      await adminClient.end();
    }
  } catch (e) {
    if (adminClient) await adminClient.end().catch(() => {});
    console.error('❌  Database setup failed:', e.message);
    process.exit(1);
  }

  // ──────────────────────────────────────────────
  // 3. Start the API server
  // ──────────────────────────────────────────────
  console.log('\n🔧 Starting API server on http://localhost:3000 ...');
  const apiEnv = {
    ...process.env,
    NODE_ENV:     'development',
    PORT:         '3000',
    DB_HOST:      'localhost',
    DB_PORT:      '5432',
    DB_NAME:      'ubi_dev',
    DB_USER:      'postgres',
    DB_PASSWORD:  'devpassword123',
    DATABASE_URL: 'postgresql://postgres:devpassword123@localhost:5432/ubi_dev',
    JWT_SECRET:   'dev-jwt-secret-change-in-production-must-be-at-least-32-chars',
    JWT_EXPIRY:   '24h',
    CORS_ORIGIN:  'http://localhost:3001,http://localhost:3000',
    LOG_LEVEL:    'debug',
  };

  const api = spawn('node', ['src/index.js'], {
    cwd: API_DIR,
    env: apiEnv,
    stdio: 'inherit',
  });

  api.on('exit', (code) => {
    console.log(`\nAPI exited with code ${code}`);
    pg.stop().catch(() => {});
  });

  // ──────────────────────────────────────────────
  // 4. Print ready message
  // ──────────────────────────────────────────────
  setTimeout(() => {
    console.log('\n' + '='.repeat(60));
    console.log('🟢  Stack is UP!');
    console.log('');
    console.log('  API:      http://localhost:3000/health');
    console.log('  Frontend: run "npm run dev" in frontend/portal-ui/');
    console.log('            (opens on http://localhost:3001)');
    console.log('');
    console.log('  Accounts:');
    console.log('    admin / Admin@123456  (admin role)');
    console.log('    demo  / Demo@Platform1 (demo user)');
    console.log('    alice / Admin@123456   (subscriber)');
    console.log('='.repeat(60) + '\n');
  }, 3000);

  // Handle shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    api.kill();
    await pg.stop().catch(() => {});
    process.exit(0);
  });
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
