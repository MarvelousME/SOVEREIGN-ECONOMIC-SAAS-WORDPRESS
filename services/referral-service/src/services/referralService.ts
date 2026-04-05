import { v4 as uuidv4 } from 'uuid';
import { 
  Referral, 
  ReferralStatus, 
  ReferralStats,
  ReferralTree,
  RewardStatus,
  TierConfig,
  DEFAULT_TIER_CONFIG 
} from '../types';
import ReferralModel from '../models/referralModel';
import RewardModel from '../models/rewardModel';
import FraudDetectionService from './fraudDetection';
import { generateReferralCode } from '../utils/referralCode';
import { config } from '../config';
import logger from '../utils/logger';

export class ReferralService {
  private referralModel: ReferralModel;
  private rewardModel: RewardModel;
  private fraudService: FraudDetectionService;
  private tierConfig: TierConfig[];

  constructor() {
    this.referralModel = new ReferralModel();
    this.rewardModel = new RewardModel();
    this.fraudService = new FraudDetectionService();
    this.tierConfig = this.initializeTierConfig();
  }

  private initializeTierConfig(): TierConfig[] {
    return [
      { tier: 1, percentage: config.tiers.tier1Percentage, maxRewardPerReferee: config.rewards.maxRewardPerReferee },
      { tier: 2, percentage: config.tiers.tier2Percentage, maxRewardPerReferee: config.rewards.maxRewardPerReferee * 0.5 },
      { tier: 3, percentage: config.tiers.tier3Percentage, maxRewardPerReferee: config.rewards.maxRewardPerReferee * 0.3 },
      { tier: 4, percentage: config.tiers.tier4Percentage, maxRewardPerReferee: config.rewards.maxRewardPerReferee * 0.2 },
      { tier: 5, percentage: config.tiers.tier5Percentage, maxRewardPerReferee: config.rewards.maxRewardPerReferee * 0.1 },
    ];
  }

  async getUserReferralCode(userId: string): Promise<string> {
    const existingReferral = await this.referralModel.findByUserId(userId);
    
    if (existingReferral) {
      return existingReferral.referralCode;
    }

    // Generate new referral code
    let referralCode: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      referralCode = generateReferralCode();
      const existing = await this.referralModel.findByReferralCode(referralCode);
      
      if (!existing) {
        break;
      }

      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique referral code');
    }

    // Create referral record
    await this.referralModel.create({
      userId,
      referralCode,
      referrerId: null,
      tier: 0,
      ipAddress: '0.0.0.0',
      deviceFingerprint: 'system',
      userAgent: 'system',
      status: ReferralStatus.ACTIVE,
      fraudScore: 0,
    });

    return referralCode;
  }

  async registerReferral(data: {
    userId: string;
    referralCode: string;
    ipAddress: string;
    deviceFingerprint: string;
    userAgent: string;
  }): Promise<Referral> {
    // Find the referrer
    const referrer = await this.referralModel.findByReferralCode(data.referralCode);
    
    if (!referrer) {
      throw new Error('Invalid referral code');
    }

    if (referrer.userId === data.userId) {
      throw new Error('Cannot refer yourself');
    }

    // Check if user already has a referral
    const existingReferral = await this.referralModel.findByUserId(data.userId);
    if (existingReferral && existingReferral.referrerId) {
      throw new Error('User already has a referrer');
    }

    // Run fraud detection
    const fraudAnalysis = await this.fraudService.analyzeReferral({
      userId: data.userId,
      ipAddress: data.ipAddress,
      deviceFingerprint: data.deviceFingerprint,
      referrerId: referrer.userId,
    });

    // Determine status based on fraud analysis
    let status = ReferralStatus.ACTIVE;
    if (fraudAnalysis.shouldBlock) {
      status = ReferralStatus.BLOCKED;
    } else if (fraudAnalysis.isSuspicious) {
      status = ReferralStatus.SUSPICIOUS;
    }

    // Calculate tier (referrer's tier + 1)
    const tier = Math.min(referrer.tier + 1, config.referral.maxTiers);

    // Generate referral code for new user
    const newUserCode = await this.getUserReferralCode(data.userId);

    // Create or update referral
    if (existingReferral) {
      // Update existing referral with referrer info
      await this.referralModel.updateStatus(data.userId, status);
      const updated = await this.referralModel.findByUserId(data.userId);
      return updated!;
    } else {
      return await this.referralModel.create({
        userId: data.userId,
        referralCode: newUserCode,
        referrerId: referrer.userId,
        tier,
        ipAddress: data.ipAddress,
        deviceFingerprint: data.deviceFingerprint,
        userAgent: data.userAgent,
        status,
        fraudScore: fraudAnalysis.score,
      });
    }
  }

  async calculateReward(data: {
    refereeId: string;
    amount: number;
    currency: string;
    source: string;
    sourceId: string;
  }): Promise<void> {
    const referee = await this.referralModel.findByUserId(data.refereeId);
    
    if (!referee || !referee.referrerId) {
      logger.debug('No referrer found for user', { userId: data.refereeId });
      return;
    }

    if (referee.status === ReferralStatus.BLOCKED) {
      logger.warn('Blocked referral, skipping reward', { userId: data.refereeId });
      return;
    }

    // Calculate rewards for up to 5 tiers
    let currentReferrerId: string | null = referee.referrerId;
    let currentTier = 1;

    while (currentReferrerId && currentTier <= config.referral.maxTiers) {
      const referrer = await this.referralModel.findByUserId(currentReferrerId);
      
      if (!referrer) {
        break;
      }

      // Get tier configuration
      const tierCfg = this.tierConfig.find(t => t.tier === currentTier);
      if (!tierCfg) {
        break;
      }

      // Calculate reward amount (percentage in basis points)
      const rewardAmount = (data.amount * tierCfg.percentage) / 10000;

      // Check max reward per referee
      const totalFromReferee = await this.rewardModel.getTotalByReferee(data.refereeId, referrer.userId);
      
      if (totalFromReferee + rewardAmount > tierCfg.maxRewardPerReferee) {
        logger.info('Max reward per referee reached', {
          referrerId: referrer.userId,
          refereeId: data.refereeId,
          tier: currentTier,
        });
        break;
      }

      // Create reward
      await this.rewardModel.create({
        referrerId: referrer.userId,
        refereeId: data.refereeId,
        tier: currentTier,
        amount: rewardAmount,
        currency: data.currency,
        source: data.source,
        sourceId: data.sourceId,
        status: RewardStatus.PENDING,
      });

      logger.info('Reward calculated', {
        referrerId: referrer.userId,
        refereeId: data.refereeId,
        tier: currentTier,
        amount: rewardAmount,
      });

      // Move up the referral chain
      currentReferrerId = referrer.referrerId;
      currentTier++;
    }
  }

  async getReferralStats(userId: string): Promise<ReferralStats> {
    const referral = await this.referralModel.findByUserId(userId);
    
    if (!referral) {
      throw new Error('Referral not found');
    }

    const totalReferrals = await this.referralModel.countByReferrerId(userId);
    const activeReferrals = await this.referralModel.countByReferrerId(userId, ReferralStatus.ACTIVE);
    const suspiciousReferrals = await this.referralModel.countByReferrerId(userId, ReferralStatus.SUSPICIOUS);
    const blockedReferrals = await this.referralModel.countByReferrerId(userId, ReferralStatus.BLOCKED);
    const referralsByTier = await this.referralModel.countByTier(userId);

    const totalEarnings = await this.rewardModel.getTotalEarnings(userId);
    const pendingEarnings = await this.rewardModel.getTotalEarnings(userId, RewardStatus.PENDING);
    const distributedEarnings = await this.rewardModel.getTotalEarnings(userId, RewardStatus.DISTRIBUTED);

    const conversionRate = totalReferrals > 0 ? (activeReferrals / totalReferrals) * 100 : 0;

    const allReferrals = await this.referralModel.findByReferrerId(userId, 1);
    const lastReferralAt = allReferrals.length > 0 ? allReferrals[0].createdAt : null;

    return {
      userId,
      referralCode: referral.referralCode,
      totalReferrals,
      activeReferrals,
      suspiciousReferrals,
      blockedReferrals,
      referralsByTier,
      totalEarnings,
      pendingEarnings,
      distributedEarnings,
      conversionRate,
      lastReferralAt,
    };
  }

  async getReferralTree(userId: string): Promise<ReferralTree> {
    const referral = await this.referralModel.findByUserId(userId);
    
    if (!referral) {
      throw new Error('Referral not found');
    }

    const treeData = await this.referralModel.getReferralTree(userId);
    
    // Build tree structure
    return this.buildTreeStructure(referral, treeData);
  }

  private async buildTreeStructure(referral: Referral, treeData: any[]): Promise<ReferralTree> {
    const children = treeData.filter(node => node.referrer_id === referral.userId);
    
    const childTrees = await Promise.all(
      children.map(async child => {
        const childReferral: Referral = {
          id: child.id,
          userId: child.user_id,
          referralCode: child.referral_code,
          referrerId: child.referrer_id,
          tier: child.tier,
          registeredAt: new Date(),
          ipAddress: '',
          deviceFingerprint: '',
          userAgent: '',
          status: child.status,
          fraudScore: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        return this.buildTreeStructure(childReferral, treeData);
      })
    );

    const stats = await this.getReferralStats(referral.userId);

    return {
      user: {
        id: referral.userId,
        referralCode: referral.referralCode,
      },
      tier: referral.tier,
      children: childTrees,
      stats: {
        totalReferrals: stats.totalReferrals,
        activeReferrals: stats.activeReferrals,
        totalEarnings: stats.totalEarnings,
      },
    };
  }

  async getLeaderboard(limit: number = 100): Promise<any[]> {
    const query = `
      SELECT 
        r.user_id,
        r.referral_code,
        COUNT(ref.id) as total_referrals,
        COUNT(CASE WHEN ref.status = 'active' THEN 1 END) as active_referrals,
        COUNT(CASE WHEN ref.tier = 1 THEN 1 END) as tier1_referrals,
        COALESCE(SUM(rw.amount), 0) as total_earnings
      FROM referrals r
      LEFT JOIN referrals ref ON ref.referrer_id = r.user_id
      LEFT JOIN referral_rewards rw ON rw.referrer_id = r.user_id
      GROUP BY r.user_id, r.referral_code
      HAVING COUNT(ref.id) > 0
      ORDER BY total_earnings DESC, total_referrals DESC
      LIMIT $1
    `;

    try {
      const result = await this.referralModel['db'].query(query, [limit]);
      
      return result.rows.map((row, index) => ({
        rank: index + 1,
        userId: row.user_id,
        referralCode: row.referral_code,
        totalReferrals: parseInt(row.total_referrals, 10),
        activeReferrals: parseInt(row.active_referrals, 10),
        tier1Referrals: parseInt(row.tier1_referrals, 10),
        totalEarnings: parseFloat(row.total_earnings),
      }));
    } catch (error) {
      logger.error('Error getting leaderboard', { error });
      throw error;
    }
  }
}

export default ReferralService;
