import { db } from '../utils/database';
import {
  AffiliateOpportunity,
} from '../types';

export class OpportunityService {
  async findOpportunities(options: {
    limit?: number;
    offset?: number;
    merchantId?: string;
    minCommission?: number;
    minFreshnessScore?: number;
    categories?: string[];
  }): Promise<{ opportunities: AffiliateOpportunity[]; total: number }> {
    const { limit = 50, offset = 0, merchantId, minCommission = 0, categories } = options;

    let whereClause = `
      WHERE o.status = 'active'
      AND (o.end_date IS NULL OR o.end_date > NOW())
      AND (o.start_date IS NULL OR o.start_date <= NOW())
      AND o.commission_rate >= $1
    `;
    const params: any[] = [minCommission];
    let paramIndex = 2;

    if (merchantId) {
      whereClause += ` AND o.merchant_id = $${paramIndex++}`;
      params.push(merchantId);
    }

    if (categories && categories.length > 0) {
      whereClause += ` AND o.categories && $${paramIndex++}`;
      params.push(categories);
    }

    const countResult = await db.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM offers o ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.count || '0', 10);

    params.push(limit);
    const limitIndex = paramIndex++;
    params.push(offset);
    const offsetIndex = paramIndex++;
    const rows = await db.query<any>(`
      SELECT
        o.id as offer_id,
        o.merchant_id,
        o.title,
        o.commission_rate,
        o.commission_amount,
        o.success_rate,
        o.discount_value,
        o.is_verified,
        o.is_featured,
        o.categories,
        m.name as merchant_name,
        m.average_commission as merchant_commission,
        m.slug as merchant_slug,
        fs.score as freshness_score
      FROM offers o
      JOIN merchants m ON o.merchant_id = m.id
      LEFT JOIN freshness_scores fs ON fs.entity_type = 'offer' AND fs.entity_id = o.id
      ${whereClause}
      ORDER BY
        o.is_featured DESC,
        fs.score DESC NULLS LAST,
        o.success_rate DESC NULLS LAST,
        o.commission_rate DESC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `, params);

    const opportunities: AffiliateOpportunity[] = rows.map(row => this.mapToOpportunity(row));

    return { opportunities, total };
  }

  async getTopOpportunities(limit: number = 20): Promise<AffiliateOpportunity[]> {
    const { opportunities } = await this.findOpportunities({
      limit,
      minFreshnessScore: 0.5,
    });
    return opportunities;
  }

  async rankLinksForOpportunities(linkIds: string[]): Promise<AffiliateOpportunity[]> {
    if (linkIds.length === 0) return [];

    const links = await db.query<any>(`
      SELECT
        al.id as link_id,
        al.merchant_id,
        al.offer_id,
        al.freshness_score,
        al.normalized_url,
        m.name as merchant_name,
        m.average_commission as merchant_commission,
        o.title as offer_title,
        o.commission_rate as offer_commission_rate,
        o.success_rate as offer_success_rate,
        o.is_featured as offer_is_featured
      FROM affiliate_links al
      JOIN merchants m ON al.merchant_id = m.id
      LEFT JOIN offers o ON al.offer_id = o.id
      WHERE al.id = ANY($1)
      AND al.status = 'active'
    `, [linkIds]);

    const opportunities: AffiliateOpportunity[] = links.map(row => this.mapLinkToOpportunity(row));

    return opportunities.sort((a, b) => b.totalScore - a.totalScore);
  }

  private mapToOpportunity(row: any): AffiliateOpportunity {
    const freshnessScore = row.freshness_score ? parseFloat(row.freshness_score) : 0.5;
    const commissionRate = row.commission_rate ? parseFloat(row.commission_rate) : 0;
    const merchantCommission = row.merchant_commission ? parseFloat(row.merchant_commission) : 0;
    const successRate = row.success_rate ? parseFloat(row.success_rate) : 0.5;

    const totalScore = this.calculateTotalScore({
      freshnessScore,
      commissionRate,
      merchantCommission,
      successRate,
      isVerified: row.is_verified,
      isFeatured: row.is_featured,
    });

    const reasons = this.generateReasons(row);

    return {
      linkId: row.offer_id,
      merchantId: row.merchant_id,
      merchantName: row.merchant_name,
      offerId: row.offer_id,
      offerTitle: row.title,
      commissionRate,
      commissionAmount: row.commission_amount ? parseFloat(row.commission_amount) : null,
      freshnessScore,
      merchantCommission,
      offerSuccessRate: successRate,
      totalScore,
      reasons,
    };
  }

  private mapLinkToOpportunity(row: any): AffiliateOpportunity {
    const freshnessScore = row.freshness_score ? parseFloat(row.freshness_score) : 0.5;
    const commissionRate = row.offer_commission_rate ? parseFloat(row.offer_commission_rate) : 0;
    const merchantCommission = row.merchant_commission ? parseFloat(row.merchant_commission) : 0;
    const successRate = row.offer_success_rate ? parseFloat(row.offer_success_rate) : 0.5;

    const totalScore = this.calculateTotalScore({
      freshnessScore,
      commissionRate,
      merchantCommission,
      successRate,
      isVerified: false,
      isFeatured: row.offer_is_featured || false,
    });

    const reasons: string[] = [];
    if (freshnessScore > 0.7) reasons.push('High link freshness');
    if (commissionRate > 0.1) reasons.push('High commission rate');
    if (merchantCommission > 0.1) reasons.push('High merchant commission');
    if (successRate > 0.7) reasons.push('High success rate');

    return {
      linkId: row.link_id,
      merchantId: row.merchant_id,
      merchantName: row.merchant_name,
      offerId: row.offer_id,
      offerTitle: row.offer_title || 'No specific offer',
      commissionRate,
      commissionAmount: null,
      freshnessScore,
      merchantCommission,
      offerSuccessRate: successRate,
      totalScore,
      reasons,
    };
  }

  private calculateTotalScore(params: {
    freshnessScore: number;
    commissionRate: number;
    merchantCommission: number;
    successRate: number;
    isVerified: boolean;
    isFeatured: boolean;
  }): number {
    let score = 0;

    score += params.freshnessScore * 0.25;
    score += Math.min(params.commissionRate * 5, 1) * 0.25;
    score += Math.min(params.merchantCommission * 5, 1) * 0.15;
    score += params.successRate * 0.2;
    score += params.isVerified ? 0.1 : 0;
    score += params.isFeatured ? 0.05 : 0;

    return Math.min(1, score);
  }

  private generateReasons(row: any): string[] {
    const reasons: string[] = [];

    if (row.is_featured) {
      reasons.push('Featured offer');
    }
    if (row.is_verified) {
      reasons.push('Verified offer');
    }
    if (parseFloat(row.discount_value) > 20) {
      reasons.push(`High discount: ${row.discount_value}%`);
    }
    if (row.freshness_score && parseFloat(row.freshness_score) > 0.7) {
      reasons.push('Fresh/Recent data');
    }
    if (row.success_rate && parseFloat(row.success_rate) > 0.7) {
      reasons.push('High success rate');
    }

    return reasons;
  }
}

export const opportunityService = new OpportunityService();
