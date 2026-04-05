import { connect, NatsConnection, StringCodec } from 'nats';
import { config } from '../config';
import logger from '../utils/logger';
import { PayoutMethod, PayoutStatus } from '../types';

export type NotificationType =
  | 'payout.requested'
  | 'payout.processing'
  | 'payout.completed'
  | 'payout.failed'
  | 'payout.cancelled';

export interface PayoutNotification {
  type: NotificationType;
  userId: string;
  payoutId: string;
  amount: number;
  currency: string;
  method: PayoutMethod;
  status: PayoutStatus;
  treasuryTransactionId?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface EmailNotification {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

export class NotificationService {
  private nc: NatsConnection | null = null;
  private sc = StringCodec();
  private isConnected: boolean = false;

  async connect(): Promise<void> {
    if (this.isConnected && this.nc) return;

    try {
      this.nc = await connect({ servers: config.nats.url });
      this.isConnected = true;
      logger.info('NotificationService connected to NATS');
    } catch (error) {
      logger.error('Failed to connect NotificationService to NATS', { error });
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.nc) {
      await this.nc.drain();
      this.isConnected = false;
      logger.info('NotificationService disconnected from NATS');
    }
  }

  async sendPayoutNotification(notification: PayoutNotification): Promise<void> {
    if (!this.nc) {
      await this.connect();
    }

    if (!this.nc) {
      logger.warn('Cannot send payout notification: NATS not connected');
      return;
    }

    const subject = 'notification.payout';

    try {
      this.nc.publish(subject, this.sc.encode(JSON.stringify(notification)));
      logger.debug('Payout notification sent', {
        type: notification.type,
        payoutId: notification.payoutId,
        userId: notification.userId,
      });
    } catch (error) {
      logger.error('Error sending payout notification', { notification, error });
    }
  }

  async sendEmail(email: EmailNotification): Promise<void> {
    if (!this.nc) {
      await this.connect();
    }

    if (!this.nc) {
      logger.warn('Cannot send email: NATS not connected');
      return;
    }

    const subject = 'notification.email';

    try {
      this.nc.publish(subject, this.sc.encode(JSON.stringify(email)));
      logger.debug('Email notification queued', {
        to: email.to,
        template: email.template,
      });
    } catch (error) {
      logger.error('Error sending email notification', { email, error });
    }
  }

  async notifyPayoutRequested(
    userId: string,
    payoutId: string,
    amount: number,
    currency: string,
    method: PayoutMethod
  ): Promise<void> {
    await this.sendPayoutNotification({
      type: 'payout.requested',
      userId,
      payoutId,
      amount,
      currency,
      method,
      status: PayoutStatus.PENDING,
    });
  }

  async notifyPayoutProcessing(
    userId: string,
    payoutId: string,
    amount: number,
    currency: string,
    method: PayoutMethod,
    treasuryTransactionId: string
  ): Promise<void> {
    await this.sendPayoutNotification({
      type: 'payout.processing',
      userId,
      payoutId,
      amount,
      currency,
      method,
      status: PayoutStatus.PROCESSING,
      treasuryTransactionId,
    });
  }

  async notifyPayoutCompleted(
    userId: string,
    payoutId: string,
    amount: number,
    currency: string,
    method: PayoutMethod,
    treasuryTransactionId: string
  ): Promise<void> {
    await this.sendPayoutNotification({
      type: 'payout.completed',
      userId,
      payoutId,
      amount,
      currency,
      method,
      status: PayoutStatus.COMPLETED,
      treasuryTransactionId,
    });
  }

  async notifyPayoutFailed(
    userId: string,
    payoutId: string,
    amount: number,
    currency: string,
    method: PayoutMethod,
    errorMessage: string
  ): Promise<void> {
    await this.sendPayoutNotification({
      type: 'payout.failed',
      userId,
      payoutId,
      amount,
      currency,
      method,
      status: PayoutStatus.FAILED,
      errorMessage,
    });
  }
}

export default NotificationService;
