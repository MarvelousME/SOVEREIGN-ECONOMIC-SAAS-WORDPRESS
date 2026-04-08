import { pool } from '../config';
import { 
  DashboardMetrics, 
  TimeSeriesPoint, 
  PageAnalytics,
  LeadAnalytics,
  AgentMetrics,
  AnomalyAlert,
  MetricTimeSeries 
} from '../types';
import { anomalyDetector } from './anomalyDetector';
import logger from '../utils/logger';

export class DashboardService {
  async getDashboardMetrics(
    tenantId: string,
    workspaceId?: string,
    period: 'today' | '7d' | '30d' | '90d' = '7d',
    region?: string
  ): Promise<DashboardMetrics> {
    const dateFilter = this.getDateFilter(period);
    
    const conditions = ['tenant_id = $1'];
    const values: unknown[] = [tenantId];
    let paramIndex = 2;

    if (workspaceId) {
      conditions.push(`workspace_id = $${paramIndex++}`);
      values.push(workspaceId);
    }
    if (region) {
      conditions.push(`COALESCE(data->>'region', metadata->>'region', 'global') = $${paramIndex++}`);
      values.push(region);
    }

    const whereClause = conditions.join(' AND ');
    const dateWhereClause = `${whereClause} AND timestamp >= ${dateFilter}`;

    const eventsResult = await pool.query(`
      SELECT COUNT(*) as total_events,
             COUNT(DISTINCT event_type) as unique_event_types
      FROM canonical_events 
      WHERE ${dateWhereClause}
    `, values);

    const conversionsResult = await pool.query(`
      SELECT COUNT(*) as total_conversions,
             SUM(revenue) as total_revenue
      FROM conversions 
      WHERE ${whereClause} AND conversion_date >= ${dateFilter}
    `, values);

    const touchpointsResult = await pool.query(`
      SELECT COUNT(*) as active_touchpoints
      FROM attribution_touchpoints
      WHERE ${whereClause} AND last_interaction_at >= ${dateFilter}
    `, values);

    const channelResult = await pool.query(`
      SELECT attributed_channel, COUNT(*) as conversions, SUM(revenue) as revenue
      FROM conversions
      WHERE ${whereClause} AND conversion_date >= ${dateFilter}
        AND attributed_channel IS NOT NULL
      GROUP BY attributed_channel
      ORDER BY revenue DESC
      LIMIT 5
    `, values);

    const attributionResult = await pool.query(`
      SELECT touchpoint_type, COUNT(*) as count
      FROM attribution_touchpoints
      WHERE ${whereClause} AND conversion_id IS NOT NULL
      GROUP BY touchpoint_type
      ORDER BY count DESC
    `, values);

    const previousPeriodResult = await pool.query(`
      SELECT COUNT(*) as events, 
             SUM(revenue) as revenue
      FROM conversions 
      WHERE ${whereClause} AND conversion_date >= ${this.getPreviousDateFilter(period)}
        AND conversion_date < ${dateFilter}
    `, values);

    const recentAnomalies = await anomalyDetector.getRecentAlerts(
      tenantId,
      workspaceId,
      5
    );

    const totalEvents = parseInt(eventsResult.rows[0].total_events, 10);
    const totalConversions = parseInt(conversionsResult.rows[0].total_conversions, 10);
    const totalRevenue = parseFloat(conversionsResult.rows[0].total_revenue || '0');
    const previousEvents = parseInt(previousPeriodResult.rows[0].events || '0', 10);
    const previousRevenue = parseFloat(previousPeriodResult.rows[0].revenue || '0');

    const attributionBreakdown: Record<string, number> = {};
    for (const row of attributionResult.rows) {
      attributionBreakdown[row.touchpoint_type] = parseInt(row.count, 10);
    }

    const topChannels = channelResult.rows.map(row => ({
      channel: row.attributed_channel,
      conversions: parseInt(row.conversions, 10),
      revenue: parseFloat(row.revenue),
    }));

    const periodDays = period === 'today' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const eventsPerMinute = totalEvents / (periodDays * 24 * 60);

    return {
      totalEvents,
      eventsPerMinute: Math.round(eventsPerMinute * 100) / 100,
      totalConversions,
      conversionRate: totalEvents > 0 ? (totalConversions / totalEvents) * 100 : 0,
      totalRevenue,
      revenuePerConversion: totalConversions > 0 ? totalRevenue / totalConversions : 0,
      activeTouchpoints: parseInt(touchpointsResult.rows[0].active_touchpoints, 10),
      attributionBreakdown,
      topChannels,
      recentAnomalies,
      periodComparison: {
        eventsChange: previousEvents > 0 ? ((totalEvents - previousEvents) / previousEvents) * 100 : 0,
        conversionsChange: previousEvents > 0 ? ((totalConversions - previousEvents) / previousEvents) * 100 : 0,
        revenueChange: previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0,
      },
    };
  }

  async getMetricTimeSeries(
    tenantId: string,
    metricName: string,
    options: {
      workspaceId?: string;
      region?: string;
      granularity?: 'minute' | 'hour' | 'day' | 'week';
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<MetricTimeSeries> {
    const granularity = options.granularity || 'hour';
    const dateTrunc = granularity === 'minute' ? 'minute' : 
                      granularity === 'hour' ? 'hour' : 
                      granularity === 'day' ? 'day' : 'week';

    const conditions = ['tenant_id = $1', 'metric_name = $2'];
    const values: unknown[] = [tenantId, metricName];
    let paramIndex = 3;

    if (options.workspaceId) {
      conditions.push(`workspace_id = $${paramIndex++}`);
      values.push(options.workspaceId);
    }
    if (options.region) {
      conditions.push(`COALESCE(dimensions->>'region', 'global') = $${paramIndex++}`);
      values.push(options.region);
    }
    if (options.startDate) {
      conditions.push(`recorded_at >= $${paramIndex++}`);
      values.push(options.startDate);
    }
    if (options.endDate) {
      conditions.push(`recorded_at <= $${paramIndex++}`);
      values.push(options.endDate);
    }

    const whereClause = conditions.join(' AND ');

    const query = `
      SELECT 
        date_trunc('${dateTrunc}', recorded_at) as timestamp,
        AVG(metric_value) as value
      FROM real_time_metrics
      WHERE ${whereClause}
      GROUP BY date_trunc('${dateTrunc}', recorded_at)
      ORDER BY timestamp ASC
    `;

    const result = await pool.query<{ timestamp: Date; value: string }>(query, values);

    return {
      metricName,
      data: result.rows.map(row => ({
        timestamp: new Date(row.timestamp),
        value: parseFloat(row.value),
      })),
      granularity,
    };
  }

  async getPageAnalytics(
    tenantId: string,
    options: {
      workspaceId?: string;
      region?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    } = {}
  ): Promise<PageAnalytics[]> {
    const conditions = ['tenant_id = $1', 'event_type IN ($2, $3)'];
    const values: unknown[] = [tenantId, 'page.generated', 'page.published'];
    let paramIndex = 4;

    if (options.workspaceId) {
      conditions.push(`workspace_id = $${paramIndex++}`);
      values.push(options.workspaceId);
    }
    if (options.region) {
      conditions.push(`COALESCE(data->>'region', metadata->>'region', 'global') = $${paramIndex++}`);
      values.push(options.region);
    }
    if (options.startDate) {
      conditions.push(`timestamp >= $${paramIndex++}`);
      values.push(options.startDate);
    }
    if (options.endDate) {
      conditions.push(`timestamp <= $${paramIndex++}`);
      values.push(options.endDate);
    }

    const whereClause = conditions.join(' AND ');

    const pageViewsResult = await pool.query(`
      SELECT 
        (data->>'page_id') as page_id,
        (data->>'page_title') as page_title,
        COUNT(*) as views,
        COUNT(DISTINCT (data->>'visitor_id')) as unique_visitors
      FROM canonical_events
      WHERE ${whereClause}
      GROUP BY (data->>'page_id'), (data->>'page_title')
      ORDER BY views DESC
      LIMIT $${paramIndex}
    `, [...values, options.limit || 50]);

    const pages: PageAnalytics[] = [];
    for (const row of pageViewsResult.rows) {
      const conversionsResult = await pool.query(`
        SELECT COUNT(*) as conversions, SUM(revenue) as revenue
        FROM conversions c
        WHERE c.tenant_id = $1 AND c.workspace_id = $2
          AND EXISTS (
            SELECT 1 FROM attribution_touchpoints t 
            WHERE t.visitor_id = c.visitor_id 
              AND t.touchpoint_id = $3
          )
      `, [tenantId, options.workspaceId || uuidv4(), row.page_id]);

      pages.push({
        pageId: row.page_id,
        pageTitle: row.page_title || 'Untitled',
        views: parseInt(row.views, 10),
        uniqueVisitors: parseInt(row.unique_visitors, 10),
        avgTimeOnPage: 0,
        bounceRate: 0,
        conversions: parseInt(conversionsResult.rows[0].conversions, 10),
        revenue: parseFloat(conversionsResult.rows[0].revenue || '0'),
        topExitPages: [],
      });
    }

    return pages;
  }

  async getLeadAnalytics(
    tenantId: string,
    options: {
      workspaceId?: string;
      region?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<LeadAnalytics> {
    const conditions = ['tenant_id = $1', 'event_type = $2'];
    const values: unknown[] = [tenantId, 'lead.captured'];
    let paramIndex = 3;

    if (options.workspaceId) {
      conditions.push(`workspace_id = $${paramIndex++}`);
      values.push(options.workspaceId);
    }
    if (options.region) {
      conditions.push(`COALESCE(data->>'region', metadata->>'region', 'global') = $${paramIndex++}`);
      values.push(options.region);
    }
    if (options.startDate) {
      conditions.push(`timestamp >= $${paramIndex++}`);
      values.push(options.startDate);
    }
    if (options.endDate) {
      conditions.push(`timestamp <= $${paramIndex++}`);
      values.push(options.endDate);
    }

    const whereClause = conditions.join(' AND ');

    const leadResult = await pool.query(`
      SELECT COUNT(*) as total_leads
      FROM canonical_events
      WHERE ${whereClause}
    `, values);

    const scoredResult = await pool.query(`
      SELECT COUNT(*) as scored_leads
      FROM canonical_events
      WHERE ${whereClause.replace('lead.captured', 'lead.scored')}
    `, values);

    const leadScoreResult = await pool.query(`
      SELECT data->>'score' as score, COUNT(*) as count
      FROM canonical_events
      WHERE ${whereClause.replace('lead.captured', 'lead.scored')}
      GROUP BY (data->>'score')
    `, values);

    const sourceResult = await pool.query(`
      SELECT data->>'source' as source, COUNT(*) as count
      FROM canonical_events
      WHERE ${whereClause}
      GROUP BY (data->>'source')
    `, values);

    const totalLeads = parseInt(leadResult.rows[0].total_leads, 10);
    const qualifiedLeads = parseInt(scoredResult.rows[0].scored_leads, 10);

    const leadScoreDistribution: Record<number, number> = {};
    for (const row of leadScoreResult.rows) {
      const score = parseInt(row.score, 10) || 0;
      leadScoreDistribution[score] = parseInt(row.count, 10);
    }

    const leadSources: Record<string, number> = {};
    for (const row of sourceResult.rows) {
      leadSources[row.source || 'unknown'] = parseInt(row.count, 10);
    }

    return {
      totalLeads,
      qualifiedLeads,
      leadScoreDistribution,
      leadSources,
      conversionFunnel: {
        captured: totalLeads,
        scored: qualifiedLeads,
        qualified: Math.floor(qualifiedLeads * 0.5),
        converted: Math.floor(qualifiedLeads * 0.2),
      },
      avgTimeToQualify: 0,
    };
  }

  async getAgentMetrics(
    tenantId: string,
    options: {
      workspaceId?: string;
      region?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<AgentMetrics[]> {
    const conditions = ['tenant_id = $1', 'event_type LIKE $2'];
    const values: unknown[] = [tenantId, 'agent.run%'];
    let paramIndex = 3;

    if (options.workspaceId) {
      conditions.push(`workspace_id = $${paramIndex++}`);
      values.push(options.workspaceId);
    }
    if (options.region) {
      conditions.push(`COALESCE(data->>'region', metadata->>'region', 'global') = $${paramIndex++}`);
      values.push(options.region);
    }
    if (options.startDate) {
      conditions.push(`timestamp >= $${paramIndex++}`);
      values.push(options.startDate);
    }
    if (options.endDate) {
      conditions.push(`timestamp <= $${paramIndex++}`);
      values.push(options.endDate);
    }

    const whereClause = conditions.join(' AND ');

    const agentResult = await pool.query(`
      SELECT 
        data->>'agent_id' as agent_id,
        data->>'agent_name' as agent_name,
        COUNT(*) FILTER (WHERE event_type = 'agent.run_started') as total_runs,
        COUNT(*) FILTER (WHERE event_type = 'agent.run_completed') as successful_runs,
        COUNT(*) FILTER (WHERE event_type = 'agent.run_failed') as failed_runs,
        AVG((data->>'latency_ms')::numeric) as avg_latency,
        SUM((data->>'cost')::numeric) as total_cost
      FROM canonical_events
      WHERE ${whereClause}
      GROUP BY (data->>'agent_id'), (data->>'agent_name')
    `, values);

    return agentResult.rows.map(row => {
      const totalRuns = parseInt(row.total_runs, 10);
      const successfulRuns = parseInt(row.successful_runs, 10);
      const failedRuns = parseInt(row.failed_runs, 10);
      const totalCost = parseFloat(row.total_cost || '0');

      return {
        agentId: row.agent_id,
        agentName: row.agent_name || 'Unknown Agent',
        totalRuns,
        successfulRuns,
        failedRuns,
        successRate: totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0,
        avgLatencyMs: parseFloat(row.avg_latency || '0'),
        totalCost,
        costPerRun: totalRuns > 0 ? totalCost / totalRuns : 0,
        runsOverTime: [],
      };
    });
  }

  async getRevenueReport(
    tenantId: string,
    options: {
      workspaceId?: string;
      region?: string;
      startDate?: Date;
      endDate?: Date;
      granularity?: 'day' | 'week' | 'month';
    } = {}
  ): Promise<{
    summary: {
      totalRevenue: number;
      averageRevenue: number;
      revenueByChannel: Record<string, number>;
    };
    timeSeries: TimeSeriesPoint[];
  }> {
    const conditions = ['tenant_id = $1'];
    const values: unknown[] = [tenantId];
    let paramIndex = 2;

    if (options.workspaceId) {
      conditions.push(`workspace_id = $${paramIndex++}`);
      values.push(options.workspaceId);
    }
    if (options.region) {
      conditions.push(`COALESCE(metadata->>'region', 'global') = $${paramIndex++}`);
      values.push(options.region);
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
    const granularity = options.granularity || 'day';
    const dateTrunc = granularity === 'week' ? 'week' : 'month';

    const summaryResult = await pool.query(`
      SELECT 
        SUM(revenue) as total_revenue,
        AVG(revenue) as average_revenue,
        attributed_channel
      FROM conversions
      WHERE ${whereClause}
      GROUP BY attributed_channel
    `, values);

    const timeSeriesResult = await pool.query(`
      SELECT 
        date_trunc('${dateTrunc}', conversion_date) as timestamp,
        SUM(revenue) as value
      FROM conversions
      WHERE ${whereClause}
      GROUP BY date_trunc('${dateTrunc}', conversion_date)
      ORDER BY timestamp ASC
    `, values);

    const revenueByChannel: Record<string, number> = {};
    let totalRevenue = 0;
    let totalCount = 0;

    for (const row of summaryResult.rows) {
      const channel = row.attributed_channel || 'unknown';
      const revenue = parseFloat(row.revenue || '0');
      revenueByChannel[channel] = revenue;
      totalRevenue += revenue;
      totalCount++;
    }

    return {
      summary: {
        totalRevenue,
        averageRevenue: totalCount > 0 ? totalRevenue / totalCount : 0,
        revenueByChannel,
      },
      timeSeries: timeSeriesResult.rows.map(row => ({
        timestamp: new Date(row.timestamp),
        value: parseFloat(row.value),
      })),
    };
  }

  private getDateFilter(period: 'today' | '7d' | '30d' | '90d'): string {
    switch (period) {
      case 'today':
        return "NOW() - INTERVAL '1 day'";
      case '7d':
        return "NOW() - INTERVAL '7 days'";
      case '30d':
        return "NOW() - INTERVAL '30 days'";
      case '90d':
        return "NOW() - INTERVAL '90 days'";
      default:
        return "NOW() - INTERVAL '7 days'";
    }
  }

  private getPreviousDateFilter(period: 'today' | '7d' | '30d' | '90d'): string {
    switch (period) {
      case 'today':
        return "NOW() - INTERVAL '2 days'";
      case '7d':
        return "NOW() - INTERVAL '14 days'";
      case '30d':
        return "NOW() - INTERVAL '60 days'";
      case '90d':
        return "NOW() - INTERVAL '180 days'";
      default:
        return "NOW() - INTERVAL '14 days'";
    }
  }
}

function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export const dashboardService = new DashboardService();
