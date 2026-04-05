import { natsClient } from './nats-client';
import { db } from '../database';
import { logger } from '../utils/logger';
import { eligibilityScorer } from '../engine/eligibility-scorer';

/**
 * Event consumer for UBI-related events
 * Listens to task.completed, referral.converted, agent.revenue events
 */
export class EventConsumer {
  async start(): Promise<void> {
    logger.info('Starting event consumer');

    // Subscribe to task completion events
    await natsClient.subscribe('task.completed', async (event) => {
      await this.handleTaskCompleted(event);
    });

    // Subscribe to referral conversion events
    await natsClient.subscribe('referral.converted', async (event) => {
      await this.handleReferralConverted(event);
    });

    // Subscribe to agent revenue events
    await natsClient.subscribe('agent.revenue', async (event) => {
      await this.handleAgentRevenue(event);
    });

    logger.info('Event consumer started');
  }

  /**
   * Handle task.completed event
   */
  private async handleTaskCompleted(event: any): Promise<void> {
    logger.info('Processing task.completed event', { event });

    const { userId, tenantId, taskType, taskValue, metadata } = event;

    try {
      // Record activity event
      await db.query(
        `INSERT INTO activity_events (user_id, tenant_id, event_type, event_data, score_value)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, tenantId, 'task_completed', JSON.stringify(metadata), 10]
      );

      // Record contribution
      await db.query(
        `INSERT INTO contribution_records (
          user_id, tenant_id, contribution_type, contribution_value,
          score_multiplier, total_score, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          userId,
          tenantId,
          'task_completion',
          taskValue || 1,
          1.0,
          10,
          JSON.stringify({ taskType, ...metadata })
        ]
      );

      // Invalidate eligibility cache
      const pools = await db.query<{ id: string }>(
        'SELECT id FROM ubi_pools WHERE tenant_id = $1 AND is_active = true',
        [tenantId]
      );

      for (const pool of pools) {
        await eligibilityScorer.invalidateCache(userId, pool.id);
      }

      logger.info('Task completion processed', { userId, taskType });
    } catch (error) {
      logger.error('Error processing task.completed event', { error, event });
    }
  }

  /**
   * Handle referral.converted event
   */
  private async handleReferralConverted(event: any): Promise<void> {
    logger.info('Processing referral.converted event', { event });

    const { referrerId, tenantId, referredUserId, metadata } = event;

    try {
      // Record activity event
      await db.query(
        `INSERT INTO activity_events (user_id, tenant_id, event_type, event_data, score_value)
         VALUES ($1, $2, $3, $4, $5)`,
        [referrerId, tenantId, 'referral_converted', JSON.stringify(metadata), 25]
      );

      // Record contribution with higher value
      await db.query(
        `INSERT INTO contribution_records (
          user_id, tenant_id, contribution_type, contribution_value,
          score_multiplier, total_score, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          referrerId,
          tenantId,
          'referral',
          1,
          2.0,
          50,
          JSON.stringify({ referredUserId, ...metadata })
        ]
      );

      // Invalidate eligibility cache
      const pools = await db.query<{ id: string }>(
        'SELECT id FROM ubi_pools WHERE tenant_id = $1 AND is_active = true',
        [tenantId]
      );

      for (const pool of pools) {
        await eligibilityScorer.invalidateCache(referrerId, pool.id);
      }

      logger.info('Referral conversion processed', { referrerId, referredUserId });
    } catch (error) {
      logger.error('Error processing referral.converted event', { error, event });
    }
  }

  /**
   * Handle agent.revenue event
   */
  private async handleAgentRevenue(event: any): Promise<void> {
    logger.info('Processing agent.revenue event', { event });

    const { userId, tenantId, revenueAmount, metadata } = event;

    try {
      // Record activity event
      await db.query(
        `INSERT INTO activity_events (user_id, tenant_id, event_type, event_data, score_value)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, tenantId, 'agent_revenue', JSON.stringify(metadata), 15]
      );

      // Record contribution based on revenue amount
      const contributionScore = Math.min(revenueAmount / 10, 100);
      
      await db.query(
        `INSERT INTO contribution_records (
          user_id, tenant_id, contribution_type, contribution_value,
          score_multiplier, total_score, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          userId,
          tenantId,
          'agent_revenue',
          revenueAmount,
          1.5,
          contributionScore,
          JSON.stringify(metadata)
        ]
      );

      // Invalidate eligibility cache
      const pools = await db.query<{ id: string }>(
        'SELECT id FROM ubi_pools WHERE tenant_id = $1 AND is_active = true',
        [tenantId]
      );

      for (const pool of pools) {
        await eligibilityScorer.invalidateCache(userId, pool.id);
      }

      logger.info('Agent revenue processed', { userId, revenueAmount });
    } catch (error) {
      logger.error('Error processing agent.revenue event', { error, event });
    }
  }
}

export const eventConsumer = new EventConsumer();
