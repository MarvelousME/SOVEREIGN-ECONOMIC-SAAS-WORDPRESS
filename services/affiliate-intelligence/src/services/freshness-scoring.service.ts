import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/database';
import {
  FreshnessScore,
  EntityType,
  FreshnessFactor,
  FreshnessBreakdown,
  AffiliateLink,
  Offer,
  Merchant,
} from '../types';
import { eventPublisher } from './event-publisher';
import logger from '../utils/logger';
import { config } from '../config';

export class FreshnessScoringService {
  private readonly DECAY_HOURS = config.affiliate.freshnessDecayHours;
  private readonly MIN_SCORE = config.affiliate.minFreshnessScore;

  async calculateLinkScore(link: AffiliateLink): Promise<FreshnessScore> {
    const factors: FreshnessFactor[] = [];
    const now = new Date();

    const hoursSinceCreation = (now.getTime() - new Date(link.firstSeenAt).getTime()) / (1000 * 60 * 60);
    const recencyScore = Math.max(0, 1 - (hoursSinceCreation / (this.DECAY_HOURS * 24 * 7)));
    factors.push({
      name: 'recency',
      weight: 0.4,
      value: recencyScore,
      contribution: recencyScore * 0.4,
    });

    const clickScore = Math.min(1, link.clickCount / 100);
    factors.push({
      name: 'activity',
      weight: 0.3,
      value: clickScore,
      contribution: clickScore * 0.3,
    });

    const metadataScore = link.merchantId ? 0.2 : 0;
    const offerScore = link.offerId ? 0.2 : 0;
    const completenessScore = metadataScore + offerScore;
    factors.push({
      name: 'completeness',
      weight: 0.2,
      value: completenessScore,
      contribution: completenessScore * 0.2,
    });

    const lastClickHours = link.lastClickedAt
      ? (now.getTime() - new Date(link.lastClickedAt).getTime()) / (1000 * 60 * 60)
      : hoursSinceCreation;
    const activityRecencyScore = Math.max(0, 1 - (lastClickHours / (this.DECAY_HOURS * 24)));
    factors.push({
      name: 'activity_recency',
      weight: 0.1,
      value: activityRecencyScore,
      contribution: activityRecencyScore * 0.1,
    });

    const totalScore = factors.reduce((sum, f) => sum + f.contribution, 0);
    const normalizedScore = Math.max(this.MIN_SCORE, Math.min(1, totalScore));

    const breakdown: FreshnessBreakdown = {
      recency: recencyScore,
      accuracy: clickScore,
      completeness: completenessScore,
      activity: activityRecencyScore,
    };

    return this.createFreshnessScore(
      EntityType.LINK,
      link.id,
      normalizedScore,
      factors,
      breakdown
    );
  }

  async calculateMerchantScore(merchant: Merchant): Promise<FreshnessScore> {
    const factors: FreshnessFactor[] = [];
    const now = new Date();

    const hoursSinceUpdate = (now.getTime() - new Date(merchant.updatedAt).getTime()) / (1000 * 60 * 60);
    const recencyScore = Math.max(0, 1 - (hoursSinceUpdate / (this.DECAY_HOURS * 24 * 14)));
    factors.push({
      name: 'recency',
      weight: 0.3,
      value: recencyScore,
      contribution: recencyScore * 0.3,
    });

    const verificationScore = merchant.isVerified ? 1 : 0.3;
    factors.push({
      name: 'verification',
      weight: 0.25,
      value: verificationScore,
      contribution: verificationScore * 0.25,
    });

    const commissionScore = merchant.averageCommission
      ? Math.min(1, (merchant.averageCommission as number) / 0.2)
      : 0;
    factors.push({
      name: 'commission_quality',
      weight: 0.25,
      value: commissionScore,
      contribution: commissionScore * 0.25,
    });

    const categoryScore = merchant.categories.length > 0 ? 0.7 : 0.2;
    factors.push({
      name: 'completeness',
      weight: 0.2,
      value: categoryScore,
      contribution: categoryScore * 0.2,
    });

    const totalScore = factors.reduce((sum, f) => sum + f.contribution, 0);
    const normalizedScore = Math.max(this.MIN_SCORE, Math.min(1, totalScore));

    const breakdown: FreshnessBreakdown = {
      recency: recencyScore,
      accuracy: verificationScore,
      completeness: categoryScore,
      activity: commissionScore,
    };

    return this.createFreshnessScore(
      EntityType.MERCHANT,
      merchant.id,
      normalizedScore,
      factors,
      breakdown
    );
  }

  async calculateOfferScore(offer: Offer): Promise<FreshnessScore> {
    const factors: FreshnessFactor[] = [];
    const now = new Date();

    const endDateScore = offer.endDate
      ? Math.max(0, (new Date(offer.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30))
      : 0.5;
    factors.push({
      name: 'expiration_urgency',
      weight: 0.35,
      value: endDateScore,
      contribution: endDateScore * 0.35,
    });

    const verificationScore = offer.isVerified ? 1 : 0.4;
    factors.push({
      name: 'verification',
      weight: 0.25,
      value: verificationScore,
      contribution: verificationScore * 0.25,
    });

    const successScore = offer.successRate ? (offer.successRate as number) : 0.5;
    factors.push({
      name: 'success_rate',
      weight: 0.2,
      value: successScore,
      contribution: successScore * 0.2,
    });

    const usageScore = Math.min(1, offer.usageCount / 1000);
    factors.push({
      name: 'usage_engagement',
      weight: 0.1,
      value: usageScore,
      contribution: usageScore * 0.1,
    });

    const featuredScore = offer.isFeatured ? 1 : 0;
    factors.push({
      name: 'featured_status',
      weight: 0.1,
      value: featuredScore,
      contribution: featuredScore * 0.1,
    });

    const totalScore = factors.reduce((sum, f) => sum + f.contribution, 0);
    const normalizedScore = Math.max(this.MIN_SCORE, Math.min(1, totalScore));

    const breakdown: FreshnessBreakdown = {
      recency: endDateScore,
      accuracy: verificationScore,
      completeness: successScore,
      activity: usageScore,
    };

    return this.createFreshnessScore(
      EntityType.OFFER,
      offer.id,
      normalizedScore,
      factors,
      breakdown
    );
  }

  async getScore(entityType: EntityType, entityId: string): Promise<FreshnessScore | null> {
    const row = await db.queryOne<any>(
      `SELECT * FROM freshness_scores
       WHERE entity_type = $1 AND entity_id = $2 AND expires_at > NOW()`,
      [entityType, entityId]
    );

    if (row) {
      return this.mapRowToScore(row);
    }

    return null;
  }

  async refreshScore(entityType: EntityType, entityId: string): Promise<FreshnessScore> {
    let score: FreshnessScore;

    switch (entityType) {
      case EntityType.LINK: {
        const link = await db.queryOne<any>(
          'SELECT * FROM affiliate_links WHERE id = $1',
          [entityId]
        );
        if (!link) throw new Error('Link not found');
        score = await this.calculateLinkScore(this.mapRowToLink(link));
        break;
      }
      case EntityType.MERCHANT: {
        const merchant = await db.queryOne<any>(
          'SELECT * FROM merchants WHERE id = $1',
          [entityId]
        );
        if (!merchant) throw new Error('Merchant not found');
        score = await this.calculateMerchantScore(this.mapRowToMerchant(merchant));
        break;
      }
      case EntityType.OFFER: {
        const offer = await db.queryOne<any>(
          'SELECT * FROM offers WHERE id = $1',
          [entityId]
        );
        if (!offer) throw new Error('Offer not found');
        score = await this.calculateOfferScore(this.mapRowToOffer(offer));
        break;
      }
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }

    await this.storeScore(score);
    await eventPublisher.publishFreshnessScored(entityType, entityId, score);

    return score;
  }

  async cleanupExpiredScores(): Promise<number> {
    const result = await db.query(
      'DELETE FROM freshness_scores WHERE expires_at < NOW()'
    );
    const count = (result as any).rowCount || 0;
    if (count > 0) {
      logger.info('Cleaned up expired freshness scores', { count });
    }
    return count;
  }

  private async createFreshnessScore(
    entityType: EntityType,
    entityId: string,
    score: number,
    factors: FreshnessFactor[],
    breakdown: FreshnessBreakdown
  ): Promise<FreshnessScore> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.DECAY_HOURS);

    return {
      id: uuidv4(),
      entityType,
      entityId,
      score,
      factors,
      breakdown,
      calculatedAt: new Date(),
      expiresAt,
      metadata: {},
    };
  }

  private async storeScore(score: FreshnessScore): Promise<void> {
    await db.query(
      `INSERT INTO freshness_scores (id, entity_type, entity_id, score, factors, breakdown, expires_at, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (entity_type, entity_id)
       DO UPDATE SET score = $4, factors = $5, breakdown = $6, calculated_at = NOW(), expires_at = $7`,
      [
        score.id,
        score.entityType,
        score.entityId,
        score.score,
        JSON.stringify(score.factors),
        JSON.stringify(score.breakdown),
        score.expiresAt,
        JSON.stringify(score.metadata),
      ]
    );
  }

  private mapRowToScore(row: any): FreshnessScore {
    return {
      id: row.id,
      entityType: row.entity_type as EntityType,
      entityId: row.entity_id,
      score: parseFloat(row.score),
      factors: JSON.parse(row.factors),
      breakdown: row.breakdown ? JSON.parse(row.breakdown) : null,
      calculatedAt: row.calculated_at,
      expiresAt: row.expires_at,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
    };
  }

  private mapRowToLink(row: any): AffiliateLink {
    return {
      id: row.id,
      originalUrl: row.original_url,
      normalizedUrl: row.normalized_url,
      merchantId: row.merchant_id,
      productId: row.product_id,
      offerId: row.offer_id,
      userId: row.user_id,
      status: row.status,
      trackingParameters: row.tracking_parameters ? JSON.parse(row.tracking_parameters) : {},
      strippedParameters: row.stripped_parameters ? JSON.parse(row.stripped_parameters) : {},
      urlHash: row.url_hash,
      clickCount: row.click_count,
      lastClickedAt: row.last_clicked_at,
      firstSeenAt: row.first_seen_at,
      lastUpdatedAt: row.last_updated_at,
      freshnessScore: row.freshness_score ? parseFloat(row.freshness_score) : null,
      provenance: row.provenance ? JSON.parse(row.provenance) : {},
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToMerchant(row: any): Merchant {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      network: row.network,
      websiteUrl: row.website_url,
      logoUrl: row.logo_url,
      description: row.description,
      categories: row.categories || [],
      commissionRules: row.commission_rules ? JSON.parse(row.commission_rules) : [],
      averageCommission: row.average_commission ? parseFloat(row.average_commission) : null,
      commissionType: row.commission_type,
      payoutThreshold: row.payout_threshold ? parseFloat(row.payout_threshold) : null,
      payoutFrequency: row.payout_frequency,
      cookieDuration: row.cookie_duration,
      isVerified: row.is_verified,
      isActive: row.is_active,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToOffer(row: any): Offer {
    return {
      id: row.id,
      merchantId: row.merchant_id,
      offerCode: row.offer_code,
      title: row.title,
      description: row.description,
      offerType: row.offer_type,
      discountType: row.discount_type,
      discountValue: row.discount_value ? parseFloat(row.discount_value) : null,
      commissionRate: row.commission_rate ? parseFloat(row.commission_rate) : null,
      commissionAmount: row.commission_amount ? parseFloat(row.commission_amount) : null,
      minimumPurchase: row.minimum_purchase ? parseFloat(row.minimum_purchase) : null,
      maximumDiscount: row.maximum_discount ? parseFloat(row.maximum_discount) : null,
      currency: row.currency || 'USD',
      startDate: row.start_date,
      endDate: row.end_date,
      isExclusive: row.is_exclusive,
      isVerified: row.is_verified,
      isFeatured: row.is_featured,
      usageCount: row.usage_count,
      successRate: row.success_rate ? parseFloat(row.success_rate) : null,
      lastVerifiedAt: row.last_verified_at,
      status: row.status,
      categories: row.categories || [],
      tags: row.tags || [],
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const freshnessScoringService = new FreshnessScoringService();
