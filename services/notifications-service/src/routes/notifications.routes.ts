import { Router, Request, Response } from 'express';
import { notificationService } from '../services/notification.service';
import { logger } from '../utils/logger';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  NotificationType,
  NotificationChannel,
  NotificationStatus
} from '../types';

const router = Router();

router.use(authMiddleware);

// Validation schemas
const sendNotificationSchema = z.object({
  tenant_id: z.string().uuid(),
  user_id: z.string().uuid(),
  type: z.string(),
  channels: z.array(z.string()).optional(),
  priority: z.enum(['urgent', 'high', 'normal', 'low']).optional(),
  title: z.string(),
  message: z.string(),
  data: z.record(z.any()).optional(),
  template_id: z.string().uuid().optional(),
  scheduled_for: z.string().datetime().optional()
});

const updatePreferencesSchema = z.object({
  enabled_channels: z.array(z.string()).optional(),
  type_preferences: z.record(z.array(z.string())).optional(),
  digest_mode: z.boolean().optional(),
  digest_frequency: z.enum(['hourly', 'daily', 'weekly']).optional(),
  dnd_enabled: z.boolean().optional(),
  dnd_start_time: z.string().optional(),
  dnd_end_time: z.string().optional(),
  locale: z.string().optional(),
  timezone: z.string().optional()
});

// GET /api/v1/notifications - List user notifications
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    if (!tenantId || !userId) {
      return res.status(400).json({ error: 'Missing tenant_id or user_id headers' });
    }

    const filters = {
      status: req.query.status as string | undefined,
      type: req.query.type as string | undefined,
      channel: req.query.channel as string | undefined,
      unread_only: req.query.unread_only === 'true',
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0
    };

    const notifications = await notificationService.getUserNotifications(
      tenantId,
      userId,
      filters
    );

    res.json({ notifications });
  } catch (error) {
    logger.error('Failed to list notifications', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/notifications/:id - Get notification
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const notification = await notificationService.getNotification(id);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ notification });
  } catch (error) {
    logger.error('Failed to get notification', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/notifications/:id/read - Mark as read
router.post('/:id/read', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await notificationService.markAsRead(id);
    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to mark as read', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/notifications/read-all - Mark all read
router.post('/read-all', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    if (!tenantId || !userId) {
      return res.status(400).json({ error: 'Missing tenant_id or user_id headers' });
    }

    const count = await notificationService.markAllAsRead(tenantId, userId);
    res.json({ success: true, count });
  } catch (error) {
    logger.error('Failed to mark all as read', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/notifications/preferences - Get preferences
router.get('/preferences', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    if (!tenantId || !userId) {
      return res.status(400).json({ error: 'Missing tenant_id or user_id headers' });
    }

    const preferences = await notificationService.getUserPreferences(tenantId, userId);
    res.json({ preferences });
  } catch (error) {
    logger.error('Failed to get preferences', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/v1/notifications/preferences - Update preferences
router.put('/preferences', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    if (!tenantId || !userId) {
      return res.status(400).json({ error: 'Missing tenant_id or user_id headers' });
    }

    const validation = updatePreferencesSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Validation failed', details: validation.error });
    }

    const preferences = await notificationService.updatePreferences(
      tenantId,
      userId,
      validation.data
    );

    res.json({ preferences });
  } catch (error) {
    logger.error('Failed to update preferences', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/notifications/send - Send notification (internal use)
router.post('/send', async (req: Request, res: Response) => {
  try {
    const validation = sendNotificationSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Validation failed', details: validation.error });
    }

    const notifications = await notificationService.sendNotification(validation.data);
    res.json({ notifications });
  } catch (error) {
    logger.error('Failed to send notification', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
