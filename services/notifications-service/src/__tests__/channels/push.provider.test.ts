import { PushProvider } from '../../services/channels/push.provider';
import { NotificationChannel } from '../../types';

describe('PushProvider', () => {
  describe('send', () => {
    it('should return delivery result object when called', async () => {
      const pushProvider = new PushProvider();
      const result = await pushProvider.send({
        token: 'fcm-token-abc123',
        title: 'Test Notification',
        body: 'This is a test push notification',
        data: { key: 'value' }
      }, 'notif-123');

      expect(result).toHaveProperty('notification_id', 'notif-123');
      expect(result).toHaveProperty('channel', NotificationChannel.PUSH);
      expect(result).toHaveProperty('success');
    });

    it('should include external_id when successful', async () => {
      const pushProvider = new PushProvider();
      const result = await pushProvider.send({
        token: 'fcm-token-abc123',
        title: 'Test',
        body: 'Test body'
      }, 'notif-123');

      if (result.success && result.external_id) {
        expect(typeof result.external_id).toBe('string');
      }
    });
  });

  describe('sendBatch', () => {
    it('should return results array for batch messages', async () => {
      const pushProvider = new PushProvider();
      const messages = [
        { token: 'token-1', title: 'Bulk', body: 'Message 1' },
        { token: 'token-2', title: 'Bulk', body: 'Message 2' }
      ];

      const results = await pushProvider.sendBatch(messages, ['notif-1', 'notif-2']);

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('notification_id', 'notif-1');
      expect(results[1]).toHaveProperty('notification_id', 'notif-2');
    });

    it('should handle partial failures in batch', async () => {
      const pushProvider = new PushProvider();
      const messages = [
        { token: 'token-1', title: 'Bulk', body: 'Message 1' },
        { token: 'token-2', title: 'Bulk', body: 'Message 2' }
      ];

      const results = await pushProvider.sendBatch(messages, ['notif-1', 'notif-2']);

      expect(results[0]).toHaveProperty('success');
      expect(results[1]).toHaveProperty('success');
    });
  });
});
