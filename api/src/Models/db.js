/**
 * Database Connection Module
 * 
 * @version 1.0.0
 * PostgreSQL connection using node-postgres
 */

const { Pool } = require('pg');
const config = require('../Config/app');

const pool = new Pool({
    host: config.database.host,
    port: config.database.port,
    database: config.database.name,
    user: config.database.user,
    password: config.database.password,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on('error', (err) => {
    console.error('Unexpected database error:', err);
});

// Query helper
async function query(text, params) {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text: text.substring(0, 50), duration, rows: res.rowCount });
    return res;
}

// Transaction helper
async function transaction(callback) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

// Health check
async function checkHealth() {
    const result = await pool.query('SELECT NOW()');
    return result.rows[0].now;
}

module.exports = {
    pool,
    query,
    transaction,
    checkHealth,
};

// For use as connection source for models
module.exports.default = pool;