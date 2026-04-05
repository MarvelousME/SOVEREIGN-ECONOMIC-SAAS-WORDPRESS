import { db } from '../database';
import { logger } from '../utils/logger';
import { distributionCalculator, DistributionResult } from '../engine/distribution-calculator';
import { eligibilityScorer } from '../engine/eligibility-scorer';
import { eventPublisher } from '../events/event-publisher';
import { v4 as uuidv4 } from 'uuid';

/**
 * Calculate distribution activity
 */
export async function calculateDistribution(params: {
  poolId: string;
  tenantId: string;
  distributionDate: Date;
}): Promise<{
  success: boolean;
  distributionId?: string;
  distributions?: DistributionResult[];
  totalDistributed?: number;
  recipientCount?: number;
  error?: string;
}> {
  try {
    logger.info('Calculating distribution', params);

    // Get pool details
    const poolQuery = `
      SELECT total_amount, distributed_amount, remaining_amount
      FROM ubi_pools
      WHERE id = $1 AND is_active = true
    `;
    const pools = await db.query<{
      total_amount: string;
      distributed_amount: string;
      remaining_amount: string;
    }>(poolQuery, [params.poolId]);

    if (pools.length === 0) {
      return { success: false, error: 'Pool not found or inactive' };
    }

    const pool = pools[0];
    const remainingAmount = parseFloat(pool.remaining_amount);

    if (remainingAmount <= 0) {
      return { success: false, error: 'Insufficient pool balance' };
    }

    // Calculate distribution
    const distributions = await distributionCalculator.calculateDistribution({
      poolId: params.poolId,
      tenantId: params.tenantId,
      totalAmount: remainingAmount * 0.1, // Distribute 10% of remaining amount
      distributionDate: params.distributionDate
    });

    const totalDistributed = distributions.reduce((sum, d) => sum + d.totalAmount, 0);
    const distributionId = uuidv4();

    // Create distribution history record
    await db.query(
      `INSERT INTO distribution_history (
        id, pool_id, distribution_date, total_distributed,
        eligible_users_count, status, started_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [distributionId, params.poolId, params.distributionDate, totalDistributed, distributions.length, 'processing']
    );

    return {
      success: true,
      distributionId,
      distributions,
      totalDistributed,
      recipientCount: distributions.length
    };
  } catch (error) {
    logger.error('Distribution calculation failed', { error, params });
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Persist distribution records activity
 */
export async function persistDistribution(params: {
  distributionId: string;
  distributions: DistributionResult[];
}): Promise<void> {
  logger.info('Persisting distribution records', {
    distributionId: params.distributionId,
    count: params.distributions.length
  });

  await db.transaction(async (client) => {
    for (const dist of params.distributions) {
      // Insert user distribution record
      await client.query(
        `INSERT INTO user_distributions (
          distribution_id, user_id, pool_id, base_amount,
          activity_bonus, contribution_bonus, reputation_multiplier,
          total_amount, vested_amount, unvested_amount,
          vesting_complete_at
        ) VALUES ($1, $2, (SELECT pool_id FROM distribution_history WHERE id = $1), $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          params.distributionId,
          dist.userId,
          dist.baseAmount,
          dist.activityBonus,
          dist.contributionBonus,
          dist.reputationMultiplier,
          dist.totalAmount,
          dist.vestedAmount,
          dist.unvestedAmount,
          dist.vestingCompleteAt
        ]
      );

      // Update user UBI balance
      await client.query(
        `INSERT INTO user_ubi_balances (user_id, tenant_id, pending_balance, lifetime_earned, last_distribution_at)
         VALUES (
           $1,
           (SELECT tenant_id FROM ubi_pools WHERE id = (SELECT pool_id FROM distribution_history WHERE id = $2)),
           $3,
           $3,
           NOW()
         )
         ON CONFLICT (user_id, tenant_id)
         DO UPDATE SET
           pending_balance = user_ubi_balances.pending_balance + EXCLUDED.pending_balance,
           lifetime_earned = user_ubi_balances.lifetime_earned + EXCLUDED.lifetime_earned,
           last_distribution_at = NOW()`,
        [dist.userId, params.distributionId, dist.vestedAmount]
      );
    }

    // Update distribution status
    await client.query(
      `UPDATE distribution_history
       SET status = 'completed', completed_at = NOW()
       WHERE id = $1`,
      [params.distributionId]
    );
  });
}

/**
 * Update pool balance activity
 */
export async function updatePoolBalance(params: {
  poolId: string;
  distributedAmount: number;
}): Promise<void> {
  logger.info('Updating pool balance', params);

  await db.query(
    `UPDATE ubi_pools
     SET distributed_amount = distributed_amount + $1,
         remaining_amount = remaining_amount - $1,
         updated_at = NOW()
     WHERE id = $2`,
    [params.distributedAmount, params.poolId]
  );
}

/**
 * Notify distribution complete activity
 */
export async function notifyDistributionComplete(params: {
  distributionId: string;
  poolId: string;
  tenantId: string;
  recipientCount: number;
  totalDistributed: number;
}): Promise<void> {
  logger.info('Notifying distribution complete', params);

  await eventPublisher.publishDistributionCompleted({
    distributionId: params.distributionId,
    poolId: params.poolId,
    tenantId: params.tenantId,
    totalDistributed: params.totalDistributed,
    recipientCount: params.recipientCount,
    completedAt: new Date()
  });
}

/**
 * Check pool sustainability activity
 */
export async function checkPoolSustainability(params: {
  poolId: string;
}): Promise<{
  isSustainable: boolean;
  recommendations?: any;
}> {
  const poolQuery = `
    SELECT total_amount, remaining_amount, distributed_amount
    FROM ubi_pools
    WHERE id = $1
  `;
  const pools = await db.query<{
    total_amount: string;
    remaining_amount: string;
    distributed_amount: string;
  }>(poolQuery, [params.poolId]);

  if (pools.length === 0) {
    return { isSustainable: false };
  }

  const pool = pools[0];
  const remainingPercent = (parseFloat(pool.remaining_amount) / parseFloat(pool.total_amount)) * 100;

  if (remainingPercent < 20) {
    return {
      isSustainable: false,
      recommendations: {
        action: 'reduce_distribution_rate',
        newRate: 0.05 // Reduce to 5% distribution
      }
    };
  }

  return { isSustainable: true };
}

/**
 * Adjust pool parameters activity
 */
export async function adjustPoolParameters(params: {
  poolId: string;
  adjustments: any;
}): Promise<void> {
  logger.info('Adjusting pool parameters', params);
  // Implementation for parameter adjustment
}

/**
 * Recalculate all eligibility activity
 */
export async function recalculateAllEligibility(params: {
  tenantId: string;
  poolId: string;
}): Promise<void> {
  logger.info('Recalculating all eligibility', params);

  const usersQuery = `
    SELECT DISTINCT user_id
    FROM activity_events
    WHERE tenant_id = $1
  `;
  const users = await db.query<{ user_id: string }>(usersQuery, [params.tenantId]);

  await eligibilityScorer.batchCalculateEligibility(
    users.map(u => u.user_id),
    params.tenantId,
    params.poolId
  );
}
