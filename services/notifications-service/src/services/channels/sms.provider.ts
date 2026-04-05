import twilio from 'twilio';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { DeliveryResult, NotificationChannel } from '../../types';

const twilioClient = config.twilio.accountSid && config.twilio.authToken
  ? twilio(config.twilio.accountSid, config.twilio.authToken)
  : null;

export interface SMSMessage {
  to: string;
  body: string;
}

export class SMSProvider {
  async send(message: SMSMessage, notificationId: string): Promise<DeliveryResult> {
    if (!config.features.enableSms || !twilioClient) {
      logger.warn('SMS notifications disabled or not configured');
      return {
        notification_id: notificationId,
        channel: NotificationChannel.SMS,
        success: false,
        error: 'SMS provider not configured'
      };
    }

    try {
      const response = await twilioClient.messages.create({
        body: message.body,
        to: message.to,
        from: config.twilio.phoneNumber
      });

      logger.info('SMS sent successfully', {
        notificationId,
        to: message.to,
        sid: response.sid
      });

      return {
        notification_id: notificationId,
        channel: NotificationChannel.SMS,
        success: true,
        external_id: response.sid,
        delivered_at: new Date()
      };
    } catch (error: any) {
      logger.error('Failed to send SMS', {
        notificationId,
        to: message.to,
        error: error.message
      });

      return {
        notification_id: notificationId,
        channel: NotificationChannel.SMS,
        success: false,
        error: error.message
      };
    }
  }

  async sendBatch(messages: SMSMessage[], notificationIds: string[]): Promise<DeliveryResult[]> {
    const results: DeliveryResult[] = [];

    for (let i = 0; i < messages.length; i++) {
      const result = await this.send(messages[i], notificationIds[i]);
      results.push(result);
    }

    return results;
  }
}

export const smsProvider = new SMSProvider();
