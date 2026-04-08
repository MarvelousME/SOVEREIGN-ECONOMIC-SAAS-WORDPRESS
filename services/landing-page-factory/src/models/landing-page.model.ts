import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import {
  LandingPage,
  PageVersion,
  PageTemplate,
  PageDisclosure,
  PublishTarget,
  PageBlock,
  PageMetadata,
  CreatePageRequest,
  UpdatePageRequest,
  PageStatus,
  ReviewStatus,
  BrandTone,
  TemplateCategory,
  CreateTemplateRequest,
  PageListQuery,
  PageVersionListQuery,
  PublishStatus,
} from '../types';

export class LandingPageModel {
  constructor(private db: Pool) {}

  async create(
    tenantId: string,
    userId: string,
    data: CreatePageRequest,
    blocks: PageBlock[] = [],
    metadata?: PageMetadata
  ): Promise<LandingPage> {
    const id = uuidv4();
    const now = new Date();
    const defaultMetadata = metadata || {
      title: data.name,
      metaTitle: data.name,
      metaDescription: data.description || '',
      keywords: [],
    };

    const query = `
      INSERT INTO landing_pages (
        id, tenant_id, user_id, business_id, template_id, name, slug, description,
        blocks, metadata, status, brand_tone, locale, version, affiliate_url,
        affiliate_network, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `;

    const values = [
      id,
      tenantId,
      userId,
      data.businessId || null,
      data.templateId || null,
      data.name,
      data.slug,
      data.description || null,
      JSON.stringify(blocks),
      JSON.stringify(defaultMetadata),
      PageStatus.DRAFT,
      data.brandTone || BrandTone.PROFESSIONAL,
      data.locale || 'en-US',
      1,
      data.affiliateUrl || null,
      data.affiliateNetwork || null,
      now,
      now,
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToPage(result.rows[0]);
  }

  async findById(tenantId: string, id: string): Promise<LandingPage | null> {
    const query = 'SELECT * FROM landing_pages WHERE id = $1 AND tenant_id = $2';
    const result = await this.db.query(query, [id, tenantId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToPage(result.rows[0]);
  }

  async findBySlug(tenantId: string, slug: string): Promise<LandingPage | null> {
    const query = 'SELECT * FROM landing_pages WHERE tenant_id = $1 AND slug = $2';
    const result = await this.db.query(query, [tenantId, slug]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToPage(result.rows[0]);
  }

  async findAll(tenantId: string, query: PageListQuery): Promise<{ pages: LandingPage[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE tenant_id = $1';
    const values: unknown[] = [tenantId];
    let paramCount = 2;

    if (query.status) {
      whereClause += ` AND status = $${paramCount++}`;
      values.push(query.status);
    }

    if (query.businessId) {
      whereClause += ` AND business_id = $${paramCount++}`;
      values.push(query.businessId);
    }

    if (query.search) {
      whereClause += ` AND (name ILIKE $${paramCount++} OR description ILIKE $${paramCount++})`;
      values.push(`%${query.search}%`);
      values.push(`%${query.search}%`);
    }

    if (query.scope === 'own' && query.userId) {
      whereClause += ` AND user_id = $${paramCount++}`;
      values.push(query.userId);
    }

    const countQuery = `SELECT COUNT(*) as total FROM landing_pages ${whereClause}`;
    const countResult = await this.db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    const dataQuery = `
      SELECT * FROM landing_pages
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount++} OFFSET $${paramCount}
    `;
    values.push(limit, offset);

    const result = await this.db.query(dataQuery, values);
    return {
      pages: result.rows.map((row) => this.mapRowToPage(row)),
      total,
    };
  }

  async update(tenantId: string, id: string, data: UpdatePageRequest): Promise<LandingPage | null> {
    const page = await this.findById(tenantId, id);
    if (!page) {
      return null;
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(data.name);
    }

    if (data.slug !== undefined) {
      updates.push(`slug = $${paramCount++}`);
      values.push(data.slug);
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(data.description);
    }

    if (data.blocks !== undefined) {
      updates.push(`blocks = $${paramCount++}`);
      values.push(JSON.stringify(data.blocks));
    }

    if (data.metadata !== undefined) {
      const newMetadata = { ...page.metadata, ...data.metadata };
      updates.push(`metadata = $${paramCount++}`);
      values.push(JSON.stringify(newMetadata));
    }

    if (data.brandTone !== undefined) {
      updates.push(`brand_tone = $${paramCount++}`);
      values.push(data.brandTone);
    }

    if (data.locale !== undefined) {
      updates.push(`locale = $${paramCount++}`);
      values.push(data.locale);
    }

    updates.push(`updated_at = $${paramCount++}`);
    values.push(new Date());

    values.push(id);
    values.push(tenantId);

    const query = `
      UPDATE landing_pages
      SET ${updates.join(', ')}
      WHERE id = $${paramCount++} AND tenant_id = $${paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return result.rows.length > 0 ? this.mapRowToPage(result.rows[0]) : null;
  }

  async updateStatus(
    tenantId: string,
    id: string,
    status: PageStatus,
    reviewData?: { reviewedBy: string; notes?: string }
  ): Promise<LandingPage | null> {
    let query: string;
    let values: unknown[];

    if (reviewData) {
      query = `
        UPDATE landing_pages
        SET status = $1, review_status = $2, review_reviewed_by = $3,
            review_notes = $4, review_reviewed_at = $5, updated_at = $6
        WHERE id = $7 AND tenant_id = $8
        RETURNING *
      `;
      values = [
        status,
        status === PageStatus.APPROVED ? ReviewStatus.APPROVED : ReviewStatus.REJECTED,
        reviewData.reviewedBy,
        reviewData.notes || null,
        new Date(),
        new Date(),
        id,
        tenantId,
      ];
    } else {
      query = `
        UPDATE landing_pages
        SET status = $1, updated_at = $2
        WHERE id = $3 AND tenant_id = $4
        RETURNING *
      `;
      values = [status, new Date(), id, tenantId];
    }

    const result = await this.db.query(query, values);
    return result.rows.length > 0 ? this.mapRowToPage(result.rows[0]) : null;
  }

  async markAsPublished(tenantId: string, id: string): Promise<LandingPage | null> {
    const query = `
      UPDATE landing_pages
      SET is_published = true, published_at = $1, status = $2, updated_at = $3
      WHERE id = $4 AND tenant_id = $5
      RETURNING *
    `;
    const result = await this.db.query(query, [
      new Date(),
      PageStatus.PUBLISHED,
      new Date(),
      id,
      tenantId,
    ]);
    return result.rows.length > 0 ? this.mapRowToPage(result.rows[0]) : null;
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const query = 'DELETE FROM landing_pages WHERE id = $1 AND tenant_id = $2';
    const result = await this.db.query(query, [id, tenantId]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  async createVersion(
    pageId: string,
    userId: string,
    blocks: PageBlock[],
    metadata: PageMetadata,
    changeDescription?: string
  ): Promise<PageVersion> {
    const id = uuidv4();
    const rollbackToken = crypto.randomBytes(32).toString('hex');
    const now = new Date();

    const versionResult = await this.db.query(
      'SELECT COALESCE(MAX(version), 0) + 1 as next_version FROM page_versions WHERE page_id = $1',
      [pageId]
    );
    const version = parseInt(versionResult.rows[0].next_version);

    const query = `
      INSERT INTO page_versions (
        id, page_id, version, blocks, metadata, created_at, created_by,
        change_description, rollback_token
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      id,
      pageId,
      version,
      JSON.stringify(blocks),
      JSON.stringify(metadata),
      now,
      userId,
      changeDescription || null,
      rollbackToken,
    ]);

    await this.db.query(
      'UPDATE landing_pages SET version = $1, current_version_id = $2, updated_at = $3 WHERE id = $4',
      [version, id, now, pageId]
    );

    return this.mapRowToVersion(result.rows[0]);
  }

  async getVersions(pageId: string, query: PageVersionListQuery): Promise<{ versions: PageVersion[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const countResult = await this.db.query(
      'SELECT COUNT(*) as total FROM page_versions WHERE page_id = $1',
      [pageId]
    );
    const total = parseInt(countResult.rows[0].total);

    const result = await this.db.query(
      'SELECT * FROM page_versions WHERE page_id = $1 ORDER BY version DESC LIMIT $2 OFFSET $3',
      [pageId, limit, offset]
    );

    return {
      versions: result.rows.map((row) => this.mapRowToVersion(row)),
      total,
    };
  }

  async getVersionById(pageId: string, versionId: string): Promise<PageVersion | null> {
    const result = await this.db.query(
      'SELECT * FROM page_versions WHERE id = $1 AND page_id = $2',
      [versionId, pageId]
    );
    return result.rows.length > 0 ? this.mapRowToVersion(result.rows[0]) : null;
  }

  async getVersionByToken(rollbackToken: string): Promise<PageVersion | null> {
    const result = await this.db.query(
      'SELECT * FROM page_versions WHERE rollback_token = $1',
      [rollbackToken]
    );
    return result.rows.length > 0 ? this.mapRowToVersion(result.rows[0]) : null;
  }

  private mapRowToPage(row: Record<string, unknown>): LandingPage {
    const parseJson = <T>(v: unknown): T =>
      typeof v === 'string' ? JSON.parse(v) : (v as T);

    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      userId: row.user_id as string,
      businessId: row.business_id as string | undefined,
      templateId: row.template_id as string | undefined,
      name: row.name as string,
      slug: row.slug as string,
      description: row.description as string | undefined,
      blocks: parseJson<PageBlock[]>(row.blocks),
      metadata: parseJson<PageMetadata>(row.metadata),
      status: row.status as PageStatus,
      reviewStatus: row.review_status as ReviewStatus | undefined,
      reviewNotes: row.review_notes as string | undefined,
      reviewReviewedBy: row.review_reviewed_by as string | undefined,
      reviewReviewedAt: row.review_reviewed_at ? new Date(row.review_reviewed_at as string) : undefined,
      publishTargets: parseJson<PublishTarget[]>(row.publish_targets || []),
      abTestVariant: row.ab_test_variant as string | undefined,
      affiliateUrl: row.affiliate_url as string | undefined,
      affiliateNetwork: row.affiliate_network as string | undefined,
      brandTone: row.brand_tone as BrandTone,
      locale: row.locale as string,
      version: row.version as number,
      currentVersionId: row.current_version_id as string | undefined,
      isPublished: row.is_published as boolean,
      publishedAt: row.published_at ? new Date(row.published_at as string) : undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private mapRowToVersion(row: Record<string, unknown>): PageVersion {
    const parseJson = <T>(v: unknown): T =>
      typeof v === 'string' ? JSON.parse(v) : (v as T);

    return {
      id: row.id as string,
      pageId: row.page_id as string,
      version: row.version as number,
      blocks: parseJson<PageBlock[]>(row.blocks),
      metadata: parseJson<PageMetadata>(row.metadata),
      createdAt: new Date(row.created_at as string),
      createdBy: row.created_by as string,
      changeDescription: row.change_description as string | undefined,
      rollbackToken: row.rollback_token as string | undefined,
    };
  }
}

export class PageTemplateModel {
  constructor(private db: Pool) {}

  async create(data: CreateTemplateRequest): Promise<PageTemplate> {
    const id = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO page_templates (
        id, tenant_id, created_by, name, description, category, thumbnail, blocks, default_metadata,
        variables, is_public, is_a_b_testable, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      id,
      data.tenantId || null,
      data.createdBy || null,
      data.name,
      data.description,
      data.category,
      data.thumbnail || null,
      JSON.stringify(data.blocks),
      JSON.stringify(data.defaultMetadata),
      JSON.stringify(data.variables || []),
      data.isPublic || false,
      data.isAbTestable !== false,
      now,
      now,
    ]);

    return this.mapRowToTemplate(result.rows[0]);
  }

  async findById(id: string): Promise<PageTemplate | null> {
    const result = await this.db.query('SELECT * FROM page_templates WHERE id = $1', [id]);
    return result.rows.length > 0 ? this.mapRowToTemplate(result.rows[0]) : null;
  }

  async findAll(options?: {
    tenantId?: string;
    userId?: string;
    category?: TemplateCategory;
    includePrivate?: boolean;
    scope?: 'own' | 'workspace';
    limit?: number;
    offset?: number;
  }): Promise<{ data: PageTemplate[]; total: number }> {
    const category = options?.category;
    const includePrivate = options?.includePrivate || false;
    const tenantId = options?.tenantId;
    const userId = options?.userId;
    const scope = options?.scope || 'workspace';
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;

    let query = 'SELECT * FROM page_templates';
    const values: unknown[] = [];
    const conditions: string[] = [];
    let paramCount = 1;

    if (tenantId) {
      if (scope === 'own' && userId) {
        conditions.push(`tenant_id = $${paramCount++}`);
        values.push(tenantId);
        conditions.push(`created_by = $${paramCount++}`);
        values.push(userId);
      } else {
        conditions.push(`(tenant_id = $${paramCount++} OR (tenant_id IS NULL AND is_public = true))`);
        values.push(tenantId);
      }
    } else if (!includePrivate) {
      conditions.push(`is_public = $${paramCount++}`);
      values.push(true);
    }

    if (!includePrivate) {
      conditions.push(`is_public = $${paramCount++}`);
      values.push(true);
    }

    if (category) {
      conditions.push(`category = $${paramCount++}`);
      values.push(category);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    const countQuery = `SELECT COUNT(*)::int AS total FROM page_templates${conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : ''}`;
    const countResult = await this.db.query(countQuery, values);
    const total = Number((countResult.rows[0] as Record<string, unknown>)?.total || 0);

    query += ' ORDER BY created_at DESC';
    query += ` LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    values.push(limit, offset);

    const result = await this.db.query(query, values);
    return {
      data: result.rows.map((row) => this.mapRowToTemplate(row)),
      total,
    };
  }

  private mapRowToTemplate(row: Record<string, unknown>): PageTemplate {
    const parseJson = <T>(v: unknown): T =>
      typeof v === 'string' ? JSON.parse(v) : (v as T);

    return {
      id: row.id as string,
      tenantId: (row.tenant_id as string | null) || undefined,
      createdBy: (row.created_by as string | null) || undefined,
      name: row.name as string,
      description: row.description as string,
      category: row.category as TemplateCategory,
      thumbnail: row.thumbnail as string | undefined,
      blocks: parseJson<PageBlock[]>(row.blocks),
      defaultMetadata: parseJson<PageMetadata>(row.default_metadata),
      variables: parseJson(row.variables || []),
      isPublic: row.is_public as boolean,
      isAbTestable: row.is_a_b_testable as boolean,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}

export class PageDisclosureModel {
  constructor(private db: Pool) {}

  async create(
    pageId: string,
    type: string,
    content: string,
    position: 'top' | 'bottom' | 'inline' = 'bottom',
    isRequired = true,
    jurisdictions?: string[]
  ): Promise<PageDisclosure> {
    const id = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO page_disclosures (
        id, page_id, disclosure_type, content, position, is_required,
        jurisdictions, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      id,
      pageId,
      type,
      content,
      position,
      isRequired,
      jurisdictions || [],
      now,
      now,
    ]);

    return this.mapRowToDisclosure(result.rows[0]);
  }

  async findByPageId(pageId: string): Promise<PageDisclosure[]> {
    const result = await this.db.query(
      'SELECT * FROM page_disclosures WHERE page_id = $1 ORDER BY created_at',
      [pageId]
    );
    return result.rows.map((row) => this.mapRowToDisclosure(row));
  }

  async update(
    id: string,
    data: { content?: string; position?: 'top' | 'bottom' | 'inline'; isRequired?: boolean }
  ): Promise<PageDisclosure | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (data.content !== undefined) {
      updates.push(`content = $${paramCount++}`);
      values.push(data.content);
    }

    if (data.position !== undefined) {
      updates.push(`position = $${paramCount++}`);
      values.push(data.position);
    }

    if (data.isRequired !== undefined) {
      updates.push(`is_required = $${paramCount++}`);
      values.push(data.isRequired);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push(`updated_at = $${paramCount++}`);
    values.push(new Date());
    values.push(id);

    const query = `
      UPDATE page_disclosures
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return result.rows.length > 0 ? this.mapRowToDisclosure(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.query('DELETE FROM page_disclosures WHERE id = $1', [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  private findById(id: string): Promise<PageDisclosure | null> {
    return this.db
      .query('SELECT * FROM page_disclosures WHERE id = $1', [id])
      .then((result) => (result.rows.length > 0 ? this.mapRowToDisclosure(result.rows[0]) : null));
  }

  private mapRowToDisclosure(row: Record<string, unknown>): PageDisclosure {
    return {
      id: row.id as string,
      pageId: row.page_id as string,
      type: row.disclosure_type as PageDisclosure['type'],
      content: row.content as string,
      position: row.position as 'top' | 'bottom' | 'inline',
      isRequired: row.is_required as boolean,
      jurisdictions: row.jurisdictions as string[] || [],
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}

export class PublishTargetModel {
  constructor(private db: Pool) {}

  async create(
    pageId: string,
    type: string,
    data: Partial<PublishTarget> = {}
  ): Promise<PublishTarget> {
    const id = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO page_publish_targets (
        id, page_id, target_type, url, domain, subdomain, cdn_distribution_id,
        cdn_url, embed_code, status, metadata, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      id,
      pageId,
      type,
      data.url || null,
      data.domain || null,
      data.subdomain || null,
      data.cdnDistributionId || null,
      data.cdnUrl || null,
      data.embedCode || null,
      'draft',
      JSON.stringify(data.metadata || {}),
      now,
      now,
    ]);

    return this.mapRowToTarget(result.rows[0]);
  }

  async findByPageId(pageId: string): Promise<PublishTarget[]> {
    const result = await this.db.query(
      'SELECT * FROM page_publish_targets WHERE page_id = $1 ORDER BY created_at',
      [pageId]
    );
    return result.rows.map((row) => this.mapRowToTarget(row));
  }

  async updateStatus(id: string, status: 'published' | 'unpublished'): Promise<PublishTarget | null> {
    const publishedAt = status === 'published' ? new Date() : null;
    const unpublishedAt = status === 'unpublished' ? new Date() : null;

    const query = `
      UPDATE page_publish_targets
      SET status = $1, published_at = $2, unpublished_at = $3, updated_at = $4
      WHERE id = $5
      RETURNING *
    `;

    const result = await this.db.query(query, [status, publishedAt, unpublishedAt, new Date(), id]);
    return result.rows.length > 0 ? this.mapRowToTarget(result.rows[0]) : null;
  }

  private mapRowToTarget(row: Record<string, unknown>): PublishTarget {
    const parseJson = <T>(v: unknown): T =>
      typeof v === 'string' ? JSON.parse(v) : (v as T);

    return {
      id: row.id as string,
      pageId: row.page_id as string,
      type: row.target_type as PublishTarget['type'],
      url: row.url as string | undefined,
      domain: row.domain as string | undefined,
      subdomain: row.subdomain as string | undefined,
      cdnDistributionId: row.cdn_distribution_id as string | undefined,
      cdnUrl: row.cdn_url as string | undefined,
      embedCode: row.embed_code as string | undefined,
      status: row.status as PublishStatus,
      publishedAt: row.published_at ? new Date(row.published_at as string) : undefined,
      unpublishedAt: row.unpublished_at ? new Date(row.unpublished_at as string) : undefined,
      metadata: parseJson<Record<string, unknown>>(row.metadata || {}),
    };
  }
}
