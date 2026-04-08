import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/database';
import { redis } from '../utils/redis';
import { logger } from '../utils/logger';
import {
  Notification,
  NotificationPreferences,
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  SendNotificationRequest,
  DeliveryResult,
  DigestFrequency
} from '../types';
import { emailProvider } from './channels/email.provider';
import { smsProvider } from './channels/sms.provider';
import { pushProvider } from './channels/push.provider';
import { digestService } from './digest.service';

class NotificationService {
  async sendNotification(request: SendNotificationRequest): Promise<Notification[]> {
    try {
      // Get user preferences
      const preferences = await this.getUserPreferences(request.tenant_id, request.user_id);

      // Get digest preferences
      const digestPrefs = await digestService.getOrCreateDigestPreferences(
        request.tenant_id,
        request.user_id
      );

      // Check if user prefers digest mode
      if (digestPrefs.digest_frequency !== 'immediate' && !request.scheduled_for) {
        // Queue for digest instead of sending immediately
        const pending = await digestService.queueForDigest(
          request.tenant_id,
          request.user_id,
          {
            type: request.type,
            channel: request.channels?.[0] || NotificationChannel.EMAIL,
            title: request.title,
            message: request.message,
            data: request.data,
            priority: request.priority
          }
        );

        if (pending) {
          logger.info('Notification queued for digest', {
            userId: request.user_id,
            notificationId: pending.id,
            digestFrequency: digestPrefs.digest_frequency
          });

          // Return a pending notification record
          return [{
            id: pending.id,
            tenant_id: pending.tenant_id,
            user_id: pending.user_id,
            type: pending.type,
            channel: pending.channel,
            priority: pending.priority as NotificationPriority,
            status: NotificationStatus.PENDING,
            title: pending.title,
            message: pending.message,
            data: pending.data,
            retry_count: 0,
            created_at: pending.created_at,
            updated_at: pending.created_at
          }];
        }
      }

      // Determine channels to use
      const channels = this.determineChannels(request, preferences);

      if (channels.length === 0) {
        logger.warn('No enabled channels for notification', { request });
        return [];
      }

      const notifications: Notification[] = [];

      // Create notification record for each channel
      for (const channel of channels) {
        const notification = await this.createNotification({
          ...request,
          channel,
          status: NotificationStatus.PENDING
        });

        notifications.push(notification);

        // Send immediately if not scheduled
        if (!request.scheduled_for) {
          await this.deliverNotification(notification, preferences);
        }
      }

      return notifications;
    } catch (error) {
      logger.error('Failed to send notification', { request, error });
      throw error;
    }
  }

  private determineChannels(
    request: SendNotificationRequest,
    preferences: NotificationPreferences
  ): NotificationChannel[] {
    // Use requested channels if specified
    if (request.channels && request.channels.length > 0) {
      return request.channels.filter(c => preferences.enabled_channels.includes(c));
    }

    // Use type-specific preferences
    const typePrefs = preferences.type_preferences[request.type];
    if (typePrefs && typePrefs.length > 0) {
      return typePrefs.filter(c => preferences.enabled_channels.includes(c));
    }

    // Default to all enabled channels
    return preferences.enabled_channels;
  }

  private async createNotification(params: {
    tenant_id: string;
    user_id: string;
    type: NotificationType;
    channel: NotificationChannel;
    priority?: NotificationPriority;
    title: string;
    message: string;
    data?: Record<string, any>;
    template_id?: string;
    scheduled_for?: Date;
    status: NotificationStatus;
  }): Promise<Notification> {
    const result = await db.query<Notification>(
      `INSERT INTO notifications 
       (id, tenant_id, user_id, type, channel, priority, status, title, message, data, template_id, scheduled_for, retry_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0)
       RETURNING *`,
      [
        uuidv4(),
        params.tenant_id,
        params.user_id,
        params.type,
        params.channel,
        params.priority || NotificationPriority.NORMAL,
        params.status,
        params.title,
        params.message,
        params.data ? JSON.stringify(params.data) : null,
        params.template_id,
        params.scheduled_for
      ]
    );

    return result.rows[0];
  }

  private async deliverNotification(
    notification: Notification,
    preferences: NotificationPreferences
  ): Promise<void> {
    try {
      // Check DND settings
      if (this.isInDND(preferences)) {
        logger.info('User in DND mode, skipping delivery', {
          notificationId: notification.id,
          userId: notification.user_id
        });
        return;
      }

      // Get user contact info
      const contactInfo = await this.getUserContactInfo(notification.user_id);

      let result: DeliveryResult;

      switch (notification.channel) {
        case NotificationChannel.EMAIL:
          result = await emailProvider.send({
            to: contactInfo.email,
            subject: notification.title,
            html: notification.message
          }, notification.id);
          break;

        case NotificationChannel.SMS:
          result = await smsProvider.send({
            to: contactInfo.phone,
            body: `${notification.title}\n\n${notification.message}`
          }, notification.id);
          break;

        case NotificationChannel.PUSH:
          result = await pushProvider.send({
            token: contactInfo.push_token,
            title: notification.title,
            body: notification.message,
            data: notification.data as Record<string, string>
          }, notification.id);
          break;

        case NotificationChannel.IN_APP:
          // In-app notifications are stored in DB only
          result = {
            notification_id: notification.id,
            channel: NotificationChannel.IN_APP,
            success: true,
            delivered_at: new Date()
          };
          break;

        default:
          throw new Error(`Unsupported channel: ${notification.channel}`);
      }

      await this.updateDeliveryStatus(notification.id, result);

      // Increment counters
      await this.incrementMetrics(notification);
    } catch (error) {
      logger.error('Failed to deliver notification', {
        notificationId: notification.id,
        error
      });

      await this.markAsFailed(notification.id, (error as Error).message);
    }
  }

  private isInDND(preferences: NotificationPreferences): boolean {
    if (!preferences.dnd_enabled || !preferences.dnd_start_time || !preferences.dnd_end_time) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = preferences.dnd_start_time.split(':').map(Number);
    const [endHour, endMin] = preferences.dnd_end_time.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  private async getUserContactInfo(userId: string): Promise<{
    email: string;
    phone: string;
    push_token: string;
  }> {
    const result = await db.query(
      'SELECT email, phone, push_token FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return result.rows[0];
  }

  private async updateDeliveryStatus(notificationId: string, result: DeliveryResult): Promise<void> {
    if (result.success) {
      await db.query(
        `UPDATE notifications 
         SET status = $1, sent_at = NOW(), delivered_at = $2
         WHERE id = $3`,
        [NotificationStatus.DELIVERED, result.delivered_at, notificationId]
      );
    } else {
      await this.markAsFailed(notificationId, result.error || 'Unknown error');
    }
  }

  private async markAsFailed(notificationId: string, errorMessage: string): Promise<void> {
    await db.query(
      `UPDATE notifications 
       SET status = $1, error_message = $2, retry_count = retry_count + 1
       WHERE id = $3`,
      [NotificationStatus.FAILED, errorMessage, notificationId]
    );
  }

  private async incrementMetrics(notification: Notification): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    const keys = [
      `metrics:notifications:sent:${date}`,
      `metrics:notifications:sent:${notification.type}:${date}`,
      `metrics:notifications:sent:${notification.channel}:${date}`
    ];

    for (const key of keys) {
      await redis.incr(key);
      await redis.set(`${key}:ttl`, '1', 86400 * 30); // 30 days TTL
    }
  }

  async getUserPreferences(tenantId: string, userId: string): Promise<NotificationPreferences> {
    const result = await db.query<NotificationPreferences>(
      'SELECT * FROM notification_preferences WHERE tenant_id = $1 AND user_id = $2',
      [tenantId, userId]
    );

    if (result.rows.length === 0) {
      return this.createDefaultPreferences(tenantId, userId);
    }

    return result.rows[0];
  }

  private async createDefaultPreferences(tenantId: string, userId: string): Promise<NotificationPreferences> {
    const defaultPrefs: NotificationPreferences = {
      user_id: userId,
      tenant_id: tenantId,
      enabled_channels: [
        NotificationChannel.EMAIL,
        NotificationChannel.IN_APP
      ],
      type_preferences: {} as Record<NotificationType, NotificationChannel[]>,
      digest_mode: false,
      digest_frequency: DigestFrequency.IMMEDIATE,
      dnd_enabled: false,
      locale: 'en',
      timezone: 'UTC',
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await db.query<NotificationPreferences>(
      `INSERT INTO notification_preferences 
       (user_id, tenant_id, enabled_channels, type_preferences, digest_mode, dnd_enabled, locale, timezone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userId,
        tenantId,
        JSON.stringify(defaultPrefs.enabled_channels),
        JSON.stringify(defaultPrefs.type_preferences),
        defaultPrefs.digest_mode,
        defaultPrefs.dnd_enabled,
        defaultPrefs.locale,
        defaultPrefs.timezone
      ]
    );

    return result.rows[0];
  }

  async updatePreferences(
    tenantId: string,
    userId: string,
    updates: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'user_id' && key !== 'tenant_id' && key !== 'created_at' && key !== 'updated_at') {
        fields.push(`${key} = $${paramCount++}`);
        if (key === 'enabled_channels' || key === 'type_preferences') {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      }
    });

    values.push(tenantId, userId);

    const result = await db.query<NotificationPreferences>(
      `UPDATE notification_preferences 
       SET ${fields.join(', ')}, updated_at = NOW()
       WHERE tenant_id = $${paramCount++} AND user_id = $${paramCount++}
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  async getUserNotifications(
    tenantId: string,
    userId: string,
    filters?: {
      status?: NotificationStatus;
      type?: NotificationType;
      channel?: NotificationChannel;
      unread_only?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<Notification[]> {
    const conditions: string[] = ['tenant_id = $1', 'user_id = $2'];
    const values: any[] = [tenantId, userId];
    let paramCount = 3;

    if (filters?.status) {
      conditions.push(`status = $${paramCount++}`);
      values.push(filters.status);
    }

    if (filters?.type) {
      conditions.push(`type = $${paramCount++}`);
      values.push(filters.type);
    }

    if (filters?.channel) {
      conditions.push(`channel = $${paramCount++}`);
      values.push(filters.channel);
    }

    if (filters?.unread_only) {
      conditions.push('read_at IS NULL');
    }

    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const result = await db.query<Notification>(
      `SELECT * FROM notifications 
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${paramCount++} OFFSET $${paramCount++}`,
      [...values, limit, offset]
    );

    return result.rows;
  }

  async markAsRead(notificationId: string): Promise<void> {
    await db.query(
      'UPDATE notifications SET read_at = NOW(), status = $1 WHERE id = $2 AND read_at IS NULL',
      [NotificationStatus.READ, notificationId]
    );
  }

  async markAllAsRead(tenantId: string, userId: string): Promise<number> {
    const result = await db.query(
      `UPDATE notifications 
       SET read_at = NOW(), status = $1 
       WHERE tenant_id = $2 AND user_id = $3 AND read_at IS NULL`,
      [NotificationStatus.READ, tenantId, userId]
    );

    return result.rowCount || 0;
  }

  async getNotification(id: string): Promise<Notification | null> {
    const result = await db.query<Notification>(
      'SELECT * FROM notifications WHERE id = $1',
      [id]
    );

    return result.rows[0] || null;
  }
}

export const notificationService = new NotificationService();
