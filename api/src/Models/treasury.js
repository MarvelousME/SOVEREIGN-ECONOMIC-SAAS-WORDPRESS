/**
 * Treasury Model
 *
 * @version 2.0.0
 * Treasury repository for database operations.
 *
 * Fixes vs v1.0.0:
 *  - Table "treasury" → "treasury_accounts"
 *  - Table "yield_strategies" → "treasury_strategies"
 *  - treasury_accounts has UNIQUE(user_id) (one account per user, no currency column
 *    in the conflict key), so deposit uses ON CONFLICT (user_id) DO UPDATE
 *  - deposit records balance_after in treasury_transactions
 *  - withdraw uses treasury_accounts and records balance_after
 *  - getOrCreateBalance updated for new schema
 */

const db = require('./db');

class TreasuryModel {
    async getBalance(userId, currency = 'UBI') {
        const result = await db.query(
            'SELECT balance, currency FROM treasury_accounts WHERE user_id = $1',
            [userId]
        );
        return result.rows[0] || { balance: 0, currency };
    }

    async getOrCreateBalance(userId, currency = 'UBI') {
        const balance = await this.getBalance(userId, currency);
        if (!balance.balance) {
            await db.query(
                'INSERT INTO treasury_accounts (user_id, balance, currency) VALUES ($1, 0, $2) ON CONFLICT (user_id) DO NOTHING',
                [userId, currency]
            );
            return { balance: 0, currency };
        }
        return balance;
    }

    async deposit(userId, amount, currency = 'UBI', metadata = {}) {
        return db.transaction(async (client) => {
            const result = await client.query(
                `INSERT INTO treasury_accounts (user_id, balance, currency)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (user_id) DO UPDATE
                     SET balance    = treasury_accounts.balance + $2,
                         updated_at = NOW()
                 RETURNING balance`,
                [userId, amount, currency]
            );

            await client.query(
                `INSERT INTO treasury_transactions (user_id, type, amount, currency, balance_after, metadata)
                 VALUES ($1, 'deposit', $2, $3, $4, $5)`,
                [userId, amount, currency, parseFloat(result.rows[0].balance), JSON.stringify(metadata)]
            );

            return { balance: parseFloat(result.rows[0].balance) };
        });
    }

    async withdraw(userId, amount, currency = 'UBI', metadata = {}) {
        return db.transaction(async (client) => {
            const checkResult = await client.query(
                'SELECT balance FROM treasury_accounts WHERE user_id = $1 FOR UPDATE',
                [userId]
            );

            const currentBalance = parseFloat(checkResult.rows[0]?.balance || 0);
            if (currentBalance < amount) {
                throw new Error('Insufficient balance');
            }

            const result = await client.query(
                'UPDATE treasury_accounts SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2 RETURNING balance',
                [amount, userId]
            );

            await client.query(
                `INSERT INTO treasury_transactions (user_id, type, amount, currency, balance_after, metadata)
                 VALUES ($1, 'withdraw', $2, $3, $4, $5)`,
                [userId, amount, currency, parseFloat(result.rows[0].balance), JSON.stringify(metadata)]
            );

            return { balance: parseFloat(result.rows[0].balance) };
        });
    }

    async getTransactionHistory(userId, page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const [result, countResult] = await Promise.all([
            db.query(
                'SELECT * FROM treasury_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
                [userId, limit, offset]
            ),
            db.query('SELECT COUNT(*) FROM treasury_transactions WHERE user_id = $1', [userId]),
        ]);
        const total = parseInt(countResult.rows[0].count);
        return {
            data: result.rows,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        };
    }

    async listStrategies() {
        const result = await db.query(
            'SELECT * FROM treasury_strategies WHERE active = true ORDER BY apy DESC'
        );
        return result.rows;
    }
}

module.exports = new TreasuryModel();
