import admin from 'firebase-admin';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { DeliveryResult, NotificationChannel } from '../../types';

let firebaseApp: admin.app.App | null = null;

if (config.features.enablePush && config.firebase.projectId && config.firebase.privateKey) {
  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebase.projectId,
        privateKey: config.firebase.privateKey,
        clientEmail: config.firebase.clientEmail
      })
    });
  } catch (error) {
    logger.error('Failed to initialize Firebase', { error });
  }
}

export interface PushMessage {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export class PushProvider {
  async send(message: PushMessage, notificationId: string): Promise<DeliveryResult> {
    if (!config.features.enablePush || !firebaseApp) {
      logger.warn('Push notifications disabled or not configured');
      return {
        notification_id: notificationId,
        channel: NotificationChannel.PUSH,
        success: false,
        error: 'Push provider not configured'
      };
    }

    try {
      const response = await admin.messaging().send({
        token: message.token,
        notification: {
          title: message.title,
          body: message.body
        },
        data: message.data
      });

      logger.info('Push notification sent successfully', {
        notificationId,
        token: message.token,
        messageId: response
      });

      return {
        notification_id: notificationId,
        channel: NotificationChannel.PUSH,
        success: true,
        external_id: response,
        delivered_at: new Date()
      };
    } catch (error: any) {
      logger.error('Failed to send push notification', {
        notificationId,
        token: message.token,
        error: error.message
      });

      return {
        notification_id: notificationId,
        channel: NotificationChannel.PUSH,
        success: false,
        error: error.message
      };
    }
  }

  async sendBatch(messages: PushMessage[], notificationIds: string[]): Promise<DeliveryResult[]> {
    if (!config.features.enablePush || !firebaseApp) {
      return messages.map((_, i) => ({
        notification_id: notificationIds[i],
        channel: NotificationChannel.PUSH,
        success: false,
        error: 'Push provider not configured'
      }));
    }

    try {
      const multicastMessage = {
        tokens: messages.map(m => m.token),
        notification: {
          title: messages[0].title,
          body: messages[0].body
        }
      };

      const response = await admin.messaging().sendMulticast(multicastMessage);

      return response.responses.map((res, i) => ({
        notification_id: notificationIds[i],
        channel: NotificationChannel.PUSH,
        success: res.success,
        external_id: res.messageId,
        error: res.error?.message,
        delivered_at: res.success ? new Date() : undefined
      }));
    } catch (error: any) {
      logger.error('Failed to send push batch', { error: error.message });
      return messages.map((_, i) => ({
        notification_id: notificationIds[i],
        channel: NotificationChannel.PUSH,
        success: false,
        error: error.message
      }));
    }
  }
}

export const pushProvider = new PushProvider();
