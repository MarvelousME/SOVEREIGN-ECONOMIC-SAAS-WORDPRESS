import {
  ReputationScore,
  ReputationLevel,
  ScoreComponents,
  TaskMetrics,
  ReferralMetrics,
  AgentPerformanceMetrics,
  CommunityEndorsement,
} from './types';

/**
 * Reputation Calculation Algorithm
 * 
 * Overall Score = 0-1000 points
 * 
 * Components:
 * - Task Score (0-300): Based on completion rate and volume
 * - Quality Score (0-250): Based on approval rate and ratings
 * - Reliability Score (0-200): Based on on-time delivery and consistency
 * - Community Score (0-150): Based on endorsements and contributions
 * - Longevity Score (0-100): Based on time on platform and activity
 */
export class ReputationCalculator {
  // Weight factors for different metrics
  private static readonly WEIGHTS = {
    TASK_VOLUME: 0.4,
    TASK_COMPLETION: 0.6,
    APPROVAL_RATE: 0.5,
    QUALITY_RATING: 0.5,
    ON_TIME_DELIVERY: 0.7,
    CONSISTENCY: 0.3,
    ENDORSEMENTS: 0.6,
    COMMUNITY_CONTRIBUTION: 0.4,
  };

  // Decay rate per day of inactivity (0.5% per day)
  private static readonly DECAY_RATE = 0.005;

  // Minimum activity threshold (days)
  private static readonly ACTIVITY_THRESHOLD = 30;

  /**
   * Calculate overall reputation score
   */
  static calculateScore(
    taskMetrics: TaskMetrics,
    referralMetrics: ReferralMetrics,
    agentMetrics: AgentPerformanceMetrics[],
    endorsements: CommunityEndorsement[],
    accountAge: number, // days
    lastActivityDate: Date
  ): ReputationScore {
    const components: ScoreComponents = {
      taskScore: this.calculateTaskScore(taskMetrics),
      qualityScore: this.calculateQualityScore(taskMetrics),
      reliabilityScore: this.calculateReliabilityScore(taskMetrics),
      communityScore: this.calculateCommunityScore(endorsements, referralMetrics),
      longevityScore: this.calculateLongevityScore(accountAge),
    };

    let rawScore =
      components.taskScore +
      components.qualityScore +
      components.reliabilityScore +
      components.communityScore +
      components.longevityScore;

    // Apply agent performance bonus
    const agentBonus = this.calculateAgentBonus(agentMetrics);
    rawScore += agentBonus;

    // Apply decay for inactivity
    const decayFactor = this.calculateDecayFactor(lastActivityDate);
    const finalScore = Math.min(1000, Math.max(0, rawScore * decayFactor));

    const trustIndex = this.calculateTrustIndex(taskMetrics, components);
    const level = this.determineLevel(finalScore);

    return {
      userId: taskMetrics.userId,
      overallScore: Math.round(finalScore),
      trustIndex: Math.round(trustIndex),
      level,
      calculatedAt: new Date(),
      components,
    };
  }

  /**
   * Calculate task completion score (0-300)
   */
  private static calculateTaskScore(metrics: TaskMetrics): number {
    const volumeScore = Math.min(150, Math.log10(metrics.completedTasks + 1) * 50);
    const completionScore = (metrics.completionRate / 100) * 150;
    
    return (
      volumeScore * this.WEIGHTS.TASK_VOLUME +
      completionScore * this.WEIGHTS.TASK_COMPLETION
    );
  }

  /**
   * Calculate quality score (0-250)
   */
  private static calculateQualityScore(metrics: TaskMetrics): number {
    const approvalScore = (metrics.approvalRate / 100) * 125;
    const qualityScore = (metrics.averageQuality / 100) * 125;
    
    return (
      approvalScore * this.WEIGHTS.APPROVAL_RATE +
      qualityScore * this.WEIGHTS.QUALITY_RATING
    );
  }

  /**
   * Calculate reliability score (0-200)
   */
  private static calculateReliabilityScore(metrics: TaskMetrics): number {
    const onTimeScore = (metrics.onTimeDeliveryRate / 100) * 140;
    
    // Consistency: Higher is better, based on standard deviation of performance
    // For now, using approval rate as a proxy
    const consistencyScore = (metrics.approvalRate / 100) * 60;
    
    return (
      onTimeScore * this.WEIGHTS.ON_TIME_DELIVERY +
      consistencyScore * this.WEIGHTS.CONSISTENCY
    );
  }

  /**
   * Calculate community score (0-150)
   */
  private static calculateCommunityScore(
    endorsements: CommunityEndorsement[],
    referralMetrics: ReferralMetrics
  ): number {
    // Weighted endorsements (based on endorser reputation)
    const endorsementScore = Math.min(
      90,
      endorsements.reduce((sum, e) => sum + e.weight, 0) * 2
    );
    
    // Referral contribution
    const referralScore = Math.min(
      60,
      (referralMetrics.activeReferrals * 5) + (referralMetrics.referralSuccessRate / 100) * 20
    );
    
    return (
      endorsementScore * this.WEIGHTS.ENDORSEMENTS +
      referralScore * this.WEIGHTS.COMMUNITY_CONTRIBUTION
    );
  }

  /**
   * Calculate longevity score (0-100)
   */
  private static calculateLongevityScore(accountAgeDays: number): number {
    // Logarithmic growth: 30 days = 40, 90 days = 60, 365 days = 80, 730 days = 100
    return Math.min(100, Math.log10(accountAgeDays + 1) * 35);
  }

  /**
   * Calculate agent performance bonus (0-50)
   */
  private static calculateAgentBonus(metrics: AgentPerformanceMetrics[]): number {
    if (metrics.length === 0) return 0;
    
    const totalRevenue = metrics.reduce((sum, m) => sum + m.revenue, 0);
    const avgRating = metrics.reduce((sum, m) => sum + m.averageRating, 0) / metrics.length;
    
    const revenueBonus = Math.min(25, Math.log10(totalRevenue + 1) * 5);
    const ratingBonus = (avgRating / 5) * 25;
    
    return Math.min(50, revenueBonus + ratingBonus);
  }

  /**
   * Calculate decay factor based on inactivity
   */
  private static calculateDecayFactor(lastActivityDate: Date): number {
    const daysSinceActivity = Math.floor(
      (Date.now() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceActivity <= this.ACTIVITY_THRESHOLD) {
      return 1.0;
    }
    
    const inactiveDays = daysSinceActivity - this.ACTIVITY_THRESHOLD;
    const decay = Math.pow(1 - this.DECAY_RATE, inactiveDays);
    
    return Math.max(0.5, decay); // Minimum 50% retention
  }

  /**
   * Calculate trust index (0-100)
   */
  private static calculateTrustIndex(
    metrics: TaskMetrics,
    components: ScoreComponents
  ): number {
    // Trust is heavily weighted on approval rate and quality
    const approvalWeight = (metrics.approvalRate / 100) * 40;
    const qualityWeight = (metrics.averageQuality / 100) * 30;
    const reliabilityWeight = (components.reliabilityScore / 200) * 20;
    const communityWeight = (components.communityScore / 150) * 10;
    
    return approvalWeight + qualityWeight + reliabilityWeight + communityWeight;
  }

  /**
   * Determine reputation level based on score
   */
  private static determineLevel(score: number): ReputationLevel {
    if (score >= 900) return ReputationLevel.DIAMOND;
    if (score >= 800) return ReputationLevel.PLATINUM;
    if (score >= 600) return ReputationLevel.GOLD;
    if (score >= 400) return ReputationLevel.SILVER;
    if (score >= 200) return ReputationLevel.BRONZE;
    return ReputationLevel.NEWCOMER;
  }

  /**
   * Calculate reward multiplier based on reputation
   */
  static getRewardMultiplier(score: number): number {
    // Linear scaling from 1.0 to 2.0
    return 1.0 + (score / 1000);
  }

  /**
   * Calculate transaction fee discount
   */
  static getTransactionFeeDiscount(score: number): number {
    // Up to 50% discount at max reputation
    return Math.min(50, (score / 1000) * 50);
  }

  /**
   * Calculate UBI multiplier
   */
  static getUBIMultiplier(score: number): number {
    // Up to 1.5x UBI at max reputation
    return 1.0 + (score / 1000) * 0.5;
  }

  /**
   * Calculate voting power
   */
  static getVotingPower(score: number): number {
    // Quadratic scaling for governance fairness
    return Math.sqrt(score / 1000) * 100;
  }
}
