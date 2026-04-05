import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/database';
import { Merchant, CommissionRule } from '../types';
import { eventPublisher } from './event-publisher';

export class MerchantService {
  async findById(id: string): Promise<Merchant | null> {
    const row = await db.queryOne<any>(
      'SELECT * FROM merchants WHERE id = $1',
      [id]
    );
    return row ? this.mapRowToMerchant(row) : null;
  }

  async findBySlug(slug: string): Promise<Merchant | null> {
    const row = await db.queryOne<any>(
      'SELECT * FROM merchants WHERE slug = $1',
      [slug]
    );
    return row ? this.mapRowToMerchant(row) : null;
  }

  async findByNetwork(network: string): Promise<Merchant[]> {
    const rows = await db.query<any>(
      'SELECT * FROM merchants WHERE network = $1 AND is_active = true ORDER BY name',
      [network]
    );
    return rows.map(row => this.mapRowToMerchant(row));
  }

  async findAll(options: {
    limit?: number;
    offset?: number;
    network?: string;
    category?: string;
    isActive?: boolean;
  }): Promise<{ merchants: Merchant[]; total: number }> {
    const { limit = 50, offset = 0, network, category, isActive = true } = options;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (network) {
      whereClause += ` AND network = $${paramIndex++}`;
      params.push(network);
    }

    if (category) {
      whereClause += ` AND $${paramIndex++} = ANY(categories)`;
      params.push(category);
    }

    if (isActive !== undefined) {
      whereClause += ` AND is_active = $${paramIndex++}`;
      params.push(isActive);
    }

    const countResult = await db.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM merchants ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.count || '0', 10);

    params.push(limit, offset);
    const rows = await db.query<any>(
      `SELECT * FROM merchants ${whereClause} ORDER BY name LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    return {
      merchants: rows.map(row => this.mapRowToMerchant(row)),
      total,
    };
  }

  async create(data: {
    name: string;
    slug?: string;
    network?: string;
    websiteUrl?: string;
    logoUrl?: string;
    description?: string;
    categories?: string[];
    commissionRules?: CommissionRule[];
    averageCommission?: number;
    commissionType?: string;
    payoutThreshold?: number;
    payoutFrequency?: string;
    cookieDuration?: number;
    metadata?: Record<string, any>;
  }): Promise<Merchant> {
    const id = uuidv4();
    const slug = data.slug || this.generateSlug(data.name);

    const row = await db.queryOne<any>(
      `INSERT INTO merchants (
        id, name, slug, network, website_url, logo_url, description,
        categories, commission_rules, average_commission, commission_type,
        payout_threshold, payout_frequency, cookie_duration, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        id,
        data.name,
        slug,
        data.network || null,
        data.websiteUrl || null,
        data.logoUrl || null,
        data.description || null,
        data.categories || [],
        JSON.stringify(data.commissionRules || []),
        data.averageCommission || null,
        data.commissionType || null,
        data.payoutThreshold || null,
        data.payoutFrequency || null,
        data.cookieDuration || null,
        JSON.stringify(data.metadata || {}),
      ]
    );

    const merchant = this.mapRowToMerchant(row);
    await eventPublisher.publishMerchantExtracted(merchant, 'api_create');
    return merchant;
  }

  async update(id: string, data: Partial<Merchant>): Promise<Merchant | null> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }
    if (data.slug !== undefined) {
      updates.push(`slug = $${paramIndex++}`);
      params.push(data.slug);
    }
    if (data.network !== undefined) {
      updates.push(`network = $${paramIndex++}`);
      params.push(data.network);
    }
    if (data.websiteUrl !== undefined) {
      updates.push(`website_url = $${paramIndex++}`);
      params.push(data.websiteUrl);
    }
    if (data.logoUrl !== undefined) {
      updates.push(`logo_url = $${paramIndex++}`);
      params.push(data.logoUrl);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(data.description);
    }
    if (data.categories !== undefined) {
      updates.push(`categories = $${paramIndex++}`);
      params.push(data.categories);
    }
    if (data.commissionRules !== undefined) {
      updates.push(`commission_rules = $${paramIndex++}`);
      params.push(JSON.stringify(data.commissionRules));
    }
    if (data.averageCommission !== undefined) {
      updates.push(`average_commission = $${paramIndex++}`);
      params.push(data.averageCommission);
    }
    if (data.commissionType !== undefined) {
      updates.push(`commission_type = $${paramIndex++}`);
      params.push(data.commissionType);
    }
    if (data.payoutThreshold !== undefined) {
      updates.push(`payout_threshold = $${paramIndex++}`);
      params.push(data.payoutThreshold);
    }
    if (data.payoutFrequency !== undefined) {
      updates.push(`payout_frequency = $${paramIndex++}`);
      params.push(data.payoutFrequency);
    }
    if (data.cookieDuration !== undefined) {
      updates.push(`cookie_duration = $${paramIndex++}`);
      params.push(data.cookieDuration);
    }
    if (data.isVerified !== undefined) {
      updates.push(`is_verified = $${paramIndex++}`);
      params.push(data.isVerified);
    }
    if (data.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(data.isActive);
    }
    if (data.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      params.push(JSON.stringify(data.metadata));
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    params.push(id);
    const row = await db.queryOne<any>(
      `UPDATE merchants SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    return row ? this.mapRowToMerchant(row) : null;
  }

  async findOrCreate(data: {
    name: string;
    slug?: string;
    network?: string;
    websiteUrl?: string;
  }): Promise<Merchant> {
    let merchant = await this.findBySlug(data.slug || this.generateSlug(data.name));

    if (!merchant) {
      merchant = await this.create(data);
    }

    return merchant;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.query(
      'DELETE FROM merchants WHERE id = $1',
      [id]
    );
    return (result as any).rowCount > 0;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 255);
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
}

export const merchantService = new MerchantService();
