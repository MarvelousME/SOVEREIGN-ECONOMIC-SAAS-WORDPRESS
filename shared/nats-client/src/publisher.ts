import { NatsConnection, headers as natsHeaders } from 'nats';
import { Logger } from 'pino';
import { PublishOptions } from './types';
import { isValidCloudEvent } from './utils';

/**
 * NATS Publisher for publishing events to JetStream
 */
export class NatsPublisher {
  private jsClient: any;

  constructor(
    private connection: NatsConnection,
    private logger: Logger
  ) {}

  /**
   * Initialize JetStream client
   */
  async initialize(): Promise<void> {
    this.jsClient = this.connection.jetstream();
    this.logger.info('Publisher initialized');
  }

  /**
   * Publish an event to a subject
   */
  async publish<T>(
    subject: string,
    event: T,
    options?: PublishOptions
  ): Promise<void> {
    if (!this.jsClient) {
      throw new Error('Publisher not initialized. Call initialize() first.');
    }

    try {
      // Validate CloudEvent structure if it looks like one
      if (typeof event === 'object' && event !== null && 'specversion' in event) {
        if (!isValidCloudEvent(event)) {
          throw new Error('Invalid CloudEvent structure');
        }
      }

      // Prepare headers
      const hdrs = natsHeaders();
      
      if (options?.msgId) {
        hdrs.set('Nats-Msg-Id', options.msgId);
      }

      if (options?.headers) {
        for (const [key, value] of Object.entries(options.headers)) {
          hdrs.set(key, value);
        }
      }

      // Publish to JetStream
      const encoder = new TextEncoder();
      const payload = encoder.encode(JSON.stringify(event));

      const pubAck = await this.jsClient.publish(subject, payload, {
        headers: hdrs,
        timeout: options?.timeout || 5000,
      });

      this.logger.debug(
        {
          subject,
          msgId: options?.msgId,
          stream: pubAck.stream,
          seq: pubAck.seq,
          duplicate: pubAck.duplicate,
        },
        'Event published successfully'
      );

      if (pubAck.duplicate) {
        this.logger.warn({ subject, msgId: options?.msgId }, 'Duplicate message detected');
      }
    } catch (error) {
      this.logger.error(
        { error, subject, msgId: options?.msgId },
        'Failed to publish event'
      );
      throw error;
    }
  }

  /**
   * Publish multiple events in a batch
   */
  async publishBatch<T>(
    subject: string,
    events: T[],
    options?: PublishOptions
  ): Promise<void> {
    const promises = events.map((event, index) => {
      const eventOptions = {
        ...options,
        msgId: options?.msgId ? `${options.msgId}-${index}` : undefined,
      };
      return this.publish(subject, event, eventOptions);
    });

    await Promise.all(promises);

    this.logger.info(
      { subject, count: events.length },
      'Batch publish completed'
    );
  }
}
