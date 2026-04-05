import { connect, NatsConnection, ConnectionOptions } from 'nats';
import pino from 'pino';
import { NatsClientOptions } from './types';
import { NatsPublisher } from './publisher';
import { NatsConsumer } from './consumer';

/**
 * Main NATS Client for UBI-CMS
 * Manages connection to NATS JetStream and provides publish/subscribe capabilities
 */
export class NatsClient {
  private connection: NatsConnection | null = null;
  private logger = pino({ name: 'nats-client' });
  private publisher: NatsPublisher | null = null;
  private consumers: Map<string, NatsConsumer> = new Map();

  constructor(private options: NatsClientOptions) {}

  /**
   * Connect to NATS server
   */
  async connect(): Promise<void> {
    if (this.connection) {
      this.logger.warn('Already connected to NATS');
      return;
    }

    try {
      this.logger.info({ servers: this.options.servers }, 'Connecting to NATS...');

      const connectionOptions: ConnectionOptions = {
        servers: this.options.servers,
        name: this.options.name || 'ubi-cms-client',
        maxReconnectAttempts: this.options.maxReconnectAttempts || -1,
        reconnectTimeWait: this.options.reconnectTimeWait || 2000,
        pingInterval: this.options.pingInterval || 20000,
        timeout: this.options.timeout || 10000,
      };

      this.connection = await connect(connectionOptions);

      // Setup event handlers
      this.setupEventHandlers();

      this.logger.info('Connected to NATS successfully');

      // Initialize publisher
      this.publisher = new NatsPublisher(this.connection, this.logger);
      await this.publisher.initialize();
    } catch (error) {
      this.logger.error({ error }, 'Failed to connect to NATS');
      throw error;
    }
  }

  /**
   * Setup connection event handlers
   */
  private setupEventHandlers(): void {
    if (!this.connection) return;

    (async () => {
      for await (const status of this.connection!.status()) {
        const data = status.data ? JSON.stringify(status.data) : undefined;
        this.logger.info({ type: status.type, data }, 'NATS status update');

        switch (status.type) {
          case 'disconnect':
            this.logger.warn('Disconnected from NATS');
            break;
          case 'reconnect':
            this.logger.info('Reconnected to NATS');
            break;
          case 'error':
            this.logger.error({ error: status.data }, 'NATS error');
            break;
        }
      }
    })();
  }

  /**
   * Get publisher instance
   */
  getPublisher(): NatsPublisher {
    if (!this.publisher) {
      throw new Error('Not connected. Call connect() first.');
    }
    return this.publisher;
  }

  /**
   * Create a new consumer
   */
  async createConsumer(
    stream: string,
    consumer: string,
    options?: { batchSize?: number }
  ): Promise<NatsConsumer> {
    if (!this.connection) {
      throw new Error('Not connected. Call connect() first.');
    }

    const key = `${stream}:${consumer}`;
    
    if (this.consumers.has(key)) {
      return this.consumers.get(key)!;
    }

    const natsConsumer = new NatsConsumer(
      this.connection,
      { stream, consumer, batchSize: options?.batchSize },
      this.logger
    );

    await natsConsumer.initialize();
    this.consumers.set(key, natsConsumer);

    return natsConsumer;
  }

  /**
   * Get connection statistics
   */
  getStats() {
    if (!this.connection) {
      return null;
    }

    return {
      connected: this.connection.protocol.connected,
      reconnecting: this.connection.protocol.reconnecting,
      info: this.connection.info,
      stats: this.connection.stats(),
    };
  }

  /**
   * Gracefully close the connection
   */
  async close(): Promise<void> {
    this.logger.info('Closing NATS connection...');

    // Stop all consumers
    for (const [key, consumer] of this.consumers.entries()) {
      try {
        await consumer.stop();
        this.logger.info({ consumer: key }, 'Consumer stopped');
      } catch (error) {
        this.logger.error({ consumer: key, error }, 'Error stopping consumer');
      }
    }

    this.consumers.clear();

    // Close connection
    if (this.connection) {
      await this.connection.drain();
      await this.connection.close();
      this.connection = null;
      this.publisher = null;
    }

    this.logger.info('NATS connection closed');
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connection !== null && !this.connection.isClosed();
  }
}
