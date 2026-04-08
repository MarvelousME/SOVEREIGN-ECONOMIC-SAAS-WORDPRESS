import { Pool, QueryResult } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import {
  Business,
  BusinessStatus,
  BusinessTemplate,
  CreateBusinessRequest,
  UpdateBusinessRequest,
  BusinessMetrics,
} from '../types';

export class BusinessModel {
  constructor(private db: Pool) {}

  async create(tenantId: string, userId: string, data: CreateBusinessRequest): Promise<Business> {
    const id = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO businesses (
        id, tenant_id, user_id, template, name, description, status,
        domain, integrations, revenue, analytics, features,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const domain = {
      subdomain: data.domain.subdomain,
      customDomain: data.domain.customDomain,
      sslEnabled: false,
    };

    const integrations = {};
    const revenue = { total: 0, platformFee: 0, lastUpdated: now };
    const analytics = {
      visitors: 0,
      conversions: 0,
      conversionRate: 0,
      revenue: 0,
      period: 'week' as const,
    };
    const features = {
      abTesting: false,
      advancedAnalytics: false,
      premiumTemplates: false,
      customIntegrations: false,
    };

    const values = [
      id,
      tenantId,
      userId,
      data.template,
      data.name,
      data.description,
      BusinessStatus.DRAFT,
      JSON.stringify(domain),
      JSON.stringify(integrations),
      JSON.stringify(revenue),
      JSON.stringify(analytics),
      JSON.stringify(features),
      now,
      now,
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToBusiness(result.rows[0]);
  }

  async findById(tenantId: string, id: string): Promise<Business | null> {
    const query = 'SELECT * FROM businesses WHERE id = $1 AND tenant_id = $2';
    const result = await this.db.query(query, [id, tenantId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToBusiness(result.rows[0]);
  }

  async findByUserId(tenantId: string, userId: string, limit = 50, offset = 0): Promise<Business[]> {
    const query = `
      SELECT * FROM businesses
      WHERE user_id = $1 AND tenant_id = $2
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4
    `;
    const result = await this.db.query(query, [userId, tenantId, limit, offset]);

    return result.rows.map((row) => this.mapRowToBusiness(row));
  }

  async findByTenant(tenantId: string, limit = 50, offset = 0): Promise<Business[]> {
    const query = `
      SELECT * FROM businesses
      WHERE tenant_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await this.db.query(query, [tenantId, limit, offset]);
    return result.rows.map((row) => this.mapRowToBusiness(row));
  }

  async findBySubdomain(tenantId: string, subdomain: string): Promise<Business | null> {
    const query = `
      SELECT * FROM businesses
      WHERE tenant_id = $1 AND domain->>'subdomain' = $2
      LIMIT 1
    `;
    const result = await this.db.query(query, [tenantId, subdomain]);
    if (result.rows.length === 0) return null;
    return this.mapRowToBusiness(result.rows[0]);
  }

  async update(tenantId: string, id: string, data: UpdateBusinessRequest): Promise<Business | null> {
    const business = await this.findById(tenantId, id);
    if (!business) {
      return null;
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(data.name);
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(data.description);
    }

    if (data.status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(data.status);
    }

    if (data.branding !== undefined) {
      const newBranding = { ...business.branding, ...data.branding };
      updates.push(`branding = $${paramCount++}`);
      values.push(JSON.stringify(newBranding));
    }

    if (data.integrations !== undefined) {
      const newIntegrations = { ...business.integrations, ...data.integrations };
      updates.push(`integrations = $${paramCount++}`);
      values.push(JSON.stringify(newIntegrations));
    }

    if (data.features !== undefined) {
      const newFeatures = { ...business.features, ...data.features };
      updates.push(`features = $${paramCount++}`);
      values.push(JSON.stringify(newFeatures));
    }

    updates.push(`updated_at = $${paramCount++}`);
    values.push(new Date());

    values.push(id);
    values.push(tenantId);

    const query = `
      UPDATE businesses
      SET ${updates.join(', ')}
      WHERE id = $${paramCount++} AND tenant_id = $${paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return this.mapRowToBusiness(result.rows[0]);
  }

  async updateRevenue(tenantId: string, id: string, amount: number): Promise<void> {
    const platformFee = amount * 0.05;
    const query = `
      UPDATE businesses
      SET revenue = jsonb_set(
        jsonb_set(revenue, '{total}', to_jsonb((revenue->>'total')::numeric + $1)),
        '{platformFee}', to_jsonb((revenue->>'platformFee')::numeric + $2)
      ),
      updated_at = $3
      WHERE id = $4 AND tenant_id = $5
    `;
    await this.db.query(query, [amount, platformFee, new Date(), id, tenantId]);
  }

  async markAsDeployed(tenantId: string, id: string): Promise<void> {
    const query = `
      UPDATE businesses
      SET status = $1, deployed_at = $2, updated_at = $3
      WHERE id = $4 AND tenant_id = $5
    `;
    await this.db.query(query, [BusinessStatus.ACTIVE, new Date(), new Date(), id, tenantId]);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const query = 'DELETE FROM businesses WHERE id = $1 AND tenant_id = $2';
    const result = await this.db.query(query, [id, tenantId]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getMetrics(
    tenantId: string,
    businessId: string,
    period: 'day' | 'week' | 'month' | 'year',
    startDate?: Date,
    endDate?: Date
  ): Promise<BusinessMetrics | null> {
    const business = await this.findById(tenantId, businessId);
    if (!business) {
      return null;
    }

    const end = endDate || new Date();
    const start = startDate || this.calculateStartDate(period, end);

    const query = `
      SELECT
        COUNT(DISTINCT ba.visitor_id) as unique_visitors,
        COUNT(*) as page_views,
        SUM(CASE WHEN ba.converted = true THEN 1 ELSE 0 END) as conversions,
        SUM(CASE WHEN ba.converted = true THEN ba.revenue ELSE 0 END) as revenue,
        json_agg(DISTINCT jsonb_build_object('path', ba.page_path, 'views', ba.page_views)) as top_pages,
        json_agg(DISTINCT jsonb_build_object('source', ba.source, 'visitors', ba.page_views)) as traffic_sources,
        SUM(CASE WHEN ba.device = 'desktop' THEN 1 ELSE 0 END) as desktop,
        SUM(CASE WHEN ba.device = 'mobile' THEN 1 ELSE 0 END) as mobile,
        SUM(CASE WHEN ba.device = 'tablet' THEN 1 ELSE 0 END) as tablet
      FROM business_analytics ba
      INNER JOIN businesses b ON b.id = ba.business_id AND b.tenant_id = $1
      WHERE ba.business_id = $2 AND ba.timestamp >= $3 AND ba.timestamp <= $4
    `;

    const result: QueryResult = await this.db.query(query, [tenantId, businessId, start, end]);
    const row = result.rows[0];

    const uniqueVisitors = parseInt(row.unique_visitors) || 0;
    const pageViews = parseInt(row.page_views) || 0;
    const conversions = parseInt(row.conversions) || 0;
    const revenue = parseFloat(row.revenue) || 0;

    return {
      businessId,
      period,
      startDate: start,
      endDate: end,
      metrics: {
        visitors: uniqueVisitors,
        uniqueVisitors,
        pageViews,
        conversions,
        conversionRate: uniqueVisitors > 0 ? (conversions / uniqueVisitors) * 100 : 0,
        revenue,
        platformFee: revenue * 0.05,
        topPages: row.top_pages || [],
        trafficSources: row.traffic_sources || [],
        devices: {
          desktop: parseInt(row.desktop) || 0,
          mobile: parseInt(row.mobile) || 0,
          tablet: parseInt(row.tablet) || 0,
        },
      },
    };
  }

  private calculateStartDate(period: 'day' | 'week' | 'month' | 'year', endDate: Date): Date {
    const start = new Date(endDate);
    switch (period) {
      case 'day':
        start.setDate(start.getDate() - 1);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
    }
    return start;
  }

  private mapRowToBusiness(row: Record<string, unknown>): Business {
    const parseJson = <T>(v: unknown): T => (typeof v === 'string' ? JSON.parse(v) : v) as T;

    return {
      id: row.id as string,
      tenantId: (row.tenant_id as string) || '',
      userId: row.user_id as string,
      template: row.template as BusinessTemplate,
      name: row.name as string,
      description: row.description as string,
      status: row.status as BusinessStatus,
      branding: row.branding ? parseJson(row.branding) : undefined,
      domain: parseJson(row.domain),
      integrations: parseJson(row.integrations),
      funnels: row.funnels ? parseJson(row.funnels) : [],
      pages: row.pages ? parseJson(row.pages) : [],
      revenue: parseJson(row.revenue),
      analytics: parseJson(row.analytics),
      features: parseJson(row.features),
      subscription: row.subscription ? parseJson(row.subscription) : undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      deployedAt: row.deployed_at ? new Date(row.deployed_at as string) : undefined,
    };
  }
}

