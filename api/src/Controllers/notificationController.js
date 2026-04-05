/**
 * Notifications API
 */
const notificationModel = require('../Models/notification');

class NotificationController {
    async list(req, res) {
        try {
            const userId = req.user.userId;
            const page = parseInt(req.query.page, 10) || 1;
            const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
            const unreadOnly = req.query.unread_only === '1' || req.query.unread_only === 'true';
            const result = await notificationModel.listForUser(userId, { page, limit, unreadOnly });
            res.json(result);
        } catch (e) {
            console.error('notifications list:', e.message);
            res.status(500).json({ error: 'Failed to list notifications' });
        }
    }

    async unreadCount(req, res) {
        try {
            const count = await notificationModel.countUnread(req.user.userId);
            res.json({ count });
        } catch (e) {
            console.error('notifications unreadCount:', e.message);
            res.status(500).json({ error: 'Failed to count' });
        }
    }

    async markRead(req, res) {
        try {
            const row = await notificationModel.markRead(req.user.userId, req.params.id);
            if (!row) return res.status(404).json({ error: 'Not found' });
            res.json(row);
        } catch (e) {
            console.error('notifications markRead:', e.message);
            res.status(500).json({ error: 'Failed to update' });
        }
    }

    async markAllRead(req, res) {
        try {
            const result = await notificationModel.markAllRead(req.user.userId);
            res.json(result);
        } catch (e) {
            console.error('notifications markAllRead:', e.message);
            res.status(500).json({ error: 'Failed to update' });
        }
    }

    async remove(req, res) {
        try {
            const ok = await notificationModel.remove(req.user.userId, req.params.id);
            if (!ok) return res.status(404).json({ error: 'Not found' });
            res.status(204).send();
        } catch (e) {
            console.error('notifications remove:', e.message);
            res.status(500).json({ error: 'Failed to delete' });
        }
    }

    /** Admin: create notification for any user */
    async adminCreate(req, res) {
        try {
            const { user_id, title, body, type, metadata } = req.body;
            if (!user_id || !title) {
                return res.status(400).json({ error: 'user_id and title are required' });
            }
            const row = await notificationModel.createForUser({
                user_id,
                title,
                body,
                type: type || 'info',
                metadata: metadata || {},
            });
            res.status(201).json(row);
        } catch (e) {
            console.error('notifications adminCreate:', e.message);
            res.status(500).json({ error: 'Failed to create notification' });
        }
    }
}

module.exports = new NotificationController();
