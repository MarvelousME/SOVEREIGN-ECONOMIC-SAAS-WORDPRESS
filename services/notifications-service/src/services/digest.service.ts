import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/database';
import { redis } from '../utils/redis';
import { logger } from '../utils/logger';
import { emailProvider } from './channels/email.provider';
import {
  DigestPreferences,
  DigestFrequency,
  PendingNotification,
  NotificationType,
  NotificationChannel,
  NotificationStatus
} from '../types';

class DigestService {
  /**
   * Get digest preferences for a user
   */
  async getDigestPreferences(tenantId: string, userId: string): Promise<DigestPreferences | null> {
    const result = await db.query<DigestPreferences>(
      `SELECT * FROM digest_preferences WHERE tenant_id = $1 AND user_id = $2`,
      [tenantId, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  /**
   * Create default digest preferences for a user
   */
  async createDefaultDigestPreferences(tenantId: string, userId: string): Promise<DigestPreferences> {
    const defaultPrefs: DigestPreferences = {
      user_id: userId,
      tenant_id: tenantId,
      digest_frequency: DigestFrequency.IMMEDIATE,
      digest_day: 0,
      digest_time: '09:00',
      last_digest_sent_at: null,
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await db.query<DigestPreferences>(
      `INSERT INTO digest_preferences 
       (user_id, tenant_id, digest_frequency, digest_day, digest_time, last_digest_sent_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        userId,
        tenantId,
        defaultPrefs.digest_frequency,
        defaultPrefs.digest_day,
        defaultPrefs.digest_time,
        defaultPrefs.last_digest_sent_at
      ]
    );

    return result.rows[0];
  }

  /**
   * Get or create digest preferences
   */
  async getOrCreateDigestPreferences(tenantId: string, userId: string): Promise<DigestPreferences> {
    const existing = await this.getDigestPreferences(tenantId, userId);
    if (existing) {
      return existing;
    }
    return this.createDefaultDigestPreferences(tenantId, userId);
  }

  /**
   * Update digest preferences
   */
  async updateDigestPreferences(
    tenantId: string,
    userId: string,
    updates: Partial<Omit<DigestPreferences, 'user_id' | 'tenant_id' | 'created_at' | 'updated_at'>>
  ): Promise<DigestPreferences> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount++}`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      return this.getOrCreateDigestPreferences(tenantId, userId);
    }

    values.push(tenantId, userId);

    const result = await db.query<DigestPreferences>(
      `UPDATE digest_preferences 
       SET ${fields.join(', ')}, updated_at = NOW()
       WHERE tenant_id = $${paramCount++} AND user_id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      // Create if doesn't exist
      const newPrefs = await this.createDefaultDigestPreferences(tenantId, userId);
      // Apply updates
      return this.updateDigestPreferences(tenantId, userId, updates);
    }

    return result.rows[0];
  }

  /**
   * Queue notification for digest (batch it)
   */
  async queueForDigest(
    tenantId: string,
    userId: string,
    notificationData: {
      type: NotificationType;
      channel: NotificationChannel;
      title: string;
      message: string;
      data?: Record<string, any>;
      priority?: string;
    }
  ): Promise<PendingNotification | null> {
    try {
      // Get user's digest preferences
      const prefs = await this.getOrCreateDigestPreferences(tenantId, userId);

      // Only queue if digest mode is not immediate
      if (prefs.digest_frequency === DigestFrequency.IMMEDIATE) {
        return null; // Don't queue, caller should send immediately
      }

      // Generate batch ID for grouping
      const batchId = await this.getOrCreateBatchId(tenantId, userId, prefs);

      const result = await db.query<PendingNotification>(
        `INSERT INTO pending_notifications 
         (id, tenant_id, user_id, batch_id, type, channel, priority, title, message, data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          uuidv4(),
          tenantId,
          userId,
          batchId,
          notificationData.type,
          notificationData.channel,
          notificationData.priority || 'normal',
          notificationData.title,
          notificationData.message,
          notificationData.data ? JSON.stringify(notificationData.data) : null
        ]
      );

      logger.info('Notification queued for digest', {
        userId,
        batchId,
        type: notificationData.type
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to queue notification for digest', { tenantId, userId, error });
      return null;
    }
  }

  /**
   * Get or create a batch ID for grouping notifications
   */
  private async getOrCreateBatchId(
    tenantId: string,
    userId: string,
    prefs: DigestPreferences
  ): Promise<string> {
    const batchKey = `digest:batch:${tenantId}:${userId}:${prefs.digest_frequency}`;
    let batchId = await redis.get(batchKey);

    if (!batchId) {
      batchId = uuidv4();
      // Set expiry based on frequency
      const ttl = this.getBatchTtl(prefs.digest_frequency);
      await redis.set(batchKey, batchId, ttl);
    }

    return batchId;
  }

  /**
   * Get TTL in seconds based on frequency
   */
  private getBatchTtl(frequency: DigestFrequency): number {
    switch (frequency) {
      case DigestFrequency.DAILY:
        return 86400; // 24 hours
      case DigestFrequency.WEEKLY:
        return 604800; // 7 days
      default:
        return 3600; // 1 hour for immediate fallback
    }
  }

  /**
   * Get all users due for digest processing
   */
  async getUsersDueForDigest(): Promise<Array<{ tenant_id: string; user_id: string; preferences: DigestPreferences }>> {
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const result = await db.query<any>(
      `SELECT dp.*, u.email, u.timezone as user_timezone
       FROM digest_preferences dp
       JOIN users u ON u.id = dp.user_id
       WHERE dp.digest_frequency != 'immediate'
         AND (
           (dp.digest_frequency = 'daily' AND dp.digest_time <= $1)
           OR (dp.digest_frequency = 'weekly' AND dp.digest_day = $2 AND dp.digest_time <= $1)
         )
         AND (dp.last_digest_sent_at IS NULL OR dp.last_digest_sent_at < $3)`,
      [currentTime, currentDay, this.getDigestCutoffDate(now)]
    );

    return result.rows.map(row => ({
      tenant_id: row.tenant_id,
      user_id: row.user_id,
      preferences: row
    }));
  }

  /**
   * Get cutoff date for digest (based on frequency)
   */
  private getDigestCutoffDate(now: Date): Date {
    const cutoff = new Date(now);
    cutoff.setHours(0, 0, 0, 0);

    switch (now.getDay()) {
      case 0: // Sunday - weekly cutoff is 7 days ago
        cutoff.setDate(cutoff.getDate() - 7);
        break;
      default:
        cutoff.setDate(cutoff.getDate() - 1); // daily cutoff is 1 day ago
    }

    return cutoff;
  }

  /**
   * Get pending notifications for a user
   */
  async getPendingNotifications(tenantId: string, userId: string): Promise<PendingNotification[]> {
    const result = await db.query<PendingNotification>(
      `SELECT * FROM pending_notifications 
       WHERE tenant_id = $1 AND user_id = $2
       ORDER BY created_at ASC`,
      [tenantId, userId]
    );

    return result.rows;
  }

  /**
   * Compile digest email content
   */
  compileDigestEmail(
    notifications: PendingNotification[],
    frequency: DigestFrequency
  ): { subject: string; html: string; text: string } {
    // Group notifications by type
    const groupedNotifications = this.groupNotificationsByType(notifications);

    const frequencyLabel = frequency === DigestFrequency.DAILY ? 'Daily' : 'Weekly';

    const subject = `Your ${frequencyLabel} Notifications Digest`;

    const html = this.generateDigestHtml(groupedNotifications, frequencyLabel);
    const text = this.generateDigestText(groupedNotifications, frequencyLabel);

    return { subject, html, text };
  }

  /**
   * Group notifications by type
   */
  private groupNotificationsByType(notifications: PendingNotification[]): Record<string, PendingNotification[]> {
    return notifications.reduce((groups, notification) => {
      const type = notification.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(notification);
      return groups;
    }, {} as Record<string, PendingNotification[]>);
  }

  /**
   * Generate HTML digest email
   */
  private generateDigestHtml(
    groupedNotifications: Record<string, PendingNotification[]>,
    frequencyLabel: string
  ): string {
    const notificationItems = Object.entries(groupedNotifications)
      .map(([type, notifications]) => {
        const typeLabel = this.formatNotificationType(type);
        const items = notifications
          .map(n => `
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #eee;">
                <strong>${this.escapeHtml(n.title)}</strong>
                <p style="margin: 8px 0 0 0; color: #666;">${this.escapeHtml(n.message)}</p>
                ${n.data?.link ? `<p style="margin: 8px 0 0 0;"><a href="${this.escapeHtml(n.data.link)}">View Details</a></p>` : ''}
                <p style="margin: 8px 0 0 0; font-size: 12px; color: #999;">
                  ${new Date(n.created_at).toLocaleString()}
                </p>
              </td>
            </tr>
          `)
          .join('');

        return `
          <tr>
            <td style="padding: 16px 12px 8px 12px; background-color: #f8f9fa;">
              <strong style="color: #333;">${typeLabel}</strong>
              <span style="color: #666; font-size: 12px;"> (${notifications.length})</span>
            </td>
          </tr>
          ${items}
        `;
      })
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${frequencyLabel} Notifications Digest</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Your ${frequencyLabel} Notifications</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">
      Here's a summary of your notifications
    </p>
  </div>
  
  <div style="background-color: #fff; border: 1px solid #e1e1e1; border-top: none; border-radius: 0 0 12px 12px;">
    <table style="width: 100%; border-collapse: collapse;">
      ${notificationItems}
    </table>
    
    ${notificationItems === '' ? `
      <tr>
        <td style="padding: 40px; text-align: center; color: #666;">
          No new notifications in this digest.
        </td>
      </tr>
    ` : ''}
    
    <tr>
      <td style="padding: 24px; text-align: center; background-color: #f8f9fa; border-top: 1px solid #e1e1e1;">
        <a href="${process.env.APP_URL || 'https://app.ubi-cms.com'}/dashboard" 
           style="display: inline-block; padding: 12px 24px; background-color: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
          View All Notifications
        </a>
      </td>
    </tr>
  </div>
  
  <p style="text-align: center; color: #999; font-size: 12px; margin-top: 24px;">
    You're receiving this because you opted in to ${frequencyLabel.toLowerCase()} digest notifications.<br>
    <a href="${process.env.APP_URL || 'https://app.ubi-cms.com'}/settings/notifications" style="color: #667eea;">
      Manage your notification preferences
    </a>
  </p>
</body>
</html>
    `.trim();
  }

  /**
   * Generate plain text digest email
   */
  private generateDigestText(
    groupedNotifications: Record<string, PendingNotification[]>,
    frequencyLabel: string
  ): string {
    const lines: string[] = [];

    lines.push(`Your ${frequencyLabel} Notifications Digest`);
    lines.push('='.repeat(40));
    lines.push('');

    Object.entries(groupedNotifications).forEach(([type, notifications]) => {
      const typeLabel = this.formatNotificationType(type);
      lines.push(`${typeLabel} (${notifications.length})`);
      lines.push('-'.repeat(30));

      notifications.forEach(n => {
        lines.push(`  ${n.title}`);
        lines.push(`  ${n.message}`);
        if (n.data?.link) {
          lines.push(`  Link: ${n.data.link}`);
        }
        lines.push(`  ${new Date(n.created_at).toLocaleString()}`);
        lines.push('');
      });
    });

    if (Object.keys(groupedNotifications).length === 0) {
      lines.push('No new notifications in this digest.');
    }

    lines.push('');
    lines.push('View all notifications: ' + (process.env.APP_URL || 'https://app.ubi-cms.com') + '/dashboard');
    lines.push('');
    lines.push(`Manage preferences: ${process.env.APP_URL || 'https://app.ubi-cms.com'}/settings/notifications`);

    return lines.join('\n');
  }

  /**
   * Format notification type for display
   */
  private formatNotificationType(type: string): string {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * Send digest email for a user
   */
  async sendDigestEmail(
    tenantId: string,
    userId: string
  ): Promise<{ success: boolean; notificationCount: number; error?: string }> {
    try {
      // Get user's email
      const userResult = await db.query<{ email: string }>(
        'SELECT email FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return { success: false, notificationCount: 0, error: 'User not found' };
      }

      const email = userResult.rows[0].email;

      // Get digest preferences
      const prefs = await this.getOrCreateDigestPreferences(tenantId, userId);

      // Get pending notifications
      const notifications = await this.getPendingNotifications(tenantId, userId);

      if (notifications.length === 0) {
        logger.info('No pending notifications for digest', { tenantId, userId });
        // Still update last_digest_sent_at to prevent reprocessing
        await this.updateDigestPreferences(tenantId, userId, {
          last_digest_sent_at: new Date()
        });
        return { success: true, notificationCount: 0 };
      }

      // Compile email content
      const { subject, html, text } = this.compileDigestEmail(
        notifications,
        prefs.digest_frequency
      );

      // Send email
      const result = await emailProvider.send(
        {
          to: email,
          subject,
          html,
          text
        },
        `digest-${userId}-${Date.now()}`
      );

      if (result.success) {
        // Mark notifications as sent
        await this.markNotificationsAsSent(notifications.map(n => n.id));

        // Update last digest sent timestamp
        await this.updateDigestPreferences(tenantId, userId, {
          last_digest_sent_at: new Date()
        });

        // Clear the batch
        const batchKey = `digest:batch:${tenantId}:${userId}:${prefs.digest_frequency}`;
        await redis.del(batchKey);

        logger.info('Digest email sent successfully', {
          tenantId,
          userId,
          notificationCount: notifications.length,
          externalId: result.external_id
        });

        return { success: true, notificationCount: notifications.length };
      } else {
        return { success: false, notificationCount: notifications.length, error: result.error };
      }
    } catch (error) {
      logger.error('Failed to send digest email', { tenantId, userId, error });
      return { success: false, notificationCount: 0, error: (error as Error).message };
    }
  }

  /**
   * Mark pending notifications as sent
   */
  private async markNotificationsAsSent(notificationIds: string[]): Promise<void> {
    if (notificationIds.length === 0) return;

    const placeholders = notificationIds.map((_, i) => `$${i + 1}`).join(', ');

    await db.query(
      `INSERT INTO notifications 
       (id, tenant_id, user_id, type, channel, priority, status, title, message, data, sent_at, delivered_at)
       SELECT 
         id, tenant_id, user_id, type, channel, priority, ${
           NotificationStatus.DELIVERED
         } as status, title, message, data, NOW() as sent_at, NOW() as delivered_at
       FROM pending_notifications
       WHERE id IN (${placeholders})`,
      notificationIds
    );

    // Delete from pending
    await db.query(
      `DELETE FROM pending_notifications WHERE id IN (${placeholders})`,
      notificationIds
    );
  }

  /**
   * Process all due digests
   */
  async processAllDigests(): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    errors: Array<{ user_id: string; error: string }>;
  }> {
    const users = await this.getUsersDueForDigest();
    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [] as Array<{ user_id: string; error: string }>
    };

    for (const user of users) {
      results.processed++;

      const result = await this.sendDigestEmail(user.tenant_id, user.user_id);

      if (result.success) {
        results.succeeded++;
      } else {
        results.failed++;
        results.errors.push({ user_id: user.user_id, error: result.error || 'Unknown error' });
      }
    }

    logger.info('Digest processing completed', {
      processed: results.processed,
      succeeded: results.succeeded,
      failed: results.failed
    });

    return results;
  }

  /**
   * Get digest statistics
   */
  async getDigestStats(tenantId: string): Promise<{
    total_users_with_digest: number;
    users_on_daily: number;
    users_on_weekly: number;
    users_on_immediate: number;
    pending_notifications: number;
  }> {
    const prefStats = await db.query<any>(
      `SELECT 
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE digest_frequency = 'daily') as daily,
         COUNT(*) FILTER (WHERE digest_frequency = 'weekly') as weekly,
         COUNT(*) FILTER (WHERE digest_frequency = 'immediate') as immediate
       FROM digest_preferences
       WHERE tenant_id = $1`,
      [tenantId]
    );

    const pendingStats = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM pending_notifications WHERE tenant_id = $1`,
      [tenantId]
    );

    return {
      total_users_with_digest: parseInt(prefStats.rows[0].total, 10),
      users_on_daily: parseInt(prefStats.rows[0].daily, 10),
      users_on_weekly: parseInt(prefStats.rows[0].weekly, 10),
      users_on_immediate: parseInt(prefStats.rows[0].immediate, 10),
      pending_notifications: parseInt(pendingStats.rows[0].count, 10)
    };
  }
}

export const digestService = new DigestService();
