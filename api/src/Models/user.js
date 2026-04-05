/**
 * User Model
 *
 * @version 2.0.0
 * User repository for database operations.
 *
 * Fixes vs v1.0.0:
 *  - create() now inserts password_hash (was silently dropped)
 *  - findByUsername / findByEmail alias password_hash → password so
 *    bcrypt.compare(password, user.password) works in authController
 *  - Removed wp_user_id / findByWpUserId (not in dev schema)
 *  - update() exposes status field
 *  - list() runs count in parallel with data query
 *  - update() RETURNING clause avoids SELECT *
 */

const db = require('./db');

class UserModel {
    async findById(id) {
        const result = await db.query(
            'SELECT id, username, email, roles, status, wallet_address, kyc_verified, created_at, updated_at FROM users WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    }

    async findByUsername(username) {
        const result = await db.query(
            'SELECT id, username, email, password_hash AS password, roles, status, wallet_address, kyc_verified FROM users WHERE username = $1',
            [username]
        );
        return result.rows[0] || null;
    }

    async findByEmail(email) {
        const result = await db.query(
            'SELECT id, username, email, password_hash AS password, roles, status FROM users WHERE email = $1',
            [email]
        );
        return result.rows[0] || null;
    }

    async create(userData) {
        const { username, email, password, roles } = userData;
        const result = await db.query(
            `INSERT INTO users (username, email, password_hash, roles)
             VALUES ($1, $2, $3, $4)
             RETURNING id, username, email, roles, status, created_at`,
            [username, email, password, roles || ['subscriber']]
        );
        return result.rows[0];
    }

    async update(id, userData) {
        const { username, email, roles, wallet_address, kyc_verified, status } = userData;
        const result = await db.query(
            `UPDATE users
             SET username      = COALESCE($1, username),
                 email         = COALESCE($2, email),
                 roles         = COALESCE($3, roles),
                 wallet_address = COALESCE($4, wallet_address),
                 kyc_verified  = COALESCE($5, kyc_verified),
                 status        = COALESCE($6, status),
                 updated_at    = NOW()
             WHERE id = $7
             RETURNING id, username, email, roles, status, wallet_address, kyc_verified, updated_at`,
            [username, email, roles, wallet_address, kyc_verified, status, id]
        );
        return result.rows[0];
    }

    async list(page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const [result, countResult] = await Promise.all([
            db.query(
                'SELECT id, username, email, roles, status, wallet_address, kyc_verified, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
                [limit, offset]
            ),
            db.query('SELECT COUNT(*) FROM users'),
        ]);
        const total = parseInt(countResult.rows[0].count);
        return {
            data: result.rows,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        };
    }

    async delete(id) {
        await db.query('DELETE FROM users WHERE id = $1', [id]);
    }
}

module.exports = new UserModel();
