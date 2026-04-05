import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/database';
import {
  AffiliateLink,
  LinkStatus,
  ProvenanceData,
} from '../types';
import { eventPublisher } from './event-publisher';
import { freshnessScoringService } from './freshness-scoring.service';
import { EntityType } from '../types';
import logger from '../utils/logger';

export class AffiliateLinkService {
  async findById(id: string): Promise<AffiliateLink | null> {
    const row = await db.queryOne<any>(
      'SELECT * FROM affiliate_links WHERE id = $1',
      [id]
    );
    return row ? this.mapRowToLink(row) : null;
  }

  async findByUrlHash(urlHash: string): Promise<AffiliateLink | null> {
    const row = await db.queryOne<any>(
      'SELECT * FROM affiliate_links WHERE url_hash = $1',
      [urlHash]
    );
    return row ? this.mapRowToLink(row) : null;
  }

  async findAll(options: {
    limit?: number;
    offset?: number;
    merchantId?: string;
    offerId?: string;
    userId?: string;
    status?: LinkStatus;
    minFreshnessScore?: number;
  }): Promise<{ links: AffiliateLink[]; total: number }> {
    const {
      limit = 50,
      offset = 0,
      merchantId,
      offerId,
      userId,
      status,
      minFreshnessScore,
    } = options;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (merchantId) {
      whereClause += ` AND merchant_id = $${paramIndex++}`;
      params.push(merchantId);
    }
    if (offerId) {
      whereClause += ` AND offer_id = $${paramIndex++}`;
      params.push(offerId);
    }
    if (userId) {
      whereClause += ` AND user_id = $${paramIndex++}`;
      params.push(userId);
    }
    if (status) {
      whereClause += ` AND status = $${paramIndex++}`;
      params.push(status);
    }
    if (minFreshnessScore !== undefined) {
      whereClause += ` AND freshness_score >= $${paramIndex++}`;
      params.push(minFreshnessScore);
    }

    const countResult = await db.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM affiliate_links ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.count || '0', 10);

    params.push(limit, offset);
    const rows = await db.query<any>(
      `SELECT * FROM affiliate_links ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    return {
      links: rows.map(row => this.mapRowToLink(row)),
      total,
    };
  }

  async create(data: {
    originalUrl: string;
    normalizedUrl: string;
    urlHash: string;
    merchantId?: string;
    productId?: string;
    offerId?: string;
    userId?: string;
    trackingParameters?: Record<string, string>;
    strippedParameters?: Record<string, string>;
    provenance?: ProvenanceData;
    metadata?: Record<string, any>;
  }): Promise<AffiliateLink> {
    const id = uuidv4();
    const now = new Date();

    const row = await db.queryOne<any>(
      `INSERT INTO affiliate_links (
        id, original_url, normalized_url, url_hash, merchant_id, product_id, offer_id,
        user_id, tracking_parameters, stripped_parameters, provenance, metadata,
        first_seen_at, last_updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        id,
        data.originalUrl,
        data.normalizedUrl,
        data.urlHash,
        data.merchantId || null,
        data.productId || null,
        data.offerId || null,
        data.userId || null,
        JSON.stringify(data.trackingParameters || {}),
        JSON.stringify(data.strippedParameters || {}),
        JSON.stringify(data.provenance || {}),
        JSON.stringify(data.metadata || {}),
        now,
        now,
      ]
    );

    const link = this.mapRowToLink(row);

    try {
      const freshnessScore = await freshnessScoringService.calculateLinkScore(link);
      await this.updateFreshnessScore(link.id, freshnessScore.score);
      link.freshnessScore = freshnessScore.score;
    } catch (error) {
      logger.error('Failed to calculate freshness score for new link', { linkId: id, error });
    }

    await eventPublisher.publishLinkIngested(link);

    return link;
  }

  async update(id: string, data: Partial<AffiliateLink>): Promise<AffiliateLink | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.normalizedUrl !== undefined) {
      updates.push(`normalized_url = $${paramIndex++}`);
      params.push(data.normalizedUrl);
    }
    if (data.merchantId !== undefined) {
      updates.push(`merchant_id = $${paramIndex++}`);
      params.push(data.merchantId);
    }
    if (data.productId !== undefined) {
      updates.push(`product_id = $${paramIndex++}`);
      params.push(data.productId);
    }
    if (data.offerId !== undefined) {
      updates.push(`offer_id = $${paramIndex++}`);
      params.push(data.offerId);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(data.status);
    }
    if (data.trackingParameters !== undefined) {
      updates.push(`tracking_parameters = $${paramIndex++}`);
      params.push(JSON.stringify(data.trackingParameters));
    }
    if (data.strippedParameters !== undefined) {
      updates.push(`stripped_parameters = $${paramIndex++}`);
      params.push(JSON.stringify(data.strippedParameters));
    }
    if (data.freshnessScore !== undefined) {
      updates.push(`freshness_score = $${paramIndex++}`);
      params.push(data.freshnessScore);
    }
    if (data.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      params.push(JSON.stringify(data.metadata));
    }

    if (updates.length === 0) {
      return existing;
    }

    params.push(id);
    const row = await db.queryOne<any>(
      `UPDATE affiliate_links SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    return row ? this.mapRowToLink(row) : null;
  }

  async recordClick(id: string): Promise<AffiliateLink | null> {
    const row = await db.queryOne<any>(
      `UPDATE affiliate_links
       SET click_count = click_count + 1, last_clicked_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (row) {
      const link = this.mapRowToLink(row);
      try {
        const freshnessScore = await freshnessScoringService.refreshScore(EntityType.LINK, id);
        await this.updateFreshnessScore(id, freshnessScore.score);
        link.freshnessScore = freshnessScore.score;
      } catch (error) {
        logger.error('Failed to refresh freshness score after click', { linkId: id, error });
      }
      return link;
    }

    return null;
  }

  async updateFreshnessScore(id: string, score: number): Promise<void> {
    await db.query(
      'UPDATE affiliate_links SET freshness_score = $1 WHERE id = $2',
      [score, id]
    );
  }

  async markExpired(): Promise<number> {
    const result = await db.query(
      `UPDATE affiliate_links
       SET status = 'expired'
       WHERE status = 'active'
       AND freshness_score < $1`,
      [0.3]
    );
    const count = (result as any).rowCount || 0;
    if (count > 0) {
      logger.info('Marked expired links', { count });
    }
    return count;
  }

  async findConflicting(normalizedUrl: string): Promise<AffiliateLink[]> {
    const rows = await db.query<any>(
      `SELECT * FROM affiliate_links
       WHERE normalized_url = $1 AND status = 'active'
       ORDER BY freshness_score DESC`,
      [normalizedUrl]
    );
    return rows.map(row => this.mapRowToLink(row));
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.query(
      'DELETE FROM affiliate_links WHERE id = $1',
      [id]
    );
    return (result as any).rowCount > 0;
  }

  async getStats(): Promise<{
    total: number;
    active: number;
    expired: number;
    conflict: number;
    avgFreshnessScore: number;
  }> {
    const stats = await db.queryOne<any>(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'expired') as expired,
        COUNT(*) FILTER (WHERE status = 'conflict') as conflict,
        AVG(freshness_score) as avg_freshness_score
      FROM affiliate_links
    `);

    return {
      total: parseInt(stats?.total || '0', 10),
      active: parseInt(stats?.active || '0', 10),
      expired: parseInt(stats?.expired || '0', 10),
      conflict: parseInt(stats?.conflict || '0', 10),
      avgFreshnessScore: stats?.avg_freshness_score ? parseFloat(stats.avg_freshness_score) : 0,
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
      status: row.status as LinkStatus,
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
}

export const affiliateLinkService = new AffiliateLinkService();
