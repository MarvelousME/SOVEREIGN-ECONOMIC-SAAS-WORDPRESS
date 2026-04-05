import { v4 as uuidv4 } from 'uuid';
import {
  RewardCalculationInput,
  RewardCalculationResult,
  RewardMultipliers,
  RewardSource,
  RewardStatus,
  ReferralReward,
  AgentRevenueShare,
} from './types';

/**
 * Rewards Calculation Engine
 * 
 * Calculates rewards with multiple multipliers:
 * - Reputation Multiplier (1.0 - 2.0)
 * - Loyalty Multiplier (1.0 - 1.5)
 * - Staking Multiplier (1.0 - 1.3)
 * - Volume Multiplier (1.0 - 1.2)
 */
export class RewardsCalculator {
  // Base multiplier ranges
  private static readonly REPUTATION_MAX = 2.0;
  private static readonly LOYALTY_MAX = 1.5;
  private static readonly STAKING_MAX = 1.3;
  private static readonly VOLUME_MAX = 1.2;

  // Referral tier percentages
  private static readonly REFERRAL_TIERS = {
    1: 0.1, // 10% of referee's rewards
    2: 0.05, // 5% of referee's rewards
    3: 0.02, // 2% of referee's rewards
  };

  // Agent marketplace commission
  private static readonly CREATOR_SHARE = 0.7; // 70% to creator
  private static readonly PLATFORM_FEE = 0.3; // 30% platform fee

  /**
   * Calculate reward with all multipliers
   */
  static calculateReward(
    input: RewardCalculationInput,
    reputationScore: number, // 0-1000
    accountAgeDays: number,
    stakedAmount: number,
    monthlyVolume: number
  ): RewardCalculationResult {
    const multipliers = this.calculateMultipliers(
      reputationScore,
      accountAgeDays,
      stakedAmount,
      monthlyVolume
    );

    const totalMultiplier =
      multipliers.reputationMultiplier *
      multipliers.loyaltyMultiplier *
      multipliers.stakingMultiplier *
      multipliers.volumeMultiplier;

    const finalAmount = input.baseAmount * totalMultiplier;

    return {
      rewardId: uuidv4(),
      userId: input.userId,
      source: input.source,
      baseAmount: input.baseAmount,
      multipliers,
      totalMultiplier: Math.round(totalMultiplier * 1000) / 1000, // 3 decimal places
      finalAmount: Math.round(finalAmount * 100) / 100, // 2 decimal places
      status: RewardStatus.CALCULATED,
      metadata: input.metadata,
      calculatedAt: input.timestamp,
    };
  }

  /**
   * Calculate all multipliers
   */
  private static calculateMultipliers(
    reputationScore: number,
    accountAgeDays: number,
    stakedAmount: number,
    monthlyVolume: number
  ): RewardMultipliers {
    return {
      reputationMultiplier: this.calculateReputationMultiplier(reputationScore),
      loyaltyMultiplier: this.calculateLoyaltyMultiplier(accountAgeDays),
      stakingMultiplier: this.calculateStakingMultiplier(stakedAmount),
      volumeMultiplier: this.calculateVolumeMultiplier(monthlyVolume),
    };
  }

  /**
   * Reputation multiplier: 1.0 - 2.0 based on score (0-1000)
   */
  private static calculateReputationMultiplier(score: number): number {
    const normalizedScore = Math.min(1000, Math.max(0, score)) / 1000;
    return 1.0 + normalizedScore * (this.REPUTATION_MAX - 1.0);
  }

  /**
   * Loyalty multiplier: 1.0 - 1.5 based on account age
   * Logarithmic growth: 30 days = 1.1, 90 days = 1.2, 365 days = 1.4, 730+ days = 1.5
   */
  private static calculateLoyaltyMultiplier(accountAgeDays: number): number {
    const maxDays = 730; // 2 years
    const normalizedAge = Math.min(maxDays, accountAgeDays) / maxDays;
    const logarithmicAge = Math.log10(accountAgeDays + 1) / Math.log10(maxDays + 1);
    return 1.0 + logarithmicAge * (this.LOYALTY_MAX - 1.0);
  }

  /**
   * Staking multiplier: 1.0 - 1.3 based on staked tokens
   * Logarithmic growth: 1000 = 1.1, 10000 = 1.2, 100000+ = 1.3
   */
  private static calculateStakingMultiplier(stakedAmount: number): number {
    if (stakedAmount <= 0) return 1.0;
    
    const maxStake = 100000;
    const normalizedStake = Math.log10(stakedAmount + 1) / Math.log10(maxStake + 1);
    return 1.0 + normalizedStake * (this.STAKING_MAX - 1.0);
  }

  /**
   * Volume multiplier: 1.0 - 1.2 based on monthly transaction volume
   */
  private static calculateVolumeMultiplier(monthlyVolume: number): number {
    if (monthlyVolume <= 0) return 1.0;
    
    const maxVolume = 50000;
    const normalizedVolume = Math.min(maxVolume, monthlyVolume) / maxVolume;
    return 1.0 + normalizedVolume * (this.VOLUME_MAX - 1.0);
  }

  /**
   * Calculate referral rewards for multi-tier system
   */
  static calculateReferralRewards(
    refereeId: string,
    refereeRewardAmount: number,
    referralChain: Array<{ userId: string; tier: number }>
  ): ReferralReward[] {
    return referralChain.map((referrer) => {
      const percentage = this.REFERRAL_TIERS[referrer.tier as keyof typeof this.REFERRAL_TIERS] || 0;
      return {
        referrerId: referrer.userId,
        refereeId,
        tier: referrer.tier,
        percentage,
        amount: Math.round(refereeRewardAmount * percentage * 100) / 100,
      };
    });
  }

  /**
   * Calculate agent marketplace revenue share
   */
  static calculateAgentRevenue(
    agentId: string,
    creatorId: string,
    saleAmount: number
  ): AgentRevenueShare {
    const creatorReward = Math.round(saleAmount * this.CREATOR_SHARE * 100) / 100;
    
    return {
      agentId,
      creatorId,
      saleAmount,
      creatorSharePercentage: this.CREATOR_SHARE * 100,
      platformFeePercentage: this.PLATFORM_FEE * 100,
      creatorReward,
    };
  }

  /**
   * Calculate task completion reward with quality bonus
   */
  static calculateTaskReward(
    baseReward: number,
    qualityRating: number, // 0-100
    complexity: number, // 1-5
    urgency: boolean
  ): number {
    let reward = baseReward;
    
    // Quality bonus: up to 50% extra
    const qualityBonus = (qualityRating / 100) * 0.5;
    reward *= 1 + qualityBonus;
    
    // Complexity multiplier
    reward *= 1 + (complexity - 1) * 0.1;
    
    // Urgency bonus: 20% extra
    if (urgency) {
      reward *= 1.2;
    }
    
    return Math.round(reward * 100) / 100;
  }

  /**
   * Calculate staking rewards (APY-based)
   */
  static calculateStakingReward(
    stakedAmount: number,
    daysStaked: number,
    baseAPY: number, // percentage
    reputationBonus: number // 0-1000 score
  ): number {
    // Reputation adds up to 5% to APY
    const bonusAPY = (reputationBonus / 1000) * 5;
    const totalAPY = baseAPY + bonusAPY;
    
    // Daily reward calculation
    const dailyRate = totalAPY / 100 / 365;
    const reward = stakedAmount * dailyRate * daysStaked;
    
    return Math.round(reward * 100) / 100;
  }

  /**
   * Calculate loyalty bonus based on consecutive activity
   */
  static calculateLoyaltyBonus(
    consecutiveDays: number,
    totalTasksCompleted: number
  ): number {
    let bonus = 0;
    
    // Streak bonus: 5 tokens per consecutive day, capped at 500
    bonus += Math.min(500, consecutiveDays * 5);
    
    // Milestone bonuses
    if (consecutiveDays >= 30) bonus += 100;
    if (consecutiveDays >= 90) bonus += 300;
    if (consecutiveDays >= 180) bonus += 600;
    if (consecutiveDays >= 365) bonus += 1000;
    
    // Volume bonus: based on total tasks
    if (totalTasksCompleted >= 100) bonus += 200;
    if (totalTasksCompleted >= 500) bonus += 500;
    if (totalTasksCompleted >= 1000) bonus += 1000;
    
    return bonus;
  }

  /**
   * Calculate data monetization reward
   */
  static calculateDataReward(
    dataPoints: number,
    dataQuality: number, // 0-100
    marketDemand: number // 0-100
  ): number {
    const baseRewardPerPoint = 0.01; // $0.01 per data point
    
    let reward = dataPoints * baseRewardPerPoint;
    
    // Quality multiplier: 0.5x - 1.5x
    const qualityMultiplier = 0.5 + (dataQuality / 100);
    reward *= qualityMultiplier;
    
    // Demand multiplier: 1.0x - 2.0x
    const demandMultiplier = 1.0 + (marketDemand / 100);
    reward *= demandMultiplier;
    
    return Math.round(reward * 100) / 100;
  }
}
