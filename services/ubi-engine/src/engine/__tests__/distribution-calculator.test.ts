import { distributionCalculator } from '../distribution-calculator';
import { UserEligibility } from '../eligibility-scorer';

describe('DistributionCalculator', () => {
  describe('validateDistribution', () => {
    it('should validate distribution totals within tolerance', () => {
      const distributions = [
        {
          userId: 'user1',
          baseAmount: 100,
          activityBonus: 50,
          contributionBonus: 25,
          reputationMultiplier: 1.1,
          totalAmount: 175,
          vestedAmount: 87.5,
          unvestedAmount: 87.5,
          vestingCompleteAt: new Date()
        },
        {
          userId: 'user2',
          baseAmount: 100,
          activityBonus: 30,
          contributionBonus: 20,
          reputationMultiplier: 1.0,
          totalAmount: 150,
          vestedAmount: 75,
          unvestedAmount: 75,
          vestingCompleteAt: new Date()
        }
      ];

      const isValid = distributionCalculator.validateDistribution(distributions, 325);
      expect(isValid).toBe(true);
    });

    it('should reject distribution totals outside tolerance', () => {
      const distributions = [
        {
          userId: 'user1',
          baseAmount: 100,
          activityBonus: 50,
          contributionBonus: 25,
          reputationMultiplier: 1.1,
          totalAmount: 500,
          vestedAmount: 250,
          unvestedAmount: 250,
          vestingCompleteAt: new Date()
        }
      ];

      const isValid = distributionCalculator.validateDistribution(distributions, 100);
      expect(isValid).toBe(false);
    });
  });

  describe('calculateEqualDistribution', () => {
    it('should distribute equally among eligible users', async () => {
      const eligibleUsers: UserEligibility[] = [
        {
          userId: 'user1',
          tenantId: 'tenant1',
          isEligible: true,
          participationScore: 50,
          activityScore: 60,
          contributionScore: 70,
          reputationScore: 80,
          totalScore: 65,
          accountAgeDays: 30,
          flaggedForAbuse: false
        },
        {
          userId: 'user2',
          tenantId: 'tenant1',
          isEligible: true,
          participationScore: 40,
          activityScore: 50,
          contributionScore: 60,
          reputationScore: 70,
          totalScore: 55,
          accountAgeDays: 20,
          flaggedForAbuse: false
        }
      ];

      const distributions = await distributionCalculator.calculateEqualDistribution(
        eligibleUsers,
        1000
      );

      expect(distributions).toHaveLength(2);
      expect(distributions[0].totalAmount).toBe(500);
      expect(distributions[1].totalAmount).toBe(500);
    });
  });
});
