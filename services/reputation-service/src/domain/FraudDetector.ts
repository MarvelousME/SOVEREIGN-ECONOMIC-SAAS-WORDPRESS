import {
  FraudAlert,
  FraudAlertType,
  AlertSeverity,
  TaskMetrics,
  ReputationHistory,
} from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Fraud Detection System
 * 
 * Detects suspicious patterns:
 * - Unusual activity spikes
 * - Fake task completion
 * - Review manipulation
 * - Sybil attacks
 * - System gaming
 */
export class FraudDetector {
  // Thresholds for anomaly detection
  private static readonly SPIKE_THRESHOLD = 3.0; // 3x std deviation
  private static readonly MIN_REVIEW_VARIANCE = 0.15; // Minimum variance in ratings
  private static readonly SYBIL_SIMILARITY_THRESHOLD = 0.85;
  private static readonly RAPID_GROWTH_THRESHOLD = 0.5; // 50% growth in 24h

  /**
   * Detect unusual activity patterns
   */
  static detectUnusualActivity(
    userId: string,
    recentTasks: number[],
    historicalAverage: number,
    historicalStdDev: number
  ): FraudAlert | null {
    if (recentTasks.length === 0) return null;

    const recentAverage = recentTasks.reduce((a, b) => a + b, 0) / recentTasks.length;
    
    // Z-score calculation
    const zScore = (recentAverage - historicalAverage) / (historicalStdDev || 1);
    
    if (Math.abs(zScore) > this.SPIKE_THRESHOLD) {
      return {
        alertId: uuidv4(),
        userId,
        alertType: FraudAlertType.UNUSUAL_ACTIVITY,
        severity: zScore > 5 ? AlertSeverity.HIGH : AlertSeverity.MEDIUM,
        description: `Unusual activity spike detected. Z-score: ${zScore.toFixed(2)}`,
        detectedAt: new Date(),
        resolved: false,
      };
    }

    return null;
  }

  /**
   * Detect fake task completion patterns
   */
  static detectFakeTasks(
    userId: string,
    metrics: TaskMetrics,
    taskTimestamps: Date[]
  ): FraudAlert | null {
    // Check for suspiciously high completion rate with low quality
    if (metrics.completionRate > 95 && metrics.averageQuality < 60) {
      return {
        alertId: uuidv4(),
        userId,
        alertType: FraudAlertType.FAKE_TASKS,
        severity: AlertSeverity.HIGH,
        description: 'High completion rate but low quality scores suggest fake tasks',
        detectedAt: new Date(),
        resolved: false,
      };
    }

    // Check for unrealistic task completion speed
    const tasksPerHour = this.calculateTasksPerHour(taskTimestamps);
    if (tasksPerHour > 20) {
      // More than 20 tasks per hour is suspicious
      return {
        alertId: uuidv4(),
        userId,
        alertType: FraudAlertType.FAKE_TASKS,
        severity: AlertSeverity.HIGH,
        description: `Unrealistic task completion speed: ${tasksPerHour} tasks/hour`,
        detectedAt: new Date(),
        resolved: false,
      };
    }

    return null;
  }

  /**
   * Detect review manipulation
   */
  static detectReviewManipulation(
    userId: string,
    ratings: number[],
    reviewerIds: string[]
  ): FraudAlert | null {
    if (ratings.length < 5) return null;

    // Check for suspiciously low variance in ratings
    const variance = this.calculateVariance(ratings);
    if (variance < this.MIN_REVIEW_VARIANCE && ratings.length > 10) {
      return {
        alertId: uuidv4(),
        userId,
        alertType: FraudAlertType.REVIEW_MANIPULATION,
        severity: AlertSeverity.MEDIUM,
        description: `Suspiciously consistent ratings. Variance: ${variance.toFixed(3)}`,
        detectedAt: new Date(),
        resolved: false,
      };
    }

    // Check for repeated reviewers (same people always reviewing)
    const uniqueReviewers = new Set(reviewerIds).size;
    const repetitionRate = 1 - uniqueReviewers / reviewerIds.length;
    if (repetitionRate > 0.7 && reviewerIds.length > 10) {
      return {
        alertId: uuidv4(),
        userId,
        alertType: FraudAlertType.REVIEW_MANIPULATION,
        severity: AlertSeverity.HIGH,
        description: `High reviewer repetition: ${(repetitionRate * 100).toFixed(1)}%`,
        detectedAt: new Date(),
        resolved: false,
      };
    }

    return null;
  }

  /**
   * Detect potential Sybil attacks (multiple fake accounts)
   */
  static detectSybilAttack(
    userId: string,
    userBehaviorFingerprint: Record<string, any>,
    knownSybilFingerprints: Array<{ userId: string; fingerprint: Record<string, any> }>
  ): FraudAlert | null {
    for (const known of knownSybilFingerprints) {
      const similarity = this.calculateFingerprintSimilarity(
        userBehaviorFingerprint,
        known.fingerprint
      );

      if (similarity > this.SYBIL_SIMILARITY_THRESHOLD) {
        return {
          alertId: uuidv4(),
          userId,
          alertType: FraudAlertType.SYBIL_ATTACK,
          severity: AlertSeverity.CRITICAL,
          description: `High similarity with known Sybil account ${known.userId}: ${(similarity * 100).toFixed(1)}%`,
          detectedAt: new Date(),
          resolved: false,
        };
      }
    }

    return null;
  }

  /**
   * Detect system gaming attempts
   */
  static detectSystemGaming(
    userId: string,
    history: ReputationHistory[],
    recentActions: Array<{ type: string; timestamp: Date; impact: number }>
  ): FraudAlert | null {
    // Check for rapid reputation growth
    if (history.length > 1) {
      const last24h = history.filter(
        (h) => Date.now() - h.timestamp.getTime() < 24 * 60 * 60 * 1000
      );

      if (last24h.length > 0) {
        const growth = last24h.reduce((sum, h) => sum + h.change, 0);
        const currentScore = history[history.length - 1].score;
        const growthRate = growth / (currentScore - growth);

        if (growthRate > this.RAPID_GROWTH_THRESHOLD) {
          return {
            alertId: uuidv4(),
            userId,
            alertType: FraudAlertType.GAMING_SYSTEM,
            severity: AlertSeverity.HIGH,
            description: `Rapid reputation growth: ${(growthRate * 100).toFixed(1)}% in 24h`,
            detectedAt: new Date(),
            resolved: false,
          };
        }
      }
    }

    // Check for repetitive low-value actions to farm points
    const actionTypes = recentActions.map((a) => a.type);
    const uniqueActions = new Set(actionTypes).size;
    const repetitionRate = 1 - uniqueActions / actionTypes.length;

    if (repetitionRate > 0.8 && actionTypes.length > 50) {
      return {
        alertId: uuidv4(),
        userId,
        alertType: FraudAlertType.GAMING_SYSTEM,
        severity: AlertSeverity.MEDIUM,
        description: `Repetitive action pattern detected: ${(repetitionRate * 100).toFixed(1)}% repetition`,
        detectedAt: new Date(),
        resolved: false,
      };
    }

    return null;
  }

  /**
   * Calculate tasks per hour from timestamps
   */
  private static calculateTasksPerHour(timestamps: Date[]): number {
    if (timestamps.length < 2) return 0;

    const sorted = timestamps.sort((a, b) => a.getTime() - b.getTime());
    const hourlyBuckets: { [key: string]: number } = {};

    for (const ts of sorted) {
      const hourKey = `${ts.getFullYear()}-${ts.getMonth()}-${ts.getDate()}-${ts.getHours()}`;
      hourlyBuckets[hourKey] = (hourlyBuckets[hourKey] || 0) + 1;
    }

    const maxPerHour = Math.max(...Object.values(hourlyBuckets));
    return maxPerHour;
  }

  /**
   * Calculate variance of ratings
   */
  private static calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Calculate similarity between behavior fingerprints
   */
  private static calculateFingerprintSimilarity(
    fp1: Record<string, any>,
    fp2: Record<string, any>
  ): number {
    const keys = new Set([...Object.keys(fp1), ...Object.keys(fp2)]);
    let matchCount = 0;
    let totalCount = 0;

    for (const key of keys) {
      totalCount++;
      if (fp1[key] === fp2[key]) {
        matchCount++;
      } else if (typeof fp1[key] === 'number' && typeof fp2[key] === 'number') {
        // For numeric values, consider them matching if within 10%
        const diff = Math.abs(fp1[key] - fp2[key]);
        const avg = (fp1[key] + fp2[key]) / 2;
        if (diff / avg < 0.1) {
          matchCount += 0.5;
        }
      }
    }

    return matchCount / totalCount;
  }

  /**
   * Run comprehensive fraud check
   */
  static runComprehensiveCheck(
    userId: string,
    data: {
      metrics: TaskMetrics;
      recentTasks: number[];
      historicalAverage: number;
      historicalStdDev: number;
      taskTimestamps: Date[];
      ratings: number[];
      reviewerIds: string[];
      history: ReputationHistory[];
      recentActions: Array<{ type: string; timestamp: Date; impact: number }>;
    }
  ): FraudAlert[] {
    const alerts: FraudAlert[] = [];

    const unusualActivity = this.detectUnusualActivity(
      userId,
      data.recentTasks,
      data.historicalAverage,
      data.historicalStdDev
    );
    if (unusualActivity) alerts.push(unusualActivity);

    const fakeTasks = this.detectFakeTasks(userId, data.metrics, data.taskTimestamps);
    if (fakeTasks) alerts.push(fakeTasks);

    const reviewManipulation = this.detectReviewManipulation(
      userId,
      data.ratings,
      data.reviewerIds
    );
    if (reviewManipulation) alerts.push(reviewManipulation);

    const systemGaming = this.detectSystemGaming(userId, data.history, data.recentActions);
    if (systemGaming) alerts.push(systemGaming);

    return alerts;
  }
}
