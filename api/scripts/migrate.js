/**
 * Database Migration Runner
 *
 * Splits SQL on semicolons outside $$ ... $$ blocks so PL/pgSQL bodies stay intact.
 */

const fs = require('fs');
const path = require('path');
const db = require('../src/Models/db');
const { splitSqlStatements } = require('./sql-split');

async function runMigrations() {
    console.log('Starting database migrations...');

    const migrationsPath = path.join(__dirname, 'migrations.sql');

    if (!fs.existsSync(migrationsPath)) {
        console.error('Migration file not found:', migrationsPath);
        process.exit(1);
    }

    const sql = fs.readFileSync(migrationsPath, 'utf8');
    const statements = splitSqlStatements(sql);

    for (const statement of statements) {
        try {
            await db.query(statement);
            console.log('Executed:', statement.substring(0, 60).replace(/\s+/g, ' ') + '...');
        } catch (error) {
            if (error.message.includes('already exists')) {
                console.log('Skipped (already exists):', statement.substring(0, 60));
            } else {
                console.error('Error executing statement:', error.message);
                console.error('Statement:', statement.substring(0, 220));
            }
        }
    }

    console.log('Migrations complete!');
    process.exit(0);
}

if (require.main === module) {
    runMigrations().catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
}

module.exports = { runMigrations, splitSqlStatements };
