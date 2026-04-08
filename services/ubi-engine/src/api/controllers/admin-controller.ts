import { Request, Response } from 'express';
import { db } from '../../database';
import { logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { Client } from '@temporalio/client';
import { config } from '../../config';

export class AdminController {
  /**
   * POST /api/v1/ubi/pool (admin)
   * Create or update UBI pool configuration
   */
  async configurePool(req: Request, res: Response): Promise<void> {
    try {
      const {
        tenantId,
        totalAmount,
        distributionInterval,
        weights,
        minParticipationScore,
        maxCapPerUser,
        activityDecayDays,
        vestingPeriodDays
      } = req.body;

      if (!tenantId || !totalAmount) {
        res.status(400).json({ error: 'tenantId and totalAmount are required' });
        return;
      }

      const poolId = uuidv4();

      await db.transaction(async (client) => {
        // Create pool
        await client.query(
          `INSERT INTO ubi_pools (
            id, tenant_id, total_amount, remaining_amount, distribution_interval
          ) VALUES ($1, $2, $3, $3, $4)`,
          [poolId, tenantId, totalAmount, distributionInterval || 'daily']
        );

        // Create distribution rules
        await client.query(
          `INSERT INTO distribution_rules (
            pool_id, weight_equal, weight_activity, weight_contribution,
            weight_reputation, min_participation_score, max_cap_per_user,
            activity_decay_days, vesting_period_days
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            poolId,
            weights?.equal || 0.4,
            weights?.activity || 0.3,
            weights?.contribution || 0.2,
            weights?.reputation || 0.1,
            minParticipationScore || 10,
            maxCapPerUser || 1000,
            activityDecayDays || 30,
            vestingPeriodDays || 7
          ]
        );
      });

      res.json({
        success: true,
        poolId,
        message: 'Pool configured successfully'
      });
    } catch (error) {
      logger.error('Error configuring pool', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /api/v1/ubi/distribute (admin)
   * Manually trigger distribution
   */
  async triggerDistribution(req: Request, res: Response): Promise<void> {
    try {
      const { poolId, tenantId, dryRun } = req.body;

      if (!poolId || !tenantId) {
        res.status(400).json({ error: 'poolId and tenantId are required' });
        return;
      }

      const pools = await db.query<{ id: string }>(
        'SELECT id FROM ubi_pools WHERE id = $1 AND tenant_id = $2',
        [poolId, tenantId]
      );

      if (pools.length === 0) {
        res.status(404).json({ error: 'Pool not found for tenant' });
        return;
      }

      const distributionId = uuidv4();

      // Schedule distribution via Temporal (worker: @ubi-cms/workflows, ubiDistributionWorkflow)
      const client = new Client({
        connection: {
          address: config.temporal.address,
        },
        namespace: config.temporal.namespace,
      });

      const handle = await client.workflow.start('ubiDistributionWorkflow', {
        taskQueue: config.temporal.taskQueue,
        args: [
          {
            distributionId,
            dryRun: dryRun === true,
            tenantId,
            poolId,
          },
        ],
        workflowId: `distribution-${distributionId}`,
      });

      logger.info('Distribution workflow started', {
        workflowId: handle.workflowId,
        poolId,
        distributionId,
      });

      res.json({
        success: true,
        workflowId: handle.workflowId,
        distributionId,
        message: 'Distribution triggered successfully',
      });
    } catch (error) {
      logger.error('Error triggering distribution', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /api/v1/ubi/admin/distributions
   * Get all distributions for admin
   */
  async getAllDistributions(req: Request, res: Response): Promise<void> {
    try {
      const poolId = req.query.poolId as string;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const query = `
        SELECT 
          id,
          pool_id,
          distribution_date,
          total_distributed,
          eligible_users_count,
          status,
          started_at,
          completed_at,
          error_message
        FROM distribution_history
        ${poolId ? 'WHERE pool_id = $1' : ''}
        ORDER BY distribution_date DESC
        LIMIT $${poolId ? '2' : '1'} OFFSET $${poolId ? '3' : '2'}
      `;

      const params = poolId ? [poolId, limit, offset] : [limit, offset];
      const result = await db.query(query, params);

      const distributions = result.map(row => ({
        id: row.id,
        poolId: row.pool_id,
        distributionDate: row.distribution_date,
        totalDistributed: parseFloat(row.total_distributed),
        eligibleUsersCount: row.eligible_users_count,
        status: row.status,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        errorMessage: row.error_message
      }));

      res.json({ distributions });
    } catch (error) {
      logger.error('Error fetching distributions', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * PUT /api/v1/ubi/admin/pool/:poolId
   * Update pool settings
   */
  async updatePool(req: Request, res: Response): Promise<void> {
    try {
      const { poolId } = req.params;
      const { totalAmount, isActive } = req.body;

      const updates: string[] = [];
      const params: any[] = [];
      let paramCount = 1;

      if (totalAmount !== undefined) {
        updates.push(`total_amount = $${paramCount}`);
        params.push(totalAmount);
        paramCount++;
      }

      if (isActive !== undefined) {
        updates.push(`is_active = $${paramCount}`);
        params.push(isActive);
        paramCount++;
      }

      if (updates.length === 0) {
        res.status(400).json({ error: 'No updates provided' });
        return;
      }

      params.push(poolId);

      await db.query(
        `UPDATE ubi_pools
         SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id = $${paramCount}`,
        params
      );

      res.json({
        success: true,
        message: 'Pool updated successfully'
      });
    } catch (error) {
      logger.error('Error updating pool', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const adminController = new AdminController();
