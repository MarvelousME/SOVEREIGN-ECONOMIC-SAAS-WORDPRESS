/**
 * User notifications
 */
const db = require('./db');

async function listForUser(userId, { page = 1, limit = 50, unreadOnly = false } = {}) {
    const offset = (page - 1) * limit;
    const conditions = ['user_id = $1'];
    const params = [userId];
    if (unreadOnly) {
        conditions.push('read = false');
    }
    const where = `WHERE ${conditions.join(' AND ')}`;
    const { rows } = await db.query(
        `SELECT id, user_id, title, body, type, read, metadata, created_at
         FROM notifications ${where}
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
    );
    const { rows: cr } = await db.query(
        `SELECT COUNT(*)::int AS c FROM notifications ${where}`,
        unreadOnly ? [userId] : [userId]
    );
    const total = cr[0]?.c ?? 0;
    return {
        data: rows,
        pagination: { page: parseInt(page, 10), limit, total, pages: Math.ceil(total / limit) || 1 },
    };
}

async function countUnread(userId) {
    const { rows } = await db.query(
        `SELECT COUNT(*)::int AS c FROM notifications WHERE user_id = $1 AND read = false`,
        [userId]
    );
    return rows[0]?.c ?? 0;
}

async function markRead(userId, id) {
    const { rows } = await db.query(
        `UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2 RETURNING *`,
        [id, userId]
    );
    return rows[0] || null;
}

async function markAllRead(userId) {
    await db.query(`UPDATE notifications SET read = true WHERE user_id = $1 AND read = false`, [userId]);
    return { ok: true };
}

async function remove(userId, id) {
    const { rowCount } = await db.query(`DELETE FROM notifications WHERE id = $1 AND user_id = $2`, [id, userId]);
    return rowCount > 0;
}

async function createForUser({ user_id, title, body, type = 'info', metadata = {} }) {
    const { rows } = await db.query(
        `INSERT INTO notifications (user_id, title, body, type, metadata)
         VALUES ($1, $2, $3, $4, $5::jsonb)
         RETURNING *`,
        [user_id, title, body || null, type, JSON.stringify(metadata || {})]
    );
    return rows[0];
}

module.exports = {
    listForUser,
    countUnread,
    markRead,
    markAllRead,
    remove,
    createForUser,
};
