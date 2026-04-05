import { db } from '../database';
import { cache } from '../cache/redis';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface UserEligibility {
  userId: string;
  tenantId: string;
  isEligible: boolean;
  participationScore: number;
  activityScore: number;
  contributionScore: number;
  reputationScore: number;
  totalScore: number;
  accountAgeDays: number;
  flaggedForAbuse: boolean;
  abuseReason?: string;
}

export class EligibilityScorer {
  private cacheKeyPrefix = 'eligibility:';
  private cacheTTL = 3600; // 1 hour

  /**
   * Calculate comprehensive eligibility score for a user
   */
  async calculateEligibility(
    userId: string,
    tenantId: string,
    poolId: string
  ): Promise<UserEligibility> {
    const cacheKey = `${this.cacheKeyPrefix}${userId}:${poolId}`;
    const cached = await cache.get<UserEligibility>(cacheKey);
    
    if (cached) {
      logger.debug('Returning cached eligibility', { userId, poolId });
      return cached;
    }

    // Calculate all score components
    const [
      participationScore,
      activityScore,
      contributionScore,
      reputationScore,
      accountAgeDays,
      abuseCheck
    ] = await Promise.all([
      this.calculateParticipationScore(userId, tenantId),
      this.calculateActivityScore(userId, tenantId),
      this.calculateContributionScore(userId, tenantId),
      this.calculateReputationScore(userId, tenantId),
      this.getAccountAgeDays(userId),
      this.checkForAbuse(userId)
    ]);

    // Calculate total weighted score
    const totalScore = this.calculateTotalScore({
      participationScore,
      activityScore,
      contributionScore,
      reputationScore
    });

    // Determine eligibility
    const isEligible = this.determineEligibility({
      participationScore,
      accountAgeDays,
      flaggedForAbuse: abuseCheck.isFlagged,
      totalScore
    });

    const eligibility: UserEligibility = {
      userId,
      tenantId,
      isEligible,
      participationScore,
      activityScore,
      contributionScore,
      reputationScore,
      totalScore,
      accountAgeDays,
      flaggedForAbuse: abuseCheck.isFlagged,
      abuseReason: abuseCheck.reason
    };

    // Cache the result
    await cache.set(cacheKey, eligibility, this.cacheTTL);

    // Store in database
    await this.storeEligibility(eligibility, poolId);

    return eligibility;
  }

  /**
   * Calculate participation score (activity frequency)
   */
  private async calculateParticipationScore(
    userId: string,
    tenantId: string
  ): Promise<number> {
    const query = `
      SELECT COUNT(*) as activity_count
      FROM activity_events
      WHERE user_id = $1
        AND tenant_id = $2
        AND occurred_at > NOW() - INTERVAL '30 days'
    `;
    
    const result = await db.query<{ activity_count: string }>(query, [userId, tenantId]);
    const activityCount = parseInt(result[0]?.activity_count || '0', 10);

    // Score: 0-100 based on activity frequency
    return Math.min(activityCount * 2, 100);
  }

  /**
   * Calculate activity score with decay factor
   */
  private async calculateActivityScore(
    userId: string,
    tenantId: string
  ): Promise<number> {
    const decayDays = config.ubi.activityDecayDays;
    
    const query = `
      SELECT 
        SUM(
          score_value * 
          EXP(-0.1 * EXTRACT(EPOCH FROM (NOW() - occurred_at)) / 86400)
        ) as weighted_score
      FROM activity_events
      WHERE user_id = $1
        AND tenant_id = $2
        AND occurred_at > NOW() - INTERVAL '${decayDays} days'
    `;
    
    const result = await db.query<{ weighted_score: string }>(query, [userId, tenantId]);
    const score = parseFloat(result[0]?.weighted_score || '0');

    return Math.min(score, 100);
  }

  /**
   * Calculate contribution score (tasks, referrals, revenue)
   */
  private async calculateContributionScore(
    userId: string,
    tenantId: string
  ): Promise<number> {
    const query = `
      SELECT SUM(total_score) as total_contribution
      FROM contribution_records
      WHERE user_id = $1
        AND tenant_id = $2
        AND created_at > NOW() - INTERVAL '30 days'
    `;
    
    const result = await db.query<{ total_contribution: string }>(query, [userId, tenantId]);
    const score = parseFloat(result[0]?.total_contribution || '0');

    return Math.min(score, 100);
  }

  /**
   * Calculate reputation score (quality multiplier)
   */
  private async calculateReputationScore(
    userId: string,
    tenantId: string
  ): Promise<number> {
    // This would integrate with a reputation system
    // For now, return a base score
    return 50;
  }

  /**
   * Get account age in days
   */
  private async getAccountAgeDays(userId: string): Promise<number> {
    const query = `
      SELECT EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 as age_days
      FROM activity_events
      WHERE user_id = $1
      ORDER BY created_at ASC
      LIMIT 1
    `;
    
    const result = await db.query<{ age_days: string }>(query, [userId]);
    return Math.floor(parseFloat(result[0]?.age_days || '0'));
  }

  /**
   * Check for abuse patterns (Sybil detection)
   */
  private async checkForAbuse(
    userId: string
  ): Promise<{ isFlagged: boolean; reason?: string }> {
    if (!config.antiAbuse.sybilDetectionEnabled) {
      return { isFlagged: false };
    }

    const query = `
      SELECT is_flagged, flagged_reason
      FROM abuse_tracking
      WHERE user_id = $1
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    
    const result = await db.query<{ is_flagged: boolean; flagged_reason?: string }>(
      query,
      [userId]
    );

    if (result.length === 0) {
      return { isFlagged: false };
    }

    return {
      isFlagged: result[0].is_flagged,
      reason: result[0].flagged_reason
    };
  }

  /**
   * Calculate total weighted score
   */
  private calculateTotalScore(scores: {
    participationScore: number;
    activityScore: number;
    contributionScore: number;
    reputationScore: number;
  }): number {
    const weights = config.weights;
    
    // Normalize scores to 0-1 range
    const normalized = {
      participation: scores.participationScore / 100,
      activity: scores.activityScore / 100,
      contribution: scores.contributionScore / 100,
      reputation: scores.reputationScore / 100
    };

    // Apply weights
    const totalScore = 
      (normalized.participation * weights.equal) +
      (normalized.activity * weights.activity) +
      (normalized.contribution * weights.contribution) +
      (normalized.reputation * weights.reputation);

    // Return score in 0-100 range
    return totalScore * 100;
  }

  /**
   * Determine if user is eligible for UBI distribution
   */
  private determineEligibility(params: {
    participationScore: number;
    accountAgeDays: number;
    flaggedForAbuse: boolean;
    totalScore: number;
  }): boolean {
    // Check abuse flag
    if (params.flaggedForAbuse) {
      logger.warn('User flagged for abuse', { participationScore: params.participationScore });
      return false;
    }

    // Check minimum account age
    if (params.accountAgeDays < config.antiAbuse.minAccountAgeDays) {
      logger.debug('Account too young', { 
        accountAgeDays: params.accountAgeDays,
        required: config.antiAbuse.minAccountAgeDays
      });
      return false;
    }

    // Check minimum participation
    if (params.participationScore < config.ubi.minParticipationScore) {
      logger.debug('Insufficient participation', {
        score: params.participationScore,
        required: config.ubi.minParticipationScore
      });
      return false;
    }

    return true;
  }

  /**
   * Store eligibility in database
   */
  private async storeEligibility(
    eligibility: UserEligibility,
    poolId: string
  ): Promise<void> {
    const query = `
      INSERT INTO user_eligibility (
        user_id, tenant_id, pool_id, is_eligible,
        participation_score, activity_score, contribution_score,
        reputation_score, total_score, account_age_days,
        flagged_for_abuse, abuse_reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (user_id, pool_id)
      DO UPDATE SET
        is_eligible = EXCLUDED.is_eligible,
        participation_score = EXCLUDED.participation_score,
        activity_score = EXCLUDED.activity_score,
        contribution_score = EXCLUDED.contribution_score,
        reputation_score = EXCLUDED.reputation_score,
        total_score = EXCLUDED.total_score,
        account_age_days = EXCLUDED.account_age_days,
        flagged_for_abuse = EXCLUDED.flagged_for_abuse,
        abuse_reason = EXCLUDED.abuse_reason,
        updated_at = NOW()
    `;

    await db.query(query, [
      eligibility.userId,
      eligibility.tenantId,
      poolId,
      eligibility.isEligible,
      eligibility.participationScore,
      eligibility.activityScore,
      eligibility.contributionScore,
      eligibility.reputationScore,
      eligibility.totalScore,
      eligibility.accountAgeDays,
      eligibility.flaggedForAbuse,
      eligibility.abuseReason
    ]);
  }

  /**
   * Batch calculate eligibility for multiple users
   */
  async batchCalculateEligibility(
    userIds: string[],
    tenantId: string,
    poolId: string
  ): Promise<UserEligibility[]> {
    logger.info('Batch calculating eligibility', { 
      userCount: userIds.length,
      poolId 
    });

    const results = await Promise.all(
      userIds.map(userId => 
        this.calculateEligibility(userId, tenantId, poolId)
      )
    );

    return results;
  }

  /**
   * Invalidate cached eligibility
   */
  async invalidateCache(userId: string, poolId: string): Promise<void> {
    const cacheKey = `${this.cacheKeyPrefix}${userId}:${poolId}`;
    await cache.del(cacheKey);
  }
}

export const eligibilityScorer = new EligibilityScorer();
