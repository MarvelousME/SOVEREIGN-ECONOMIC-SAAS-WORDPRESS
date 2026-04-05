import { Request, Response } from 'express';
import { ReputationService } from '../../domain/services/ReputationService';
import { logger } from '../../infrastructure/logger';

export class ReputationController {
  private reputationService: ReputationService;

  constructor() {
    this.reputationService = new ReputationService();
  }

  /**
   * GET /api/v1/reputation/:userId
   */
  async getReputation(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const reputation = await this.reputationService.getReputation(userId);

      res.status(200).json({
        success: true,
        data: reputation,
      });
    } catch (error) {
      logger.error('Error fetching reputation', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch reputation',
      });
    }
  }

  /**
   * GET /api/v1/reputation/:userId/skills
   */
  async getUserSkills(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const skills = await this.reputationService.getUserSkills(userId);

      res.status(200).json({
        success: true,
        data: skills,
      });
    } catch (error) {
      logger.error('Error fetching user skills', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user skills',
      });
    }
  }

  /**
   * POST /api/v1/reputation/validate-skill
   */
  async validateSkill(req: Request, res: Response): Promise<void> {
    try {
      const validatorId = (req as any).user?.id;
      const { userId, skillId } = req.body;

      const result = await this.reputationService.validateSkill(
        userId,
        skillId,
        validatorId
      );

      logger.info('Skill validated', { userId, skillId, validatorId });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error validating skill', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to validate skill',
      });
    }
  }

  /**
   * GET /api/v1/reputation/leaderboard
   */
  async getLeaderboard(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      const leaderboard = await this.reputationService.getLeaderboard(limit, offset);

      res.status(200).json({
        success: true,
        data: leaderboard,
      });
    } catch (error) {
      logger.error('Error fetching leaderboard', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch leaderboard',
      });
    }
  }

  /**
   * GET /api/v1/reputation/:userId/history
   */
  async getReputationHistory(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      const history = await this.reputationService.getReputationHistory(userId, limit);

      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      logger.error('Error fetching reputation history', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch reputation history',
      });
    }
  }

  /**
   * GET /api/v1/reputation/:userId/achievements
   */
  async getUserAchievements(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const achievements = await this.reputationService.getUserAchievements(userId);

      res.status(200).json({
        success: true,
        data: achievements,
      });
    } catch (error) {
      logger.error('Error fetching user achievements', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user achievements',
      });
    }
  }

  /**
   * POST /api/v1/reputation/endorse
   */
  async endorseUser(req: Request, res: Response): Promise<void> {
    try {
      const endorserId = (req as any).user?.id;
      const { endorseeId, skillId, message } = req.body;

      const endorsement = await this.reputationService.endorseUser(
        endorserId,
        endorseeId,
        skillId,
        message
      );

      logger.info('User endorsed', { endorserId, endorseeId, skillId });

      res.status(200).json({
        success: true,
        data: endorsement,
      });
    } catch (error) {
      logger.error('Error endorsing user', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to endorse user',
      });
    }
  }

  /**
   * GET /api/v1/reputation/:userId/benefits
   */
  async getReputationBenefits(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const benefits = await this.reputationService.getReputationBenefits(userId);

      res.status(200).json({
        success: true,
        data: benefits,
      });
    } catch (error) {
      logger.error('Error fetching reputation benefits', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch reputation benefits',
      });
    }
  }

  /**
   * POST /api/v1/reputation/recalculate/:userId
   */
  async recalculateReputation(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const newReputation = await this.reputationService.recalculateReputation(userId);

      logger.info('Reputation recalculated', { userId });

      res.status(200).json({
        success: true,
        data: newReputation,
      });
    } catch (error) {
      logger.error('Error recalculating reputation', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to recalculate reputation',
      });
    }
  }

  /**
   * GET /api/v1/reputation/:userId/fraud-alerts
   */
  async getFraudAlerts(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const alerts = await this.reputationService.getFraudAlerts(userId);

      res.status(200).json({
        success: true,
        data: alerts,
      });
    } catch (error) {
      logger.error('Error fetching fraud alerts', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch fraud alerts',
      });
    }
  }
}
