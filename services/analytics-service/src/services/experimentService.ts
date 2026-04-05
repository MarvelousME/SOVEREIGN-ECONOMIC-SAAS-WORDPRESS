import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config';
import { Experiment, ExperimentResult, AttributionModelType } from '../types';
import { emitAnalyticsEvent } from '../utils/logger';
import logger from '../utils/logger';

interface ExperimentRow {
  id: string;
  tenant_id: string;
  workspace_id: string;
  experiment_name: string;
  experiment_description: string | null;
  hypothesis: string | null;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'archived';
  variant_config: Record<string, unknown>;
  traffic_allocation: string;
  attribution_model_id: string | null;
  start_date: Date | null;
  end_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface ExperimentResultRow {
  id: string;
  experiment_id: string;
  variant_id: string;
  variant_name: string | null;
  metric_name: string;
  metric_value: string;
  sample_size: number;
  confidence_level: string | null;
  p_value: string | null;
  statistical_significance: boolean;
  winner: boolean;
  created_at: Date;
}

export class ExperimentService {
  async createExperiment(
    tenantId: string,
    workspaceId: string,
    experimentName: string,
    variantConfig: Record<string, unknown>,
    options: {
      experimentDescription?: string;
      hypothesis?: string;
      trafficAllocation?: number;
      attributionModelId?: string;
    } = {}
  ): Promise<Experiment> {
    const id = uuidv4();

    const query = `
      INSERT INTO experiments (
        id, tenant_id, workspace_id, experiment_name, experiment_description,
        hypothesis, status, variant_config, traffic_allocation, 
        attribution_model_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      id,
      tenantId,
      workspaceId,
      experimentName,
      options.experimentDescription || null,
      options.hypothesis || null,
      'draft',
      JSON.stringify(variantConfig),
      options.trafficAllocation || 100,
      options.attributionModelId || null,
    ];

    const result = await pool.query(query, values);
    const experiment = this.mapToExperiment(result.rows[0]);

    logger.info('Experiment created', { experimentId: id, experimentName, tenantId });

    return experiment;
  }

  async startExperiment(experimentId: string): Promise<Experiment> {
    const query = `
      UPDATE experiments 
      SET status = 'running', start_date = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [experimentId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    const experiment = this.mapToExperiment(result.rows[0]);

    emitAnalyticsEvent('analytics.experiment.started', {
      experimentId,
      experimentName: experiment.experimentName,
    });

    logger.info('Experiment started', { experimentId });

    return experiment;
  }

  async pauseExperiment(experimentId: string): Promise<Experiment> {
    const query = `
      UPDATE experiments 
      SET status = 'paused', updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [experimentId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    return this.mapToExperiment(result.rows[0]);
  }

  async completeExperiment(experimentId: string): Promise<Experiment> {
    const query = `
      UPDATE experiments 
      SET status = 'completed', end_date = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [experimentId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    const experiment = this.mapToExperiment(result.rows[0]);

    await this.calculateExperimentResults(experimentId);

    emitAnalyticsEvent('analytics.experiment.completed', {
      experimentId,
      experimentName: experiment.experimentName,
    });

    logger.info('Experiment completed', { experimentId });

    return experiment;
  }

  async archiveExperiment(experimentId: string): Promise<Experiment> {
    const query = `
      UPDATE experiments 
      SET status = 'archived', updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [experimentId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    return this.mapToExperiment(result.rows[0]);
  }

  async getExperiment(experimentId: string): Promise<Experiment | null> {
    const result = await pool.query(
      'SELECT * FROM experiments WHERE id = $1',
      [experimentId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToExperiment(result.rows[0]);
  }

  async getExperiments(
    tenantId: string,
    options: {
      workspaceId?: string;
      status?: 'draft' | 'running' | 'paused' | 'completed' | 'archived';
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ experiments: Experiment[]; total: number }> {
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

    const whereClause = conditions.join(' AND ');

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM experiments WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    values.push(options.limit || 50);
    values.push(options.offset || 0);

    const result = await pool.query(
      `SELECT * FROM experiments WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      values
    );

    return {
      experiments: result.rows.map(row => this.mapToExperiment(row)),
      total,
    };
  }

  async recordVariantImpression(
    experimentId: string,
    variantId: string,
    visitorId: string,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    const query = `
      INSERT INTO experiment_results (
        id, experiment_id, variant_id, metric_name, metric_value, 
        sample_size, statistical_significance, winner, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (experiment_id, variant_id, metric_name) 
      DO UPDATE SET 
        metric_value = experiment_results.metric_value,
        sample_size = experiment_results.sample_size + 1
    `;

    const id = uuidv4();
    await pool.query(query, [
      id,
      experimentId,
      variantId,
      'impressions',
      0,
      1,
      false,
      false,
    ]);
  }

  async recordVariantConversion(
    experimentId: string,
    variantId: string,
    conversionValue: number,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    const experiment = await this.getExperiment(experimentId);
    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    const existingResult = await pool.query(
      `SELECT * FROM experiment_results 
       WHERE experiment_id = $1 AND variant_id = $2 AND metric_name = 'conversions'
       ORDER BY created_at DESC LIMIT 1`,
      [experimentId, variantId]
    );

    if (existingResult.rows.length > 0) {
      const current = existingResult.rows[0];
      const newValue = parseFloat(current.metric_value) + conversionValue;
      const newSampleSize = current.sample_size + 1;

      await pool.query(
        `UPDATE experiment_results 
         SET metric_value = $1, sample_size = $2
         WHERE id = $3`,
        [newValue, newSampleSize, current.id]
      );
    } else {
      await pool.query(
        `INSERT INTO experiment_results (
           id, experiment_id, variant_id, metric_name, metric_value,
           sample_size, statistical_significance, winner, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [uuidv4(), experimentId, variantId, 'conversions', conversionValue, 1, false, false]
      );
    }
  }

  async getVariantResults(
    experimentId: string
  ): Promise<Array<{
    variantId: string;
    variantName?: string;
    impressions: number;
    conversions: number;
    conversionRate: number;
    totalValue: number;
  }>> {
    const results = await pool.query(
      `SELECT 
         variant_id,
         variant_name,
         SUM(CASE WHEN metric_name = 'impressions' THEN sample_size ELSE 0 END) as impressions,
         SUM(CASE WHEN metric_name = 'conversions' THEN sample_size ELSE 0 END) as conversions,
         SUM(CASE WHEN metric_name = 'conversions' THEN metric_value ELSE 0 END) as total_value
       FROM experiment_results
       WHERE experiment_id = $1
       GROUP BY variant_id, variant_name
       ORDER BY total_value DESC`,
      [experimentId]
    );

    return results.rows.map(row => ({
      variantId: row.variant_id,
      variantName: row.variant_name,
      impressions: parseInt(row.impressions, 10),
      conversions: parseInt(row.conversions, 10),
      conversionRate: parseInt(row.impressions, 10) > 0
        ? (parseInt(row.conversions, 10) / parseInt(row.impressions, 10)) * 100
        : 0,
      totalValue: parseFloat(row.total_value),
    }));
  }

  private async calculateExperimentResults(experimentId: string): Promise<void> {
    const variants = await this.getVariantResults(experimentId);
    
    if (variants.length < 2) {
      logger.warn('Cannot calculate experiment results with fewer than 2 variants', { experimentId });
      return;
    }

    const controlVariant = variants[0];
    const totalSampleSize = variants.reduce((sum, v) => sum + v.conversions, 0);

    for (const variant of variants) {
      const controlRate = controlVariant.conversions / Math.max(controlVariant.impressions, 1);
      const variantRate = variant.conversions / Math.max(variant.impressions, 1);
      
      const lift = controlRate > 0 ? ((variantRate - controlRate) / controlRate) * 100 : 0;
      
      const { confidenceLevel, pValue, isSignificant } = this.calculateStatisticalSignificance(
        variant.conversions,
        variant.impressions,
        controlVariant.conversions,
        controlVariant.impressions
      );

      const query = `
        INSERT INTO experiment_results (
          id, experiment_id, variant_id, variant_name, metric_name,
          metric_value, sample_size, confidence_level, p_value,
          statistical_significance, winner, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        ON CONFLICT (experiment_id, variant_id, metric_name)
        DO UPDATE SET
          metric_value = $6,
          sample_size = $7,
          confidence_level = $8,
          p_value = $9,
          statistical_significance = $10,
          winner = $11
      `;

      await pool.query(query, [
        uuidv4(),
        experimentId,
        variant.variantId,
        variant.variantName || null,
        'conversion_rate',
        variantRate * 100,
        variant.conversions,
        confidenceLevel,
        pValue,
        isSignificant,
        isSignificant && variant.totalValue > controlVariant.totalValue,
      ]);
    }
  }

  private calculateStatisticalSignificance(
    treatmentConversions: number,
    treatmentSample: number,
    controlConversions: number,
    controlSample: number
  ): { confidenceLevel: number; pValue: number; isSignificant: boolean } {
    if (treatmentSample === 0 || controlSample === 0) {
      return { confidenceLevel: 0, pValue: 1, isSignificant: false };
    }

    const treatmentRate = treatmentConversions / treatmentSample;
    const controlRate = controlConversions / controlSample;

    const pooledRate = (treatmentConversions + controlConversions) / (treatmentSample + controlSample);
    const standardError = Math.sqrt(
      pooledRate * (1 - pooledRate) * (1 / treatmentSample + 1 / controlSample)
    );

    if (standardError === 0) {
      return { confidenceLevel: 0, pValue: 1, isSignificant: false };
    }

    const zScore = (treatmentRate - controlRate) / standardError;
    const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore)));
    const confidenceLevel = (1 - pValue) * 100;
    const isSignificant = pValue < 0.05;

    return { confidenceLevel, pValue, isSignificant };
  }

  private normalCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }

  async getExperimentResults(experimentId: string): Promise<{
    experiment: Experiment;
    variants: Array<{
      variantId: string;
      variantName?: string;
      impressions: number;
      conversions: number;
      conversionRate: number;
      totalValue: number;
      confidenceLevel?: number;
      pValue?: number;
      statisticalSignificance: boolean;
      winner: boolean;
    }>;
    summary: {
      totalImpressions: number;
      totalConversions: number;
      overallConversionRate: number;
      winner?: string;
    };
  }> {
    const experiment = await this.getExperiment(experimentId);
    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    const variants = await this.getVariantResults(experimentId);

    const detailedVariants = await Promise.all(
      variants.map(async v => {
        const resultData = await pool.query(
          `SELECT confidence_level, p_value, statistical_significance, winner
           FROM experiment_results
           WHERE experiment_id = $1 AND variant_id = $2 AND metric_name = 'conversion_rate'`,
          [experimentId, v.variantId]
        );

        const result = resultData.rows[0] || {};
        return {
          ...v,
          confidenceLevel: result.confidence_level ? parseFloat(result.confidence_level) : undefined,
          pValue: result.p_value ? parseFloat(result.p_value) : undefined,
          statisticalSignificance: result.statistical_significance || false,
          winner: result.winner || false,
        };
      })
    );

    const winner = detailedVariants.find(v => v.winner);
    const totalImpressions = variants.reduce((sum, v) => sum + v.impressions, 0);
    const totalConversions = variants.reduce((sum, v) => sum + v.conversions, 0);

    return {
      experiment,
      variants: detailedVariants,
      summary: {
        totalImpressions,
        totalConversions,
        overallConversionRate: totalImpressions > 0 ? (totalConversions / totalImpressions) * 100 : 0,
        winner: winner?.variantName,
      },
    };
  }

  async deleteExperiment(experimentId: string): Promise<void> {
    await pool.query('DELETE FROM experiment_results WHERE experiment_id = $1', [experimentId]);
    await pool.query('DELETE FROM experiments WHERE id = $1', [experimentId]);
    logger.info('Experiment deleted', { experimentId });
  }

  private mapToExperiment(row: ExperimentRow): Experiment {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      workspaceId: row.workspace_id,
      experimentName: row.experiment_name,
      experimentDescription: row.experiment_description || undefined,
      hypothesis: row.hypothesis || undefined,
      status: row.status,
      variantConfig: row.variant_config,
      trafficAllocation: parseFloat(row.traffic_allocation),
      attributionModelId: row.attribution_model_id || undefined,
      startDate: row.start_date ? new Date(row.start_date) : undefined,
      endDate: row.end_date ? new Date(row.end_date) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export const experimentService = new ExperimentService();
