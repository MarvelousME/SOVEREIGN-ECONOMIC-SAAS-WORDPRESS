import { connect, NatsConnection, StringCodec } from 'nats';
import { config } from '../config';
import { logger } from '../utils/logger';

export class EventService {
  private nc: NatsConnection | null = null;
  private sc = StringCodec();

  async connect(): Promise<void> {
    try {
      this.nc = await connect({ servers: config.nats.url });
      logger.info('Connected to NATS');
    } catch (error) {
      logger.error('Failed to connect to NATS', { error });
      throw error;
    }
  }

  async publish(subject: string, data: any): Promise<void> {
    if (!this.nc) {
      await this.connect();
    }

    try {
      this.nc!.publish(subject, this.sc.encode(JSON.stringify(data)));
      logger.debug('Published event', { subject, data });
    } catch (error) {
      logger.error('Failed to publish event', { subject, error });
      throw error;
    }
  }

  async subscribe(subject: string, handler: (data: any) => void): Promise<void> {
    if (!this.nc) {
      await this.connect();
    }

    const sub = this.nc!.subscribe(subject);
    logger.info('Subscribed to subject', { subject });

    (async () => {
      for await (const msg of sub) {
        try {
          const data = JSON.parse(this.sc.decode(msg.data));
          handler(data);
        } catch (error) {
          logger.error('Error processing message', { subject, error });
        }
      }
    })();
  }

  async close(): Promise<void> {
    if (this.nc) {
      await this.nc.drain();
      logger.info('NATS connection closed');
    }
  }
}
