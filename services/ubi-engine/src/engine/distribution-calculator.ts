import { db } from '../database';
import { config } from '../config';
import { logger } from '../utils/logger';
import { eligibilityScorer, UserEligibility } from './eligibility-scorer';

export interface DistributionResult {
  userId: string;
  baseAmount: number;
  activityBonus: number;
  contributionBonus: number;
  reputationMultiplier: number;
  totalAmount: number;
  vestedAmount: number;
  unvestedAmount: number;
  vestingCompleteAt: Date;
}

export interface DistributionParams {
  poolId: string;
  tenantId: string;
  totalAmount: number;
  distributionDate: Date;
}

export class DistributionCalculator {
  /**
   * Calculate distribution for all eligible users
   */
  async calculateDistribution(
    params: DistributionParams
  ): Promise<DistributionResult[]> {
    logger.info('Starting distribution calculation', {
      poolId: params.poolId,
      totalAmount: params.totalAmount
    });

    // Get all active users for tenant
    const activeUsers = await this.getActiveUsers(params.tenantId);
    
    if (activeUsers.length === 0) {
      logger.warn('No active users found for distribution', {
        tenantId: params.tenantId
      });
      return [];
    }

    // Calculate eligibility for all users
    const eligibilities = await eligibilityScorer.batchCalculateEligibility(
      activeUsers,
      params.tenantId,
      params.poolId
    );

    // Filter eligible users only
    const eligibleUsers = eligibilities.filter(e => e.isEligible);
    
    if (eligibleUsers.length === 0) {
      logger.warn('No eligible users found for distribution', {
        tenantId: params.tenantId,
        totalUsers: activeUsers.length
      });
      return [];
    }

    logger.info('Eligible users found', { count: eligibleUsers.length });

    // Calculate distribution amounts using hybrid algorithm
    const distributions = await this.applyHybridAlgorithm(
      eligibleUsers,
      params.totalAmount
    );

    // Apply vesting schedule
    const vestedDistributions = this.applyVesting(
      distributions,
      params.distributionDate
    );

    logger.info('Distribution calculation complete', {
      totalDistributed: vestedDistributions.reduce((sum, d) => sum + d.totalAmount, 0),
      recipientCount: vestedDistributions.length
    });

    return vestedDistributions;
  }

  /**
   * Get active users for a tenant
   */
  private async getActiveUsers(tenantId: string): Promise<string[]> {
    const query = `
      SELECT DISTINCT user_id
      FROM activity_events
      WHERE tenant_id = $1
        AND occurred_at > NOW() - INTERVAL '60 days'
    `;

    const result = await db.query<{ user_id: string }>(query, [tenantId]);
    return result.map(r => r.user_id);
  }

  /**
   * Apply hybrid distribution algorithm
   * Combines equal, activity-weighted, contribution-weighted, and reputation-multiplied approaches
   */
  private async applyHybridAlgorithm(
    eligibleUsers: UserEligibility[],
    totalAmount: number
  ): Promise<DistributionResult[]> {
    const weights = config.weights;
    const maxCapPerUser = config.ubi.maxCapPerUser;
    
    // Calculate total scores for normalization
    const totalActivityScore = eligibleUsers.reduce((sum, u) => sum + u.activityScore, 0);
    const totalContributionScore = eligibleUsers.reduce((sum, u) => sum + u.contributionScore, 0);
    const totalReputationScore = eligibleUsers.reduce((sum, u) => sum + u.reputationScore, 0);

    // Equal distribution base amount
    const equalShare = totalAmount * weights.equal / eligibleUsers.length;

    const distributions: DistributionResult[] = eligibleUsers.map(user => {
      // 1. Equal distribution component
      const baseAmount = equalShare;

      // 2. Activity-weighted bonus
      const activityBonus = totalActivityScore > 0
        ? (user.activityScore / totalActivityScore) * (totalAmount * weights.activity)
        : 0;

      // 3. Contribution-weighted bonus
      const contributionBonus = totalContributionScore > 0
        ? (user.contributionScore / totalContributionScore) * (totalAmount * weights.contribution)
        : 0;

      // 4. Reputation multiplier (applied to total)
      const reputationMultiplier = 1 + (user.reputationScore / 100) * weights.reputation;

      // Calculate total before reputation multiplier
      const subtotal = baseAmount + activityBonus + contributionBonus;

      // Apply reputation multiplier
      let totalAmount = subtotal * reputationMultiplier;

      // Apply maximum cap
      if (totalAmount > maxCapPerUser) {
        logger.debug('Applying max cap to user distribution', {
          userId: user.userId,
          calculated: totalAmount,
          capped: maxCapPerUser
        });
        totalAmount = maxCapPerUser;
      }

      // Round to 2 decimal places
      return {
        userId: user.userId,
        baseAmount: Math.round(baseAmount * 100) / 100,
        activityBonus: Math.round(activityBonus * 100) / 100,
        contributionBonus: Math.round(contributionBonus * 100) / 100,
        reputationMultiplier: Math.round(reputationMultiplier * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        vestedAmount: 0, // Will be calculated in applyVesting
        unvestedAmount: 0,
        vestingCompleteAt: new Date()
      };
    });

    // Normalize if total exceeds pool amount (rare edge case)
    const calculatedTotal = distributions.reduce((sum, d) => sum + d.totalAmount, 0);
    if (calculatedTotal > totalAmount) {
      const normalizationFactor = totalAmount / calculatedTotal;
      distributions.forEach(d => {
        d.totalAmount = Math.round(d.totalAmount * normalizationFactor * 100) / 100;
      });
    }

    return distributions;
  }

  /**
   * Apply vesting schedule to distributions
   */
  private applyVesting(
    distributions: DistributionResult[],
    distributionDate: Date
  ): DistributionResult[] {
    const vestingPeriodDays = config.ubi.vestingPeriodDays;
    
    return distributions.map(dist => {
      // Immediate vesting: 50%
      // Gradual vesting: 50% over vesting period
      const vestedAmount = Math.round(dist.totalAmount * 0.5 * 100) / 100;
      const unvestedAmount = Math.round((dist.totalAmount - vestedAmount) * 100) / 100;
      
      const vestingCompleteAt = new Date(distributionDate);
      vestingCompleteAt.setDate(vestingCompleteAt.getDate() + vestingPeriodDays);

      return {
        ...dist,
        vestedAmount,
        unvestedAmount,
        vestingCompleteAt
      };
    });
  }

  /**
   * Calculate equal distribution (baseline algorithm)
   */
  async calculateEqualDistribution(
    eligibleUsers: UserEligibility[],
    totalAmount: number
  ): Promise<DistributionResult[]> {
    const amountPerUser = totalAmount / eligibleUsers.length;

    return eligibleUsers.map(user => ({
      userId: user.userId,
      baseAmount: amountPerUser,
      activityBonus: 0,
      contributionBonus: 0,
      reputationMultiplier: 1.0,
      totalAmount: amountPerUser,
      vestedAmount: amountPerUser,
      unvestedAmount: 0,
      vestingCompleteAt: new Date()
    }));
  }

  /**
   * Validate distribution results
   */
  validateDistribution(
    distributions: DistributionResult[],
    expectedTotal: number
  ): boolean {
    const actualTotal = distributions.reduce((sum, d) => sum + d.totalAmount, 0);
    const difference = Math.abs(actualTotal - expectedTotal);
    
    // Allow 1% tolerance for rounding errors
    const tolerance = expectedTotal * 0.01;
    
    if (difference > tolerance) {
      logger.error('Distribution validation failed', {
        expected: expectedTotal,
        actual: actualTotal,
        difference
      });
      return false;
    }

    return true;
  }
}

export const distributionCalculator = new DistributionCalculator();
