import { FraudDetectionService } from '../../src/services/fraudDetection';
import { ReferralStatus } from '../../src/types';

describe('FraudDetectionService', () => {
  let fraudService: FraudDetectionService;

  beforeEach(() => {
    fraudService = new FraudDetectionService();
  });

  describe('analyzeReferral', () => {
    it('should mark referral as safe with low score for unique IP and device', async () => {
      const result = await fraudService.analyzeReferral({
        userId: 'user1',
        ipAddress: '192.168.1.1',
        deviceFingerprint: 'device1',
        referrerId: 'referrer1',
      });

      expect(result.isSuspicious).toBe(false);
      expect(result.shouldBlock).toBe(false);
      expect(result.score).toBeLessThan(50);
      expect(result.reasons).toEqual([]);
    });

    it('should flag suspicious activity for same IP multiple times', async () => {
      // Create multiple referrals from same IP
      for (let i = 0; i < 6; i++) {
        await fraudService.analyzeReferral({
          userId: `user${i}`,
          ipAddress: '192.168.1.100',
          deviceFingerprint: `device${i}`,
          referrerId: 'referrer1',
        });
      }

      const result = await fraudService.analyzeReferral({
        userId: 'user7',
        ipAddress: '192.168.1.100',
        deviceFingerprint: 'device7',
        referrerId: 'referrer1',
      });

      expect(result.isSuspicious).toBe(true);
      expect(result.reasons).toContain('Excessive referrals from same IP');
    });

    it('should flag suspicious activity for same device multiple times', async () => {
      for (let i = 0; i < 4; i++) {
        await fraudService.analyzeReferral({
          userId: `user${i}`,
          ipAddress: `192.168.1.${i}`,
          deviceFingerprint: 'common-device',
          referrerId: 'referrer1',
        });
      }

      const result = await fraudService.analyzeReferral({
        userId: 'user5',
        ipAddress: '192.168.1.5',
        deviceFingerprint: 'common-device',
        referrerId: 'referrer1',
      });

      expect(result.isSuspicious).toBe(true);
      expect(result.reasons).toContain('Excessive referrals from same device');
    });

    it('should detect high velocity referrals', async () => {
      const baseTime = Date.now();
      
      // Simulate 11 referrals in short time
      for (let i = 0; i < 11; i++) {
        await fraudService.analyzeReferral({
          userId: `user${i}`,
          ipAddress: `192.168.1.${i}`,
          deviceFingerprint: `device${i}`,
          referrerId: 'referrer1',
        });
      }

      const result = await fraudService.analyzeReferral({
        userId: 'user12',
        ipAddress: '192.168.1.12',
        deviceFingerprint: 'device12',
        referrerId: 'referrer1',
      });

      expect(result.isSuspicious).toBe(true);
      expect(result.reasons).toContain('Suspicious referral velocity');
    });

    it('should block referrals with very high fraud score', async () => {
      // Create conditions for high fraud score
      for (let i = 0; i < 10; i++) {
        await fraudService.analyzeReferral({
          userId: `user${i}`,
          ipAddress: '192.168.1.1',
          deviceFingerprint: 'device1',
          referrerId: 'referrer1',
        });
      }

      const result = await fraudService.analyzeReferral({
        userId: 'user11',
        ipAddress: '192.168.1.1',
        deviceFingerprint: 'device1',
        referrerId: 'referrer1',
      });

      expect(result.shouldBlock).toBe(true);
      expect(result.score).toBeGreaterThan(80);
    });
  });

  describe('calculateFraudScore', () => {
    it('should return 0 for clean referral', () => {
      const score = fraudService.calculateFraudScore([]);
      expect(score).toBe(0);
    });

    it('should increase score based on number of flags', () => {
      const score1 = fraudService.calculateFraudScore(['reason1']);
      const score2 = fraudService.calculateFraudScore(['reason1', 'reason2']);
      const score3 = fraudService.calculateFraudScore(['reason1', 'reason2', 'reason3']);

      expect(score2).toBeGreaterThan(score1);
      expect(score3).toBeGreaterThan(score2);
    });
  });
});
