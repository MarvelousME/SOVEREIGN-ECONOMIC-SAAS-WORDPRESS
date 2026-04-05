import { connect, NatsConnection, StringCodec } from 'nats';
import { config } from '../config';
import winston from 'winston';

const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

export class EventService {
  private nc: NatsConnection | null = null;
  private sc = StringCodec();

  async connect(): Promise<void> {
    try {
      this.nc = await connect({ servers: config.nats.url });
      logger.info('Connected to NATS');
    } catch (error) {
      logger.error('Failed to connect to NATS:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.nc) {
      await this.nc.drain();
      logger.info('Disconnected from NATS');
    }
  }

  async publish(subject: string, data: Record<string, unknown>): Promise<void> {
    if (!this.nc) {
      throw new Error('NATS connection not established');
    }

    try {
      this.nc.publish(subject, this.sc.encode(JSON.stringify(data)));
      logger.info(`Published event to ${subject}`, { data });
    } catch (error) {
      logger.error(`Failed to publish event to ${subject}:`, error);
      throw error;
    }
  }

  async subscribe(subject: string, handler: (data: any) => Promise<void>): Promise<void> {
    if (!this.nc) {
      throw new Error('NATS connection not established');
    }

    const sub = this.nc.subscribe(subject);
    logger.info(`Subscribed to ${subject}`);

    (async () => {
      for await (const msg of sub) {
        try {
          const data = JSON.parse(this.sc.decode(msg.data));
          await handler(data);
        } catch (error) {
          logger.error(`Error processing message from ${subject}:`, error);
        }
      }
    })();
  }

  // Event publishers
  async publishTreasuryDeposit(vaultId: string, userId: string, amount: string, currency: string): Promise<void> {
    await this.publish('treasury.deposit', { vaultId, userId, amount, currency, timestamp: new Date() });
  }

  async publishTreasuryWithdraw(vaultId: string, userId: string, amount: string, currency: string): Promise<void> {
    await this.publish('treasury.withdraw', { vaultId, userId, amount, currency, timestamp: new Date() });
  }

  async publishTreasuryCompounded(vaultId: string, yieldHarvested: string, newBalance: string): Promise<void> {
    await this.publish('treasury.compounded', { vaultId, yieldHarvested, newBalance, timestamp: new Date() });
  }

  async publishTreasuryRebalanced(vaultId: string, strategyId: string, result: Record<string, unknown>): Promise<void> {
    await this.publish('treasury.rebalanced', { vaultId, strategyId, result, timestamp: new Date() });
  }

  async publishYieldHarvested(vaultId: string, amount: string, protocol: string): Promise<void> {
    await this.publish('treasury.yield.harvested', { vaultId, amount, protocol, timestamp: new Date() });
  }
}
