import { Request, Response } from 'express';
import { db } from '../../database';
import { cache } from '../../cache/redis';
import { logger } from '../../utils/logger';
import { eligibilityScorer } from '../../engine/eligibility-scorer';
import { eventPublisher } from '../../events/event-publisher';

export class UBIController {
  /**
   * GET /api/v1/ubi/balance
   * Get user's UBI balance
   */
  async getBalance(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.query.userId as string;
      const tenantId = req.query.tenantId as string;

      if (!userId || !tenantId) {
        res.status(400).json({ error: 'userId and tenantId are required' });
        return;
      }

      const query = `
        SELECT 
          available_balance,
          pending_balance,
          lifetime_earned,
          lifetime_claimed,
          last_distribution_at,
          last_claim_at
        FROM user_ubi_balances
        WHERE user_id = $1 AND tenant_id = $2
      `;

      const result = await db.query(query, [userId, tenantId]);

      if (result.length === 0) {
        res.json({
          availableBalance: 0,
          pendingBalance: 0,
          lifetimeEarned: 0,
          lifetimeClaimed: 0,
          lastDistributionAt: null,
          lastClaimAt: null
        });
        return;
      }

      const balance = result[0];
      res.json({
        availableBalance: parseFloat(balance.available_balance),
        pendingBalance: parseFloat(balance.pending_balance),
        lifetimeEarned: parseFloat(balance.lifetime_earned),
        lifetimeClaimed: parseFloat(balance.lifetime_claimed),
        lastDistributionAt: balance.last_distribution_at,
        lastClaimAt: balance.last_claim_at
      });
    } catch (error) {
      logger.error('Error fetching UBI balance', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /api/v1/ubi/claim
   * Claim pending UBI
   */
  async claimUBI(req: Request, res: Response): Promise<void> {
    try {
      const { userId, tenantId } = req.body;

      if (!userId || !tenantId) {
        res.status(400).json({ error: 'userId and tenantId are required' });
        return;
      }

      // Get pending balance
      const balanceQuery = `
        SELECT id, pending_balance
        FROM user_ubi_balances
        WHERE user_id = $1 AND tenant_id = $2
      `;
      const balances = await db.query<{ id: string; pending_balance: string }>(
        balanceQuery,
        [userId, tenantId]
      );

      if (balances.length === 0 || parseFloat(balances[0].pending_balance) <= 0) {
        res.status(400).json({ error: 'No pending UBI to claim' });
        return;
      }

      const pendingAmount = parseFloat(balances[0].pending_balance);

      // Update balance - move pending to available
      await db.transaction(async (client) => {
        await client.query(
          `UPDATE user_ubi_balances
           SET available_balance = available_balance + pending_balance,
               pending_balance = 0,
               lifetime_claimed = lifetime_claimed + pending_balance,
               last_claim_at = NOW()
           WHERE user_id = $1 AND tenant_id = $2`,
          [userId, tenantId]
        );

        // Mark distributions as claimed
        await client.query(
          `UPDATE user_distributions
           SET claimed = true, claimed_at = NOW()
           WHERE user_id = $1 AND claimed = false`,
          [userId]
        );
      });

      // Publish claim event
      await eventPublisher.publishUBIClaimed({
        userId,
        tenantId,
        amount: pendingAmount,
        distributionId: 'batch', // Could track specific distributions
        claimedAt: new Date()
      });

      res.json({
        success: true,
        claimedAmount: pendingAmount,
        message: 'UBI claimed successfully'
      });
    } catch (error) {
      logger.error('Error claiming UBI', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /api/v1/ubi/history
   * Get distribution history for user
   */
  async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.query.userId as string;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
      }

      const query = `
        SELECT 
          ud.id,
          ud.distribution_id,
          ud.base_amount,
          ud.activity_bonus,
          ud.contribution_bonus,
          ud.reputation_multiplier,
          ud.total_amount,
          ud.vested_amount,
          ud.unvested_amount,
          ud.claimed,
          ud.claimed_at,
          ud.created_at,
          dh.distribution_date
        FROM user_distributions ud
        JOIN distribution_history dh ON ud.distribution_id = dh.id
        WHERE ud.user_id = $1
        ORDER BY ud.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await db.query(query, [userId, limit, offset]);

      const history = result.map(row => ({
        id: row.id,
        distributionId: row.distribution_id,
        baseAmount: parseFloat(row.base_amount),
        activityBonus: parseFloat(row.activity_bonus),
        contributionBonus: parseFloat(row.contribution_bonus),
        reputationMultiplier: parseFloat(row.reputation_multiplier),
        totalAmount: parseFloat(row.total_amount),
        vestedAmount: parseFloat(row.vested_amount),
        unvestedAmount: parseFloat(row.unvested_amount),
        claimed: row.claimed,
        claimedAt: row.claimed_at,
        distributionDate: row.distribution_date,
        createdAt: row.created_at
      }));

      res.json({ history });
    } catch (error) {
      logger.error('Error fetching UBI history', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /api/v1/ubi/eligibility
   * Check user's eligibility status
   */
  async getEligibility(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.query.userId as string;
      const tenantId = req.query.tenantId as string;
      const poolId = req.query.poolId as string;

      if (!userId || !tenantId || !poolId) {
        res.status(400).json({ error: 'userId, tenantId, and poolId are required' });
        return;
      }

      const eligibility = await eligibilityScorer.calculateEligibility(
        userId,
        tenantId,
        poolId
      );

      res.json(eligibility);
    } catch (error) {
      logger.error('Error checking eligibility', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /api/v1/ubi/stats
   * Get pool statistics
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const poolId = req.query.poolId as string;

      if (!poolId) {
        res.status(400).json({ error: 'poolId is required' });
        return;
      }

      // Check cache first
      const cacheKey = `pool:stats:${poolId}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        res.json(cached);
        return;
      }

      const poolQuery = `
        SELECT 
          total_amount,
          distributed_amount,
          remaining_amount,
          distribution_interval,
          created_at
        FROM ubi_pools
        WHERE id = $1
      `;

      const poolResult = await db.query(poolQuery, [poolId]);

      if (poolResult.length === 0) {
        res.status(404).json({ error: 'Pool not found' });
        return;
      }

      const pool = poolResult[0];

      // Get distribution statistics
      const statsQuery = `
        SELECT 
          COUNT(*) as total_distributions,
          SUM(total_distributed) as total_distributed,
          SUM(eligible_users_count) as total_recipients,
          AVG(eligible_users_count) as avg_recipients_per_distribution
        FROM distribution_history
        WHERE pool_id = $1 AND status = 'completed'
      `;

      const statsResult = await db.query(statsQuery, [poolId]);
      const stats = statsResult[0];

      const response = {
        pool: {
          totalAmount: parseFloat(pool.total_amount),
          distributedAmount: parseFloat(pool.distributed_amount),
          remainingAmount: parseFloat(pool.remaining_amount),
          distributionInterval: pool.distribution_interval,
          createdAt: pool.created_at
        },
        distributions: {
          totalDistributions: parseInt(stats.total_distributions),
          totalDistributed: parseFloat(stats.total_distributed || '0'),
          totalRecipients: parseInt(stats.total_recipients || '0'),
          avgRecipientsPerDistribution: parseFloat(stats.avg_recipients_per_distribution || '0')
        }
      };

      // Cache for 5 minutes
      await cache.set(cacheKey, response, 300);

      res.json(response);
    } catch (error) {
      logger.error('Error fetching pool stats', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const ubiController = new UBIController();
