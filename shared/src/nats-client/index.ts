import {
  connect,
  NatsConnection,
  StringCodec,
  JSONCodec,
  JetStreamClient,
  JetStreamManager,
  ConsumerOpts,
  JsMsg,
  AckPolicy,
  DeliverPolicy,
  ReplayPolicy,
} from 'nats';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { logger } from '../logger';
import { BaseEvent, DomainEvent } from '../types';
import retry from 'async-retry';

export interface PublishOptions {
  correlationId?: string;
  causationId?: string;
  tenantId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface SubscribeOptions {
  durableName?: string;
  deliverPolicy?: DeliverPolicy;
  ackPolicy?: AckPolicy;
  maxDeliver?: number;
  ackWait?: number;
  replayPolicy?: ReplayPolicy;
}

export interface EventHandler<T = any> {
  (event: T): Promise<void>;
}

class NatsClient {
  private nc: NatsConnection | null = null;
  private js: JetStreamClient | null = null;
  private jsm: JetStreamManager | null = null;
  private sc = StringCodec();
  private jc = JSONCodec();
  private reconnecting = false;

  /**
   * Connect to NATS server
   */
  async connect(): Promise<void> {
    if (this.nc) {
      logger.warn('NATS client already connected');
      return;
    }

    const natsConfig = config.getNatsConfig();

    try {
      this.nc = await retry(
        async () => {
          logger.info('Connecting to NATS...', { url: natsConfig.url });
          return await connect({
            servers: natsConfig.url,
            reconnect: natsConfig.reconnect,
            maxReconnectAttempts: natsConfig.maxReconnectAttempts,
            reconnectTimeWait: natsConfig.reconnectTimeWait,
          });
        },
        {
          retries: 5,
          minTimeout: 1000,
          maxTimeout: 5000,
          onRetry: (error, attempt) => {
            logger.warn(`NATS connection attempt ${attempt} failed`, {
              error: error.message,
            });
          },
        }
      );

      this.js = this.nc.jetstream();
      this.jsm = await this.nc.jetstreamManager();

      this.setupEventHandlers();
      await this.ensureStreams();

      logger.info('Connected to NATS successfully');
    } catch (error: any) {
      logger.error('Failed to connect to NATS', { error: error.message });
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.nc) return;

    (async () => {
      for await (const status of this.nc!.status()) {
        logger.debug('NATS status update', {
          type: status.type,
          data: status.data,
        });

        if (status.type === 'disconnect' || status.type === 'reconnecting') {
          this.reconnecting = true;
          logger.warn('NATS connection lost, attempting to reconnect...');
        }

        if (status.type === 'reconnect') {
          this.reconnecting = false;
          logger.info('NATS connection restored');
        }
      }
    })();
  }

  /**
   * Ensure required streams exist
   */
  private async ensureStreams(): Promise<void> {
    if (!this.jsm) {
      throw new Error('JetStream manager not initialized');
    }

    const streams = [
      {
        name: 'EVENTS',
        subjects: ['events.>'],
        retention: 'limits' as const,
        max_age: 7 * 24 * 60 * 60 * 1000000000, // 7 days in nanoseconds
        storage: 'file' as const,
      },
      {
        name: 'COMMANDS',
        subjects: ['commands.>'],
        retention: 'limits' as const,
        max_age: 24 * 60 * 60 * 1000000000, // 1 day in nanoseconds
        storage: 'file' as const,
      },
    ];

    for (const streamConfig of streams) {
      try {
        await this.jsm.streams.info(streamConfig.name);
        logger.debug(`Stream ${streamConfig.name} already exists`);
      } catch (error) {
        try {
          await this.jsm.streams.add(streamConfig);
          logger.info(`Created stream ${streamConfig.name}`);
        } catch (addError: any) {
          logger.error(`Failed to create stream ${streamConfig.name}`, {
            error: addError.message,
          });
        }
      }
    }
  }

  /**
   * Publish an event
   */
  async publish(
    eventType: string,
    data: any,
    options: PublishOptions = {}
  ): Promise<void> {
    if (!this.js) {
      await this.connect();
    }

    const event: BaseEvent & { data: any } = {
      eventId: uuidv4(),
      eventType,
      timestamp: new Date().toISOString(),
      correlationId: options.correlationId || uuidv4(),
      causationId: options.causationId || uuidv4(),
      tenantId: options.tenantId,
      userId: options.userId,
      metadata: options.metadata,
      data,
    };

    const subject = `events.${eventType.replace(/\./g, '_')}`;

    try {
      await retry(
        async () => {
          const ack = await this.js!.publish(subject, this.jc.encode(event));
          logger.debug('Event published', {
            eventId: event.eventId,
            eventType,
            subject,
            seq: ack.seq,
          });
        },
        {
          retries: 3,
          minTimeout: 100,
          maxTimeout: 1000,
        }
      );
    } catch (error: any) {
      logger.error('Failed to publish event', {
        eventType,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Subscribe to events
   */
  async subscribe<T = any>(
    eventType: string,
    handler: EventHandler<T>,
    options: SubscribeOptions = {}
  ): Promise<void> {
    if (!this.js) {
      await this.connect();
    }

    const subject = `events.${eventType.replace(/\./g, '_')}`;
    const durableName = options.durableName || `${eventType}_consumer`;

    const consumerOpts: Partial<ConsumerOpts> = {
      durable: durableName,
      ack_policy: options.ackPolicy || AckPolicy.Explicit,
      deliver_policy: options.deliverPolicy || DeliverPolicy.All,
      max_deliver: options.maxDeliver || 3,
      ack_wait: options.ackWait || 30000000000, // 30 seconds in nanoseconds
      replay_policy: options.replayPolicy || ReplayPolicy.Instant,
    };

    try {
      const consumer = await this.js!.subscribe(subject, consumerOpts as ConsumerOpts);
      
      logger.info('Subscribed to events', {
        subject,
        durableName,
      });

      // Process messages
      (async () => {
        for await (const msg of consumer) {
          await this.handleMessage(msg, handler);
        }
      })();
    } catch (error: any) {
      logger.error('Failed to subscribe to events', {
        subject,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Subscribe to multiple event types
   */
  async subscribeMultiple<T = any>(
    eventTypes: string[],
    handler: EventHandler<T>,
    options: SubscribeOptions = {}
  ): Promise<void> {
    const promises = eventTypes.map((eventType) =>
      this.subscribe(eventType, handler, {
        ...options,
        durableName: options.durableName || `multi_${eventTypes.join('_')}_consumer`,
      })
    );

    await Promise.all(promises);
  }

  /**
   * Handle incoming message
   */
  private async handleMessage<T>(msg: JsMsg, handler: EventHandler<T>): Promise<void> {
    const start = Date.now();

    try {
      const event = this.jc.decode(msg.data) as T & BaseEvent;

      logger.debug('Processing event', {
        eventId: (event as BaseEvent).eventId,
        eventType: (event as BaseEvent).eventType,
        subject: msg.subject,
      });

      await handler(event);

      msg.ack();

      const duration = Date.now() - start;
      logger.debug('Event processed successfully', {
        eventId: (event as BaseEvent).eventId,
        duration,
      });
    } catch (error: any) {
      const duration = Date.now() - start;
      logger.error('Error processing event', {
        subject: msg.subject,
        error: error.message,
        duration,
      });

      // Nack the message to allow redelivery
      msg.nak(1000); // Delay 1 second before redelivery
    }
  }

  /**
   * Request-reply pattern
   */
  async request<TResponse = any>(
    subject: string,
    data: any,
    timeout: number = 5000
  ): Promise<TResponse> {
    if (!this.nc) {
      await this.connect();
    }

    try {
      const msg = await this.nc!.request(
        subject,
        this.jc.encode(data),
        { timeout }
      );

      return this.jc.decode(msg.data) as TResponse;
    } catch (error: any) {
      logger.error('Request failed', {
        subject,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Respond to requests
   */
  async respondTo<TRequest = any, TResponse = any>(
    subject: string,
    handler: (data: TRequest) => Promise<TResponse>
  ): Promise<void> {
    if (!this.nc) {
      await this.connect();
    }

    const sub = this.nc!.subscribe(subject);

    logger.info('Responding to requests', { subject });

    (async () => {
      for await (const msg of sub) {
        try {
          const request = this.jc.decode(msg.data) as TRequest;
          const response = await handler(request);
          msg.respond(this.jc.encode(response));
        } catch (error: any) {
          logger.error('Error handling request', {
            subject,
            error: error.message,
          });
          msg.respond(
            this.jc.encode({ error: error.message })
          );
        }
      }
    })();
  }

  /**
   * Drain and close connection
   */
  async close(): Promise<void> {
    if (this.nc) {
      await this.nc.drain();
      this.nc = null;
      this.js = null;
      this.jsm = null;
      logger.info('NATS connection closed');
    }
  }

  /**
   * Check connection health
   */
  isConnected(): boolean {
    return this.nc !== null && !this.reconnecting;
  }

  /**
   * Get JetStream client
   */
  getJetStream(): JetStreamClient | null {
    return this.js;
  }

  /**
   * Get JetStream manager
   */
  getJetStreamManager(): JetStreamManager | null {
    return this.jsm;
  }
}

// Export singleton instance
export const natsClient = new NatsClient();

// Export class for testing or custom instances
export { NatsClient };
