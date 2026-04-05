import request from 'supertest';
import { ReferralService } from '../../src/services/referralService';
import { ReferralStatus } from '../../src/types';

describe('ReferralService Integration Tests', () => {
  let referralService: ReferralService;

  beforeAll(() => {
    referralService = new ReferralService();
  });

  describe('Full Referral Flow', () => {
    it('should create referral code for new user', async () => {
      const userId = 'user-' + Date.now();
      const code = await referralService.getUserReferralCode(userId);

      expect(code).toBeDefined();
      expect(code.length).toBeGreaterThanOrEqual(6);
    });

    it('should register referral and calculate tiers', async () => {
      const referrerId = 'referrer-' + Date.now();
      const refereeId = 'referee-' + Date.now();

      // Get referrer code
      const referrerCode = await referralService.getUserReferralCode(referrerId);

      // Register referee with referrer code
      const referral = await referralService.registerReferral({
        userId: refereeId,
        referralCode: referrerCode,
        ipAddress: '192.168.1.100',
        deviceFingerprint: 'device-123',
        userAgent: 'Mozilla/5.0',
      });

      expect(referral).toBeDefined();
      expect(referral.referrerId).toBe(referrerId);
      expect(referral.tier).toBe(1);
      expect(referral.status).toBe(ReferralStatus.ACTIVE);
    });

    it('should calculate rewards across multiple tiers', async () => {
      const tier0 = 'tier0-' + Date.now();
      const tier1 = 'tier1-' + Date.now();
      const tier2 = 'tier2-' + Date.now();

      // Build referral chain
      const code0 = await referralService.getUserReferralCode(tier0);
      
      await referralService.registerReferral({
        userId: tier1,
        referralCode: code0,
        ipAddress: '192.168.1.101',
        deviceFingerprint: 'device-101',
        userAgent: 'Mozilla/5.0',
      });

      const code1 = await referralService.getUserReferralCode(tier1);
      
      await referralService.registerReferral({
        userId: tier2,
        referralCode: code1,
        ipAddress: '192.168.1.102',
        deviceFingerprint: 'device-102',
        userAgent: 'Mozilla/5.0',
      });

      // Calculate reward for tier2 activity
      await referralService.calculateReward({
        refereeId: tier2,
        amount: 100,
        currency: 'USD',
        source: 'test',
        sourceId: 'test-123',
      });

      // Check tier1 got reward
      const tier1Stats = await referralService.getReferralStats(tier1);
      expect(tier1Stats.totalEarnings).toBeGreaterThan(0);

      // Check tier0 got reward
      const tier0Stats = await referralService.getReferralStats(tier0);
      expect(tier0Stats.totalEarnings).toBeGreaterThan(0);
    });

    it('should build referral tree correctly', async () => {
      const rootId = 'root-' + Date.now();
      const rootCode = await referralService.getUserReferralCode(rootId);

      // Create 2 direct referrals
      const child1 = 'child1-' + Date.now();
      const child2 = 'child2-' + Date.now();

      await referralService.registerReferral({
        userId: child1,
        referralCode: rootCode,
        ipAddress: '192.168.1.201',
        deviceFingerprint: 'device-201',
        userAgent: 'Mozilla/5.0',
      });

      await referralService.registerReferral({
        userId: child2,
        referralCode: rootCode,
        ipAddress: '192.168.1.202',
        deviceFingerprint: 'device-202',
        userAgent: 'Mozilla/5.0',
      });

      const tree = await referralService.getReferralTree(rootId);

      expect(tree.children.length).toBe(2);
      expect(tree.user.id).toBe(rootId);
    });
  });

  describe('Fraud Detection Integration', () => {
    it('should flag suspicious referrals from same IP', async () => {
      const referrerId = 'ref-suspicious-' + Date.now();
      const referrerCode = await referralService.getUserReferralCode(referrerId);

      // Create multiple referrals from same IP
      const sameIP = '192.168.99.99';
      
      for (let i = 0; i < 6; i++) {
        const userId = `user-ip-${Date.now()}-${i}`;
        const referral = await referralService.registerReferral({
          userId,
          referralCode: referrerCode,
          ipAddress: sameIP,
          deviceFingerprint: `device-${i}`,
          userAgent: 'Mozilla/5.0',
        });

        if (i >= 5) {
          expect([ReferralStatus.SUSPICIOUS, ReferralStatus.BLOCKED]).toContain(referral.status);
        }
      }
    });
  });
});
