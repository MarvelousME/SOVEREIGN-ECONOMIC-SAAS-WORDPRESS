import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config';
import { 
  Conversion, 
  AttributionTouchpoint, 
  AttributionModelType,
  TimeSeriesPoint 
} from '../types';
import { attributionEngine } from './attributionEngine';
import logger from '../utils/logger';

interface TouchpointData {
  id: string;
  visitor_id: string;
  session_id: string;
  touchpoint_type: string;
  touchpoint_id: string | null;
  channel: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  first_interaction_at: Date;
  last_interaction_at: Date;
}

interface ConversionData {
  id: string;
  tenant_id: string;
  workspace_id: string;
  visitor_id: string;
  session_id: string;
  conversion_type: string;
  conversion_value: string;
  currency: string;
  revenue: string;
  cost: string;
  attributed_channel: string | null;
  attributed_source: string | null;
  attributed_medium: string | null;
  attributed_campaign: string | null;
  conversion_date: Date;
  created_at: Date;
}

export class ConversionTracker {
  private readonly DEFAULT_ATTRIBUTION_WINDOW_DAYS = 30;

  async trackConversion(
    tenantId: string,
    workspaceId: string,
    visitorId: string,
    sessionId: string,
    conversionType: string,
    conversionValue: number,
    options: {
      revenue?: number;
      cost?: number;
      currency?: string;
      attributionModel?: AttributionModelType;
      attributionWindowDays?: number;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<Conversion> {
    const attributionModel = options.attributionModel || 'linear';
    const attributionWindowDays = options.attributionWindowDays || this.DEFAULT_ATTRIBUTION_WINDOW_DAYS;

    const touchpoints = await this.getAttributionTouchpoints(
      tenantId,
      visitorId,
      attributionWindowDays
    );

    const attributedChannel = this.getMostCommonValue(touchpoints, 'channel');
    const attributedSource = this.getMostCommonValue(touchpoints, 'source');
    const attributedMedium = this.getMostCommonValue(touchpoints, 'medium');
    const attributedCampaign = this.getMostCommonValue(touchpoints, 'campaign');

    const conversion = await attributionEngine.createConversion(
      tenantId,
      workspaceId,
      visitorId,
      sessionId,
      conversionType,
      conversionValue,
      options.revenue || conversionValue,
      {
        cost: options.cost,
        currency: options.currency,
        channel: attributedChannel || 'direct',
        source: attributedSource || 'unknown',
        medium: attributedMedium || undefined,
        campaign: attributedCampaign || undefined,
      }
    );

    for (const touchpoint of touchpoints) {
      await this.linkTouchpointToConversion(conversion.id, touchpoint);
    }

    const attributionResult = await attributionEngine.calculateAttribution(
      conversion.id,
      attributionModel
    );

    await this.updateConversionWithAttribution(conversion.id, attributionResult);

    logger.info('Conversion tracked', {
      conversionId: conversion.id,
      conversionType,
      revenue: options.revenue || conversionValue,
      touchpointsCount: touchpoints.length,
      attributionModel,
    });

    return this.getConversionWithTouchpoints(conversion.id);
  }

  private async getAttributionTouchpoints(
    tenantId: string,
    visitorId: string,
    windowDays: number
  ): Promise<TouchpointData[]> {
    const query = `
      SELECT * FROM attribution_touchpoints
      WHERE tenant_id = $1 
        AND visitor_id = $2
        AND last_interaction_at >= NOW() - INTERVAL '1 day' * $3
      ORDER BY first_interaction_at ASC
    `;

    const result = await pool.query<TouchpointData>(query, [tenantId, visitorId, windowDays]);
    return result.rows;
  }

  private getMostCommonValue(touchpoints: TouchpointData[], field: keyof TouchpointData): string | null {
    const counts: Record<string, number> = {};
    for (const tp of touchpoints) {
      const value = tp[field] as string | null;
      if (value) {
        counts[value] = (counts[value] || 0) + 1;
      }
    }

    let mostCommon: string | null = null;
    let maxCount = 0;
    for (const [value, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = value;
      }
    }
    return mostCommon;
  }

  private async linkTouchpointToConversion(
    conversionId: string,
    touchpoint: TouchpointData
  ): Promise<void> {
    await pool.query(
      `UPDATE attribution_touchpoints SET conversion_id = $1 WHERE id = $2`,
      [conversionId, touchpoint.id]
    );
  }

  private async updateConversionWithAttribution(
    conversionId: string,
    attributionResult: { credits: Array<{ touchpointId: string; credit: number }> }
  ): Promise<void> {
    const topCredit = attributionResult.credits.reduce((max, c) => 
      c.credit > max.credit ? c : max, 
      { touchpointId: '', credit: 0 }
    );

    if (topCredit.touchpointId) {
      const touchpointResult = await pool.query(
        `SELECT * FROM attribution_touchpoints WHERE id = $1`,
        [topCredit.touchpointId]
      );

      if (touchpointResult.rows.length > 0) {
        const touchpoint = touchpointResult.rows[0];
        await pool.query(
          `UPDATE conversions SET 
            attributed_channel = $1,
            attributed_source = $2,
            attributed_medium = $3,
            attributed_campaign = $4
           WHERE id = $5`,
          [
            touchpoint.channel,
            touchpoint.source,
            touchpoint.medium,
            touchpoint.campaign,
            conversionId,
          ]
        );
      }
    }
  }

  async getConversionWithTouchpoints(conversionId: string): Promise<Conversion | null> {
    const conversionResult = await pool.query<ConversionData>(
      'SELECT * FROM conversions WHERE id = $1',
      [conversionId]
    );

    if (conversionResult.rows.length === 0) {
      return null;
    }

    const conversion = this.mapToConversion(conversionResult.rows[0]);

    const touchpointsResult = await pool.query<TouchpointData>(
      `SELECT * FROM attribution_touchpoints WHERE conversion_id = $1`,
      [conversionId]
    );

    conversion.touchpoints = touchpointsResult.rows.map(tp => ({
      id: tp.id,
      tenantId: tp.visitor_id,
      workspaceId: tp.session_id,
      visitorId: tp.visitor_id,
      sessionId: tp.session_id,
      touchpointType: tp.touchpoint_type,
      touchpointId: tp.touchpoint_id,
      touchpointData: {},
      channel: tp.channel || undefined,
      source: tp.source || undefined,
      medium: tp.medium || undefined,
      campaign: tp.campaign || undefined,
      firstInteractionAt: new Date(tp.first_interaction_at),
      lastInteractionAt: new Date(tp.last_interaction_at),
      interactionCount: 1,
      conversionId: conversionId,
      createdAt: new Date(),
    }));

    return conversion;
  }

  async getConversionFunnel(
    tenantId: string,
    options: {
      workspaceId?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{
    steps: Array<{
      name: string;
      count: number;
      conversionRate: number;
    }>;
    totalUsers: number;
  }> {
    const conditions: string[] = ['tenant_id = $1'];
    const values: unknown[] = [tenantId];
    let paramIndex = 2;

    if (options.workspaceId) {
      conditions.push(`workspace_id = $${paramIndex++}`);
      values.push(options.workspaceId);
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

    const leadCapturedResult = await pool.query(
      `SELECT COUNT(DISTINCT visitor_id) FROM canonical_events 
       WHERE tenant_id = $1 AND event_type = 'lead.captured'
       ${options.workspaceId ? 'AND workspace_id = $2' : ''}
       ${options.startDate ? 'AND timestamp >= $' + (options.workspaceId ? '3' : '2') : ''}
       ${options.endDate ? 'AND timestamp <= $' + (options.workspaceId ? (options.startDate ? '4' : '3') : (options.startDate ? '3' : '2')) : ''}`,
      values
    );

    const leadScoredResult = await pool.query(
      `SELECT COUNT(DISTINCT visitor_id) FROM canonical_events 
       WHERE tenant_id = $1 AND event_type = 'lead.scored'
       ${options.workspaceId ? 'AND workspace_id = $2' : ''}`,
      values.slice(0, options.workspaceId ? 2 : 1)
    );

    const conversionsResult = await pool.query(
      `SELECT COUNT(*) FROM conversions WHERE ${whereClause}`,
      values
    );

    const leadCaptured = parseInt(leadCapturedResult.rows[0].count, 10);
    const leadScored = parseInt(leadScoredResult.rows[0].count, 10);
    const conversions = parseInt(conversionsResult.rows[0].count, 10);

    const steps = [
      { name: 'Lead Captured', count: leadCaptured, conversionRate: 100 },
      { name: 'Lead Scored', count: leadScored, conversionRate: leadCaptured > 0 ? (leadScored / leadCaptured) * 100 : 0 },
      { name: 'Converted', count: conversions, conversionRate: leadScored > 0 ? (conversions / leadScored) * 100 : 0 },
    ];

    return {
      steps,
      totalUsers: leadCaptured,
    };
  }

  async getConversionTrends(
    tenantId: string,
    options: {
      workspaceId?: string;
      granularity?: 'hour' | 'day' | 'week' | 'month';
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<TimeSeriesPoint[]> {
    const granularity = options.granularity || 'day';
    const intervalMap = {
      hour: '1 hour',
      day: '1 day',
      week: '1 week',
      month: '1 month',
    };

    const conditions: string[] = ['tenant_id = $1'];
    const values: unknown[] = [tenantId];
    let paramIndex = 2;

    if (options.workspaceId) {
      conditions.push(`workspace_id = $${paramIndex++}`);
      values.push(options.workspaceId);
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

    const query = `
      SELECT 
        date_trunc('${granularity}', conversion_date) as timestamp,
        COUNT(*) as value
      FROM conversions
      WHERE ${whereClause}
      GROUP BY date_trunc('${granularity}', conversion_date)
      ORDER BY timestamp ASC
    `;

    const result = await pool.query<{ timestamp: Date; value: string }>(query, values);

    return result.rows.map(row => ({
      timestamp: new Date(row.timestamp),
      value: parseInt(row.value, 10),
    }));
  }

  async getRevenueAttribution(
    tenantId: string,
    options: {
      workspaceId?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<Array<{
    channel: string;
    revenue: number;
    conversions: number;
    revenuePerConversion: number;
  }>> {
    const conditions: string[] = ['tenant_id = $1'];
    const values: unknown[] = [tenantId];
    let paramIndex = 2;

    if (options.workspaceId) {
      conditions.push(`workspace_id = $${paramIndex++}`);
      values.push(options.workspaceId);
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

    const query = `
      SELECT 
        attributed_channel as channel,
        SUM(revenue) as revenue,
        COUNT(*) as conversions
      FROM conversions
      WHERE ${whereClause}
        AND attributed_channel IS NOT NULL
      GROUP BY attributed_channel
      ORDER BY revenue DESC
    `;

    const result = await pool.query<{ channel: string; revenue: string; conversions: string }>(
      query,
      values
    );

    return result.rows.map(row => ({
      channel: row.channel,
      revenue: parseFloat(row.revenue),
      conversions: parseInt(row.conversions, 10),
      revenuePerConversion: parseFloat(row.revenue) / parseInt(row.conversions, 10),
    }));
  }

  async getConversionRate(
    tenantId: string,
    options: {
      workspaceId?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{
    totalTouchpoints: number;
    totalConversions: number;
    conversionRate: number;
  }> {
    const conditions: string[] = ['tenant_id = $1'];
    const values: unknown[] = [tenantId];
    let paramIndex = 2;

    if (options.workspaceId) {
      conditions.push(`workspace_id = $${paramIndex++}`);
      values.push(options.workspaceId);
    }
    if (options.startDate) {
      conditions.push(`first_interaction_at >= $${paramIndex++}`);
      values.push(options.startDate);
    }
    if (options.endDate) {
      conditions.push(`first_interaction_at <= $${paramIndex++}`);
      values.push(options.endDate);
    }

    const whereClause = conditions.join(' AND ');

    const touchpointsResult = await pool.query(
      `SELECT COUNT(DISTINCT visitor_id) FROM attribution_touchpoints WHERE ${whereClause}`,
      values
    );

    const conversionsResult = await pool.query(
      `SELECT COUNT(*) FROM conversions WHERE ${whereClause}`,
      values
    );

    const totalTouchpoints = parseInt(touchpointsResult.rows[0].count, 10);
    const totalConversions = parseInt(conversionsResult.rows[0].count, 10);

    return {
      totalTouchpoints,
      totalConversions,
      conversionRate: totalTouchpoints > 0 ? (totalConversions / totalTouchpoints) * 100 : 0,
    };
  }

  private mapToConversion(row: ConversionData): Conversion {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      workspaceId: row.workspace_id,
      visitorId: row.visitor_id,
      sessionId: row.session_id,
      conversionType: row.conversion_type,
      conversionValue: parseFloat(row.conversion_value),
      currency: row.currency,
      revenue: parseFloat(row.revenue),
      cost: parseFloat(row.cost),
      touchpoints: [],
      attributedChannel: row.attributed_channel || undefined,
      attributedSource: row.attributed_source || undefined,
      attributedMedium: row.attributed_medium || undefined,
      attributedCampaign: row.attributed_campaign || undefined,
      conversionDate: new Date(row.conversion_date),
      createdAt: new Date(row.created_at),
    };
  }
}

export const conversionTracker = new ConversionTracker();
