import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @typedef {{ filename: string, number: number, status: 'success' | 'failed' | 'duplicate', error?: string, duration?: number }} MigrationResult */
/** @typedef {{ number: number, filename: string, filepath: string }} MigrationFile */

class MigrationTester {
  constructor() {
    this.migrationsDir = path.join(__dirname, '..', '..', 'migrations');
    
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'ubi_dev',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'devpassword123',
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }

  async initialize() {
    console.log('\n=== Migration Integration Test ===\n');
    console.log(`Database: ${process.env.DB_NAME || 'ubi_dev'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}`);
    console.log(`Migrations directory: ${this.migrationsDir}\n`);
    
    const client = await this.pool.connect();
    try {
      await client.query('SELECT 1');
      console.log('Database connection: OK\n');
    } finally {
      client.release();
    }
  }

  async dropAllTables() {
    console.log('Dropping all existing tables for fresh migration test...\n');
    const client = await this.pool.connect();
    try {
      await client.query(`
        DO $$
        DECLARE
          r RECORD;
        BEGIN
          FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
            EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
          END LOOP;
          FOR r IN (SELECT sequencename FROM pg_sequences WHERE schemaname = 'public') LOOP
            EXECUTE 'DROP SEQUENCE IF EXISTS public.' || quote_ident(r.sequencename) || ' CASCADE';
          END LOOP;
          FOR r IN (SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace) LOOP
            EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(r.proname) || ' CASCADE';
          END LOOP;
          FOR r IN (SELECT typname FROM pg_type WHERE typnamespace = 'public'::regnamespace) LOOP
            EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
          END LOOP;
          FOR r IN (SELECT policy_name, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policy_name) || ' ON ' || quote_ident(r.tablename);
          END LOOP;
          ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
          ALTER TABLE users DISABLE ROW LEVEL SECURITY;
        END;
        $$;
      `);
      console.log('All tables dropped successfully.\n');
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pool.end();
  }

  parseMigrationNumber(filename) {
    const match = filename.match(/^(\d+)_/);
    if (match) {
      return parseInt(match[1], 10);
    }
    return null;
  }

  getMigrationFiles() {
    const files = fs.readdirSync(this.migrationsDir)
      .filter(f => f.endsWith('.sql') && f !== '000_run_all_migrations.sql')
      .map(filename => {
        const number = this.parseMigrationNumber(filename);
        return {
          number: number ?? -1,
          filename,
          filepath: path.join(this.migrationsDir, filename)
        };
      })
      .filter(f => f.number >= 0)
      .sort((a, b) => a.number - b.number);

    return files;
  }

  detectDuplicateMigrationNumbers(files) {
    const numberCount = new Map();
    
    for (const file of files) {
      const existing = numberCount.get(file.number) || [];
      existing.push(file.filename);
      numberCount.set(file.number, existing);
    }

    let hasDuplicates = false;
    for (const [number, filenames] of numberCount) {
      if (filenames.length > 1) {
        console.error(`WARNING: Duplicate migration number ${number}: ${filenames.join(', ')}`);
        this.duplicateNumbers.add(number);
        hasDuplicates = true;
      }
    }

    if (hasDuplicates) {
      console.error(`\nERROR: Found ${this.duplicateNumbers.size} duplicate migration numbers!\n`);
    }
  }

  async applyMigration(file) {
    const startTime = Date.now();
    const client = await this.pool.connect();
    
    /** @type {MigrationResult} */
    const result = {
      filename: file.filename,
      number: file.number,
      status: 'success'
    };

    try {
      const sql = fs.readFileSync(file.filepath, 'utf-8');
      
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('COMMIT');
        result.duration = Date.now() - startTime;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    } catch (err) {
      result.status = 'failed';
      result.error = err.message;
      result.duration = Date.now() - startTime;
    } finally {
      client.release();
    }

    return result;
  }

  async runAllMigrations() {
    const files = this.getMigrationFiles();
    this.duplicateNumbers = new Set();
    
    console.log(`Found ${files.length} migration files\n`);
    
    this.detectDuplicateMigrationNumbers(files);
    
    console.log('Migration execution order:\n');
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isDuplicate = this.duplicateNumbers.has(file.number);
      
      process.stdout.write(`[${String(i + 1).padStart(2)}/${files.length}] ${file.filename}`);
      
      if (isDuplicate) {
        process.stdout.write(' (DUPLICATE NUMBER)');
      }
      
      process.stdout.write('... ');
      
      const result = await this.applyMigration(file);
      this.results.push(result);
      
      if (result.status === 'success') {
        console.log(`OK (${result.duration}ms)`);
      } else if (result.status === 'duplicate') {
        console.log(`SKIPPED (duplicate)`);
      } else {
        console.log(`FAILED`);
        console.log(`  Error: ${result.error}`);
      }
    }
  }

  async verifySchemaIntegrity() {
    console.log('\nVerifying schema integrity...\n');
    
    const client = await this.pool.connect();
    try {
      const extensions = await client.query(`
        SELECT extname FROM pg_extension WHERE extname NOT IN ('plpgsql')
      `);
      console.log(`Extensions created: ${extensions.rows.map(r => r.extname).join(', ')}`);
      
      const tables = await client.query(`
        SELECT COUNT(*) as count FROM pg_tables WHERE schemaname = 'public'
      `);
      console.log(`Tables created: ${tables.rows[0].count}`);
      
      const functions = await client.query(`
        SELECT COUNT(*) as count FROM pg_proc WHERE pronamespace = 'public'::regnamespace
      `);
      console.log(`Functions created: ${functions.rows[0].count}`);
      
      const enums = await client.query(`
        SELECT COUNT(*) as count FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typtype = 'e'
      `);
      console.log(`Enums created: ${enums.rows[0].count}`);
      
      const rlsEnabled = await client.query(`
        SELECT COUNT(*) as count FROM pg_tables 
        WHERE schemaname = 'public' AND relrowsecurity = true
      `);
      console.log(`Tables with RLS: ${rlsEnabled.rows[0].count}`);
      
    } finally {
      client.release();
    }
  }

  async checkCircularDependencies() {
    console.log('\nChecking for potential circular dependencies...\n');
    
    const client = await this.pool.connect();
    try {
      const foreignKeys = await client.query(`
        SELECT
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name != ccu.table_name
        AND tc.table_schema = 'public'
        AND ccu.table_schema = 'public'
        ORDER BY tc.table_name, kcu.column_name
      `);
      
      const tableRefs = new Map();
      for (const row of foreignKeys.rows) {
        const deps = tableRefs.get(row.table_name) || new Set();
        deps.add(row.foreign_table_name);
        tableRefs.set(row.table_name, deps);
      }
      
      const circularDeps = this.findCircularDependencies(tableRefs);
      
      if (circularDeps.length > 0) {
        console.log('WARNING: Potential circular dependencies detected:');
        for (const dep of circularDeps) {
          console.log(`  ${dep.join(' -> ')}`);
        }
      } else {
        console.log('No circular dependencies detected.');
      }
      
    } finally {
      client.release();
    }
  }

  findCircularDependencies(graph) {
    const cycles = [];
    const visited = new Set();
    const recursionStack = new Set();

    const dfs = (node, path) => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const neighbors = graph.get(node) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path]);
        } else if (recursionStack.has(neighbor)) {
          const cycleStart = path.indexOf(neighbor);
          cycles.push(path.slice(cycleStart));
        }
      }

      recursionStack.delete(node);
    };

    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }

    return cycles;
  }

  printSummary() {
    console.log('\n=== Migration Test Summary ===\n');
    
    const successful = this.results.filter(r => r.status === 'success').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const duplicates = this.results.filter(r => r.status === 'duplicate').length;
    
    console.log(`Total migrations: ${this.results.length}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);
    console.log(`Skipped (duplicates): ${duplicates}`);
    console.log(`Duplicate numbers found: ${this.duplicateNumbers.size}`);
    
    if (failed > 0) {
      console.log('\nFailed migrations:');
      for (const result of this.results.filter(r => r.status === 'failed')) {
        console.log(`  ${result.filename}: ${result.error}`);
      }
    }
    
    if (this.duplicateNumbers.size > 0) {
      console.log('\nDuplicate migration numbers must be resolved:');
      for (const num of this.duplicateNumbers) {
        const files = this.results.filter(r => r.number === num).map(r => r.filename);
        console.log(`  ${num}: ${files.join(', ')}`);
      }
    }
    
    console.log('\n' + (failed === 0 ? '✓ ALL MIGRATIONS PASSED' : '✗ SOME MIGRATIONS FAILED'));
  }

  async run() {
    this.results = [];
    this.duplicateNumbers = new Set();
    
    try {
      await this.initialize();
      await this.dropAllTables();
      await this.runAllMigrations();
      await this.verifySchemaIntegrity();
      await this.checkCircularDependencies();
      this.printSummary();
      
      const hasFailures = this.results.some(r => r.status === 'failed');
      const hasDuplicates = this.duplicateNumbers.size > 0;
      
      return !hasFailures && !hasDuplicates;
    } catch (err) {
      console.error('Migration test failed:', err);
      return false;
    } finally {
      await this.close();
    }
  }
}

async function main() {
  const tester = new MigrationTester();
  const success = await tester.run();
  process.exit(success ? 0 : 1);
}

main().catch(console.error);
