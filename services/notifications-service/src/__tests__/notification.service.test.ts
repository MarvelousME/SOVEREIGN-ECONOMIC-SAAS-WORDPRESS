import { notificationService } from '../services/notification.service';
import { db } from '../utils/database';
import { redis } from '../utils/redis';
import { logger } from '../utils/logger';
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  NotificationPreferences,
  Notification
} from '../types';

const mockDb = db as jest.Mocked<typeof db>;
const mockRedis = redis as jest.Mocked<typeof redis>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('NotificationService', () => {
  const mockUserPreferences: NotificationPreferences = {
    user_id: 'user-123',
    tenant_id: 'tenant-456',
    enabled_channels: [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.PUSH],
    type_preferences: {
      [NotificationType.TASK_ASSIGNED]: [NotificationChannel.EMAIL],
      [NotificationType.UBI_DISTRIBUTION]: [NotificationChannel.EMAIL, NotificationChannel.SMS]
    } as Record<NotificationType, NotificationChannel[]>,
    digest_mode: false,
    dnd_enabled: false,
    locale: 'en',
    timezone: 'UTC',
    created_at: new Date(),
    updated_at: new Date()
  };

  const mockNotification: Notification = {
    id: 'notif-789',
    tenant_id: 'tenant-456',
    user_id: 'user-123',
    type: NotificationType.TASK_ASSIGNED,
    channel: NotificationChannel.EMAIL,
    priority: NotificationPriority.NORMAL,
    status: NotificationStatus.PENDING,
    title: 'Test Notification',
    message: 'This is a test notification',
    data: { task_id: 'task-001' },
    template_id: 'template-001',
    retry_count: 0,
    created_at: new Date(),
    updated_at: new Date()
  };

  const mockUserContactInfo = {
    email: 'user@example.com',
    phone: '+1234567890',
    push_token: 'fcm-token-123'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendNotification', () => {
    it('should send notification to all enabled channels', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockUserPreferences], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [mockNotification], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [mockUserContactInfo], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      
      mockRedis.incr.mockResolvedValue(1);
      (mockRedis.set as any).mockResolvedValue(undefined);

      const result = await notificationService.sendNotification({
        tenant_id: 'tenant-456',
        user_id: 'user-123',
        type: NotificationType.TASK_ASSIGNED,
        title: 'Test Notification',
        message: 'This is a test notification'
      });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(mockDb.query).toHaveBeenCalled();
    });

    it('should return empty array when no channels are enabled', async () => {
      const noChannelPrefs = { ...mockUserPreferences, enabled_channels: [] };
      mockDb.query.mockResolvedValueOnce({ rows: [noChannelPrefs], rowCount: 1 } as any);

      const result = await notificationService.sendNotification({
        tenant_id: 'tenant-456',
        user_id: 'user-123',
        type: NotificationType.TASK_ASSIGNED,
        title: 'Test Notification',
        message: 'This is a test notification'
      });

      expect(result).toEqual([]);
    });

    it('should respect user-specified channels', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockUserPreferences], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [mockNotification], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [mockUserContactInfo], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      mockRedis.incr.mockResolvedValue(1);
      (mockRedis.set as any).mockResolvedValue(undefined);

      const result = await notificationService.sendNotification({
        tenant_id: 'tenant-456',
        user_id: 'user-123',
        type: NotificationType.TASK_ASSIGNED,
        channels: [NotificationChannel.EMAIL],
        title: 'Test Notification',
        message: 'This is a test notification'
      });

      expect(result).toBeDefined();
    });

    it('should skip delivery when in DND mode', async () => {
      const dndPrefs = { ...mockUserPreferences, dnd_enabled: true, dnd_start_time: '00:00', dnd_end_time: '23:59' };
      mockDb.query
        .mockResolvedValueOnce({ rows: [dndPrefs], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [mockNotification], rowCount: 1 } as any);

      const result = await notificationService.sendNotification({
        tenant_id: 'tenant-456',
        user_id: 'user-123',
        type: NotificationType.TASK_ASSIGNED,
        title: 'Test Notification',
        message: 'This is a test notification'
      });

      expect(result).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'User in DND mode, skipping delivery',
        expect.any(Object)
      );
    });

    it('should handle scheduled notifications without immediate delivery', async () => {
      const scheduledDate = new Date(Date.now() + 86400000);
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockUserPreferences], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [mockNotification], rowCount: 1 } as any);

      const result = await notificationService.sendNotification({
        tenant_id: 'tenant-456',
        user_id: 'user-123',
        type: NotificationType.TASK_ASSIGNED,
        title: 'Test Notification',
        message: 'This is a test notification',
        scheduled_for: scheduledDate
      });

      expect(result).toBeDefined();
    });

    it('should create default preferences for new users', async () => {
      const defaultPrefs = { ...mockUserPreferences, id: 'pref-new' };
      mockDb.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({ rows: [defaultPrefs], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [mockNotification], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [mockUserContactInfo], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      mockRedis.incr.mockResolvedValue(1);
      (mockRedis.set as any).mockResolvedValue(undefined);

      const result = await notificationService.sendNotification({
        tenant_id: 'tenant-456',
        user_id: 'new-user',
        type: NotificationType.TASK_ASSIGNED,
        title: 'Test Notification',
        message: 'This is a test notification'
      });

      expect(result).toBeDefined();
    });
  });

  describe('getUserPreferences', () => {
    it('should return user preferences', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [mockUserPreferences], rowCount: 1 } as any);

      const result = await notificationService.getUserPreferences('tenant-456', 'user-123');

      expect(result).toEqual(mockUserPreferences);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM notification_preferences WHERE tenant_id = $1 AND user_id = $2',
        ['tenant-456', 'user-123']
      );
    });

    it('should return default preferences when none exist', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({ rows: [mockUserPreferences], rowCount: 1 } as any);

      const result = await notificationService.getUserPreferences('tenant-456', 'user-123');

      expect(result).toEqual(mockUserPreferences);
    });
  });

  describe('updatePreferences', () => {
    it('should update user preferences', async () => {
      const updatedPrefs = { ...mockUserPreferences, dnd_enabled: true };
      mockDb.query.mockResolvedValueOnce({ rows: [updatedPrefs], rowCount: 1 } as any);

      const result = await notificationService.updatePreferences('tenant-456', 'user-123', {
        dnd_enabled: true
      });

      expect(result.dnd_enabled).toBe(true);
    });

    it('should not allow updating user_id or tenant_id', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [mockUserPreferences], rowCount: 1 } as any);

      await notificationService.updatePreferences('tenant-456', 'user-123', {
        user_id: 'different-user',
        tenant_id: 'different-tenant',
        dnd_enabled: true
      } as any);

      const queryCall = mockDb.query.mock.calls[0];
      const setClause = queryCall[0].split('WHERE')[0];
      expect(setClause).toContain('dnd_enabled');
      expect(setClause).not.toContain('user_id');
      expect(setClause).not.toContain('tenant_id');
    });
  });

  describe('getUserNotifications', () => {
    it('should return user notifications with filters', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [mockNotification], rowCount: 1 } as any);

      const result = await notificationService.getUserNotifications('tenant-456', 'user-123', {
        status: NotificationStatus.PENDING,
        type: NotificationType.TASK_ASSIGNED,
        limit: 10
      });

      expect(result).toEqual([mockNotification]);
      expect(mockDb.query).toHaveBeenCalled();
    });

    it('should apply default limit and offset', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await notificationService.getUserNotifications('tenant-456', 'user-123');

      const queryCall = mockDb.query.mock.calls[0];
      expect(queryCall[0]).toContain('LIMIT');
      expect(queryCall[0]).toContain('OFFSET');
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      await notificationService.markAsRead('notif-789');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications SET read_at'),
        expect.any(Array)
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all user notifications as read', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 5 } as any);

      const result = await notificationService.markAllAsRead('tenant-456', 'user-123');

      expect(result).toBe(5);
    });
  });

  describe('getNotification', () => {
    it('should return notification by id', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [mockNotification], rowCount: 1 } as any);

      const result = await notificationService.getNotification('notif-789');

      expect(result).toEqual(mockNotification);
    });

    it('should return null when notification not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await notificationService.getNotification('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('determineChannels', () => {
    it('should filter channels by user preferences', () => {
      const result = (notificationService as any).determineChannels(
        { channels: [NotificationChannel.EMAIL, NotificationChannel.SMS] } as any,
        mockUserPreferences
      );

      expect(result).toContain(NotificationChannel.EMAIL);
      expect(result).toContain(NotificationChannel.SMS);
    });

    it('should use type-specific preferences when no channels specified', () => {
      const result = (notificationService as any).determineChannels(
        { type: NotificationType.UBI_DISTRIBUTION } as any,
        mockUserPreferences
      );

      expect(result).toContain(NotificationChannel.EMAIL);
      expect(result).toContain(NotificationChannel.SMS);
    });

    it('should default to all enabled channels', () => {
      const result = (notificationService as any).determineChannels(
        { type: NotificationType.SYSTEM_ALERT } as any,
        mockUserPreferences
      );

      expect(result).toContain(NotificationChannel.EMAIL);
      expect(result).toContain(NotificationChannel.SMS);
      expect(result).toContain(NotificationChannel.PUSH);
    });
  });

  describe('isInDND', () => {
    it('should return false when DND is disabled', () => {
      const result = (notificationService as any).isInDND({
        ...mockUserPreferences,
        dnd_enabled: false
      });

      expect(result).toBe(false);
    });

    it('should return false when DND times are not set', () => {
      const result = (notificationService as any).isInDND({
        ...mockUserPreferences,
        dnd_enabled: true,
        dnd_start_time: undefined,
        dnd_end_time: undefined
      });

      expect(result).toBe(false);
    });

    it('should return true when current time is within DND range', () => {
      const now = new Date();
      const startHour = (now.getHours() - 1 + 24) % 24;
      const endHour = (now.getHours() + 1) % 24;

      const result = (notificationService as any).isInDND({
        ...mockUserPreferences,
        dnd_enabled: true,
        dnd_start_time: `${startHour.toString().padStart(2, '0')}:00`,
        dnd_end_time: `${endHour.toString().padStart(2, '0')}:00`
      });

      expect(result).toBe(true);
    });
  });
});
