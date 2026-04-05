import { OpportunityService } from '../../src/services/opportunity.service';

describe('OpportunityService', () => {
  let service: OpportunityService;

  beforeEach(() => {
    service = new OpportunityService();
  });

  describe('calculateTotalScore', () => {
    it('should calculate a higher score for better opportunities', () => {
      const highQuality = {
        freshnessScore: 0.9,
        commissionRate: 0.15,
        merchantCommission: 0.12,
        successRate: 0.85,
        isVerified: true,
        isFeatured: true,
      };

      const lowQuality = {
        freshnessScore: 0.3,
        commissionRate: 0.02,
        merchantCommission: 0.01,
        successRate: 0.2,
        isVerified: false,
        isFeatured: false,
      };

      const highScore = (service as any).calculateTotalScore(highQuality);
      const lowScore = (service as any).calculateTotalScore(lowQuality);

      expect(highScore).toBeGreaterThan(lowScore);
    });

    it('should weigh freshness score appropriately', () => {
      const highFreshness = {
        freshnessScore: 0.95,
        commissionRate: 0.05,
        merchantCommission: 0.05,
        successRate: 0.5,
        isVerified: false,
        isFeatured: false,
      };

      const lowFreshness = {
        freshnessScore: 0.1,
        commissionRate: 0.05,
        merchantCommission: 0.05,
        successRate: 0.5,
        isVerified: false,
        isFeatured: false,
      };

      const highFreshScore = (service as any).calculateTotalScore(highFreshness);
      const lowFreshScore = (service as any).calculateTotalScore(lowFreshness);

      expect(highFreshScore).toBeGreaterThan(lowFreshScore);
    });

    it('should cap score at 1', () => {
      const perfectOpportunity = {
        freshnessScore: 1,
        commissionRate: 1,
        merchantCommission: 1,
        successRate: 1,
        isVerified: true,
        isFeatured: true,
      };

      const score = (service as any).calculateTotalScore(perfectOpportunity);

      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('generateReasons', () => {
    it('should include featured in reasons when offer is featured', () => {
      const row = {
        is_featured: true,
        is_verified: false,
        discount_value: '10',
        freshness_score: '0.5',
        success_rate: '0.5',
      };

      const reasons = (service as any).generateReasons(row);

      expect(reasons).toContain('Featured offer');
    });

    it('should include verified in reasons when offer is verified', () => {
      const row = {
        is_featured: false,
        is_verified: true,
        discount_value: '10',
        freshness_score: '0.5',
        success_rate: '0.5',
      };

      const reasons = (service as any).generateReasons(row);

      expect(reasons).toContain('Verified offer');
    });

    it('should include high discount reason when discount > 20', () => {
      const row = {
        is_featured: false,
        is_verified: false,
        discount_value: '25',
        freshness_score: '0.5',
        success_rate: '0.5',
      };

      const reasons = (service as any).generateReasons(row);

      expect(reasons.some((r: string) => r.includes('High discount'))).toBe(true);
    });

    it('should include fresh data reason when freshness > 0.7', () => {
      const row = {
        is_featured: false,
        is_verified: false,
        discount_value: '10',
        freshness_score: '0.8',
        success_rate: '0.5',
      };

      const reasons = (service as any).generateReasons(row);

      expect(reasons.some((r: string) => r.includes('Fresh'))).toBe(true);
    });

    it('should include high success rate reason when success > 0.7', () => {
      const row = {
        is_featured: false,
        is_verified: false,
        discount_value: '10',
        freshness_score: '0.5',
        success_rate: '0.85',
      };

      const reasons = (service as any).generateReasons(row);

      expect(reasons.some((r: string) => r.includes('High success rate'))).toBe(true);
    });
  });
});
