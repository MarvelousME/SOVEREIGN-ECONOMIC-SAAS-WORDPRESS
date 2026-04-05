import { EmailProvider } from '../../services/channels/email.provider';
import sgMail from '@sendgrid/mail';
import { config } from '../../config';
import { NotificationChannel } from '../../types';

jest.mock('@sendgrid/mail');

const mockSgMail = sgMail as jest.Mocked<typeof sgMail>;

describe('EmailProvider', () => {
  let emailProvider: EmailProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    emailProvider = new EmailProvider();
  });

  describe('send', () => {
    it('should send email successfully', async () => {
      mockSgMail.send.mockResolvedValue([
        { statusCode: 202, headers: { 'x-message-id': 'sg-message-id-123' } } as any,
        {}
      ]);

      const result = await emailProvider.send({
        to: 'user@example.com',
        subject: 'Test Email',
        html: '<h1>Hello</h1><p>This is a test email.</p>'
      }, 'notif-123');

      expect(result.success).toBe(true);
      expect(result.notification_id).toBe('notif-123');
      expect(result.channel).toBe(NotificationChannel.EMAIL);
      expect(result.external_id).toBe('sg-message-id-123');
      expect(mockSgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Test Email',
          html: '<h1>Hello</h1><p>This is a test email.</p>'
        })
      );
    });

    it('should generate plain text from HTML', async () => {
      mockSgMail.send.mockResolvedValue([
        { statusCode: 202, headers: { 'x-message-id': 'sg-message-id-123' } } as any,
        {}
      ]);

      await emailProvider.send({
        to: 'user@example.com',
        subject: 'Test Email',
        html: '<h1>Hello</h1><p>This is a test.</p>'
      }, 'notif-123');

      expect(mockSgMail.send).toHaveBeenCalled();
      const callArg = mockSgMail.send.mock.calls[0][0] as any;
      expect(callArg).toHaveProperty('text');
    });

    it('should use provided plain text', async () => {
      mockSgMail.send.mockResolvedValue([
        { statusCode: 202, headers: { 'x-message-id': 'sg-message-id-123' } } as any,
        {}
      ]);

      await emailProvider.send({
        to: 'user@example.com',
        subject: 'Test Email',
        html: '<h1>Hello</h1>',
        text: 'Plain text version'
      }, 'notif-123');

      expect(mockSgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Plain text version'
        })
      );
    });

    it('should return failure when email disabled', async () => {
      const originalEnableEmail = (config as any).features.enableEmail;
      (config as any).features.enableEmail = false;

      const result = await emailProvider.send({
        to: 'user@example.com',
        subject: 'Test Email',
        html: '<h1>Hello</h1>'
      }, 'notif-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email provider not configured');

      (config as any).features.enableEmail = originalEnableEmail;
    });

    it('should return failure when API key not set', async () => {
      const originalApiKey = (config as any).sendgrid.apiKey;
      (config as any).sendgrid.apiKey = '';

      const result = await emailProvider.send({
        to: 'user@example.com',
        subject: 'Test Email',
        html: '<h1>Hello</h1>'
      }, 'notif-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email provider not configured');

      (config as any).sendgrid.apiKey = originalApiKey;
    });

    it('should handle SendGrid errors', async () => {
      mockSgMail.send.mockRejectedValue(new Error('SendGrid rate limit exceeded'));

      const result = await emailProvider.send({
        to: 'user@example.com',
        subject: 'Test Email',
        html: '<h1>Hello</h1>'
      }, 'notif-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('SendGrid rate limit exceeded');
    });

    it('should use configured from email and name', async () => {
      mockSgMail.send.mockResolvedValue([
        { statusCode: 202, headers: { 'x-message-id': 'sg-message-id-123' } } as any,
        {}
      ]);

      await emailProvider.send({
        to: 'user@example.com',
        subject: 'Test Email',
        html: '<h1>Hello</h1>'
      }, 'notif-123');

      expect(mockSgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          from: {
            email: 'test@example.com',
            name: 'Test'
          }
        })
      );
    });
  });

  describe('sendBatch', () => {
    it('should send multiple emails', async () => {
      mockSgMail.send
        .mockResolvedValueOnce([{ statusCode: 202, headers: { 'x-message-id': 'id-1' } } as any, {}])
        .mockResolvedValueOnce([{ statusCode: 202, headers: { 'x-message-id': 'id-2' } } as any, {}]);

      const messages = [
        { to: 'user1@example.com', subject: 'Email 1', html: '<p>Email 1</p>' },
        { to: 'user2@example.com', subject: 'Email 2', html: '<p>Email 2</p>' }
      ];

      const results = await emailProvider.sendBatch(messages, ['notif-1', 'notif-2']);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should handle partial failures in batch', async () => {
      mockSgMail.send
        .mockResolvedValueOnce([{ statusCode: 202, headers: { 'x-message-id': 'id-1' } } as any, {}])
        .mockRejectedValueOnce(new Error('Failed'));

      const messages = [
        { to: 'user1@example.com', subject: 'Email 1', html: '<p>Email 1</p>' },
        { to: 'user2@example.com', subject: 'Email 2', html: '<p>Email 2</p>' }
      ];

      const results = await emailProvider.sendBatch(messages, ['notif-1', 'notif-2']);

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });
  });
});
