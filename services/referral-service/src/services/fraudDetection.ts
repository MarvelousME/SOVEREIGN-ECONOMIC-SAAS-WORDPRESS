import { FraudDetectionResult } from '../types';
import { config } from '../config';
import { redis } from '../config/redis';
import logger from '../utils/logger';

interface ReferralAnalysisInput {
  userId: string;
  ipAddress: string;
  deviceFingerprint: string;
  referrerId: string;
}

export class FraudDetectionService {
  private readonly REDIS_PREFIX = 'fraud:';
  private readonly IP_KEY_PREFIX = 'ip:';
  private readonly DEVICE_KEY_PREFIX = 'device:';
  private readonly VELOCITY_KEY_PREFIX = 'velocity:';
  private readonly TRACKING_WINDOW = 86400; // 24 hours in seconds

  async analyzeReferral(input: ReferralAnalysisInput): Promise<FraudDetectionResult> {
    const reasons: string[] = [];

    // Check IP address patterns
    const ipCount = await this.getIPReferralCount(input.ipAddress);
    if (ipCount >= config.fraud.maxReferralsPerIP) {
      reasons.push('Excessive referrals from same IP');
    }

    // Check device fingerprint patterns
    const deviceCount = await this.getDeviceReferralCount(input.deviceFingerprint);
    if (deviceCount >= config.fraud.maxReferralsPerDevice) {
      reasons.push('Excessive referrals from same device');
    }

    // Check velocity (referrals per time period)
    const velocityCount = await this.getVelocityCount(input.referrerId);
    if (velocityCount >= config.fraud.suspiciousVelocityCount) {
      reasons.push('Suspicious referral velocity');
    }

    // Track this referral
    await this.trackReferral(input);

    const score = this.calculateFraudScore(reasons);
    const isSuspicious = score >= 50;
    const shouldBlock = score >= 80;

    logger.info('Fraud analysis completed', {
      userId: input.userId,
      score,
      isSuspicious,
      shouldBlock,
      reasons,
    });

    return {
      isSuspicious,
      score,
      reasons,
      shouldBlock,
    };
  }

  calculateFraudScore(reasons: string[]): number {
    let score = 0;
    
    // Each reason adds to the fraud score
    for (const reason of reasons) {
      if (reason.includes('Excessive referrals from same IP')) {
        score += 40;
      } else if (reason.includes('Excessive referrals from same device')) {
        score += 35;
      } else if (reason.includes('Suspicious referral velocity')) {
        score += 30;
      } else {
        score += 20;
      }
    }

    return Math.min(score, 100);
  }

  private async getIPReferralCount(ipAddress: string): Promise<number> {
    const key = `${this.REDIS_PREFIX}${this.IP_KEY_PREFIX}${ipAddress}`;
    try {
      const count = await redis.get(key);
      return count ? parseInt(count, 10) : 0;
    } catch (error) {
      logger.error('Error getting IP referral count', { ipAddress, error });
      return 0;
    }
  }

  private async getDeviceReferralCount(deviceFingerprint: string): Promise<number> {
    const key = `${this.REDIS_PREFIX}${this.DEVICE_KEY_PREFIX}${deviceFingerprint}`;
    try {
      const count = await redis.get(key);
      return count ? parseInt(count, 10) : 0;
    } catch (error) {
      logger.error('Error getting device referral count', { deviceFingerprint, error });
      return 0;
    }
  }

  private async getVelocityCount(referrerId: string): Promise<number> {
    const key = `${this.REDIS_PREFIX}${this.VELOCITY_KEY_PREFIX}${referrerId}`;
    try {
      const count = await redis.get(key);
      return count ? parseInt(count, 10) : 0;
    } catch (error) {
      logger.error('Error getting velocity count', { referrerId, error });
      return 0;
    }
  }

  private async trackReferral(input: ReferralAnalysisInput): Promise<void> {
    try {
      // Track IP
      const ipKey = `${this.REDIS_PREFIX}${this.IP_KEY_PREFIX}${input.ipAddress}`;
      const ipCount = await redis.incr(ipKey);
      if (ipCount === 1) {
        await redis.expire(ipKey, this.TRACKING_WINDOW);
      }

      // Track device
      const deviceKey = `${this.REDIS_PREFIX}${this.DEVICE_KEY_PREFIX}${input.deviceFingerprint}`;
      const deviceCount = await redis.incr(deviceKey);
      if (deviceCount === 1) {
        await redis.expire(deviceKey, this.TRACKING_WINDOW);
      }

      // Track velocity
      const velocityKey = `${this.REDIS_PREFIX}${this.VELOCITY_KEY_PREFIX}${input.referrerId}`;
      const velocityCount = await redis.incr(velocityKey);
      if (velocityCount === 1) {
        await redis.expire(velocityKey, config.fraud.suspiciousVelocityMinutes * 60);
      }
    } catch (error) {
      logger.error('Error tracking referral', { input, error });
    }
  }

  async resetTracking(userId: string): Promise<void> {
    // This method can be used for testing or admin overrides
    logger.info('Resetting fraud tracking', { userId });
  }
}

export default FraudDetectionService;
