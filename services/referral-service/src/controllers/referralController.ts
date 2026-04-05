import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import ReferralService from '../services/referralService';
import { generateReferralLink } from '../utils/referralCode';
import { generateDeviceFingerprint } from '../utils/deviceFingerprint';
import { PayoutModel, PayoutAuditModel } from '../models/payoutModel';
import RewardModel from '../models/rewardModel';
import TreasuryService from '../services/treasuryService';
import NotificationService from '../services/notificationService';
import { PayoutMethod, PayoutStatus, RewardStatus } from '../types';
import { config } from '../config';
import logger from '../utils/logger';
import db from '../config/database';

export class ReferralController {
  private referralService: ReferralService;
  private payoutModel: PayoutModel;
  private payoutAuditModel: PayoutAuditModel;
  private rewardModel: RewardModel;
  private treasuryService: TreasuryService;
  private notificationService: NotificationService;

  constructor() {
    this.referralService = new ReferralService();
    this.payoutModel = new PayoutModel();
    this.payoutAuditModel = new PayoutAuditModel();
    this.rewardModel = new RewardModel();
    this.treasuryService = new TreasuryService();
    this.notificationService = new NotificationService();
  }

  getMyCode = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id || req.query.userId as string;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const referralCode = await this.referralService.getUserReferralCode(userId);
      const referralLink = generateReferralLink(referralCode);

      res.json({
        success: true,
        data: {
          referralCode,
          referralLink,
        },
      });
    } catch (error) {
      logger.error('Error getting referral code', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  registerWithCode = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, referralCode } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress || '0.0.0.0';
      const userAgent = req.headers['user-agent'] || 'unknown';
      const deviceFingerprint = generateDeviceFingerprint(
        userAgent,
        ipAddress,
        req.headers['accept-language'] as string,
        req.headers['accept-encoding'] as string
      );

      if (!userId || !referralCode) {
        res.status(400).json({ error: 'userId and referralCode are required' });
        return;
      }

      const referral = await this.referralService.registerReferral({
        userId,
        referralCode,
        ipAddress,
        deviceFingerprint,
        userAgent,
      });

      res.json({
        success: true,
        data: referral,
      });
    } catch (error: any) {
      logger.error('Error registering referral', { error });
      
      if (error.message.includes('Invalid referral code')) {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes('already has a referrer') || error.message.includes('Cannot refer yourself')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };

  getStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id || req.query.userId as string;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const stats = await this.referralService.getReferralStats(userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      logger.error('Error getting referral stats', { error });
      
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };

  getTree = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id || req.query.userId as string;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const tree = await this.referralService.getReferralTree(userId);

      res.json({
        success: true,
        data: tree,
      });
    } catch (error: any) {
      logger.error('Error getting referral tree', { error });
      
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };

  getRewards = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id || req.query.userId as string;
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const rewards = await this.rewardModel.findByReferrerId(userId, limit, offset);

      res.json({
        success: true,
        data: rewards,
      });
    } catch (error) {
      logger.error('Error getting rewards', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  getLeaderboard = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const leaderboard = await this.referralService.getLeaderboard(limit);

      res.json({
        success: true,
        data: leaderboard,
      });
    } catch (error) {
      logger.error('Error getting leaderboard', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  requestPayout = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id || req.body.userId;
    const { amount, method, idempotencyKey, destination } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!amount || !method) {
      res.status(400).json({ error: 'amount and method are required' });
      return;
    }

    const finalIdempotencyKey = idempotencyKey || uuidv4();

    try {
      const existingPayout = await this.payoutModel.findByIdempotencyKey(finalIdempotencyKey);
      if (existingPayout) {
        logger.info('Duplicate payout request detected', {
          idempotencyKey: finalIdempotencyKey,
          payoutId: existingPayout.id,
        });

        res.json({
          success: true,
          message: 'Payout request already processed',
          data: existingPayout,
          duplicate: true,
        });
        return;
      }

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        res.status(400).json({ error: 'Invalid amount' });
        return;
      }

      const validMethods = Object.values(PayoutMethod);
      if (!validMethods.includes(method)) {
        res.status(400).json({
          error: `Invalid payout method. Must be one of: ${validMethods.join(', ')}`,
        });
        return;
      }

      if (parsedAmount < config.payout.minimumAmount) {
        res.status(400).json({
          error: `Minimum payout amount is ${config.payout.minimumAmount} ${config.payout.currency}`,
        });
        return;
      }

      if (parsedAmount > config.payout.maximumAmount) {
        res.status(400).json({
          error: `Maximum payout amount is ${config.payout.maximumAmount} ${config.payout.currency}`,
        });
        return;
      }

      const availableBalance = await this.calculateAvailableBalance(userId);
      
      if (parsedAmount > availableBalance) {
        res.status(400).json({
          error: `Insufficient balance. Available: ${availableBalance.toFixed(2)} ${config.payout.currency}`,
        });
        return;
      }

      const pendingTotal = await this.payoutModel.getPendingPayoutsTotal(userId);
      if (parsedAmount + pendingTotal > config.payout.dailyLimit) {
        res.status(400).json({
          error: `Payout would exceed daily limit of ${config.payout.dailyLimit} ${config.payout.currency}`,
        });
        return;
      }

      const payout = await db.transaction(async (_client) => {
        const payoutRecord = await this.payoutModel.create({
          userId,
          amount: parsedAmount,
          currency: config.payout.currency,
          method,
          idempotencyKey: finalIdempotencyKey,
          metadata: { destination },
        });

        await this.payoutAuditModel.create({
          payoutId: payoutRecord.id,
          action: 'PAYOUT_REQUESTED',
          actorId: userId,
          details: {
            amount: parsedAmount,
            currency: config.payout.currency,
            method,
            availableBalance,
            pendingTotal,
          },
        });

        const rewards = await this.rewardModel.findByReferrerId(userId, 1000, 0);
        const pendingRewards = rewards.filter(r => r.status === RewardStatus.PENDING);
        
        for (const reward of pendingRewards) {
          await this.rewardModel.updateStatus(reward.id, RewardStatus.VESTED);
          await this.payoutAuditModel.create({
            payoutId: payoutRecord.id,
            action: 'REWARD_VESTED',
            actorId: userId,
            details: {
              rewardId: reward.id,
              amount: reward.amount,
              previousStatus: RewardStatus.PENDING,
              newStatus: RewardStatus.VESTED,
            },
          });
        }

        return payoutRecord;
      });

      await this.notificationService.notifyPayoutRequested(
        userId,
        payout.id,
        parsedAmount,
        config.payout.currency,
        method
      );

      this.processPayoutAsync(payout.id, userId, parsedAmount, method, destination);

      res.json({
        success: true,
        message: 'Payout request submitted',
        data: {
          id: payout.id,
          userId,
          amount: parsedAmount,
          currency: config.payout.currency,
          method,
          status: PayoutStatus.PENDING,
          requestedAt: payout.requestedAt,
        },
      });
    } catch (error: any) {
      logger.error('Error requesting payout', { error, userId, amount, method });

      if (error.code === '23505') {
        res.status(409).json({
          error: 'Duplicate payout request',
          idempotencyKey: finalIdempotencyKey,
        });
        return;
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  };

  private async processPayoutAsync(
    payoutId: string,
    userId: string,
    amount: number,
    method: PayoutMethod,
    destination?: any
  ): Promise<void> {
    try {
      await this.payoutModel.updateStatus(payoutId, PayoutStatus.PROCESSING);
      
      await this.payoutAuditModel.create({
        payoutId,
        action: 'PAYOUT_PROCESSING_STARTED',
        actorId: 'system',
        details: { startedAt: new Date().toISOString() },
      });

      const treasuryResult = await this.treasuryService.processPayout({
        payoutId,
        userId,
        amount,
        currency: config.payout.currency,
        method,
        destination: destination || {},
      });

      if (treasuryResult.success) {
        await this.payoutModel.updateStatus(payoutId, PayoutStatus.COMPLETED, new Date(), {
          treasuryTransactionId: treasuryResult.treasuryTransactionId,
        });

        await this.payoutAuditModel.create({
          payoutId,
          action: 'PAYOUT_COMPLETED',
          actorId: 'treasury-service',
          details: {
            treasuryTransactionId: treasuryResult.treasuryTransactionId,
            completedAt: new Date().toISOString(),
          },
        });

        await this.notificationService.notifyPayoutCompleted(
          userId,
          payoutId,
          amount,
          config.payout.currency,
          method,
          treasuryResult.treasuryTransactionId!
        );

        logger.info('Payout completed successfully', {
          payoutId,
          treasuryTransactionId: treasuryResult.treasuryTransactionId,
        });
      } else {
        await this.payoutModel.updateStatus(payoutId, PayoutStatus.FAILED, undefined, {
          error: treasuryResult.error,
          errorCode: treasuryResult.errorCode,
        });

        await this.payoutAuditModel.create({
          payoutId,
          action: 'PAYOUT_FAILED',
          actorId: 'treasury-service',
          details: {
            error: treasuryResult.error,
            errorCode: treasuryResult.errorCode,
            failedAt: new Date().toISOString(),
          },
        });

        await this.notificationService.notifyPayoutFailed(
          userId,
          payoutId,
          amount,
          config.payout.currency,
          method,
          treasuryResult.error || 'Unknown error'
        );

        logger.warn('Payout failed', {
          payoutId,
          error: treasuryResult.error,
          errorCode: treasuryResult.errorCode,
        });
      }
    } catch (error: any) {
      logger.error('Error processing payout', { payoutId, error: error.message });

      try {
        await this.payoutModel.updateStatus(payoutId, PayoutStatus.FAILED, undefined, {
          error: error.message,
          errorCode: 'PROCESSING_EXCEPTION',
        });

        await this.payoutAuditModel.create({
          payoutId,
          action: 'PAYOUT_FAILED',
          actorId: 'system',
          details: {
            error: error.message,
            errorCode: 'PROCESSING_EXCEPTION',
            failedAt: new Date().toISOString(),
          },
        });
      } catch (updateError) {
        logger.error('Failed to update payout status after processing error', {
          payoutId,
          error: updateError,
        });
      }
    }
  }

  private async calculateAvailableBalance(userId: string): Promise<number> {
    const totalEarnings = await this.rewardModel.getTotalEarnings(userId);
    const totalPaidOut = await this.payoutModel.getTotalPaidOut(userId);
    const pendingPayouts = await this.payoutModel.getPendingPayoutsTotal(userId);

    return totalEarnings - totalPaidOut - pendingPayouts;
  }

  getPayoutHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id || req.query.userId as string;
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const payouts = await this.payoutModel.findByUserId(userId, limit, offset);

      res.json({
        success: true,
        data: payouts,
      });
    } catch (error) {
      logger.error('Error getting payout history', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  getPayoutAuditLog = async (req: Request, res: Response): Promise<void> => {
    try {
      const { payoutId } = req.query;

      if (!payoutId || typeof payoutId !== 'string') {
        res.status(400).json({ error: 'payoutId is required' });
        return;
      }

      const auditLog = await this.payoutAuditModel.findByPayoutId(payoutId);

      res.json({
        success: true,
        data: auditLog,
      });
    } catch (error) {
      logger.error('Error getting payout audit log', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

export default ReferralController;
