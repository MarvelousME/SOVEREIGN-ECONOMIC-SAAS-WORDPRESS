import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config';
import { 
  AttributionModelType, 
  AttributionCredit, 
  AttributionResult, 
  AttributionTouchpoint,
  Conversion 
} from '../types';
import { emitAnalyticsEvent } from '../utils/logger';
import logger from '../utils/logger';

interface TouchpointRow {
  id: string;
  touchpoint_type: string;
  first_interaction_at: Date;
  last_interaction_at: Date;
  visitor_id: string;
  session_id: string;
  channel: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  conversion_id: string | null;
}

interface ConversionRow {
  id: string;
  conversion_type: string;
  conversion_value: number;
  revenue: number;
  visitor_id: string;
  session_id: string;
  conversion_date: Date;
}

export class AttributionEngine {
  private readonly DEFAULT_DECAY_FACTOR = 0.5;
  private readonly POSITION_BASED_FIRST_WEIGHT = 0.4;
  private readonly POSITION_BASED_LAST_WEIGHT = 0.4;

  async calculateAttribution(
    conversionId: string,
    modelType: AttributionModelType
  ): Promise<AttributionResult> {
    const touchpoints = await this.getTouchpointsForConversion(conversionId);
    const credits = this.applyAttributionModel(touchpoints, modelType);
    const totalCredits = credits.reduce((sum, c) => sum + c.credit, 0);

    await this.storeAttributionResult(conversionId, modelType, credits);

    emitAnalyticsEvent('analytics.attribution_calculated', {
      conversionId,
      modelType,
      totalCredits,
      touchpointCount: touchpoints.length,
    });

    return {
      conversionId,
      modelType,
      credits,
      totalCredits,
    };
  }

  async recalculateAllAttribution(
    tenantId: string,
    modelType: AttributionModelType,
    workspaceId?: string
  ): Promise<{ conversionsProcessed: number }> {
    let query = `
      SELECT id FROM conversions 
      WHERE tenant_id = $1 AND conversion_date > NOW() - INTERVAL '90 days'
    `;
    const values: unknown[] = [tenantId];
    
    if (workspaceId) {
      query += ' AND workspace_id = $2';
      values.push(workspaceId);
    }

    const result = await pool.query(query, values);
    let processed = 0;

    for (const row of result.rows) {
      await this.calculateAttribution(row.id, modelType);
      processed++;
    }

    logger.info('Recalculated attribution for all conversions', {
      tenantId,
      modelType,
      conversionsProcessed: processed,
    });

    return { conversionsProcessed: processed };
  }

  async getAttributionReport(
    tenantId: string,
    options: {
      workspaceId?: string;
      modelType?: AttributionModelType;
      startDate?: Date;
      endDate?: Date;
      groupBy?: 'channel' | 'source' | 'medium' | 'campaign' | 'touchpoint_type';
    } = {}
  ): Promise<{
    summary: Record<string, number>;
    breakdown: Array<{
      dimension: string;
      conversions: number;
      revenue: number;
      creditPercentage: number;
    }>;
  }> {
    const conditions: string[] = ['c.tenant_id = $1'];
    const values: unknown[] = [tenantId];
    let paramIndex = 2;

    if (options.workspaceId) {
      conditions.push(`c.workspace_id = $${paramIndex++}`);
      values.push(options.workspaceId);
    }
    if (options.startDate) {
      conditions.push(`c.conversion_date >= $${paramIndex++}`);
      values.push(options.startDate);
    }
    if (options.endDate) {
      conditions.push(`c.conversion_date <= $${paramIndex++}`);
      values.push(options.endDate);
    }

    const groupByColumn = this.getGroupByColumn(options.groupBy || 'channel');
    const whereClause = conditions.join(' AND ');

    const query = `
      SELECT 
        t.${groupByColumn} as dimension,
        COUNT(DISTINCT c.id) as conversions,
        SUM(c.revenue) as revenue,
        SUM(t.interaction_count) as total_interactions
      FROM conversions c
      JOIN attribution_touchpoints t ON c.visitor_id = t.visitor_id
      WHERE ${whereClause}
        AND t.${groupByColumn} IS NOT NULL
        AND c.conversion_date >= t.first_interaction_at
        AND c.conversion_date <= t.last_interaction_at + INTERVAL '30 days'
      GROUP BY t.${groupByColumn}
      ORDER BY revenue DESC
    `;

    const result = await pool.query(query, values);
    const totalRevenue = result.rows.reduce((sum, row) => sum + parseFloat(row.revenue), 0);

    const breakdown = result.rows.map(row => ({
      dimension: row.dimension || 'unknown',
      conversions: parseInt(row.conversions, 10),
      revenue: parseFloat(row.revenue),
      creditPercentage: totalRevenue > 0 ? (parseFloat(row.revenue) / totalRevenue) * 100 : 0,
    }));

    const summary = {
      totalConversions: breakdown.reduce((sum, b) => sum + b.conversions, 0),
      totalRevenue,
      avgRevenuePerConversion: breakdown.length > 0 
        ? totalRevenue / breakdown.reduce((sum, b) => sum + b.conversions, 0)
        : 0,
    };

    return { summary, breakdown };
  }

  async getChannelAttribution(
    tenantId: string,
    options: { workspaceId?: string; startDate?: Date; endDate?: Date } = {}
  ): Promise<Array<{ channel: string; conversions: number; revenue: number; creditPercentage: number }>> {
    const report = await this.getAttributionReport(tenantId, {
      ...options,
      groupBy: 'channel',
    });
    return report.breakdown.map(b => ({
      channel: b.dimension,
      conversions: b.conversions,
      revenue: b.revenue,
      creditPercentage: b.creditPercentage,
    }));
  }

  async getTouchpointAttribution(
    tenantId: string,
    conversionId: string
  ): Promise<AttributionCredit[]> {
    const touchpoints = await this.getTouchpointsForConversion(conversionId);
    const defaultModel = await this.getDefaultModel(tenantId);
    return this.applyAttributionModel(touchpoints, defaultModel.model_type as AttributionModelType);
  }

  private async getTouchpointsForConversion(conversionId: string): Promise<TouchpointRow[]> {
    const conversionResult = await pool.query<ConversionRow>(
      'SELECT * FROM conversions WHERE id = $1',
      [conversionId]
    );

    if (conversionResult.rows.length === 0) {
      throw new Error(`Conversion not found: ${conversionId}`);
    }

    const conversion = conversionResult.rows[0];

    const query = `
      SELECT t.*, c.id as conversion_id FROM attribution_touchpoints t
      JOIN conversions c ON c.visitor_id = t.visitor_id
      WHERE c.id = $1
        AND t.first_interaction_at <= c.conversion_date
        AND t.last_interaction_at >= c.conversion_date - INTERVAL '30 days'
      ORDER BY t.first_interaction_at ASC
    `;

    const result = await pool.query<TouchpointRow>(query, [conversionId]);
    return result.rows;
  }

  private applyAttributionModel(
    touchpoints: TouchpointRow[],
    modelType: AttributionModelType
  ): AttributionCredit[] {
    if (touchpoints.length === 0) {
      return [];
    }

    switch (modelType) {
      case 'first_touch':
        return this.applyFirstTouch(touchpoints);
      case 'last_touch':
        return this.applyLastTouch(touchpoints);
      case 'linear':
        return this.applyLinear(touchpoints);
      case 'time_decay':
        return this.applyTimeDecay(touchpoints);
      case 'position_based':
        return this.applyPositionBased(touchpoints);
      case 'data_driven':
        return this.applyDataDriven(touchpoints);
      default:
        return this.applyLinear(touchpoints);
    }
  }

  private applyFirstTouch(touchpoints: TouchpointRow[]): AttributionCredit[] {
    if (touchpoints.length === 0) return [];
    
    const firstTouch = touchpoints.reduce((earliest, t) =>
      new Date(t.first_interaction_at) < new Date(earliest.first_interaction_at) ? t : earliest
    );

    return touchpoints.map(tp => ({
      touchpointId: tp.id,
      touchpointType: tp.touchpoint_type,
      credit: tp.id === firstTouch.id ? 100 : 0,
    }));
  }

  private applyLastTouch(touchpoints: TouchpointRow[]): AttributionCredit[] {
    if (touchpoints.length === 0) return [];

    const lastTouch = touchpoints.reduce((latest, t) =>
      new Date(t.last_interaction_at) > new Date(latest.last_interaction_at) ? t : latest
    );

    return touchpoints.map(tp => ({
      touchpointId: tp.id,
      touchpointType: tp.touchpoint_type,
      credit: tp.id === lastTouch.id ? 100 : 0,
    }));
  }

  private applyLinear(touchpoints: TouchpointRow[]): AttributionCredit[] {
    if (touchpoints.length === 0) return [];
    
    const creditPerTouchpoint = 100 / touchpoints.length;
    return touchpoints.map(tp => ({
      touchpointId: tp.id,
      touchpointType: tp.touchpoint_type,
      credit: creditPerTouchpoint,
    }));
  }

  private applyTimeDecay(touchpoints: TouchpointRow[]): AttributionCredit[] {
    if (touchpoints.length === 0) return [];

    const conversionDate = touchpoints[0].conversion_id
      ? new Date()
      : new Date();

    const weights = touchpoints.map(tp => {
      const daysDiff = Math.max(0, (conversionDate.getTime() - new Date(tp.last_interaction_at).getTime()) / (1000 * 60 * 60 * 24));
      return Math.pow(2, -daysDiff * this.DEFAULT_DECAY_FACTOR);
    });

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    return touchpoints.map((tp, i) => ({
      touchpointId: tp.id,
      touchpointType: tp.touchpoint_type,
      credit: (weights[i] / totalWeight) * 100,
    }));
  }

  private applyPositionBased(touchpoints: TouchpointRow[]): AttributionCredit[] {
    if (touchpoints.length === 0) return [];
    
    if (touchpoints.length === 1) {
      return [{
        touchpointId: touchpoints[0].id,
        touchpointType: touchpoints[0].touchpoint_type,
        credit: 100,
      }];
    }

    if (touchpoints.length === 2) {
      return touchpoints.map((tp, i) => ({
        touchpointId: tp.id,
        touchpointType: tp.touchpoint_type,
        credit: i === 0 ? this.POSITION_BASED_FIRST_WEIGHT * 100 : this.POSITION_BASED_LAST_WEIGHT * 100,
      }));
    }

    const middleWeight = 100 - (this.POSITION_BASED_FIRST_WEIGHT + this.POSITION_BASED_LAST_WEIGHT);
    const middleCredit = middleWeight / (touchpoints.length - 2);

    return touchpoints.map((tp, i) => {
      let credit: number;
      if (i === 0) {
        credit = this.POSITION_BASED_FIRST_WEIGHT * 100;
      } else if (i === touchpoints.length - 1) {
        credit = this.POSITION_BASED_LAST_WEIGHT * 100;
      } else {
        credit = middleCredit;
      }
      return {
        touchpointId: tp.id,
        touchpointType: tp.touchpoint_type,
        credit,
      };
    });
  }

  private applyDataDriven(touchpoints: TouchpointRow[]): AttributionCredit[] {
    const weights = {
      first_touch: 0.3,
      last_touch: 0.3,
      linear: 0.2,
      position_based: 0.2,
    };

    const firstTouchCredits = this.applyFirstTouch(touchpoints);
    const lastTouchCredits = this.applyLastTouch(touchpoints);
    const linearCredits = this.applyLinear(touchpoints);
    const positionBasedCredits = this.applyPositionBased(touchpoints);

    return touchpoints.map((tp, i) => {
      const credit = 
        firstTouchCredits[i].credit * weights.first_touch +
        lastTouchCredits[i].credit * weights.last_touch +
        linearCredits[i].credit * weights.linear +
        positionBasedCredits[i].credit * weights.position_based;

      return {
        touchpointId: tp.id,
        touchpointType: tp.touchpoint_type,
        credit,
      };
    });
  }

  private async storeAttributionResult(
    conversionId: string,
    modelType: AttributionModelType,
    credits: AttributionCredit[]
  ): Promise<void> {
    for (const credit of credits) {
      const query = `
        UPDATE attribution_touchpoints 
        SET conversion_id = $1 
        WHERE id = $2
      `;
      await pool.query(query, [conversionId, credit.touchpointId]);
    }
  }

  private async getDefaultModel(tenantId: string): Promise<{ model_type: string }> {
    const result = await pool.query(
      `SELECT model_type FROM attribution_models 
       WHERE tenant_id = $1 AND is_default = TRUE AND is_active = TRUE
       LIMIT 1`,
      [tenantId]
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    return { model_type: 'linear' };
  }

  private getGroupByColumn(groupBy: string): string {
    const mapping: Record<string, string> = {
      channel: 'channel',
      source: 'source',
      medium: 'medium',
      campaign: 'campaign',
      touchpoint_type: 'touchpoint_type',
    };
    return mapping[groupBy] || 'channel';
  }

  async createConversion(
    tenantId: string,
    workspaceId: string,
    visitorId: string,
    sessionId: string,
    conversionType: string,
    conversionValue: number,
    revenue: number,
    options: {
      cost?: number;
      currency?: string;
      channel?: string;
      source?: string;
      medium?: string;
      campaign?: string;
    } = {}
  ): Promise<Conversion> {
    const id = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO conversions (
        id, tenant_id, workspace_id, visitor_id, session_id, conversion_type,
        conversion_value, currency, revenue, cost, attributed_channel,
        attributed_source, attributed_medium, attributed_campaign, conversion_date, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
      RETURNING *
    `;

    const values = [
      id,
      tenantId,
      workspaceId,
      visitorId,
      sessionId,
      conversionType,
      conversionValue,
      options.currency || 'USD',
      revenue,
      options.cost || 0,
      options.channel || 'direct',
      options.source || 'unknown',
      options.medium || null,
      options.campaign || null,
      now,
    ];

    const result = await pool.query(query, values);
    return this.mapToConversion(result.rows[0]);
  }

  private mapToConversion(row: Record<string, unknown>): Conversion {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      workspaceId: row.workspace_id as string,
      visitorId: row.visitor_id as string,
      sessionId: row.session_id as string,
      conversionType: row.conversion_type as string,
      conversionValue: parseFloat(row.conversion_value as string),
      currency: row.currency as string,
      revenue: parseFloat(row.revenue as string),
      cost: parseFloat(row.cost as string),
      touchpoints: [],
      attributedChannel: row.attributed_channel as string | undefined,
      attributedSource: row.attributed_source as string | undefined,
      attributedMedium: row.attributed_medium as string | undefined,
      attributedCampaign: row.attributed_campaign as string | undefined,
      conversionDate: new Date(row.conversion_date as string),
      createdAt: new Date(row.created_at as string),
    };
  }

  async getConversion(
    conversionId: string
  ): Promise<Conversion | null> {
    const result = await pool.query(
      'SELECT * FROM conversions WHERE id = $1',
      [conversionId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToConversion(result.rows[0]);
  }

  async getConversions(
    tenantId: string,
    options: {
      workspaceId?: string;
      conversionType?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ conversions: Conversion[]; total: number }> {
    const conditions: string[] = ['tenant_id = $1'];
    const values: unknown[] = [tenantId];
    let paramIndex = 2;

    if (options.workspaceId) {
      conditions.push(`workspace_id = $${paramIndex++}`);
      values.push(options.workspaceId);
    }
    if (options.conversionType) {
      conditions.push(`conversion_type = $${paramIndex++}`);
      values.push(options.conversionType);
    }
    if (options.startDate) {
      conditions.push(`conversion_date >= $${paramIndex++}`);
      values.push(options.startDate);
    }
    if (options.endDate) {
      conditions.push(`conversion_date <= $${paramIndex++}`);
      values.push(options.endDate);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM conversions WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    values.push(options.limit || 100);
    values.push(options.offset || 0);

    const result = await pool.query(
      `SELECT * FROM conversions WHERE ${whereClause} ORDER BY conversion_date DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      values
    );

    return {
      conversions: result.rows.map(row => this.mapToConversion(row)),
      total,
    };
  }
}

export const attributionEngine = new AttributionEngine();
