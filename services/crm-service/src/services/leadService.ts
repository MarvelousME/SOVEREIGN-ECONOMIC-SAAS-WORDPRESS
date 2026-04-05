import { db } from '../models/database';
import { eventEmitter } from './eventEmitter';
import {
  Lead,
  LeadActivity,
  LeadScore,
  CreateLeadInput,
  UpdateLeadInput,
  LogActivityInput,
  PaginatedResult,
  ListQueryParams,
  LeadStatus,
  LeadAttribution,
} from '../types';
import { scoringService } from './scoringService';
import { routingService } from './routingService';

interface LeadRow {
  id: string;
  tenant_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  company: string | null;
  job_title: string | null;
  status: LeadStatus;
  score: number | null;
  behavioral_score: number | null;
  demographic_score: number | null;
  engagement_score: number | null;
  owner_id: string | null;
  attribution_source: string;
  attribution_medium: string;
  attribution_campaign: string | null;
  attribution_term: string | null;
  attribution_content: string | null;
  attribution_referrer: string | null;
  attribution_landing_page: string | null;
  tags: string[];
  custom_fields: Record<string, unknown>;
  converted_at: Date | null;
  converted_to_deal_id: string | null;
  lost_at: Date | null;
  lost_reason: string | null;
  last_contacted_at: Date | null;
  next_follow_up: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface ActivityRow {
  id: string;
  lead_id: string;
  tenant_id: string;
  type: string;
  subject: string;
  description: string | null;
  direction: string | null;
  duration: number | null;
  outcome: string | null;
  user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
}

interface ScoreRow {
  id: string;
  lead_id: string;
  tenant_id: string;
  behavioral_score: number;
  demographic_score: number;
  engagement_score: number;
  total_score: number;
  scores: Record<string, number>;
  segment: string | null;
  calculated_at: Date;
}

function mapRowToLead(row: LeadRow): Lead {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    firstName: row.first_name || undefined,
    lastName: row.last_name || undefined,
    email: row.email,
    phone: row.phone || undefined,
    company: row.company || undefined,
    jobTitle: row.job_title || undefined,
    status: row.status,
    score: row.score || undefined,
    behavioralScore: row.behavioral_score || undefined,
    demographicScore: row.demographic_score || undefined,
    engagementScore: row.engagement_score || undefined,
    ownerId: row.owner_id || undefined,
    attribution: {
      source: row.attribution_source as LeadAttribution['source'],
      medium: row.attribution_medium as LeadAttribution['medium'],
      campaign: row.attribution_campaign || undefined,
      term: row.attribution_term || undefined,
      content: row.attribution_content || undefined,
      referrer: row.attribution_referrer || undefined,
      landingPage: row.attribution_landing_page || undefined,
    },
    tags: row.tags || [],
    customFields: row.custom_fields || {},
    convertedAt: row.converted_at || undefined,
    convertedToDealId: row.converted_to_deal_id || undefined,
    lostAt: row.lost_at || undefined,
    lostReason: row.lost_reason || undefined,
    lastContactedAt: row.last_contacted_at || undefined,
    nextFollowUp: row.next_follow_up || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToActivity(row: ActivityRow): LeadActivity {
  return {
    id: row.id,
    leadId: row.lead_id,
    tenantId: row.tenant_id,
    type: row.type as LeadActivity['type'],
    subject: row.subject,
    description: row.description || undefined,
    direction: row.direction as LeadActivity['direction'] | undefined,
    duration: row.duration || undefined,
    outcome: row.outcome || undefined,
    userId: row.user_id || undefined,
    metadata: row.metadata || {},
    createdAt: row.created_at,
  };
}

export class LeadService {
  async create(tenantId: string, input: CreateLeadInput): Promise<Lead> {
    const attribution = input.attribution || {};
    
    const row = await db.queryOne<LeadRow>(
      `INSERT INTO leads (
        tenant_id, first_name, last_name, email, phone, company, job_title,
        attribution_source, attribution_medium, attribution_campaign, attribution_term,
        attribution_content, attribution_referrer, attribution_landing_page,
        tags, custom_fields, owner_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        tenantId,
        input.firstName || null,
        input.lastName || null,
        input.email,
        input.phone || null,
        input.company || null,
        input.jobTitle || null,
        attribution.source || 'web',
        attribution.medium || 'organic',
        attribution.campaign || null,
        attribution.term || null,
        attribution.content || null,
        attribution.referrer || null,
        attribution.landingPage || null,
        input.tags || [],
        JSON.stringify(input.customFields || {}),
        input.ownerId || null,
      ]
    );

    if (!row) {
      throw new Error('Failed to create lead');
    }

    const lead = mapRowToLead(row);

    const score = await scoringService.calculateScore(tenantId, lead);
    if (score) {
      lead.score = score.totalScore;
      lead.behavioralScore = score.behavioralScore;
      lead.demographicScore = score.demographicScore;
      lead.engagementScore = score.engagementScore;
    }

    const routingRule = await routingService.applyRoutingRules(tenantId, lead);
    if (routingRule && routingRule.actions) {
      for (const action of routingRule.actions) {
        if (action.type === 'assign_owner' && action.value) {
          await this.update(tenantId, lead.id, { ownerId: action.value as string });
          lead.ownerId = action.value as string;
        }
        if (action.type === 'add_tag' && action.value) {
          const tags = [...lead.tags, action.value as string];
          await db.execute(
            'UPDATE leads SET tags = $1 WHERE id = $2',
            [tags, lead.id]
          );
          lead.tags = tags;
        }
      }
    }

    eventEmitter.emitLeadCaptured(tenantId, lead);
    if (routingRule) {
      eventEmitter.emitLeadRouted(tenantId, lead, routingRule);
    }

    return lead;
  }

  async getById(tenantId: string, id: string): Promise<Lead | null> {
    const row = await db.queryOne<LeadRow>(
      'SELECT * FROM leads WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    return row ? mapRowToLead(row) : null;
  }

  async list(tenantId: string, params: ListQueryParams = {}): Promise<PaginatedResult<Lead>> {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const offset = (page - 1) * limit;
    const sortBy = params.sortBy || 'created_at';
    const sortOrder = params.sortOrder || 'desc';

    let whereClause = 'WHERE tenant_id = $1';
    const queryParams: unknown[] = [tenantId];
    let paramIndex = 2;

    if (params.search) {
      whereClause += ` AND (
        email ILIKE $${paramIndex} OR
        first_name ILIKE $${paramIndex} OR
        last_name ILIKE $${paramIndex} OR
        company ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${params.search}%`);
      paramIndex++;
    }

    if (params.filter) {
      if (params.filter.status) {
        whereClause += ` AND status = $${paramIndex}`;
        queryParams.push(params.filter.status);
        paramIndex++;
      }
      if (params.filter.ownerId) {
        whereClause += ` AND owner_id = $${paramIndex}`;
        queryParams.push(params.filter.ownerId);
        paramIndex++;
      }
      if (params.filter.tags && Array.isArray(params.filter.tags)) {
        whereClause += ` AND tags && $${paramIndex}`;
        queryParams.push(params.filter.tags);
        paramIndex++;
      }
    }

    const validSortColumns = ['created_at', 'updated_at', 'score', 'status', 'email', 'company'];
    const safeSortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';

    const countResult = await db.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM leads ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult?.count || '0', 10);

    queryParams.push(limit, offset);
    const rows = await db.query<LeadRow>(
      `SELECT * FROM leads ${whereClause} ORDER BY ${safeSortColumn} ${sortOrder} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      queryParams
    );

    return {
      data: rows.map(mapRowToLead),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(tenantId: string, id: string, input: UpdateLeadInput): Promise<Lead | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.firstName !== undefined) {
      updates.push(`first_name = $${paramIndex++}`);
      values.push(input.firstName);
    }
    if (input.lastName !== undefined) {
      updates.push(`last_name = $${paramIndex++}`);
      values.push(input.lastName);
    }
    if (input.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(input.email);
    }
    if (input.phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(input.phone);
    }
    if (input.company !== undefined) {
      updates.push(`company = $${paramIndex++}`);
      values.push(input.company);
    }
    if (input.jobTitle !== undefined) {
      updates.push(`job_title = $${paramIndex++}`);
      values.push(input.jobTitle);
    }
    if (input.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(input.status);
      if (input.status === 'lost') {
        updates.push(`lost_at = NOW()`);
      }
    }
    if (input.ownerId !== undefined) {
      updates.push(`owner_id = $${paramIndex++}`);
      values.push(input.ownerId);
    }
    if (input.tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      values.push(input.tags);
    }
    if (input.customFields !== undefined) {
      updates.push(`custom_fields = $${paramIndex++}`);
      values.push(JSON.stringify(input.customFields));
    }
    if (input.nextFollowUp !== undefined) {
      updates.push(`next_follow_up = $${paramIndex++}`);
      values.push(input.nextFollowUp);
    }

    if (updates.length === 0) {
      return this.getById(tenantId, id);
    }

    values.push(id, tenantId);
    const row = await db.queryOne<LeadRow>(
      `UPDATE leads SET ${updates.join(', ')} WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex} RETURNING *`,
      values
    );

    return row ? mapRowToLead(row) : null;
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const count = await db.execute(
      'DELETE FROM leads WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    return count > 0;
  }

  async logActivity(tenantId: string, leadId: string, input: LogActivityInput): Promise<LeadActivity> {
    const row = await db.queryOne<ActivityRow>(
      `INSERT INTO lead_activities (lead_id, tenant_id, type, subject, description, direction, duration, outcome, user_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        leadId,
        tenantId,
        input.type,
        input.subject,
        input.description || null,
        input.direction || null,
        input.duration || null,
        input.outcome || null,
        input.userId || null,
        JSON.stringify(input.metadata || {}),
      ]
    );

    if (!row) {
      throw new Error('Failed to log activity');
    }

    if (input.type === 'call' || input.type === 'meeting' || input.type === 'email') {
      await db.execute(
        'UPDATE leads SET last_contacted_at = NOW() WHERE id = $1',
        [leadId]
      );
    }

    const activity = mapRowToActivity(row);
    eventEmitter.emitActivityLogged(tenantId, activity);

    const lead = await this.getById(tenantId, leadId);
    if (lead) {
      await scoringService.recalculateScore(tenantId, lead);
    }

    return activity;
  }

  async getTimeline(tenantId: string, leadId: string, params: ListQueryParams = {}): Promise<PaginatedResult<LeadActivity>> {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const offset = (page - 1) * limit;

    const countResult = await db.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM lead_activities WHERE lead_id = $1 AND tenant_id = $2',
      [leadId, tenantId]
    );
    const total = parseInt(countResult?.count || '0', 10);

    const rows = await db.query<ActivityRow>(
      `SELECT * FROM lead_activities WHERE lead_id = $1 AND tenant_id = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
      [leadId, tenantId, limit, offset]
    );

    return {
      data: rows.map(mapRowToActivity),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async convertToDeal(tenantId: string, leadId: string, dealData: { name: string; value: number; pipelineId: string; stageId: string }): Promise<{ lead: Lead; dealId: string }> {
    return db.transaction(async () => {
      const lead = await this.getById(tenantId, leadId);
      if (!lead) {
        throw new Error('Lead not found');
      }

      if (lead.status === 'converted') {
        throw new Error('Lead already converted');
      }

      const { dealService } = await import('./dealService');
      const deal = await dealService.create(tenantId, {
        name: dealData.name,
        value: dealData.value,
        pipelineId: dealData.pipelineId,
        stageId: dealData.stageId,
        leadId: leadId,
        contactId: undefined,
        accountId: undefined,
      });

      await db.execute(
        `UPDATE leads SET status = 'converted', converted_at = NOW(), converted_to_deal_id = $1 WHERE id = $2`,
        [deal.id, leadId]
      );

      const updatedLead = await this.getById(tenantId, leadId);
      if (!updatedLead) {
        throw new Error('Failed to fetch updated lead');
      }

      eventEmitter.emitLeadConverted(tenantId, updatedLead, deal);

      return { lead: updatedLead, dealId: deal.id };
    });
  }

  async bulkImport(tenantId: string, leads: CreateLeadInput[]): Promise<{ imported: number; failed: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;
    let failed = 0;

    for (const leadInput of leads) {
      try {
        await this.create(tenantId, leadInput);
        imported++;
      } catch (error) {
        failed++;
        errors.push(`Failed to import lead ${leadInput.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { imported, failed, errors };
  }

  async getScore(tenantId: string, leadId: string): Promise<LeadScore | null> {
    const row = await db.queryOne<ScoreRow>(
      'SELECT * FROM lead_scores WHERE lead_id = $1 AND tenant_id = $2 ORDER BY calculated_at DESC LIMIT 1',
      [leadId, tenantId]
    );

    if (!row) return null;

    return {
      id: row.id,
      leadId: row.lead_id,
      tenantId: row.tenant_id,
      behavioralScore: row.behavioral_score,
      demographicScore: row.demographic_score,
      engagementScore: row.engagement_score,
      totalScore: row.total_score,
      scores: row.scores,
      segment: row.segment || undefined,
      calculatedAt: row.calculated_at,
    };
  }

  async updateStatus(tenantId: string, id: string, status: LeadStatus, reason?: string): Promise<Lead | null> {
    const updates: Record<string, unknown> = { status };
    
    if (status === 'lost') {
      updates.lostAt = new Date();
      updates.lostReason = reason;
    } else if (status === 'contacted') {
      updates.lastContactedAt = new Date();
    }

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      setClauses.push(`${snakeKey} = $${paramIndex++}`);
      values.push(value);
    }

    values.push(id, tenantId);
    const row = await db.queryOne<LeadRow>(
      `UPDATE leads SET ${setClauses.join(', ')} WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex} RETURNING *`,
      values
    );

    return row ? mapRowToLead(row) : null;
  }
}

export const leadService = new LeadService();
