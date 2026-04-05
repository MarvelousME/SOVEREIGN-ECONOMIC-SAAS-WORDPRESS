import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config';
import { AnomalyAlert, TimeSeriesPoint } from '../types';
import { emitAnalyticsEvent } from '../utils/logger';
import logger from '../utils/logger';

interface MetricStats {
  mean: number;
  stddev: number;
  current: number;
}

interface AnomalyDetectionResult {
  isAnomaly: boolean;
  zScore: number;
  currentValue: number;
  expectedValue: number;
  deviationPercentage: number;
}

export class AnomalyDetector {
  private readonly DEFAULT_Z_THRESHOLD = 2.5;
  private readonly DEFAULT_MIN_DATA_POINTS = 30;
  private readonly DETECTION_INTERVAL_MS = 300000;

  private monitoredMetrics: Set<string> = new Set();
  private detectionIntervals: Map<string, NodeJS.Timeout> = new Map();

  async detectAnomaly(
    tenantId: string,
    metricName: string,
    workspaceId?: string,
    options: {
      zThreshold?: number;
      minDataPoints?: number;
    } = {}
  ): Promise<AnomalyDetectionResult> {
    const zThreshold = options.zThreshold || this.DEFAULT_Z_THRESHOLD;
    const minDataPoints = options.minDataPoints || this.DEFAULT_MIN_DATA_POINTS;

    const stats = await this.calculateMetricStats(tenantId, metricName, workspaceId);
    
    if (stats.mean === 0 && stats.stddev === 0) {
      return {
        isAnomaly: false,
        zScore: 0,
        currentValue: stats.current,
        expectedValue: stats.mean,
        deviationPercentage: 0,
      };
    }

    const zScore = (stats.current - stats.mean) / stats.stddev;
    const isAnomaly = Math.abs(zScore) > zThreshold;
    const deviationPercentage = stats.mean !== 0 
      ? ((stats.current - stats.mean) / stats.mean) * 100 
      : 0;

    if (isAnomaly) {
      await this.createAlert(
        tenantId,
        workspaceId,
        'statistical_anomaly',
        metricName,
        stats.current,
        stats.mean,
        deviationPercentage,
        Math.abs(zScore) > zThreshold * 2 ? 'high' : 'medium'
      );

      emitAnalyticsEvent('analytics.anomaly_detected', {
        tenantId,
        metricName,
        currentValue: stats.current,
        expectedValue: stats.mean,
        zScore,
        deviationPercentage,
      });
    }

    return {
      isAnomaly,
      zScore,
      currentValue: stats.current,
      expectedValue: stats.mean,
      deviationPercentage,
    };
  }

  private async calculateMetricStats(
    tenantId: string,
    metricName: string,
    workspaceId?: string
  ): Promise<MetricStats> {
    const conditions = ['tenant_id = $1', 'metric_name = $2', "recorded_at > NOW() - INTERVAL '30 days'"];
    const values: unknown[] = [tenantId, metricName];
    let paramIndex = 3;

    if (workspaceId) {
      conditions.push(`workspace_id = $${paramIndex++}`);
      values.push(workspaceId);
    }

    const whereClause = conditions.join(' AND ');

    const result = await pool.query(`
      SELECT 
        AVG(metric_value)::numeric as mean,
        STDDEV(metric_value)::numeric as stddev,
        (SELECT metric_value 
         FROM real_time_metrics 
         WHERE ${whereClause}
         ORDER BY recorded_at DESC 
         LIMIT 1) as current
      FROM real_time_metrics
      WHERE ${whereClause}
    `, values);

    const row = result.rows[0];
    return {
      mean: parseFloat(row.mean) || 0,
      stddev: parseFloat(row.stddev) || 0,
      current: parseFloat(row.current) || 0,
    };
  }

  async getRecentAlerts(
    tenantId: string,
    workspaceId?: string,
    limit: number = 10
  ): Promise<AnomalyAlert[]> {
    const conditions = ['tenant_id = $1', 'status = $2'];
    const values: unknown[] = [tenantId, 'active'];
    let paramIndex = 3;

    if (workspaceId) {
      conditions.push(`workspace_id = $${paramIndex++}`);
      values.push(workspaceId);
    }

    const whereClause = conditions.join(' AND ');

    const result = await pool.query(`
      SELECT * FROM anomaly_alerts 
      WHERE ${whereClause}
      ORDER BY detected_at DESC
      LIMIT $${paramIndex}
    `, [...values, limit]);

    return result.rows.map(row => this.mapToAnomalyAlert(row));
  }

  async getAlerts(
    tenantId: string,
    options: {
      workspaceId?: string;
      status?: 'active' | 'acknowledged' | 'resolved';
      severity?: 'low' | 'medium' | 'high' | 'critical';
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ alerts: AnomalyAlert[]; total: number }> {
    const conditions: string[] = ['tenant_id = $1'];
    const values: unknown[] = [tenantId];
    let paramIndex = 2;

    if (options.workspaceId) {
      conditions.push(`workspace_id = $${paramIndex++}`);
      values.push(options.workspaceId);
    }
    if (options.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(options.status);
    }
    if (options.severity) {
      conditions.push(`severity = $${paramIndex++}`);
      values.push(options.severity);
    }
    if (options.startDate) {
      conditions.push(`detected_at >= $${paramIndex++}`);
      values.push(options.startDate);
    }
    if (options.endDate) {
      conditions.push(`detected_at <= $${paramIndex++}`);
      values.push(options.endDate);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM anomaly_alerts WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    values.push(options.limit || 50);
    values.push(options.offset || 0);

    const result = await pool.query(`
      SELECT * FROM anomaly_alerts 
      WHERE ${whereClause}
      ORDER BY detected_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `, values);

    return {
      alerts: result.rows.map(row => this.mapToAnomalyAlert(row)),
      total,
    };
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    await pool.query(
      `UPDATE anomaly_alerts SET status = 'acknowledged' WHERE id = $1`,
      [alertId]
    );
  }

  async resolveAlert(alertId: string): Promise<void> {
    await pool.query(
      `UPDATE anomaly_alerts SET status = 'resolved', resolved_at = NOW() WHERE id = $1`,
      [alertId]
    );
  }

  async createAlert(
    tenantId: string,
    workspaceId: string | undefined,
    alertType: string,
    metricName: string,
    currentValue: number,
    expectedValue: number,
    deviationPercentage: number,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<AnomalyAlert> {
    const id = uuidv4();

    const query = `
      INSERT INTO anomaly_alerts (
        id, tenant_id, workspace_id, alert_type, metric_name, 
        current_value, expected_value, deviation_percentage, 
        severity, status, description, detected_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING *
    `;

    const description = `Anomaly detected in ${metricName}: current value ${currentValue.toFixed(2)} differs from expected ${expectedValue.toFixed(2)} by ${deviationPercentage.toFixed(2)}%`;

    const values = [
      id,
      tenantId,
      workspaceId,
      alertType,
      metricName,
      currentValue,
      expectedValue,
      deviationPercentage,
      severity,
      'active',
      description,
    ];

    const result = await pool.query(query, values);
    return this.mapToAnomalyAlert(result.rows[0]);
  }

  async startMonitoring(
    tenantId: string,
    metricNames: string[],
    workspaceId?: string,
    options: {
      intervalMs?: number;
      zThreshold?: number;
    } = {}
  ): Promise<void> {
    const intervalMs = options.intervalMs || this.DETECTION_INTERVAL_MS;

    for (const metricName of metricNames) {
      const key = `${tenantId}:${workspaceId || 'all'}:${metricName}`;
      
      if (this.detectionIntervals.has(key)) {
        continue;
      }

      this.monitoredMetrics.add(key);

      const interval = setInterval(async () => {
        try {
          await this.detectAnomaly(tenantId, metricName, workspaceId, {
            zThreshold: options.zThreshold,
          });
        } catch (error) {
          logger.error('Anomaly detection failed', { error, metricName, tenantId });
        }
      }, intervalMs);

      this.detectionIntervals.set(key, interval);
    }

    logger.info('Started monitoring metrics', { tenantId, metricNames, workspaceId, intervalMs });
  }

  async stopMonitoring(tenantId: string, metricName?: string, workspaceId?: string): Promise<void> {
    if (metricName) {
      const key = `${tenantId}:${workspaceId || 'all'}:${metricName}`;
      const interval = this.detectionIntervals.get(key);
      if (interval) {
        clearInterval(interval);
        this.detectionIntervals.delete(key);
        this.monitoredMetrics.delete(key);
      }
    } else {
      for (const [key, interval] of this.detectionIntervals.entries()) {
        if (key.startsWith(`${tenantId}:`)) {
          clearInterval(interval);
          this.detectionIntervals.delete(key);
          this.monitoredMetrics.delete(key);
        }
      }
    }

    logger.info('Stopped monitoring metrics', { tenantId, metricName, workspaceId });
  }

  async getTrendAnalysis(
    tenantId: string,
    metricName: string,
    options: {
      workspaceId?: string;
      periods?: number;
    } = {}
  ): Promise<{
    trend: 'increasing' | 'decreasing' | 'stable';
    slope: number;
    volatility: number;
    forecast: TimeSeriesPoint[];
  }> {
    const periods = options.periods || 7;
    
    const conditions = ['tenant_id = $1', 'metric_name = $2'];
    const values: unknown[] = [tenantId, metricName];
    let paramIndex = 3;

    if (options.workspaceId) {
      conditions.push(`workspace_id = $${paramIndex++}`);
      values.push(options.workspaceId);
    }

    const whereClause = conditions.join(' AND ');

    const result = await pool.query(`
      SELECT 
        date_trunc('day', recorded_at) as timestamp,
        AVG(metric_value) as value
      FROM real_time_metrics
      WHERE ${whereClause}
        AND recorded_at > NOW() - INTERVAL '${periods} days'
      GROUP BY date_trunc('day', recorded_at)
      ORDER BY timestamp ASC
    `, values);

    const dataPoints = result.rows.map(row => ({
      timestamp: new Date(row.timestamp),
      value: parseFloat(row.value),
    }));

    if (dataPoints.length < 2) {
      return { trend: 'stable', slope: 0, volatility: 0, forecast: [] };
    }

    const { slope, volatility } = this.calculateLinearRegression(dataPoints);
    
    const lastValue = dataPoints[dataPoints.length - 1].value;
    const avgValue = dataPoints.reduce((sum, p) => sum + p.value, 0) / dataPoints.length;
    
    let trend: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(slope) < avgValue * 0.05) {
      trend = 'stable';
    } else if (slope > 0) {
      trend = 'increasing';
    } else {
      trend = 'decreasing';
    }

    const forecast: TimeSeriesPoint[] = [];
    const lastTimestamp = dataPoints[dataPoints.length - 1].timestamp;
    for (let i = 1; i <= 3; i++) {
      const forecastDate = new Date(lastTimestamp);
      forecastDate.setDate(forecastDate.getDate() + i);
      forecast.push({
        timestamp: forecastDate,
        value: lastValue + slope * i,
      });
    }

    return { trend, slope, volatility, forecast };
  }

  private calculateLinearRegression(points: TimeSeriesPoint[]): { slope: number; volatility: number } {
    const n = points.length;
    const xMean = (n - 1) / 2;
    const yMean = points.reduce((sum, p) => sum + p.value, 0) / n;

    let numerator = 0;
    let denominator = 0;
    let squaredDiffs = 0;

    for (let i = 0; i < n; i++) {
      const xDiff = i - xMean;
      const yDiff = points[i].value - yMean;
      numerator += xDiff * yDiff;
      denominator += xDiff * xDiff;
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;

    for (let i = 0; i < n; i++) {
      const predicted = yMean + slope * (i - xMean);
      squaredDiffs += Math.pow(points[i].value - predicted, 2);
    }
    const volatility = Math.sqrt(squaredDiffs / n);

    return { slope, volatility };
  }

  private mapToAnomalyAlert(row: Record<string, unknown>): AnomalyAlert {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      workspaceId: row.workspace_id as string,
      alertType: row.alert_type as string,
      metricName: row.metric_name as string,
      currentValue: parseFloat(row.current_value as string),
      expectedValue: parseFloat(row.expected_value as string),
      deviationPercentage: parseFloat(row.deviation_percentage as string),
      severity: row.severity as 'low' | 'medium' | 'high' | 'critical',
      status: row.status as 'active' | 'acknowledged' | 'resolved',
      description: row.description as string | undefined,
      metadata: row.metadata as Record<string, unknown> || {},
      detectedAt: new Date(row.detected_at as string),
      resolvedAt: row.resolved_at ? new Date(row.resolved_at as string) : undefined,
    };
  }
}

export const anomalyDetector = new AnomalyDetector();
