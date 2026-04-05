/**
 * Marketplace apps & user installs
 */
const db = require('./db');

async function listAppsForUser(userId, roles, { page = 1, limit = 50 } = {}) {
    const offset = (page - 1) * limit;
    const admin = roles.includes('admin');
    const developer = roles.includes('developer');

    let where = `WHERE a.status = 'published'`;
    const params = [];
    if (admin) {
        where = '';
    } else if (developer) {
        where = `WHERE a.status = 'published' OR a.publisher_id = $1`;
        params.push(userId);
    }

    const limIdx = params.length + 1;
    const offIdx = params.length + 2;
    const sql = `
    SELECT a.*, u.username AS publisher_username
    FROM marketplace_apps a
    LEFT JOIN users u ON u.id = a.publisher_id
    ${where}
    ORDER BY a.updated_at DESC
    LIMIT $${limIdx} OFFSET $${offIdx}`;
    params.push(limit, offset);

    const { rows } = await db.query(sql, params);

    let countSql;
    let countParams = [];
    if (admin) {
        countSql = 'SELECT COUNT(*)::int AS c FROM marketplace_apps a';
    } else if (developer) {
        countSql = `SELECT COUNT(*)::int AS c FROM marketplace_apps a WHERE a.status = 'published' OR a.publisher_id = $1`;
        countParams = [userId];
    } else {
        countSql = `SELECT COUNT(*)::int AS c FROM marketplace_apps a WHERE a.status = 'published'`;
    }

    const { rows: cr } = await db.query(countSql, countParams);
    const total = cr[0]?.c ?? 0;

    return {
        data: rows,
        pagination: { page: parseInt(page, 10), limit, total, pages: Math.ceil(total / limit) || 1 },
    };
}

async function findAppById(id) {
    const { rows } = await db.query(
        `SELECT a.*, u.username AS publisher_username FROM marketplace_apps a
         LEFT JOIN users u ON u.id = a.publisher_id WHERE a.id = $1`,
        [id]
    );
    return rows[0] || null;
}

async function findAppBySlug(slug) {
    const { rows } = await db.query('SELECT * FROM marketplace_apps WHERE slug = $1', [slug]);
    return rows[0] || null;
}

async function createApp(payload) {
    const { slug, name, description, publisher_id, category, version, manifest } = payload;
    const { rows } = await db.query(
        `INSERT INTO marketplace_apps (slug, name, description, publisher_id, category, version, status, manifest)
         VALUES ($1,$2,$3,$4,$5,$6,'draft',$7::jsonb)
         RETURNING *`,
        [slug, name, description || null, publisher_id, category || 'general', version || '1.0.0', JSON.stringify(manifest || {})]
    );
    return rows[0];
}

async function updateApp(id, patch) {
    const allowed = ['name', 'description', 'category', 'version', 'manifest', 'slug'];
    const sets = [];
    const vals = [];
    let i = 1;
    for (const k of allowed) {
        if (patch[k] !== undefined) {
            if (k === 'manifest') {
                sets.push(`manifest = $${i}::jsonb`);
            } else {
                sets.push(`${k} = $${i}`);
            }
            vals.push(k === 'manifest' ? JSON.stringify(patch[k]) : patch[k]);
            i++;
        }
    }
    if (!sets.length) return findAppById(id);
    vals.push(id);
    const { rows } = await db.query(
        `UPDATE marketplace_apps SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`,
        vals
    );
    return rows[0] || null;
}

async function setAppStatus(id, status) {
    const { rows } = await db.query(
        `UPDATE marketplace_apps SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [status, id]
    );
    return rows[0] || null;
}

async function deleteApp(id) {
    await db.query('DELETE FROM marketplace_apps WHERE id = $1', [id]);
}

async function listInstalls(userId) {
    const { rows } = await db.query(
        `SELECT i.*, a.slug, a.name, a.description, a.category, a.version, a.status AS app_status
         FROM user_app_installs i
         JOIN marketplace_apps a ON a.id = i.app_id
         WHERE i.user_id = $1
         ORDER BY i.installed_at DESC`,
        [userId]
    );
    return rows;
}

async function findInstall(id, userId) {
    const { rows } = await db.query(
        'SELECT * FROM user_app_installs WHERE id = $1 AND user_id = $2',
        [id, userId]
    );
    return rows[0] || null;
}

async function installApp(userId, appId) {
    const ins = await db.query(
        `INSERT INTO user_app_installs (user_id, app_id, status)
         VALUES ($1, $2, 'installed')
         ON CONFLICT (user_id, app_id) DO NOTHING
         RETURNING *`,
        [userId, appId]
    );
    if (ins.rows[0]) return ins.rows[0];
    const ex = await db.query(
        'SELECT * FROM user_app_installs WHERE user_id = $1 AND app_id = $2',
        [userId, appId]
    );
    return ex.rows[0];
}

async function setInstallStatus(installId, userId, status) {
    const extra = status === 'active' ? ', activated_at = NOW()' : '';
    const { rows } = await db.query(
        `UPDATE user_app_installs SET status = $1${extra} WHERE id = $2 AND user_id = $3 RETURNING *`,
        [status, installId, userId]
    );
    return rows[0] || null;
}

async function uninstallApp(userId, appId) {
    await db.query('DELETE FROM user_app_installs WHERE user_id = $1 AND app_id = $2', [userId, appId]);
}

function canManageApp(app, userId, roles) {
    if (!app) return false;
    if (roles.includes('admin')) return true;
    if (roles.includes('developer') && app.publisher_id === userId) return true;
    return false;
}

module.exports = {
    listAppsForUser,
    findAppById,
    findAppBySlug,
    createApp,
    updateApp,
    setAppStatus,
    deleteApp,
    listInstalls,
    findInstall,
    installApp,
    setInstallStatus,
    uninstallApp,
    canManageApp,
};
