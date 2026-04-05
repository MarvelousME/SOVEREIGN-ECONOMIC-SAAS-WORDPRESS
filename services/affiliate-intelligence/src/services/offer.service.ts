import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/database';
import {
  Offer,
  OfferSnapshot,
  OfferType,
  DiscountType,
  SnapshotReason,
} from '../types';
import { eventPublisher } from './event-publisher';
import logger from '../utils/logger';

export class OfferService {
  async findById(id: string): Promise<Offer | null> {
    const row = await db.queryOne<any>(
      'SELECT * FROM offers WHERE id = $1',
      [id]
    );
    return row ? this.mapRowToOffer(row) : null;
  }

  async findByCode(merchantId: string, offerCode: string): Promise<Offer | null> {
    const row = await db.queryOne<any>(
      'SELECT * FROM offers WHERE merchant_id = $1 AND offer_code = $2',
      [merchantId, offerCode]
    );
    return row ? this.mapRowToOffer(row) : null;
  }

  async findByMerchant(merchantId: string, options?: {
    activeOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ offers: Offer[]; total: number }> {
    const { activeOnly = true, limit = 50, offset = 0 } = options || {};

    let whereClause = 'WHERE merchant_id = $1';
    const params: any[] = [merchantId];

    if (activeOnly) {
      whereClause += ` AND status = 'active' AND (end_date IS NULL OR end_date > NOW())`;
    }

    const countResult = await db.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM offers ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.count || '0', 10);

    params.push(limit, offset);
    const rows = await db.query<any>(
      `SELECT * FROM offers ${whereClause} ORDER BY is_featured DESC, created_at DESC LIMIT $2 OFFSET $3`,
      params
    );

    return {
      offers: rows.map(row => this.mapRowToOffer(row)),
      total,
    };
  }

  async findAll(options: {
    limit?: number;
    offset?: number;
    merchantId?: string;
    offerType?: OfferType;
    status?: string;
    isVerified?: boolean;
    isFeatured?: boolean;
    categories?: string[];
    minDiscount?: number;
    search?: string;
  }): Promise<{ offers: Offer[]; total: number }> {
    const {
      limit = 50,
      offset = 0,
      merchantId,
      offerType,
      status = 'active',
      isVerified,
      isFeatured,
      categories,
      minDiscount,
      search,
    } = options;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (merchantId) {
      whereClause += ` AND merchant_id = $${paramIndex++}`;
      params.push(merchantId);
    }

    if (offerType) {
      whereClause += ` AND offer_type = $${paramIndex++}`;
      params.push(offerType);
    }

    if (status) {
      whereClause += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    if (isVerified !== undefined) {
      whereClause += ` AND is_verified = $${paramIndex++}`;
      params.push(isVerified);
    }

    if (isFeatured !== undefined) {
      whereClause += ` AND is_featured = $${paramIndex++}`;
      params.push(isFeatured);
    }

    if (categories && categories.length > 0) {
      whereClause += ` AND categories && $${paramIndex++}`;
      params.push(categories);
    }

    if (minDiscount !== undefined) {
      whereClause += ` AND discount_value >= $${paramIndex++}`;
      params.push(minDiscount);
    }

    if (search) {
      whereClause += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countResult = await db.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM offers ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.count || '0', 10);

    params.push(limit, offset);
    const rows = await db.query<any>(
      `SELECT * FROM offers ${whereClause} ORDER BY is_featured DESC, success_rate DESC NULLS LAST, created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    return {
      offers: rows.map(row => this.mapRowToOffer(row)),
      total,
    };
  }

  async create(data: {
    merchantId: string;
    offerCode?: string;
    title: string;
    description?: string;
    offerType: OfferType;
    discountType?: DiscountType;
    discountValue?: number;
    commissionRate?: number;
    commissionAmount?: number;
    minimumPurchase?: number;
    maximumDiscount?: number;
    currency?: string;
    startDate?: Date;
    endDate?: Date;
    isExclusive?: boolean;
    isVerified?: boolean;
    isFeatured?: boolean;
    categories?: string[];
    tags?: string[];
    metadata?: Record<string, any>;
  }): Promise<Offer> {
    const id = uuidv4();

    const row = await db.queryOne<any>(
      `INSERT INTO offers (
        id, merchant_id, offer_code, title, description, offer_type,
        discount_type, discount_value, commission_rate, commission_amount,
        minimum_purchase, maximum_discount, currency, start_date, end_date,
        is_exclusive, is_verified, is_featured, categories, tags, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *`,
      [
        id,
        data.merchantId,
        data.offerCode || null,
        data.title,
        data.description || null,
        data.offerType,
        data.discountType || null,
        data.discountValue || null,
        data.commissionRate || null,
        data.commissionAmount || null,
        data.minimumPurchase || null,
        data.maximumDiscount || null,
        data.currency || 'USD',
        data.startDate || null,
        data.endDate || null,
        data.isExclusive || false,
        data.isVerified || false,
        data.isFeatured || false,
        data.categories || [],
        data.tags || [],
        JSON.stringify(data.metadata || {}),
      ]
    );

    const offer = this.mapRowToOffer(row);
    await this.createSnapshot(offer, SnapshotReason.CREATED);
    await eventPublisher.publishOfferDetected(offer, 'api_create');

    return offer;
  }

  async update(id: string, data: Partial<Offer>): Promise<Offer | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      params.push(data.title);
    }
    if (data.offerCode !== undefined) {
      updates.push(`offer_code = $${paramIndex++}`);
      params.push(data.offerCode);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(data.description);
    }
    if (data.offerType !== undefined) {
      updates.push(`offer_type = $${paramIndex++}`);
      params.push(data.offerType);
    }
    if (data.discountType !== undefined) {
      updates.push(`discount_type = $${paramIndex++}`);
      params.push(data.discountType);
    }
    if (data.discountValue !== undefined) {
      updates.push(`discount_value = $${paramIndex++}`);
      params.push(data.discountValue);
    }
    if (data.commissionRate !== undefined) {
      updates.push(`commission_rate = $${paramIndex++}`);
      params.push(data.commissionRate);
    }
    if (data.commissionAmount !== undefined) {
      updates.push(`commission_amount = $${paramIndex++}`);
      params.push(data.commissionAmount);
    }
    if (data.minimumPurchase !== undefined) {
      updates.push(`minimum_purchase = $${paramIndex++}`);
      params.push(data.minimumPurchase);
    }
    if (data.maximumDiscount !== undefined) {
      updates.push(`maximum_discount = $${paramIndex++}`);
      params.push(data.maximumDiscount);
    }
    if (data.endDate !== undefined) {
      updates.push(`end_date = $${paramIndex++}`);
      params.push(data.endDate);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(data.status);
    }
    if (data.isVerified !== undefined) {
      updates.push(`is_verified = $${paramIndex++}`);
      params.push(data.isVerified);
    }
    if (data.isFeatured !== undefined) {
      updates.push(`is_featured = $${paramIndex++}`);
      params.push(data.isFeatured);
    }
    if (data.isExclusive !== undefined) {
      updates.push(`is_exclusive = $${paramIndex++}`);
      params.push(data.isExclusive);
    }
    if (data.categories !== undefined) {
      updates.push(`categories = $${paramIndex++}`);
      params.push(data.categories);
    }
    if (data.tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      params.push(data.tags);
    }
    if (data.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      params.push(JSON.stringify(data.metadata));
    }
    if (data.lastVerifiedAt !== undefined) {
      updates.push(`last_verified_at = $${paramIndex++}`);
      params.push(data.lastVerifiedAt);
    }

    if (updates.length === 0) {
      return existing;
    }

    params.push(id);
    const row = await db.queryOne<any>(
      `UPDATE offers SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    if (row) {
      const updated = this.mapRowToOffer(row);
      const changedFields = updates.map(u => u.split(' = ')[0]);
      await this.createSnapshot(updated, SnapshotReason.UPDATED, changedFields);
      await eventPublisher.publishOfferUpdated(updated, existing);
      return updated;
    }

    return null;
  }

  async createSnapshot(offer: Offer, reason: SnapshotReason, changedFields?: string[]): Promise<OfferSnapshot> {
    const versionResult = await db.queryOne<{ max_version: number }>(
      'SELECT COALESCE(MAX(version), 0) as max_version FROM offer_snapshots WHERE offer_id = $1',
      [offer.id]
    );
    const nextVersion = (versionResult?.max_version || 0) + 1;

    const row = await db.queryOne<any>(
      `INSERT INTO offer_snapshots (
        id, offer_id, version, title, description, discount_type,
        discount_value, commission_rate, commission_amount, minimum_purchase,
        maximum_discount, start_date, end_date, status, snapshot_reason, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        uuidv4(),
        offer.id,
        nextVersion,
        offer.title,
        offer.description,
        offer.discountType,
        offer.discountValue,
        offer.commissionRate,
        offer.commissionAmount,
        offer.minimumPurchase,
        offer.maximumDiscount,
        offer.startDate,
        offer.endDate,
        offer.status,
        reason,
        JSON.stringify({ changedFields }),
      ]
    );

    return this.mapRowToSnapshot(row);
  }

  async getSnapshots(offerId: string): Promise<OfferSnapshot[]> {
    const rows = await db.query<any>(
      'SELECT * FROM offer_snapshots WHERE offer_id = $1 ORDER BY version DESC',
      [offerId]
    );
    return rows.map(row => this.mapRowToSnapshot(row));
  }

  async findActiveOffers(limit: number = 20): Promise<Offer[]> {
    const rows = await db.query<any>(
      `SELECT * FROM offers
       WHERE status = 'active'
       AND (end_date IS NULL OR end_date > NOW())
       AND (start_date IS NULL OR start_date <= NOW())
       ORDER BY is_featured DESC, success_rate DESC NULLS LAST, created_at DESC
       LIMIT $1`,
      [limit]
    );
    return rows.map(row => this.mapRowToOffer(row));
  }

  async incrementUsage(id: string): Promise<void> {
    await db.query(
      'UPDATE offers SET usage_count = usage_count + 1 WHERE id = $1',
      [id]
    );
  }

  async updateSuccessRate(id: string, success: boolean): Promise<void> {
    await db.query(
      `UPDATE offers SET
        success_rate = COALESCE(
          (success_rate * usage_count + ($2::boolean)::int) / (usage_count + 1),
          $2::int::decimal
        ),
        usage_count = usage_count + 1
       WHERE id = $1`,
      [id, success]
    );
  }

  async checkExpiredOffers(): Promise<number> {
    const result = await db.query(
      `UPDATE offers SET status = 'expired'
       WHERE status = 'active' AND end_date IS NOT NULL AND end_date < NOW()`
    );
    const count = (result as any).rowCount || 0;
    if (count > 0) {
      logger.info('Expired offers marked', { count });
    }
    return count;
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

  private mapRowToSnapshot(row: any): OfferSnapshot {
    return {
      id: row.id,
      offerId: row.offer_id,
      version: row.version,
      title: row.title,
      description: row.description,
      discountType: row.discount_type,
      discountValue: row.discount_value ? parseFloat(row.discount_value) : null,
      commissionRate: row.commission_rate ? parseFloat(row.commission_rate) : null,
      commissionAmount: row.commission_amount ? parseFloat(row.commission_amount) : null,
      minimumPurchase: row.minimum_purchase ? parseFloat(row.minimum_purchase) : null,
      maximumDiscount: row.maximum_discount ? parseFloat(row.maximum_discount) : null,
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status,
      priceAtSnapshot: row.price_at_snapshot ? parseFloat(row.price_at_snapshot) : null,
      commissionAtSnapshot: row.commission_at_snapshot ? parseFloat(row.commission_at_snapshot) : null,
      snapshotReason: row.snapshot_reason as SnapshotReason,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      createdAt: row.created_at,
    };
  }
}

export const offerService = new OfferService();
