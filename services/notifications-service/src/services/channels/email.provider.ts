import sgMail from '@sendgrid/mail';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { DeliveryResult, NotificationChannel } from '../../types';

sgMail.setApiKey(config.sendgrid.apiKey);

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailProvider {
  async send(message: EmailMessage, notificationId: string): Promise<DeliveryResult> {
    if (!config.features.enableEmail || !config.sendgrid.apiKey) {
      logger.warn('Email notifications disabled or not configured');
      return {
        notification_id: notificationId,
        channel: NotificationChannel.EMAIL,
        success: false,
        error: 'Email provider not configured'
      };
    }

    try {
      const msg = {
        to: message.to,
        from: {
          email: config.sendgrid.fromEmail,
          name: config.sendgrid.fromName
        },
        subject: message.subject,
        html: message.html,
        text: message.text || message.html.replace(/<[^>]*>/g, '')
      };

      const [response] = await sgMail.send(msg);

      logger.info('Email sent successfully', {
        notificationId,
        to: message.to,
        messageId: response.headers['x-message-id']
      });

      return {
        notification_id: notificationId,
        channel: NotificationChannel.EMAIL,
        success: true,
        external_id: response.headers['x-message-id'] as string,
        delivered_at: new Date()
      };
    } catch (error: any) {
      logger.error('Failed to send email', {
        notificationId,
        to: message.to,
        error: error.message
      });

      return {
        notification_id: notificationId,
        channel: NotificationChannel.EMAIL,
        success: false,
        error: error.message
      };
    }
  }

  async sendBatch(messages: EmailMessage[], notificationIds: string[]): Promise<DeliveryResult[]> {
    const results: DeliveryResult[] = [];

    for (let i = 0; i < messages.length; i++) {
      const result = await this.send(messages[i], notificationIds[i]);
      results.push(result);
    }

    return results;
  }
}

export const emailProvider = new EmailProvider();
