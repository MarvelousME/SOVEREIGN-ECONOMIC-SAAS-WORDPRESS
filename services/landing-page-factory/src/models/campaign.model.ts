import { Pool } from 'pg';
import {
  CampaignAgentChainRun,
  CampaignOrchestration,
  CampaignExecutionSummary,
  CampaignNextAction,
  CampaignReportKpis,
  CampaignReportResult,
  CampaignReportRow,
  CampaignStateEvent,
  CampaignStatus,
} from '../types';

const CAMPAIGN_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  draft: ['ready', 'archived'],
  ready: ['scheduled', 'running', 'archived'],
  scheduled: ['running', 'paused', 'failed', 'archived'],
  running: ['paused', 'completed', 'failed', 'archived'],
  paused: ['running', 'failed', 'archived'],
  completed: ['archived'],
  failed: ['draft', 'archived'],
  archived: [],
};

export function canTransitionCampaignStatus(from: CampaignStatus, to: CampaignStatus): boolean {
  if (from === to) return true;
  return CAMPAIGN_TRANSITIONS[from].includes(to);
}

type CampaignRow = Record<string, unknown>;
type CampaignEventRow = Record<string, unknown>;
type CampaignSummaryRow = Record<string, unknown>;

export function calculateCampaignReportKpis(
  totalPosts: number,
  publishedPosts: number,
  failedPosts: number,
  daysInRange: number
): CampaignReportKpis {
  const safeTotal = Number(totalPosts || 0);
  const safePublished = Number(publishedPosts || 0);
  const safeFailed = Number(failedPosts || 0);
  const successRate = safeTotal > 0 ? Number(((safePublished / safeTotal) * 100).toFixed(2)) : 0;
  const failureRate = safeTotal > 0 ? Number(((safeFailed / safeTotal) * 100).toFixed(2)) : 0;
  const publishThroughputPerDay = daysInRange > 0 ? Number((safePublished / daysInRange).toFixed(2)) : 0;
  return {
    totalPosts: safeTotal,
    publishedPosts: safePublished,
    failedPosts: safeFailed,
    successRate,
    failureRate,
    publishThroughputPerDay,
  };
}

export class CampaignModel {
  constructor(private db: Pool) {}

  async create(input: {
    tenantId: string;
    userId: string;
    name: string;
    description?: string;
    objective?: string;
    budget?: number;
    businessId?: string;
    pageId?: string;
    startsAt?: Date;
    endsAt?: Date;
    metadata?: Record<string, unknown>;
  }): Promise<CampaignOrchestration> {
    const r = await this.db.query(
      `INSERT INTO campaign_orchestrations (
         tenant_id, business_id, page_id, name, description, objective, budget,
         status, starts_at, ends_at, metadata, created_by
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,'draft',$8,$9,$10,$11
       )
       RETURNING *`,
      [
        input.tenantId,
        input.businessId || null,
        input.pageId || null,
        input.name,
        input.description || null,
        input.objective || null,
        input.budget ?? null,
        input.startsAt || null,
        input.endsAt || null,
        JSON.stringify(input.metadata || {}),
        input.userId,
      ]
    );
    return this.mapCampaign(r.rows[0] as CampaignRow);
  }

  async findById(tenantId: string, id: string): Promise<CampaignOrchestration | null> {
    const r = await this.db.query(
      `SELECT * FROM campaign_orchestrations WHERE tenant_id = $1 AND id = $2`,
      [tenantId, id]
    );
    return r.rowCount ? this.mapCampaign(r.rows[0] as CampaignRow) : null;
  }

  async list(
    tenantId: string,
    options?: {
      scope?: 'own' | 'workspace';
      userId?: string;
      limit?: number;
      offset?: number;
      search?: string;
      sort?: 'updated' | 'name' | 'progress';
    }
  ): Promise<{ data: CampaignOrchestration[]; total: number }> {
    const scope = options?.scope || 'workspace';
    const userId = options?.userId;
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    const search = options?.search?.trim();
    const sort = options?.sort || 'updated';

    const whereParams: unknown[] = [tenantId];
    let whereClause = 'tenant_id = $1';
    if (scope === 'own' && userId) {
      whereParams.push(userId);
      whereClause += ` AND created_by = $${whereParams.length}`;
    }
    if (search) {
      whereParams.push(`%${search}%`);
      const idx = whereParams.length;
      whereClause += ` AND (name ILIKE $${idx} OR COALESCE(description, '') ILIKE $${idx} OR status ILIKE $${idx})`;
    }

    let orderBy = 'updated_at DESC';
    if (sort === 'name') {
      orderBy = 'name ASC, updated_at DESC';
    } else if (sort === 'progress') {
      // Approximation without expensive joins: prioritize active execution states.
      orderBy = `CASE
        WHEN status = 'running' THEN 1
        WHEN status = 'scheduled' THEN 2
        WHEN status = 'ready' THEN 3
        WHEN status = 'draft' THEN 4
        WHEN status = 'paused' THEN 5
        WHEN status = 'failed' THEN 6
        WHEN status = 'completed' THEN 7
        ELSE 8
      END ASC, updated_at DESC`;
    }

    const countResult = await this.db.query(
      `SELECT COUNT(*)::int AS total
       FROM campaign_orchestrations
       WHERE ${whereClause}`,
      whereParams
    );
    const total = Number((countResult.rows[0] as Record<string, unknown>)?.total || 0);

    const listParams = [...whereParams, limit, offset];
    const r = await this.db.query(
      `SELECT * FROM campaign_orchestrations
       WHERE ${whereClause}
       ORDER BY ${orderBy}
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams
    );
    return {
      data: r.rows.map((row) => this.mapCampaign(row as CampaignRow)),
      total,
    };
  }

  async update(
    tenantId: string,
    id: string,
    patch: {
      name?: string;
      description?: string;
      objective?: string;
      budget?: number;
      startsAt?: Date;
      endsAt?: Date;
      metadata?: Record<string, unknown>;
    }
  ): Promise<CampaignOrchestration | null> {
    const updates: string[] = [];
    const values: unknown[] = [tenantId, id];
    let idx = 3;

    const push = (expr: string, value: unknown): void => {
      updates.push(`${expr} = $${idx++}`);
      values.push(value);
    };

    if (patch.name !== undefined) push('name', patch.name);
    if (patch.description !== undefined) push('description', patch.description || null);
    if (patch.objective !== undefined) push('objective', patch.objective || null);
    if (patch.budget !== undefined) push('budget', patch.budget ?? null);
    if (patch.startsAt !== undefined) push('starts_at', patch.startsAt || null);
    if (patch.endsAt !== undefined) push('ends_at', patch.endsAt || null);
    if (patch.metadata !== undefined) push('metadata', JSON.stringify(patch.metadata || {}));

    if (updates.length === 0) {
      return this.findById(tenantId, id);
    }

    updates.push(`updated_at = NOW()`);
    const r = await this.db.query(
      `UPDATE campaign_orchestrations
       SET ${updates.join(', ')}
       WHERE tenant_id = $1 AND id = $2
       RETURNING *`,
      values
    );
    return r.rowCount ? this.mapCampaign(r.rows[0] as CampaignRow) : null;
  }

  async transitionStatus(input: {
    tenantId: string;
    campaignId: string;
    toStatus: CampaignStatus;
    userId: string;
    reason?: string;
    metadata?: Record<string, unknown>;
  }): Promise<CampaignOrchestration> {
    const current = await this.findById(input.tenantId, input.campaignId);
    if (!current) {
      throw new Error('Campaign not found');
    }
    if (!canTransitionCampaignStatus(current.status, input.toStatus)) {
      throw new Error(`Invalid campaign status transition: ${current.status} -> ${input.toStatus}`);
    }

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const updated = await client.query(
        `UPDATE campaign_orchestrations
         SET status = $3, updated_at = NOW()
         WHERE tenant_id = $1 AND id = $2
         RETURNING *`,
        [input.tenantId, input.campaignId, input.toStatus]
      );

      await client.query(
        `INSERT INTO campaign_state_events (
           campaign_id, tenant_id, from_status, to_status, reason, metadata, changed_by
         ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          input.campaignId,
          input.tenantId,
          current.status,
          input.toStatus,
          input.reason || null,
          JSON.stringify(input.metadata || {}),
          input.userId,
        ]
      );

      await client.query('COMMIT');
      return this.mapCampaign(updated.rows[0] as CampaignRow);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listStateEvents(tenantId: string, campaignId: string): Promise<CampaignStateEvent[]> {
    const r = await this.db.query(
      `SELECT * FROM campaign_state_events
       WHERE tenant_id = $1 AND campaign_id = $2
       ORDER BY created_at DESC`,
      [tenantId, campaignId]
    );
    return r.rows.map((row) => this.mapCampaignEvent(row as CampaignEventRow));
  }

  async getExecutionSummary(tenantId: string, campaignId: string): Promise<CampaignExecutionSummary | null> {
    const campaign = await this.findById(tenantId, campaignId);
    if (!campaign) return null;

    const countsResult = await this.db.query(
      `SELECT
         COUNT(*)::int AS total,
         SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END)::int AS queued,
         SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END)::int AS scheduled,
         SUM(CASE WHEN status = 'publishing' THEN 1 ELSE 0 END)::int AS publishing,
         SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END)::int AS published,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)::int AS failed,
         SUM(CASE WHEN status = 'dead_letter' THEN 1 ELSE 0 END)::int AS dead_letter,
         SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END)::int AS cancelled
       FROM social_posts
       WHERE tenant_id = $1 AND campaign_id = $2`,
      [tenantId, campaignId]
    );
    const countsRow = countsResult.rows[0] as CampaignSummaryRow;

    const eventResult = await this.db.query(
      `SELECT to_status, reason, created_at
       FROM campaign_state_events
       WHERE tenant_id = $1 AND campaign_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [tenantId, campaignId]
    );
    const lastEvent = eventResult.rowCount ? (eventResult.rows[0] as CampaignSummaryRow) : undefined;

    const failureResult = await this.db.query(
      `SELECT error_message, created_at
       FROM social_post_attempts spa
       INNER JOIN social_posts sp ON sp.id = spa.social_post_id
       WHERE sp.tenant_id = $1 AND sp.campaign_id = $2 AND spa.status = 'failed'
       ORDER BY spa.created_at DESC
       LIMIT 1`,
      [tenantId, campaignId]
    );
    const lastFailure = failureResult.rowCount ? (failureResult.rows[0] as CampaignSummaryRow) : undefined;

    const total = Number(countsRow.total || 0);
    const published = Number(countsRow.published || 0);
    const failed = Number(countsRow.failed || 0);
    const deadLetter = Number(countsRow.dead_letter || 0);
    const progressPercent = total > 0 ? Math.round((published / total) * 100) : 0;
    const hasFailures = failed > 0 || deadLetter > 0;
    const nextAction = this.deriveNextAction(campaign.status, {
      total,
      scheduled: Number(countsRow.scheduled || 0),
      published,
      hasFailures,
      progressPercent,
    });

    return {
      campaignId,
      status: campaign.status,
      socialPostCounts: {
        total,
        queued: Number(countsRow.queued || 0),
        scheduled: Number(countsRow.scheduled || 0),
        publishing: Number(countsRow.publishing || 0),
        published,
        failed,
        deadLetter,
        cancelled: Number(countsRow.cancelled || 0),
      },
      progressPercent,
      hasFailures,
      lastFailureReason:
        (lastFailure?.error_message as string | undefined) ||
        (lastEvent?.reason as string | undefined) ||
        undefined,
      lastStatusChangeAt: lastEvent?.created_at ? new Date(lastEvent.created_at as string) : undefined,
      nextAction,
    };
  }

  async getCampaignReport(
    tenantId: string,
    options: {
      from: Date;
      to: Date;
      scope?: 'own' | 'workspace';
      userId?: string;
      ownerId?: string;
      search?: string;
      sort?: 'updated' | 'name' | 'throughput' | 'success_rate' | 'failure_rate';
      direction?: 'asc' | 'desc';
      limit?: number;
      offset?: number;
    }
  ): Promise<CampaignReportResult> {
    const scope = options.scope || 'workspace';
    const userId = options.userId;
    const ownerId = options.ownerId;
    const search = options.search?.trim();
    const sort = options.sort || 'updated';
    const direction = (options.direction || (sort === 'name' ? 'asc' : 'desc')).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;
    const dateFrom = options.from;
    const dateTo = options.to;
    const msInDay = 1000 * 60 * 60 * 24;
    const daysInRange = Math.max(1, Math.ceil((dateTo.getTime() - dateFrom.getTime()) / msInDay));

    const whereParams: unknown[] = [tenantId];
    let whereClause = 'c.tenant_id = $1';

    if (scope === 'own' && userId) {
      whereParams.push(userId);
      whereClause += ` AND c.created_by = $${whereParams.length}`;
    }
    if (ownerId) {
      whereParams.push(ownerId);
      whereClause += ` AND c.created_by = $${whereParams.length}`;
    }
    if (search) {
      whereParams.push(`%${search}%`);
      const idx = whereParams.length;
      whereClause += ` AND (c.name ILIKE $${idx} OR COALESCE(c.description, '') ILIKE $${idx} OR c.status ILIKE $${idx})`;
    }

    whereParams.push(dateFrom);
    const fromParam = whereParams.length;
    whereParams.push(dateTo);
    const toParam = whereParams.length;

    const metricsExpr = `COUNT(sp.id)::int AS total_posts,
      SUM(CASE WHEN sp.status = 'published' THEN 1 ELSE 0 END)::int AS published_posts,
      SUM(CASE WHEN sp.status IN ('failed','dead_letter','cancelled') THEN 1 ELSE 0 END)::int AS failed_posts`;
    const dateFilter = `COALESCE(sp.published_at, sp.scheduled_for, sp.created_at) >= $${fromParam}
      AND COALESCE(sp.published_at, sp.scheduled_for, sp.created_at) <= $${toParam}`;
    const cte = `WITH filtered_campaigns AS (
      SELECT c.id, c.name, c.status, c.created_by, c.updated_at
      FROM campaign_orchestrations c
      WHERE ${whereClause}
    ),
    campaign_stats AS (
      SELECT
        fc.id AS campaign_id,
        fc.name,
        fc.status,
        fc.created_by,
        fc.updated_at,
        ${metricsExpr}
      FROM filtered_campaigns fc
      LEFT JOIN social_posts sp
        ON sp.tenant_id = $1
       AND sp.campaign_id = fc.id
       AND ${dateFilter}
      GROUP BY fc.id, fc.name, fc.status, fc.created_by, fc.updated_at
    )`;

    const orderByMap: Record<string, string> = {
      updated: 'updated_at',
      name: 'name',
      throughput: `CASE WHEN ${daysInRange} > 0 THEN COALESCE(published_posts,0)::numeric / ${daysInRange} ELSE 0 END`,
      success_rate:
        'CASE WHEN COALESCE(total_posts,0) > 0 THEN (COALESCE(published_posts,0)::numeric / COALESCE(total_posts,0)) ELSE 0 END',
      failure_rate:
        "CASE WHEN COALESCE(total_posts,0) > 0 THEN (COALESCE(failed_posts,0)::numeric / COALESCE(total_posts,0)) ELSE 0 END",
    };
    const orderBy = orderByMap[sort] || orderByMap.updated;

    const summaryQuery = `${cte}
      SELECT
        COUNT(*)::int AS campaigns_matched,
        COALESCE(SUM(total_posts), 0)::int AS total_posts,
        COALESCE(SUM(published_posts), 0)::int AS published_posts,
        COALESCE(SUM(failed_posts), 0)::int AS failed_posts
      FROM campaign_stats`;
    const summaryResult = await this.db.query(summaryQuery, whereParams);
    const summaryRow = (summaryResult.rows[0] || {}) as CampaignSummaryRow;

    const total = Number(summaryRow.campaigns_matched || 0);
    const summaryKpis = calculateCampaignReportKpis(
      Number(summaryRow.total_posts || 0),
      Number(summaryRow.published_posts || 0),
      Number(summaryRow.failed_posts || 0),
      daysInRange
    );

    const listParams = [...whereParams, limit, offset];
    const listQuery = `${cte}
      SELECT *
      FROM campaign_stats
      ORDER BY ${orderBy} ${direction}, updated_at DESC
      LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`;
    const listResult = await this.db.query(listQuery, listParams);

    const rows: CampaignReportRow[] = listResult.rows.map((row) => {
      const totalPosts = Number(row.total_posts || 0);
      const publishedPosts = Number(row.published_posts || 0);
      const failedPosts = Number(row.failed_posts || 0);
      return {
        campaignId: row.campaign_id as string,
        campaignName: row.name as string,
        campaignStatus: row.status as CampaignStatus,
        ownerUserId: (row.created_by as string | null) || undefined,
        updatedAt: new Date(row.updated_at as string),
        kpis: calculateCampaignReportKpis(totalPosts, publishedPosts, failedPosts, daysInRange),
      };
    });

    return {
      summary: {
        dateFrom,
        dateTo,
        daysInRange,
        campaignsMatched: total,
        kpis: summaryKpis,
      },
      rows,
      total,
    };
  }

  async saveAgentChainRun(input: {
    tenantId: string;
    campaignId: string;
    userId: string;
    run: CampaignAgentChainRun;
  }): Promise<void> {
    const campaign = await this.findById(input.tenantId, input.campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    await this.db.query(
      `INSERT INTO campaign_state_events (
         campaign_id, tenant_id, from_status, to_status, reason, metadata, changed_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        input.campaignId,
        input.tenantId,
        campaign.status,
        campaign.status,
        'agent_chain_run',
        JSON.stringify({
          kind: 'agent_chain_run',
          run: input.run,
        }),
        input.userId,
      ]
    );
  }

  async getLatestAgentChainRun(
    tenantId: string,
    campaignId: string
  ): Promise<CampaignAgentChainRun | null> {
    const r = await this.db.query(
      `SELECT metadata
       FROM campaign_state_events
       WHERE tenant_id = $1
         AND campaign_id = $2
         AND reason = 'agent_chain_run'
         AND metadata->>'kind' = 'agent_chain_run'
       ORDER BY created_at DESC
       LIMIT 1`,
      [tenantId, campaignId]
    );

    if (!r.rowCount) {
      return null;
    }

    const metadata = r.rows[0].metadata as Record<string, unknown> | string;
    const parsed =
      typeof metadata === 'string'
        ? (JSON.parse(metadata) as Record<string, unknown>)
        : (metadata as Record<string, unknown>);
    return (parsed.run as CampaignAgentChainRun) || null;
  }

  private deriveNextAction(
    status: CampaignStatus,
    metrics: {
      total: number;
      scheduled: number;
      published: number;
      hasFailures: boolean;
      progressPercent: number;
    }
  ): CampaignNextAction {
    if (metrics.total === 0) return 'link_social_posts';
    if (status === 'failed' || metrics.hasFailures) return 'investigate_failures';
    if (status === 'draft' || status === 'ready') return 'schedule_posts';
    if (status === 'paused') return 'resume_execution';
    if (status === 'completed') return 'archive_campaign';
    if (metrics.published < metrics.total || metrics.progressPercent < 100 || metrics.scheduled > 0) {
      return 'monitor_progress';
    }
    return 'monitor_progress';
  }

  private mapCampaign(row: CampaignRow): CampaignOrchestration {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      businessId: (row.business_id as string | null) || undefined,
      pageId: (row.page_id as string | null) || undefined,
      name: row.name as string,
      description: (row.description as string | null) || undefined,
      objective: (row.objective as string | null) || undefined,
      budget: row.budget !== null && row.budget !== undefined ? Number(row.budget) : undefined,
      status: row.status as CampaignStatus,
      startsAt: row.starts_at ? new Date(row.starts_at as string) : undefined,
      endsAt: row.ends_at ? new Date(row.ends_at as string) : undefined,
      metadata:
        (typeof row.metadata === 'string'
          ? (JSON.parse(row.metadata) as Record<string, unknown>)
          : (row.metadata as Record<string, unknown>)) || {},
      createdBy: (row.created_by as string | null) || undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private mapCampaignEvent(row: CampaignEventRow): CampaignStateEvent {
    return {
      id: row.id as string,
      campaignId: row.campaign_id as string,
      tenantId: row.tenant_id as string,
      fromStatus: row.from_status as CampaignStatus,
      toStatus: row.to_status as CampaignStatus,
      reason: (row.reason as string | null) || undefined,
      metadata:
        (typeof row.metadata === 'string'
          ? (JSON.parse(row.metadata) as Record<string, unknown>)
          : (row.metadata as Record<string, unknown>)) || {},
      changedBy: (row.changed_by as string | null) || undefined,
      createdAt: new Date(row.created_at as string),
    };
  }
}
