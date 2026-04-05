import { NatsConnection } from 'nats';
import { jsonCodec } from '../config/nats';
import {
  EventSubject,
  TaskCreatedEvent,
  TaskClaimedEvent,
  TaskCompletedEvent,
  TaskApprovedEvent,
  TaskRejectedEvent,
  TaskExpiredEvent,
  TaskDisputedEvent,
} from '../types/events.types';
import { logger } from '../utils/logger';

export class EventService {
  constructor(private nats: NatsConnection) {}

  async publishTaskCreated(event: TaskCreatedEvent): Promise<void> {
    try {
      this.nats.publish(EventSubject.TASK_CREATED, jsonCodec.encode(event));
      logger.info('Published task.created event', { taskId: event.task_id });
    } catch (error) {
      logger.error('Failed to publish task.created event', { error, event });
      throw error;
    }
  }

  async publishTaskClaimed(event: TaskClaimedEvent): Promise<void> {
    try {
      this.nats.publish(EventSubject.TASK_CLAIMED, jsonCodec.encode(event));
      logger.info('Published task.claimed event', { taskId: event.task_id });
    } catch (error) {
      logger.error('Failed to publish task.claimed event', { error, event });
      throw error;
    }
  }

  async publishTaskCompleted(event: TaskCompletedEvent): Promise<void> {
    try {
      this.nats.publish(EventSubject.TASK_COMPLETED, jsonCodec.encode(event));
      logger.info('Published task.completed event', { taskId: event.task_id });
    } catch (error) {
      logger.error('Failed to publish task.completed event', { error, event });
      throw error;
    }
  }

  async publishTaskApproved(event: TaskApprovedEvent): Promise<void> {
    try {
      this.nats.publish(EventSubject.TASK_APPROVED, jsonCodec.encode(event));
      logger.info('Published task.approved event', { taskId: event.task_id });
    } catch (error) {
      logger.error('Failed to publish task.approved event', { error, event });
      throw error;
    }
  }

  async publishTaskRejected(event: TaskRejectedEvent): Promise<void> {
    try {
      this.nats.publish(EventSubject.TASK_REJECTED, jsonCodec.encode(event));
      logger.info('Published task.rejected event', { taskId: event.task_id });
    } catch (error) {
      logger.error('Failed to publish task.rejected event', { error, event });
      throw error;
    }
  }

  async publishTaskExpired(event: TaskExpiredEvent): Promise<void> {
    try {
      this.nats.publish(EventSubject.TASK_EXPIRED, jsonCodec.encode(event));
      logger.info('Published task.expired event', { taskId: event.task_id });
    } catch (error) {
      logger.error('Failed to publish task.expired event', { error, event });
      throw error;
    }
  }

  async publishTaskDisputed(event: TaskDisputedEvent): Promise<void> {
    try {
      this.nats.publish(EventSubject.TASK_DISPUTED, jsonCodec.encode(event));
      logger.info('Published task.disputed event', { taskId: event.task_id });
    } catch (error) {
      logger.error('Failed to publish task.disputed event', { error, event });
      throw error;
    }
  }

  /**
   * Subscribe to reputation updates to refresh user cache
   */
  async subscribeToReputationUpdates(
    callback: (userId: string, newReputation: number) => Promise<void>
  ): Promise<void> {
    const subscription = this.nats.subscribe(EventSubject.REPUTATION_UPDATED);

    (async () => {
      for await (const msg of subscription) {
        try {
          const event = jsonCodec.decode(msg.data) as any;
          await callback(event.user_id, event.new_reputation);
          logger.debug('Processed reputation update', {
            userId: event.user_id,
            newReputation: event.new_reputation,
          });
        } catch (error) {
          logger.error('Error processing reputation update', { error });
        }
      }
    })();

    logger.info('Subscribed to reputation.updated events');
  }
}
