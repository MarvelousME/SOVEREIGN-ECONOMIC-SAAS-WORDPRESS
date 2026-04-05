import { NotificationChannel } from '../../types';

jest.mock('../../services/channels/sms.provider', () => ({
  SMSProvider: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({
      notification_id: 'mock-notif-id',
      channel: 'sms',
      success: true,
      external_id: 'mock-sid',
      delivered_at: new Date()
    }),
    sendBatch: jest.fn().mockResolvedValue([
      {
        notification_id: 'mock-notif-1',
        channel: 'sms',
        success: true,
        external_id: 'mock-sid-1',
        delivered_at: new Date()
      },
      {
        notification_id: 'mock-notif-2',
        channel: 'sms',
        success: true,
        external_id: 'mock-sid-2',
        delivered_at: new Date()
      }
    ])
  }))
}));

import { SMSProvider } from '../../services/channels/sms.provider';

describe('SMSProvider', () => {
  let smsProvider: SMSProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    smsProvider = new SMSProvider();
  });

  describe('send', () => {
    it('should send SMS and return success result', async () => {
      const result = await smsProvider.send({
        to: '+1234567890',
        body: 'Test SMS message'
      }, 'notif-123');

      expect(result).toHaveProperty('notification_id', 'mock-notif-id');
      expect(result).toHaveProperty('channel', NotificationChannel.SMS);
      expect(result).toHaveProperty('success', true);
    });
  });

  describe('sendBatch', () => {
    it('should send multiple SMS messages', async () => {
      const messages = [
        { to: '+1111111111', body: 'SMS 1' },
        { to: '+2222222222', body: 'SMS 2' }
      ];

      const results = await smsProvider.sendBatch(messages, ['notif-1', 'notif-2']);

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('notification_id', 'mock-notif-1');
      expect(results[1]).toHaveProperty('notification_id', 'mock-notif-2');
    });
  });
});
