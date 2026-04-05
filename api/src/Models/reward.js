/**
 * Reward Model
 * 
 * @version 1.0.0
 * Reward repository for database operations
 */

const db = require('./db');

class RewardModel {
    async findById(id) {
        const result = await db.query('SELECT * FROM rewards WHERE id = $1', [id]);
        return result.rows[0] || null;
    }

    async create(rewardData) {
        const { user_id, amount, currency, type, source_type, source_id } = rewardData;
        const result = await db.query(
            `INSERT INTO rewards (user_id, amount, currency, type, source_type, source_id)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [user_id, amount, currency || 'UBI', type, source_type, source_id]
        );
        return result.rows[0];
    }

    async updateStatus(id, status) {
        const processedAt = status === 'completed' ? 'NOW()' : 'NULL';
        const result = await db.query(
            `UPDATE rewards SET status = $1, processed_at = ${processedAt} WHERE id = $2 RETURNING *`,
            [status, id]
        );
        return result.rows[0];
    }

    async listByUser(userId, page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const result = await db.query(
            `SELECT * FROM rewards WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );
        
        const countResult = await db.query('SELECT COUNT(*) FROM rewards WHERE user_id = $1', [userId]);
        const total = parseInt(countResult.rows[0].count);
        
        return {
            data: result.rows,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        };
    }

    async getUserBalance(userId) {
        const result = await db.query(
            `SELECT COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as balance
             FROM rewards WHERE user_id = $1`,
            [userId]
        );
        return parseFloat(result.rows[0].balance);
    }
}

module.exports = new RewardModel();