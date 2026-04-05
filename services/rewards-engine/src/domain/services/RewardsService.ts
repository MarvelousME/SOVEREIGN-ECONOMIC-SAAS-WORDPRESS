import { Pool } from 'pg';
import { createClient } from 'redis';
import { RewardsCalculator } from '../RewardsCalculator';
import {
  RewardCalculationInput,
  RewardCalculationResult,
  RewardStats,
  RewardPool,
  RewardMultipliers,
  RewardStatus,
  RewardSource,
} from '../types';
import { EventBus } from '../../infrastructure/events/EventBus';
import { logger } from '../../infrastructure/logger';

export class RewardsService {
  private db: Pool;
  private redis: ReturnType<typeof createClient>;
  private eventBus: EventBus;

  constructor() {
    this.db = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    this.redis = createClient({ url: process.env.REDIS_URL });
    this.redis.connect();
    this.eventBus = new EventBus();
  }

  /**
   * Calculate reward with multipliers
   */
  async calculateReward(input: RewardCalculationInput): Promise<RewardCalculationResult> {
    try {
      // Get user data for multipliers
      const [reputationScore, accountAgeDays, stakedAmount, monthlyVolume] = await Promise.all([
        this.getReputationScore(input.userId),
        this.getAccountAge(input.userId),
        this.getStakedAmount(input.userId),
        this.getMonthlyVolume(input.userId),
      ]);

      // Calculate reward
      const reward = RewardsCalculator.calculateReward(
        input,
        reputationScore,
        accountAgeDays,
        stakedAmount,
        monthlyVolume
      );

      // Store in database
      await this.storeReward(reward);

      // Emit event
      await this.eventBus.publish('reward.calculated', reward);

      logger.info('Reward calculated', {
        rewardId: reward.rewardId,
        userId: reward.userId,
        finalAmount: reward.finalAmount,
      });

      return reward;
    } catch (error) {
      logger.error('Error calculating reward', { error, input });
      throw error;
    }
  }

  /**
   * Get reward history for user
   */
  async getRewardHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    source?: RewardSource
  ): Promise<RewardCalculationResult[]> {
    const sourceFilter = source ? 'AND source = $4' : '';
    const params: any[] = [userId, limit, offset];
    if (source) params.push(source);

    const result = await this.db.query(
      `SELECT * FROM rewards 
       WHERE user_id = $1 
       ${sourceFilter}
       ORDER BY calculated_at DESC 
       LIMIT $2 OFFSET $3`,
      params
    );

    return result.rows.map(this.mapRowToReward);
  }

  /**
   * Get pending rewards
   */
  async getPendingRewards(userId: string): Promise<RewardCalculationResult[]> {
    const result = await this.db.query(
      `SELECT * FROM rewards 
       WHERE user_id = $1 AND status IN ('PENDING', 'CALCULATED', 'APPROVED')
       ORDER BY calculated_at DESC`,
      [userId]
    );

    return result.rows.map(this.mapRowToReward);
  }

  /**
   * Claim rewards
   */
  async claimRewards(userId: string, rewardIds: string[]): Promise<{
    totalAmount: number;
    claimedRewards: string[];
    transactionId: string;
  }> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Get rewards to claim
      const result = await client.query(
        `UPDATE rewards 
         SET status = 'CLAIMED', claimed_at = NOW()
         WHERE reward_id = ANY($1) AND user_id = $2 AND status = 'APPROVED'
         RETURNING *`,
        [rewardIds, userId]
      );

      const claimedRewards = result.rows;
      const totalAmount = claimedRewards.reduce((sum, r) => sum + parseFloat(r.final_amount), 0);

      // Create ledger transaction
      const transactionId = await this.createLedgerTransaction(userId, totalAmount);

      // Update rewards with transaction ID
      await client.query(
        `UPDATE rewards SET transaction_id = $1 WHERE reward_id = ANY($2)`,
        [transactionId, rewardIds]
      );

      await client.query('COMMIT');

      // Emit event
      await this.eventBus.publish('reward.distributed', {
        userId,
        totalAmount,
        transactionId,
        rewardIds,
      });

      logger.info('Rewards claimed', { userId, totalAmount, count: claimedRewards.length });

      return {
        totalAmount,
        claimedRewards: claimedRewards.map((r) => r.reward_id),
        transactionId,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error claiming rewards', { error, userId, rewardIds });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get reward statistics
   */
  async getRewardStats(userId: string): Promise<RewardStats> {
    const cacheKey = `reward:stats:${userId}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const result = await this.db.query(
      `SELECT 
        SUM(final_amount) as total_earned,
        SUM(CASE WHEN status = 'CLAIMED' THEN final_amount ELSE 0 END) as total_claimed,
        SUM(CASE WHEN status IN ('PENDING', 'CALCULATED', 'APPROVED') THEN final_amount ELSE 0 END) as total_pending,
        AVG(total_multiplier) as average_multiplier,
        MAX(calculated_at) as last_reward_date,
        json_object_agg(source, source_total) as rewards_by_source
       FROM (
         SELECT 
           source,
           final_amount,
           status,
           total_multiplier,
           calculated_at,
           SUM(final_amount) OVER (PARTITION BY source) as source_total
         FROM rewards
         WHERE user_id = $1
       ) subquery
       GROUP BY user_id`,
      [userId]
    );

    const stats: RewardStats = {
      userId,
      totalRewardsEarned: parseFloat(result.rows[0]?.total_earned || 0),
      totalRewardsClaimed: parseFloat(result.rows[0]?.total_claimed || 0),
      totalRewardsPending: parseFloat(result.rows[0]?.total_pending || 0),
      rewardsBySource: result.rows[0]?.rewards_by_source || {},
      averageMultiplier: parseFloat(result.rows[0]?.average_multiplier || 1),
      lastRewardDate: result.rows[0]?.last_reward_date || new Date(),
    };

    // Cache for 5 minutes
    await this.redis.setEx(cacheKey, 300, JSON.stringify(stats));

    return stats;
  }

  /**
   * Get active reward pools
   */
  async getActiveRewardPools(): Promise<RewardPool[]> {
    const result = await this.db.query(
      `SELECT * FROM reward_pools WHERE is_active = true ORDER BY source`
    );

    return result.rows.map(this.mapRowToPool);
  }

  /**
   * Get user multipliers
   */
  async getUserMultipliers(userId: string): Promise<RewardMultipliers> {
    const [reputationScore, accountAgeDays, stakedAmount, monthlyVolume] = await Promise.all([
      this.getReputationScore(userId),
      this.getAccountAge(userId),
      this.getStakedAmount(userId),
      this.getMonthlyVolume(userId),
    ]);

    return {
      reputationMultiplier: 1.0 + reputationScore / 1000,
      loyaltyMultiplier: 1.0 + Math.log10(accountAgeDays + 1) / Math.log10(731) * 0.5,
      stakingMultiplier: stakedAmount > 0
        ? 1.0 + Math.log10(stakedAmount + 1) / Math.log10(100001) * 0.3
        : 1.0,
      volumeMultiplier: 1.0 + Math.min(50000, monthlyVolume) / 50000 * 0.2,
    };
  }

  // Helper methods
  private async getReputationScore(userId: string): Promise<number> {
    // Call reputation service
    try {
      const response = await fetch(
        `${process.env.REPUTATION_SERVICE_URL}/api/v1/reputation/${userId}`
      );
      const data = await response.json();
      return data.data?.overallScore || 0;
    } catch (error) {
      logger.warn('Failed to get reputation score', { userId, error });
      return 0;
    }
  }

  private async getAccountAge(userId: string): Promise<number> {
    const result = await this.db.query(
      `SELECT EXTRACT(DAY FROM NOW() - created_at) as age_days 
       FROM users WHERE user_id = $1`,
      [userId]
    );
    return parseFloat(result.rows[0]?.age_days || 0);
  }

  private async getStakedAmount(userId: string): Promise<number> {
    const result = await this.db.query(
      `SELECT SUM(amount) as total FROM reputation_stakes 
       WHERE user_id = $1 AND locked_until > NOW()`,
      [userId]
    );
    return parseFloat(result.rows[0]?.total || 0);
  }

  private async getMonthlyVolume(userId: string): Promise<number> {
    const result = await this.db.query(
      `SELECT SUM(final_amount) as volume FROM rewards 
       WHERE user_id = $1 AND calculated_at > NOW() - INTERVAL '30 days'`,
      [userId]
    );
    return parseFloat(result.rows[0]?.volume || 0);
  }

  private async storeReward(reward: RewardCalculationResult): Promise<void> {
    await this.db.query(
      `INSERT INTO rewards (
        reward_id, user_id, source, base_amount,
        reputation_multiplier, loyalty_multiplier, staking_multiplier, volume_multiplier,
        total_multiplier, final_amount, status, metadata, calculated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        reward.rewardId,
        reward.userId,
        reward.source,
        reward.baseAmount,
        reward.multipliers.reputationMultiplier,
        reward.multipliers.loyaltyMultiplier,
        reward.multipliers.stakingMultiplier,
        reward.multipliers.volumeMultiplier,
        reward.totalMultiplier,
        reward.finalAmount,
        reward.status,
        JSON.stringify(reward.metadata),
        reward.calculatedAt,
      ]
    );
  }

  private async createLedgerTransaction(userId: string, amount: number): Promise<string> {
    // Call ledger service to create transaction
    const response = await fetch(`${process.env.LEDGER_SERVICE_URL}/api/v1/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        amount,
        type: 'CREDIT',
        description: 'Reward claim',
      }),
    });
    const data = await response.json();
    return data.transactionId;
  }

  private mapRowToReward(row: any): RewardCalculationResult {
    return {
      rewardId: row.reward_id,
      userId: row.user_id,
      source: row.source,
      baseAmount: parseFloat(row.base_amount),
      multipliers: {
        reputationMultiplier: parseFloat(row.reputation_multiplier),
        loyaltyMultiplier: parseFloat(row.loyalty_multiplier),
        stakingMultiplier: parseFloat(row.staking_multiplier),
        volumeMultiplier: parseFloat(row.volume_multiplier),
      },
      totalMultiplier: parseFloat(row.total_multiplier),
      finalAmount: parseFloat(row.final_amount),
      status: row.status as RewardStatus,
      metadata: row.metadata,
      calculatedAt: row.calculated_at,
    };
  }

  private mapRowToPool(row: any): RewardPool {
    return {
      poolId: row.pool_id,
      source: row.source,
      totalAllocated: parseFloat(row.total_allocated),
      totalDistributed: parseFloat(row.total_distributed),
      remaining: parseFloat(row.remaining),
      startDate: row.start_date,
      endDate: row.end_date,
      isActive: row.is_active,
    };
  }
}
