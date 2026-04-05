import { db } from '../models/database';
import { eventEmitter } from './eventEmitter';
import {
  Deal,
  DealActivity,
  Pipeline,
  PipelineStage,
  CreateDealInput,
  UpdateDealStageInput,
  PaginatedResult,
  ListQueryParams,
} from '../types';

interface DealRow {
  id: string;
  tenant_id: string;
  account_id: string;
  contact_id: string | null;
  lead_id: string | null;
  name: string;
  description: string | null;
  value: number;
  currency: string;
  probability: number;
  stage_id: string;
  pipeline_id: string;
  owner_id: string | null;
  expected_close_date: Date | null;
  actual_close_date: Date | null;
  lost_reason: string | null;
  won_at: Date | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

interface DealActivityRow {
  id: string;
  deal_id: string;
  tenant_id: string;
  type: string;
  description: string;
  from_value: string | null;
  to_value: string | null;
  user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
}

interface PipelineRow {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}

interface PipelineStageRow {
  id: string;
  pipeline_id: string;
  name: string;
  order: number;
  probability: number;
  is_win_stage: boolean;
  is_loss_stage: boolean;
  days_to_advance: number | null;
  created_at: Date;
}

function mapRowToDeal(row: DealRow): Deal {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    accountId: row.account_id,
    contactId: row.contact_id || undefined,
    leadId: row.lead_id || undefined,
    name: row.name,
    description: row.description || undefined,
    value: row.value,
    currency: row.currency,
    probability: row.probability,
    stageId: row.stage_id,
    pipelineId: row.pipeline_id,
    ownerId: row.owner_id || undefined,
    expectedCloseDate: row.expected_close_date || undefined,
    actualCloseDate: row.actual_close_date || undefined,
    lostReason: row.lost_reason || undefined,
    wonAt: row.won_at || undefined,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToActivity(row: DealActivityRow): DealActivity {
  return {
    id: row.id,
    dealId: row.deal_id,
    tenantId: row.tenant_id,
    type: row.type as DealActivity['type'],
    description: row.description,
    fromValue: row.from_value || undefined,
    toValue: row.to_value || undefined,
    userId: row.user_id || undefined,
    metadata: row.metadata || {},
    createdAt: row.created_at,
  };
}

function mapRowToPipeline(row: PipelineRow): Pipeline {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description || undefined,
    isDefault: row.is_default,
    stages: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToStage(row: PipelineStageRow): PipelineStage {
  return {
    id: row.id,
    pipelineId: row.pipeline_id,
    name: row.name,
    order: row.order,
    probability: row.probability,
    isWinStage: row.is_win_stage,
    isLossStage: row.is_loss_stage,
    daysToAdvance: row.days_to_advance || undefined,
    createdAt: row.created_at,
  };
}

export class DealService {
  async create(tenantId: string, input: CreateDealInput): Promise<Deal> {
    const row = await db.queryOne<DealRow>(
      `INSERT INTO deals (
        tenant_id, account_id, contact_id, lead_id, name, description, value,
        currency, probability, stage_id, pipeline_id, owner_id, expected_close_date, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [
        tenantId,
        input.accountId,
        input.contactId || null,
        input.leadId || null,
        input.name,
        input.description || null,
        input.value,
        input.currency || 'USD',
        input.probability || 0,
        input.stageId,
        input.pipelineId,
        input.ownerId || null,
        input.expectedCloseDate || null,
        JSON.stringify(input.metadata || {}),
      ]
    );

    if (!row) {
      throw new Error('Failed to create deal');
    }

    const deal = mapRowToDeal(row);
    eventEmitter.emitDealCreated(tenantId, deal);

    await this.logActivity(tenantId, deal.id, {
      type: 'stage_change',
      description: 'Deal created',
      metadata: { stageId: input.stageId },
    });

    return deal;
  }

  async getById(tenantId: string, id: string): Promise<Deal | null> {
    const row = await db.queryOne<DealRow>(
      'SELECT * FROM deals WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    return row ? mapRowToDeal(row) : null;
  }

  async list(tenantId: string, params: ListQueryParams = {}): Promise<PaginatedResult<Deal>> {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const offset = (page - 1) * limit;
    const sortBy = params.sortBy || 'created_at';
    const sortOrder = params.sortOrder || 'desc';

    let whereClause = 'WHERE tenant_id = $1';
    const queryParams: unknown[] = [tenantId];
    let paramIndex = 2;

    if (params.search) {
      whereClause += ` AND name ILIKE $${paramIndex}`;
      queryParams.push(`%${params.search}%`);
      paramIndex++;
    }

    if (params.filter) {
      if (params.filter.accountId) {
        whereClause += ` AND account_id = $${paramIndex++}`;
        queryParams.push(params.filter.accountId);
      }
      if (params.filter.pipelineId) {
        whereClause += ` AND pipeline_id = $${paramIndex++}`;
        queryParams.push(params.filter.pipelineId);
      }
      if (params.filter.stageId) {
        whereClause += ` AND stage_id = $${paramIndex++}`;
        queryParams.push(params.filter.stageId);
      }
      if (params.filter.ownerId) {
        whereClause += ` AND owner_id = $${paramIndex++}`;
        queryParams.push(params.filter.ownerId);
      }
    }

    const validSortColumns = ['created_at', 'updated_at', 'value', 'probability', 'expected_close_date'];
    const safeSortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';

    const countResult = await db.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM deals ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult?.count || '0', 10);

    queryParams.push(limit, offset);
    const rows = await db.query<DealRow>(
      `SELECT * FROM deals ${whereClause} ORDER BY ${safeSortColumn} ${sortOrder} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      queryParams
    );

    return {
      data: rows.map(mapRowToDeal),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(tenantId: string, id: string, updates: Partial<Deal>): Promise<Deal | null> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      name: 'name',
      description: 'description',
      value: 'value',
      currency: 'currency',
      probability: 'probability',
      stageId: 'stage_id',
      pipelineId: 'pipeline_id',
      ownerId: 'owner_id',
      contactId: 'contact_id',
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (updates[key as keyof Deal] !== undefined) {
        setClauses.push(`${dbField} = $${paramIndex++}`);
        values.push(updates[key as keyof Deal]);
      }
    }

    if (updates.expectedCloseDate !== undefined) {
      setClauses.push(`expected_close_date = $${paramIndex++}`);
      values.push(updates.expectedCloseDate);
    }

    if (updates.metadata) {
      setClauses.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(updates.metadata));
    }

    if (setClauses.length === 0) {
      return this.getById(tenantId, id);
    }

    values.push(id, tenantId);
    const row = await db.queryOne<DealRow>(
      `UPDATE deals SET ${setClauses.join(', ')} WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex} RETURNING *`,
      values
    );

    return row ? mapRowToDeal(row) : null;
  }

  async updateStage(tenantId: string, id: string, input: UpdateDealStageInput): Promise<Deal | null> {
    const deal = await this.getById(tenantId, id);
    if (!deal) return null;

    const oldStageId = deal.stageId;
    const oldProbability = deal.probability;

    await db.execute(
      'UPDATE deals SET stage_id = $1, probability = $2 WHERE id = $3',
      [input.stageId, input.probability || deal.probability, id]
    );

    if (input.notes) {
      await this.logActivity(tenantId, id, {
        type: 'note',
        description: input.notes,
      });
    }

    await this.logActivity(tenantId, id, {
      type: 'stage_change',
      description: `Stage changed from ${oldStageId} to ${input.stageId}`,
      fromValue: oldStageId,
      toValue: input.stageId,
    });

    const stage = await this.getStage(tenantId, input.stageId);
    if (stage?.isWinStage) {
      await db.execute(
        'UPDATE deals SET won_at = NOW(), actual_close_date = NOW() WHERE id = $1',
        [id]
      );
    }

    if (stage?.isLossStage && input.notes) {
      await db.execute(
        'UPDATE deals SET lost_reason = $1 WHERE id = $2',
        [input.notes, id]
      );
    }

    const updatedDeal = await this.getById(tenantId, id);
    if (updatedDeal) {
      eventEmitter.emitDealStageChanged(tenantId, updatedDeal, oldStageId, input.stageId);
    }

    return updatedDeal;
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const count = await db.execute(
      'DELETE FROM deals WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    return count > 0;
  }

  async logActivity(
    tenantId: string,
    dealId: string,
    input: { type: DealActivity['type']; description: string; fromValue?: string; toValue?: string; userId?: string; metadata?: Record<string, unknown> }
  ): Promise<DealActivity> {
    const row = await db.queryOne<DealActivityRow>(
      `INSERT INTO deal_activities (deal_id, tenant_id, type, description, from_value, to_value, user_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        dealId,
        tenantId,
        input.type,
        input.description,
        input.fromValue || null,
        input.toValue || null,
        input.userId || null,
        JSON.stringify(input.metadata || {}),
      ]
    );

    if (!row) {
      throw new Error('Failed to log activity');
    }

    return mapRowToActivity(row);
  }

  async getActivities(tenantId: string, dealId: string): Promise<DealActivity[]> {
    const rows = await db.query<DealActivityRow>(
      'SELECT * FROM deal_activities WHERE deal_id = $1 AND tenant_id = $2 ORDER BY created_at DESC',
      [dealId, tenantId]
    );
    return rows.map(mapRowToActivity);
  }

  async getPipelines(tenantId: string): Promise<Pipeline[]> {
    const rows = await db.query<PipelineRow>(
      'SELECT * FROM pipelines WHERE tenant_id = $1 ORDER BY is_default DESC, name',
      [tenantId]
    );

    const pipelines = rows.map(mapRowToPipeline);

    for (const pipeline of pipelines) {
      pipeline.stages = await this.getPipelineStages(tenantId, pipeline.id);
    }

    return pipelines;
  }

  async getPipeline(tenantId: string, pipelineId: string): Promise<Pipeline | null> {
    const row = await db.queryOne<PipelineRow>(
      'SELECT * FROM pipelines WHERE id = $1 AND tenant_id = $2',
      [pipelineId, tenantId]
    );

    if (!row) return null;

    const pipeline = mapRowToPipeline(row);
    pipeline.stages = await this.getPipelineStages(tenantId, pipelineId);

    return pipeline;
  }

  private async getPipelineStages(tenantId: string, pipelineId: string): Promise<PipelineStage[]> {
    const rows = await db.query<PipelineStageRow>(
      'SELECT * FROM pipeline_stages WHERE pipeline_id = $1 ORDER BY "order" ASC',
      [pipelineId]
    );
    return rows.map(mapRowToStage);
  }

  async getStage(tenantId: string, stageId: string): Promise<PipelineStage | null> {
    const row = await db.queryOne<PipelineStageRow>(
      'SELECT * FROM pipeline_stages WHERE id = $1',
      [stageId]
    );
    return row ? mapRowToStage(row) : null;
  }

  async createPipeline(tenantId: string, name: string, description?: string, isDefault = false): Promise<Pipeline> {
    if (isDefault) {
      await db.execute(
        'UPDATE pipelines SET is_default = false WHERE tenant_id = $1',
        [tenantId]
      );
    }

    const row = await db.queryOne<PipelineRow>(
      `INSERT INTO pipelines (tenant_id, name, description, is_default) VALUES ($1, $2, $3, $4) RETURNING *`,
      [tenantId, name, description || null, isDefault]
    );

    if (!row) {
      throw new Error('Failed to create pipeline');
    }

    return mapRowToPipeline(row);
  }

  async createStage(pipelineId: string, name: string, order: number, probability: number, options?: { isWinStage?: boolean; isLossStage?: boolean; daysToAdvance?: number }): Promise<PipelineStage> {
    const row = await db.queryOne<PipelineStageRow>(
      `INSERT INTO pipeline_stages (pipeline_id, name, "order", probability, is_win_stage, is_loss_stage, days_to_advance)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        pipelineId,
        name,
        order,
        probability,
        options?.isWinStage || false,
        options?.isLossStage || false,
        options?.daysToAdvance || null,
      ]
    );

    if (!row) {
      throw new Error('Failed to create stage');
    }

    return mapRowToStage(row);
  }

  async getPipelineView(tenantId: string, pipelineId: string): Promise<{ pipeline: Pipeline; stages: { stage: PipelineStage; deals: Deal[]; totalValue: number }[] }> {
    const pipeline = await this.getPipeline(tenantId, pipelineId);
    if (!pipeline) {
      throw new Error('Pipeline not found');
    }

    const stageViews = [];

    for (const stage of pipeline.stages) {
      const deals = await this.list(tenantId, { filter: { pipelineId, stageId: stage.id } });
      const totalValue = deals.data.reduce((sum, deal) => sum + deal.value, 0);
      stageViews.push({
        stage,
        deals: deals.data,
        totalValue,
      });
    }

    return { pipeline, stages: stageViews };
  }

  async winAnalysis(tenantId: string, startDate?: Date, endDate?: Date): Promise<{ totalDeals: number; wonDeals: number; lostDeals: number; winRate: number; averageDealValue: number; totalValue: number }> {
    let whereClause = 'WHERE tenant_id = $1';
    const queryParams: unknown[] = [tenantId];
    let paramIndex = 2;

    if (startDate) {
      whereClause += ` AND created_at >= $${paramIndex++}`;
      queryParams.push(startDate);
    }
    if (endDate) {
      whereClause += ` AND created_at <= $${paramIndex++}`;
      queryParams.push(endDate);
    }

    const rows = await db.query<{ count: string; total_value: string }>(
      `SELECT COUNT(*) as count, COALESCE(SUM(value), 0) as total_value FROM deals ${whereClause}`,
      queryParams
    );

    const totalDeals = parseInt(rows[0]?.count || '0', 10);
    const totalValue = parseInt(rows[0]?.total_value || '0', 10);

    const wonRows = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM deals ${whereClause} AND won_at IS NOT NULL`,
      queryParams
    );
    const wonDeals = parseInt(wonRows[0]?.count || '0', 10);

    const lostRows = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM deals ${whereClause} AND lost_reason IS NOT NULL`,
      queryParams
    );
    const lostDeals = parseInt(lostRows[0]?.count || '0', 10);

    return {
      totalDeals,
      wonDeals,
      lostDeals,
      winRate: totalDeals > 0 ? (wonDeals / totalDeals) * 100 : 0,
      averageDealValue: totalDeals > 0 ? totalValue / totalDeals : 0,
      totalValue,
    };
  }
}

export const dealService = new DealService();
