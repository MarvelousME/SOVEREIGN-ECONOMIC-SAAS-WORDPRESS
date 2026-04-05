import { Request, Response } from 'express';
import { RewardsService } from '../../domain/services/RewardsService';
import { RewardSource } from '../../domain/types';
import { logger } from '../../infrastructure/logger';

export class RewardsController {
  private rewardsService: RewardsService;

  constructor() {
    this.rewardsService = new RewardsService();
  }

  /**
   * POST /api/v1/rewards/calculate
   * Calculate reward for an action
   */
  async calculateReward(req: Request, res: Response): Promise<void> {
    try {
      const { userId, source, baseAmount, metadata } = req.body;

      const reward = await this.rewardsService.calculateReward({
        userId,
        source: source as RewardSource,
        baseAmount: parseFloat(baseAmount),
        metadata,
        timestamp: new Date(),
      });

      logger.info('Reward calculated', { rewardId: reward.rewardId, userId });

      res.status(200).json({
        success: true,
        data: reward,
      });
    } catch (error) {
      logger.error('Error calculating reward', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to calculate reward',
      });
    }
  }

  /**
   * GET /api/v1/rewards/history
   * Get user reward history
   */
  async getRewardHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.query.userId as string || (req as any).user?.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const source = req.query.source as RewardSource | undefined;

      const history = await this.rewardsService.getRewardHistory(
        userId,
        limit,
        offset,
        source
      );

      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      logger.error('Error fetching reward history', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch reward history',
      });
    }
  }

  /**
   * GET /api/v1/rewards/pending
   * Get pending rewards for user
   */
  async getPendingRewards(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      const pending = await this.rewardsService.getPendingRewards(userId);

      res.status(200).json({
        success: true,
        data: pending,
      });
    } catch (error) {
      logger.error('Error fetching pending rewards', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch pending rewards',
      });
    }
  }

  /**
   * POST /api/v1/rewards/claim
   * Claim rewards
   */
  async claimRewards(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { rewardIds } = req.body;

      const result = await this.rewardsService.claimRewards(userId, rewardIds);

      logger.info('Rewards claimed', { userId, count: rewardIds.length });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error claiming rewards', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to claim rewards',
      });
    }
  }

  /**
   * GET /api/v1/rewards/stats
   * Get aggregate reward statistics
   */
  async getRewardStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.query.userId as string || (req as any).user?.id;

      const stats = await this.rewardsService.getRewardStats(userId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error fetching reward stats', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch reward stats',
      });
    }
  }

  /**
   * GET /api/v1/rewards/pools
   * Get active reward pools
   */
  async getRewardPools(req: Request, res: Response): Promise<void> {
    try {
      const pools = await this.rewardsService.getActiveRewardPools();

      res.status(200).json({
        success: true,
        data: pools,
      });
    } catch (error) {
      logger.error('Error fetching reward pools', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch reward pools',
      });
    }
  }

  /**
   * GET /api/v1/rewards/multipliers/:userId
   * Get user multipliers
   */
  async getUserMultipliers(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const multipliers = await this.rewardsService.getUserMultipliers(userId);

      res.status(200).json({
        success: true,
        data: multipliers,
      });
    } catch (error) {
      logger.error('Error fetching user multipliers', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user multipliers',
      });
    }
  }
}
