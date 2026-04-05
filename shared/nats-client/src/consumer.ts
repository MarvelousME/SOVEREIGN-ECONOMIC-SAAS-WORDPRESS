import { NatsConnection, JsMsg, AckPolicy } from 'nats';
import { Logger } from 'pino';
import { ConsumeOptions, MessageHandler, DEFAULT_RETRY_POLICY } from './types';
import { calculateBackoff, sleep } from './utils';

/**
 * NATS Consumer for consuming messages from JetStream
 */
export class NatsConsumer {
  private jsClient: any;
  private subscription: any;
  private running = false;
  private messageHandler: MessageHandler | null = null;

  constructor(
    private connection: NatsConnection,
    private options: ConsumeOptions,
    private logger: Logger
  ) {}

  /**
   * Initialize JetStream client
   */
  async initialize(): Promise<void> {
    this.jsClient = this.connection.jetstream();
    this.logger.info(
      { stream: this.options.stream, consumer: this.options.consumer },
      'Consumer initialized'
    );
  }

  /**
   * Start consuming messages
   */
  async consume(handler: MessageHandler): Promise<void> {
    if (!this.jsClient) {
      throw new Error('Consumer not initialized. Call initialize() first.');
    }

    if (this.running) {
      this.logger.warn('Consumer already running');
      return;
    }

    this.messageHandler = handler;
    this.running = true;

    try {
      // Get consumer from JetStream
      const consumer = await this.jsClient.consumers.get(
        this.options.stream,
        this.options.consumer
      );

      this.logger.info(
        {
          stream: this.options.stream,
          consumer: this.options.consumer,
        },
        'Starting message consumption'
      );

      // Create ordered consumer for processing
      const messages = await consumer.consume({
        max_messages: this.options.batchSize || 10,
        expires: this.options.expires || 30000,
      });

      // Process messages
      for await (const msg of messages) {
        if (!this.running) {
          this.logger.info('Consumer stopped, breaking message loop');
          break;
        }

        await this.processMessage(msg);
      }
    } catch (error) {
      this.logger.error(
        { error, stream: this.options.stream, consumer: this.options.consumer },
        'Error in consumer'
      );
      this.running = false;
      throw error;
    }
  }

  /**
   * Process a single message with retry logic
   */
  private async processMessage(msg: JsMsg): Promise<void> {
    const retryPolicy = DEFAULT_RETRY_POLICY;
    let attempt = 0;

    while (attempt < retryPolicy.maxAttempts) {
      try {
        const decoder = new TextDecoder();
        const data = decoder.decode(msg.data);
        const parsed = JSON.parse(data);

        this.logger.debug(
          {
            subject: msg.subject,
            seq: msg.seq,
            attempt: attempt + 1,
            deliveryCount: msg.info?.deliveryCount,
          },
          'Processing message'
        );

        // Call message handler
        if (this.messageHandler) {
          await this.messageHandler(msg);
        }

        // Acknowledge message on success
        msg.ack();

        this.logger.debug(
          { subject: msg.subject, seq: msg.seq },
          'Message processed successfully'
        );

        return; // Success - exit retry loop
      } catch (error) {
        attempt++;

        this.logger.error(
          {
            error,
            subject: msg.subject,
            seq: msg.seq,
            attempt,
            maxAttempts: retryPolicy.maxAttempts,
          },
          'Error processing message'
        );

        if (attempt >= retryPolicy.maxAttempts) {
          // Max retries exceeded - NAK with term
          this.logger.error(
            { subject: msg.subject, seq: msg.seq },
            'Max retries exceeded, terminating message'
          );

          msg.term();

          // Send to dead letter queue if configured
          await this.sendToDeadLetterQueue(msg, error);
          return;
        }

        // Calculate backoff and retry
        const backoffMs = calculateBackoff(
          attempt,
          retryPolicy.backoffMs,
          retryPolicy.maxBackoffMs,
          retryPolicy.backoffMultiplier
        );

        this.logger.info(
          { backoffMs, attempt },
          'Retrying after backoff'
        );

        // NAK with delay
        msg.nak(backoffMs);
        await sleep(backoffMs);
      }
    }
  }

  /**
   * Send failed message to dead letter queue
   */
  private async sendToDeadLetterQueue(msg: JsMsg, error: unknown): Promise<void> {
    try {
      const dlqSubject = `dlq.${this.options.stream.toLowerCase()}.${msg.subject}`;

      const decoder = new TextDecoder();
      const originalData = decoder.decode(msg.data);

      const dlqMessage = {
        original_subject: msg.subject,
        original_data: JSON.parse(originalData),
        error: error instanceof Error ? error.message : String(error),
        error_stack: error instanceof Error ? error.stack : undefined,
        stream: this.options.stream,
        consumer: this.options.consumer,
        delivery_count: msg.info?.deliveryCount,
        timestamp: new Date().toISOString(),
      };

      const encoder = new TextEncoder();
      const payload = encoder.encode(JSON.stringify(dlqMessage));

      await this.jsClient.publish(dlqSubject, payload);

      this.logger.info(
        { dlqSubject, originalSubject: msg.subject },
        'Message sent to dead letter queue'
      );
    } catch (dlqError) {
      this.logger.error(
        { error: dlqError, originalError: error },
        'Failed to send message to dead letter queue'
      );
    }
  }

  /**
   * Stop consuming messages
   */
  async stop(): Promise<void> {
    this.logger.info('Stopping consumer...');
    this.running = false;

    if (this.subscription) {
      try {
        await this.subscription.drain();
      } catch (error) {
        this.logger.error({ error }, 'Error draining subscription');
      }
    }

    this.logger.info('Consumer stopped');
  }

  /**
   * Check if consumer is running
   */
  isRunning(): boolean {
    return this.running;
  }
}
