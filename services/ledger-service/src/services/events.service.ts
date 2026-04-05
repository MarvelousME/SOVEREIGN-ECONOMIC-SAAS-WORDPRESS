import { connect, NatsConnection, StringCodec } from 'nats';
import { config } from '../config';
import { logger } from '../utils/logger';
import { LedgerEvent } from '../types';

class EventsService {
  private nc: NatsConnection | null = null;
  private sc = StringCodec();

  async connect(): Promise<void> {
    try {
      this.nc = await connect({ servers: config.nats.url });
      logger.info('Connected to NATS', { url: config.nats.url });

      this.nc.closed().then((err) => {
        if (err) {
          logger.error('NATS connection closed with error', { error: err });
        } else {
          logger.info('NATS connection closed');
        }
      });
    } catch (error) {
      logger.error('Failed to connect to NATS', { error });
      throw error;
    }
  }

  async publish(subject: string, event: LedgerEvent): Promise<void> {
    if (!this.nc) {
      logger.warn('NATS not connected, skipping event publish', { subject });
      return;
    }

    try {
      const data = this.sc.encode(JSON.stringify(event));
      await this.nc.publish(subject, data);
      logger.debug('Published event', { subject, event });
    } catch (error) {
      logger.error('Failed to publish event', { subject, error });
      throw error;
    }
  }

  async publishTransactionCreated(tenantId: string, transaction: any): Promise<void> {
    await this.publish('ledger.transaction.created', {
      type: 'ledger.transaction.created',
      timestamp: new Date(),
      tenant_id: tenantId,
      data: transaction
    });
  }

  async publishTransactionReversed(tenantId: string, transaction: any): Promise<void> {
    await this.publish('ledger.transaction.reversed', {
      type: 'ledger.transaction.reversed',
      timestamp: new Date(),
      tenant_id: tenantId,
      data: transaction
    });
  }

  async publishAccountCreated(tenantId: string, account: any): Promise<void> {
    await this.publish('ledger.account.created', {
      type: 'ledger.account.created',
      timestamp: new Date(),
      tenant_id: tenantId,
      data: account
    });
  }

  async publishBalanceUpdated(tenantId: string, accountId: string, balance: string): Promise<void> {
    await this.publish('ledger.balance.updated', {
      type: 'ledger.balance.updated',
      timestamp: new Date(),
      tenant_id: tenantId,
      data: { account_id: accountId, balance }
    });
  }

  async close(): Promise<void> {
    if (this.nc) {
      await this.nc.drain();
      logger.info('NATS connection drained');
    }
  }

  isConnected(): boolean {
    return this.nc !== null && !this.nc.isClosed();
  }
}

export const eventsService = new EventsService();
