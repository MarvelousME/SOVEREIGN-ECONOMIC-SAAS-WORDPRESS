import { FreshnessScoringService } from '../../src/services/freshness-scoring.service';
import { EntityType, LinkStatus } from '../../src/types';

describe('FreshnessScoringService', () => {
  let service: FreshnessScoringService;

  beforeEach(() => {
    service = new FreshnessScoringService();
  });

  describe('calculateLinkScore', () => {
    it('should calculate freshness score for a new link', async () => {
      const link = {
        id: 'test-link-id',
        originalUrl: 'https://example.com/product',
        normalizedUrl: 'https://example.com/product',
        merchantId: null,
        productId: null,
        offerId: null,
        userId: null,
        status: LinkStatus.ACTIVE,
        trackingParameters: {},
        strippedParameters: {},
        urlHash: 'abc123',
        clickCount: 0,
        lastClickedAt: null,
        firstSeenAt: new Date(),
        lastUpdatedAt: new Date(),
        freshnessScore: null,
        provenance: {},
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const score = await service.calculateLinkScore(link as any);

      expect(score.entityType).toBe(EntityType.LINK);
      expect(score.entityId).toBe('test-link-id');
      expect(score.score).toBeGreaterThan(0);
      expect(score.factors.length).toBeGreaterThan(0);
      expect(score.expiresAt).toBeInstanceOf(Date);
    });

    it('should give higher score to links with recent activity', async () => {
      const recentLink = {
        id: 'recent-link',
        originalUrl: 'https://example.com/product',
        normalizedUrl: 'https://example.com/product',
        merchantId: null,
        productId: null,
        offerId: null,
        userId: null,
        status: LinkStatus.ACTIVE,
        trackingParameters: {},
        strippedParameters: {},
        urlHash: 'abc123',
        clickCount: 10,
        lastClickedAt: new Date(),
        firstSeenAt: new Date(),
        lastUpdatedAt: new Date(),
        freshnessScore: null,
        provenance: {},
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const oldLink = {
        id: 'old-link',
        originalUrl: 'https://example.com/product2',
        normalizedUrl: 'https://example.com/product2',
        merchantId: null,
        productId: null,
        offerId: null,
        userId: null,
        status: LinkStatus.ACTIVE,
        trackingParameters: {},
        strippedParameters: {},
        urlHash: 'def456',
        clickCount: 10,
        lastClickedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        firstSeenAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        lastUpdatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        freshnessScore: null,
        provenance: {},
        metadata: {},
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      };

      const recentScore = await service.calculateLinkScore(recentLink as any);
      const oldScore = await service.calculateLinkScore(oldLink as any);

      expect(recentScore.score).toBeGreaterThan(oldScore.score);
    });

    it('should give higher score to links with merchant and offer associations', async () => {
      const richLink = {
        id: 'rich-link',
        originalUrl: 'https://example.com/product',
        normalizedUrl: 'https://example.com/product',
        merchantId: 'merchant-123',
        productId: 'product-456',
        offerId: 'offer-789',
        userId: null,
        status: LinkStatus.ACTIVE,
        trackingParameters: {},
        strippedParameters: {},
        urlHash: 'abc123',
        clickCount: 0,
        lastClickedAt: null,
        firstSeenAt: new Date(),
        lastUpdatedAt: new Date(),
        freshnessScore: null,
        provenance: {},
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const poorLink = {
        id: 'poor-link',
        originalUrl: 'https://example.com/product2',
        normalizedUrl: 'https://example.com/product2',
        merchantId: null,
        productId: null,
        offerId: null,
        userId: null,
        status: LinkStatus.ACTIVE,
        trackingParameters: {},
        strippedParameters: {},
        urlHash: 'def456',
        clickCount: 0,
        lastClickedAt: null,
        firstSeenAt: new Date(),
        lastUpdatedAt: new Date(),
        freshnessScore: null,
        provenance: {},
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const richScore = await service.calculateLinkScore(richLink as any);
      const poorScore = await service.calculateLinkScore(poorLink as any);

      expect(richScore.score).toBeGreaterThan(poorScore.score);
    });
  });

  describe('calculateMerchantScore', () => {
    it('should calculate freshness score for a merchant', async () => {
      const merchant = {
        id: 'merchant-123',
        name: 'Test Merchant',
        slug: 'test-merchant',
        network: 'cj_affiliate',
        websiteUrl: 'https://example.com',
        logoUrl: null,
        description: null,
        categories: ['electronics', 'clothing'],
        commissionRules: [],
        averageCommission: 0.15,
        commissionType: 'cps',
        payoutThreshold: 50,
        payoutFrequency: 'monthly',
        cookieDuration: 30,
        isVerified: true,
        isActive: true,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const score = await service.calculateMerchantScore(merchant as any);

      expect(score.entityType).toBe(EntityType.MERCHANT);
      expect(score.entityId).toBe('merchant-123');
      expect(score.score).toBeGreaterThan(0);
      expect(score.factors.some((f: any) => f.name === 'verification')).toBe(true);
    });

    it('should give higher score to verified merchants', async () => {
      const verifiedMerchant = {
        id: 'verified-merchant',
        name: 'Verified Merchant',
        slug: 'verified-merchant',
        network: null,
        websiteUrl: null,
        logoUrl: null,
        description: null,
        categories: [],
        commissionRules: [],
        averageCommission: null,
        commissionType: null,
        payoutThreshold: null,
        payoutFrequency: null,
        cookieDuration: null,
        isVerified: true,
        isActive: true,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const unverifiedMerchant = {
        id: 'unverified-merchant',
        name: 'Unverified Merchant',
        slug: 'unverified-merchant',
        network: null,
        websiteUrl: null,
        logoUrl: null,
        description: null,
        categories: [],
        commissionRules: [],
        averageCommission: null,
        commissionType: null,
        payoutThreshold: null,
        payoutFrequency: null,
        cookieDuration: null,
        isVerified: false,
        isActive: true,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const verifiedScore = await service.calculateMerchantScore(verifiedMerchant as any);
      const unverifiedScore = await service.calculateMerchantScore(unverifiedMerchant as any);

      expect(verifiedScore.score).toBeGreaterThan(unverifiedScore.score);
    });
  });

  describe('calculateOfferScore', () => {
    it('should calculate freshness score for an offer', async () => {
      const offer = {
        id: 'offer-123',
        merchantId: 'merchant-123',
        offerCode: 'SUMMER20',
        title: '20% Off Summer Sale',
        description: null,
        offerType: 'discount',
        discountType: 'percentage',
        discountValue: 20,
        commissionRate: 0.1,
        commissionAmount: null,
        minimumPurchase: null,
        maximumDiscount: null,
        currency: 'USD',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isExclusive: false,
        isVerified: true,
        isFeatured: true,
        usageCount: 100,
        successRate: 0.85,
        lastVerifiedAt: new Date(),
        status: 'active',
        categories: [],
        tags: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const score = await service.calculateOfferScore(offer as any);

      expect(score.entityType).toBe(EntityType.OFFER);
      expect(score.entityId).toBe('offer-123');
      expect(score.score).toBeGreaterThan(0);
    });

    it('should give higher score to offers with high success rate', async () => {
      const highSuccessOffer = {
        id: 'high-success-offer',
        merchantId: 'merchant-123',
        offerCode: 'CODE1',
        title: 'High Success Offer',
        description: null,
        offerType: 'discount',
        discountType: null,
        discountValue: null,
        commissionRate: null,
        commissionAmount: null,
        minimumPurchase: null,
        maximumDiscount: null,
        currency: 'USD',
        startDate: null,
        endDate: null,
        isExclusive: false,
        isVerified: true,
        isFeatured: false,
        usageCount: 1000,
        successRate: 0.95,
        lastVerifiedAt: new Date(),
        status: 'active',
        categories: [],
        tags: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const lowSuccessOffer = {
        id: 'low-success-offer',
        merchantId: 'merchant-123',
        offerCode: 'CODE2',
        title: 'Low Success Offer',
        description: null,
        offerType: 'discount',
        discountType: null,
        discountValue: null,
        commissionRate: null,
        commissionAmount: null,
        minimumPurchase: null,
        maximumDiscount: null,
        currency: 'USD',
        startDate: null,
        endDate: null,
        isExclusive: false,
        isVerified: true,
        isFeatured: false,
        usageCount: 1000,
        successRate: 0.3,
        lastVerifiedAt: new Date(),
        status: 'active',
        categories: [],
        tags: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const highScore = await service.calculateOfferScore(highSuccessOffer as any);
      const lowScore = await service.calculateOfferScore(lowSuccessOffer as any);

      expect(highScore.score).toBeGreaterThan(lowScore.score);
    });
  });
});
