import { natsClient } from './nats-client';
import { logger } from '../utils/logger';

export interface UBIEvent {
  eventType: string;
  timestamp: Date;
  data: any;
}

/**
 * Event publisher for UBI distribution events
 */
export class EventPublisher {
  /**
   * Publish UBI distribution scheduled event
   */
  async publishDistributionScheduled(data: {
    distributionId: string;
    poolId: string;
    tenantId: string;
    scheduledDate: Date;
    totalAmount: number;
  }): Promise<void> {
    const event: UBIEvent = {
      eventType: 'ubi.distribution.scheduled',
      timestamp: new Date(),
      data
    };

    try {
      await natsClient.publish('ubi.distribution.scheduled', event);
      logger.info('Published ubi.distribution.scheduled event', { distributionId: data.distributionId });
    } catch (error) {
      logger.error('Failed to publish distribution scheduled event', { error, data });
    }
  }

  /**
   * Publish UBI distribution completed event
   */
  async publishDistributionCompleted(data: {
    distributionId: string;
    poolId: string;
    tenantId: string;
    totalDistributed: number;
    recipientCount: number;
    completedAt: Date;
  }): Promise<void> {
    const event: UBIEvent = {
      eventType: 'ubi.distribution.completed',
      timestamp: new Date(),
      data
    };

    try {
      await natsClient.publish('ubi.distribution.completed', event);
      logger.info('Published ubi.distribution.completed event', { 
        distributionId: data.distributionId,
        recipientCount: data.recipientCount 
      });
    } catch (error) {
      logger.error('Failed to publish distribution completed event', { error, data });
    }
  }

  /**
   * Publish UBI claimed event
   */
  async publishUBIClaimed(data: {
    userId: string;
    tenantId: string;
    amount: number;
    distributionId: string;
    claimedAt: Date;
  }): Promise<void> {
    const event: UBIEvent = {
      eventType: 'ubi.claimed',
      timestamp: new Date(),
      data
    };

    try {
      await natsClient.publish('ubi.claimed', event);
      
      // Also publish to ledger service for actual token transfer
      await natsClient.publish('ledger.transfer.request', {
        userId: data.userId,
        tenantId: data.tenantId,
        amount: data.amount,
        type: 'ubi_claim',
        metadata: {
          distributionId: data.distributionId,
          claimedAt: data.claimedAt
        }
      });

      logger.info('Published ubi.claimed event', { 
        userId: data.userId,
        amount: data.amount 
      });
    } catch (error) {
      logger.error('Failed to publish UBI claimed event', { error, data });
    }
  }

  /**
   * Publish UBI distribution failed event
   */
  async publishDistributionFailed(data: {
    distributionId: string;
    poolId: string;
    error: string;
    failedAt: Date;
  }): Promise<void> {
    const event: UBIEvent = {
      eventType: 'ubi.distribution.failed',
      timestamp: new Date(),
      data
    };

    try {
      await natsClient.publish('ubi.distribution.failed', event);
      logger.error('Published ubi.distribution.failed event', { distributionId: data.distributionId });
    } catch (error) {
      logger.error('Failed to publish distribution failed event', { error, data });
    }
  }
}

export const eventPublisher = new EventPublisher();
