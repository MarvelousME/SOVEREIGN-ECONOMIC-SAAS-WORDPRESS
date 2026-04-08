import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export type SocialProvider = 'x' | 'linkedin' | 'facebook' | 'tiktok' | 'instagram' | 'youtube';
export type SocialPostStatus =
  | 'queued'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'dead_letter'
  | 'cancelled';

export interface SocialAccount {
  id: string;
  tenantId: string;
  provider: SocialProvider;
  accountRef: string;
  displayName?: string;
  scopes: string[];
  accessTokenEncrypted: string;
  refreshTokenEncrypted?: string;
  expiresAt?: Date;
  metadata: Record<string, unknown>;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SocialPost {
  id: string;
  tenantId: string;
  pageId: string;
  campaignId?: string;
  socialAccountId: string;
  provider: SocialProvider;
  status: SocialPostStatus;
  text: string;
  linkUrl: string;
  utmParams: Record<string, unknown>;
  scheduledFor?: Date;
  publishedAt?: Date;
  providerPostId?: string;
  providerPostUrl?: string;
  errorMessage?: string;
  attempts: number;
  maxAttempts: number;
  metadata: Record<string, unknown>;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt?: Date;
}

export interface OAuthStateRow {
  id: string;
  tenantId: string;
  userId: string;
  provider: SocialProvider;
  stateHash: string;
  codeVerifierHash?: string;
  redirectUri: string;
  expiresAt: Date;
  consumedAt?: Date;
}

export class SocialModel {
  constructor(private db: Pool) {}

  async upsertSocialAccount(input: Omit<SocialAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<SocialAccount> {
    const now = new Date();
    const id = uuidv4();
    const r = await this.db.query(
      `INSERT INTO social_accounts (
         id, tenant_id, provider, account_ref, display_name, scopes,
         access_token_encrypted, refresh_token_encrypted, expires_at, metadata, created_by, created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (tenant_id, provider, account_ref)
       DO UPDATE SET
         display_name = EXCLUDED.display_name,
         scopes = EXCLUDED.scopes,
         access_token_encrypted = EXCLUDED.access_token_encrypted,
         refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
         expires_at = EXCLUDED.expires_at,
         metadata = EXCLUDED.metadata,
         updated_at = EXCLUDED.updated_at
       RETURNING *`,
      [
        id,
        input.tenantId,
        input.provider,
        input.accountRef,
        input.displayName || null,
        input.scopes,
        input.accessTokenEncrypted,
        input.refreshTokenEncrypted || null,
        input.expiresAt || null,
        JSON.stringify(input.metadata || {}),
        input.createdBy || null,
        now,
        now,
      ]
    );
    return this.mapAccount(r.rows[0]);
  }

  async listSocialAccounts(tenantId: string): Promise<SocialAccount[]> {
    const r = await this.db.query(
      `SELECT * FROM social_accounts WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return r.rows.map((row) => this.mapAccount(row));
  }

  async getSocialAccountById(tenantId: string, id: string): Promise<SocialAccount | null> {
    const r = await this.db.query(`SELECT * FROM social_accounts WHERE tenant_id = $1 AND id = $2`, [tenantId, id]);
    return r.rowCount ? this.mapAccount(r.rows[0]) : null;
  }

  async saveOAuthState(input: Omit<OAuthStateRow, 'id' | 'consumedAt'>): Promise<void> {
    await this.db.query(
      `INSERT INTO social_oauth_states (
         tenant_id, user_id, provider, state_hash, code_verifier_hash, redirect_uri, expires_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        input.tenantId,
        input.userId,
        input.provider,
        input.stateHash,
        input.codeVerifierHash || null,
        input.redirectUri,
        input.expiresAt,
      ]
    );
  }

  async consumeOAuthState(
    tenantId: string,
    provider: SocialProvider,
    stateHash: string
  ): Promise<OAuthStateRow | null> {
    const r = await this.db.query(
      `UPDATE social_oauth_states
       SET consumed_at = NOW()
       WHERE tenant_id = $1 AND provider = $2 AND state_hash = $3 AND consumed_at IS NULL AND expires_at > NOW()
       RETURNING *`,
      [tenantId, provider, stateHash]
    );
    if (!r.rowCount) return null;
    const row = r.rows[0];
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      userId: row.user_id as string,
      provider: row.provider as SocialProvider,
      stateHash: row.state_hash as string,
      codeVerifierHash: (row.code_verifier_hash as string | null) || undefined,
      redirectUri: row.redirect_uri as string,
      expiresAt: new Date(row.expires_at as string),
      consumedAt: row.consumed_at ? new Date(row.consumed_at as string) : undefined,
    };
  }

  async createSocialPost(input: Omit<SocialPost, 'id' | 'createdAt' | 'updatedAt' | 'attempts'>): Promise<SocialPost> {
    const id = uuidv4();
    const now = new Date();
    const r = await this.db.query(
      `INSERT INTO social_posts (
         id, tenant_id, page_id, campaign_id, social_account_id, provider, status, text, link_url,
         utm_params, scheduled_for, published_at, provider_post_id, provider_post_url,
         error_message, attempts, max_attempts, metadata, created_by, created_at, updated_at, cancelled_at
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,
         $10,$11,$12,$13,$14,
         $15,$16,$17,$18,$19,$20,$21,$22
       )
       RETURNING *`,
      [
        id,
        input.tenantId,
        input.pageId,
        input.campaignId || null,
        input.socialAccountId,
        input.provider,
        input.status,
        input.text,
        input.linkUrl,
        JSON.stringify(input.utmParams || {}),
        input.scheduledFor || null,
        input.publishedAt || null,
        input.providerPostId || null,
        input.providerPostUrl || null,
        input.errorMessage || null,
        0,
        input.maxAttempts,
        JSON.stringify(input.metadata || {}),
        input.createdBy || null,
        now,
        now,
        input.cancelledAt || null,
      ]
    );
    return this.mapPost(r.rows[0]);
  }

  async listSocialPosts(
    tenantId: string,
    options?: { scope?: 'own' | 'workspace'; userId?: string; limit?: number; offset?: number }
  ): Promise<{ data: SocialPost[]; total: number }> {
    const scope = options?.scope || 'workspace';
    const userId = options?.userId;
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;

    const queryParams: string[] = [tenantId];
    let whereClause = 'tenant_id = $1';

    if (scope === 'own' && userId) {
      queryParams.push(userId);
      whereClause += ` AND created_by = $${queryParams.length}`;
    }

    const countResult = await this.db.query(
      `SELECT COUNT(*)::int AS total FROM social_posts WHERE ${whereClause}`,
      queryParams
    );
    const total = Number((countResult.rows[0] as Record<string, unknown>)?.total || 0);

    const listParams: Array<string | number> = [...queryParams, limit, offset];
    const r = await this.db.query(
      `SELECT * FROM social_posts
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams
    );
    return {
      data: r.rows.map((row) => this.mapPost(row)),
      total,
    };
  }

  async getSocialPostById(tenantId: string, id: string): Promise<SocialPost | null> {
    const r = await this.db.query(`SELECT * FROM social_posts WHERE tenant_id = $1 AND id = $2`, [tenantId, id]);
    return r.rowCount ? this.mapPost(r.rows[0]) : null;
  }

  async updateSocialPostStatus(
    tenantId: string,
    id: string,
    patch: {
      status: SocialPostStatus;
      attemptsIncrement?: boolean;
      publishedAt?: Date;
      providerPostId?: string;
      providerPostUrl?: string;
      errorMessage?: string;
      cancelledAt?: Date;
    }
  ): Promise<void> {
    await this.db.query(
      `UPDATE social_posts
       SET status = $3,
           attempts = attempts + CASE WHEN $4::boolean THEN 1 ELSE 0 END,
           published_at = COALESCE($5, published_at),
           provider_post_id = COALESCE($6, provider_post_id),
           provider_post_url = COALESCE($7, provider_post_url),
           error_message = COALESCE($8, error_message),
           cancelled_at = COALESCE($9, cancelled_at),
           updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2`,
      [
        tenantId,
        id,
        patch.status,
        Boolean(patch.attemptsIncrement),
        patch.publishedAt || null,
        patch.providerPostId || null,
        patch.providerPostUrl || null,
        patch.errorMessage || null,
        patch.cancelledAt || null,
      ]
    );
  }

  async createPostAttempt(input: {
    socialPostId: string;
    attemptNumber: number;
    status: string;
    responsePayload?: Record<string, unknown>;
    errorMessage?: string;
  }): Promise<void> {
    await this.db.query(
      `INSERT INTO social_post_attempts (
         social_post_id, attempt_number, status, response_payload, error_message
       ) VALUES ($1,$2,$3,$4,$5)`,
      [
        input.socialPostId,
        input.attemptNumber,
        input.status,
        input.responsePayload ? JSON.stringify(input.responsePayload) : null,
        input.errorMessage || null,
      ]
    );
  }

  async getCampaignPostStatusCounts(
    tenantId: string,
    campaignId: string
  ): Promise<{ total: number; published: number; failed: number; deadLetter: number }> {
    const r = await this.db.query(
      `SELECT
         COUNT(*)::int AS total,
         SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END)::int AS published,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)::int AS failed,
         SUM(CASE WHEN status = 'dead_letter' THEN 1 ELSE 0 END)::int AS dead_letter
       FROM social_posts
       WHERE tenant_id = $1 AND campaign_id = $2`,
      [tenantId, campaignId]
    );
    const row = r.rows[0] as Record<string, unknown>;
    return {
      total: Number(row.total || 0),
      published: Number(row.published || 0),
      failed: Number(row.failed || 0),
      deadLetter: Number(row.dead_letter || 0),
    };
  }

  private mapAccount(row: Record<string, unknown>): SocialAccount {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      provider: row.provider as SocialProvider,
      accountRef: row.account_ref as string,
      displayName: (row.display_name as string | null) || undefined,
      scopes: (row.scopes as string[]) || [],
      accessTokenEncrypted: row.access_token_encrypted as string,
      refreshTokenEncrypted: (row.refresh_token_encrypted as string | null) || undefined,
      expiresAt: row.expires_at ? new Date(row.expires_at as string) : undefined,
      metadata: (typeof row.metadata === 'string'
        ? (JSON.parse(row.metadata) as Record<string, unknown>)
        : (row.metadata as Record<string, unknown>)) || {},
      createdBy: (row.created_by as string | null) || undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private mapPost(row: Record<string, unknown>): SocialPost {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      pageId: row.page_id as string,
      campaignId: (row.campaign_id as string | null) || undefined,
      socialAccountId: row.social_account_id as string,
      provider: row.provider as SocialProvider,
      status: row.status as SocialPostStatus,
      text: row.text as string,
      linkUrl: row.link_url as string,
      utmParams: (typeof row.utm_params === 'string'
        ? (JSON.parse(row.utm_params) as Record<string, unknown>)
        : (row.utm_params as Record<string, unknown>)) || {},
      scheduledFor: row.scheduled_for ? new Date(row.scheduled_for as string) : undefined,
      publishedAt: row.published_at ? new Date(row.published_at as string) : undefined,
      providerPostId: (row.provider_post_id as string | null) || undefined,
      providerPostUrl: (row.provider_post_url as string | null) || undefined,
      errorMessage: (row.error_message as string | null) || undefined,
      attempts: Number(row.attempts || 0),
      maxAttempts: Number(row.max_attempts || 5),
      metadata: (typeof row.metadata === 'string'
        ? (JSON.parse(row.metadata) as Record<string, unknown>)
        : (row.metadata as Record<string, unknown>)) || {},
      createdBy: (row.created_by as string | null) || undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      cancelledAt: row.cancelled_at ? new Date(row.cancelled_at as string) : undefined,
    };
  }
}

