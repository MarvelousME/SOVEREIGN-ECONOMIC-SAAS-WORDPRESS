import { connect, NatsConnection, StringCodec, JetStreamClient } from 'nats';
import { config } from '../config';
import { logger } from '../utils/logger';

export class NatsClient {
  private connection: NatsConnection | null = null;
  private jetstream: JetStreamClient | null = null;
  private codec = StringCodec();

  async connect(): Promise<void> {
    try {
      this.connection = await connect({
        servers: config.nats.url,
        user: config.nats.user,
        pass: config.nats.password,
      });

      this.jetstream = this.connection.jetstream();

      logger.info('NATS client connected', { server: config.nats.url });

      // Handle connection events
      (async () => {
        for await (const status of this.connection!.status()) {
          logger.info('NATS status change', { 
            type: status.type,
            data: status.data 
          });
        }
      })();
    } catch (error) {
      logger.error('Failed to connect to NATS', { error });
      throw error;
    }
  }

  async publish(subject: string, data: any): Promise<void> {
    if (!this.connection) {
      throw new Error('NATS client not connected');
    }

    try {
      const payload = this.codec.encode(JSON.stringify(data));
      await this.connection.publish(subject, payload);
      logger.debug('Published message', { subject, data });
    } catch (error) {
      logger.error('Failed to publish message', { subject, error });
      throw error;
    }
  }

  async subscribe(
    subject: string,
    handler: (data: any) => Promise<void>
  ): Promise<void> {
    if (!this.connection) {
      throw new Error('NATS client not connected');
    }

    const sub = this.connection.subscribe(subject);
    logger.info('Subscribed to subject', { subject });

    (async () => {
      for await (const msg of sub) {
        try {
          const data = JSON.parse(this.codec.decode(msg.data));
          await handler(data);
        } catch (error) {
          logger.error('Error processing message', { subject, error });
        }
      }
    })();
  }

  async close(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      logger.info('NATS client disconnected');
    }
  }

  async healthCheck(): Promise<boolean> {
    return this.connection !== null && !this.connection.isClosed();
  }
}

export const natsClient = new NatsClient();
