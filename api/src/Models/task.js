/**
 * Task Model
 * 
 * @version 1.0.0
 * Task repository for database operations
 */

const db = require('./db');

class TaskModel {
    async findById(id) {
        const result = await db.query(
            'SELECT * FROM tasks WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    }

    async create(taskData) {
        const { title, description, category, difficulty, reward_amount, reward_currency, max_participants, deadline, proof_requirements, created_by } = taskData;
        const result = await db.query(
            `INSERT INTO tasks (title, description, category, difficulty, reward_amount, reward_currency, max_participants, deadline, proof_requirements, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [title, description, category, difficulty || 'medium', reward_amount, reward_currency || 'UBI', max_participants || 1, deadline, JSON.stringify(proof_requirements || {}), created_by]
        );
        return result.rows[0];
    }

    async update(id, taskData) {
        const { title, description, category, difficulty, reward_amount, reward_currency, max_participants, status, deadline, proof_requirements } = taskData;
        const result = await db.query(
            `UPDATE tasks 
             SET title = COALESCE($1, title),
                 description = COALESCE($2, description),
                 category = COALESCE($3, category),
                 difficulty = COALESCE($4, difficulty),
                 reward_amount = COALESCE($5, reward_amount),
                 reward_currency = COALESCE($6, reward_currency),
                 max_participants = COALESCE($7, max_participants),
                 status = COALESCE($8, status),
                 deadline = COALESCE($9, deadline),
                 proof_requirements = COALESCE($10, proof_requirements),
                 updated_at = NOW()
             WHERE id = $11
             RETURNING *`,
            [title, description, category, difficulty, reward_amount, reward_currency, max_participants, status, deadline, proof_requirements ? JSON.stringify(proof_requirements) : null, id]
        );
        return result.rows[0];
    }

    async list(filters = {}, page = 1, limit = 20) {
        const { status, category, difficulty } = filters;
        const conditions = [];
        const params = [];
        let paramIndex = 1;

        if (status) {
            conditions.push(`status = $${paramIndex++}`);
            params.push(status);
        }
        if (category) {
            conditions.push(`category = $${paramIndex++}`);
            params.push(category);
        }
        if (difficulty) {
            conditions.push(`difficulty = $${paramIndex++}`);
            params.push(difficulty);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const offset = (page - 1) * limit;

        const result = await db.query(
            `SELECT * FROM tasks ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
            [...params, limit, offset]
        );

        const countResult = await db.query(`SELECT COUNT(*) FROM tasks ${whereClause}`, params);
        const total = parseInt(countResult.rows[0].count);

        return {
            data: result.rows,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        };
    }

    async incrementParticipants(id) {
        const result = await db.query(
            'UPDATE tasks SET current_participants = current_participants + 1 WHERE id = $1 RETURNING *',
            [id]
        );
        return result.rows[0];
    }

    async delete(id) {
        await db.query('DELETE FROM tasks WHERE id = $1', [id]);
    }
}

module.exports = new TaskModel();