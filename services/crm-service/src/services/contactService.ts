import { db } from '../models/database';
import { eventEmitter } from './eventEmitter';
import {
  Contact,
  ContactTimeline,
  CreateContactInput,
  PaginatedResult,
  ListQueryParams,
} from '../types';

interface ContactRow {
  id: string;
  tenant_id: string;
  lead_id: string | null;
  account_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  job_title: string | null;
  department: string | null;
  is_primary: boolean;
  is_decision_maker: boolean;
  linkedin_url: string | null;
  twitter_handle: string | null;
  avatar: string | null;
  custom_fields: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

interface TimelineRow {
  id: string;
  contact_id: string;
  tenant_id: string;
  activity_type: string;
  subject: string;
  description: string | null;
  metadata: Record<string, unknown>;
  user_id: string | null;
  created_at: Date;
}

function mapRowToContact(row: ContactRow): Contact {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    leadId: row.lead_id || undefined,
    accountId: row.account_id || undefined,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone || undefined,
    jobTitle: row.job_title || undefined,
    department: row.department || undefined,
    isPrimary: row.is_primary,
    isDecisionMaker: row.is_decision_maker,
    linkedInUrl: row.linkedin_url || undefined,
    twitterHandle: row.twitter_handle || undefined,
    avatar: row.avatar || undefined,
    customFields: row.custom_fields || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToTimeline(row: TimelineRow): ContactTimeline {
  return {
    id: row.id,
    contactId: row.contact_id,
    tenantId: row.tenant_id,
    activityType: row.activity_type as ContactTimeline['activityType'],
    subject: row.subject,
    description: row.description || undefined,
    metadata: row.metadata || {},
    userId: row.user_id || undefined,
    createdAt: row.created_at,
  };
}

export class ContactService {
  async create(tenantId: string, input: CreateContactInput): Promise<Contact> {
    const existingContact = await this.findDuplicate(tenantId, input.email);
    if (existingContact) {
      return this.mergeContacts(tenantId, existingContact.id, input);
    }

    const row = await db.queryOne<ContactRow>(
      `INSERT INTO contacts (
        tenant_id, lead_id, account_id, first_name, last_name, email, phone,
        job_title, department, is_primary, is_decision_maker, linkedin_url,
        custom_fields
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
        tenantId,
        input.leadId || null,
        input.accountId || null,
        input.firstName,
        input.lastName,
        input.email,
        input.phone || null,
        input.jobTitle || null,
        input.department || null,
        input.isPrimary || false,
        input.isDecisionMaker || false,
        input.linkedInUrl || null,
        JSON.stringify(input.customFields || {}),
      ]
    );

    if (!row) {
      throw new Error('Failed to create contact');
    }

    return mapRowToContact(row);
  }

  private async findDuplicate(tenantId: string, email: string): Promise<Contact | null> {
    const row = await db.queryOne<ContactRow>(
      'SELECT * FROM contacts WHERE tenant_id = $1 AND email = $2',
      [tenantId, email]
    );
    return row ? mapRowToContact(row) : null;
  }

  private async mergeContacts(tenantId: string, existingId: string, input: CreateContactInput): Promise<Contact> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.leadId) {
      updates.push(`lead_id = $${paramIndex++}`);
      values.push(input.leadId);
    }
    if (input.accountId) {
      updates.push(`account_id = $${paramIndex++}`);
      values.push(input.accountId);
    }
    if (input.phone) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(input.phone);
    }
    if (input.jobTitle) {
      updates.push(`job_title = $${paramIndex++}`);
      values.push(input.jobTitle);
    }
    if (input.linkedInUrl) {
      updates.push(`linkedin_url = $${paramIndex++}`);
      values.push(input.linkedInUrl);
    }
    if (input.customFields) {
      updates.push(`custom_fields = $${paramIndex++}`);
      values.push(JSON.stringify(input.customFields));
    }

    if (updates.length === 0) {
      const existing = await this.getById(tenantId, existingId);
      if (!existing) throw new Error('Contact not found');
      return existing;
    }

    values.push(existingId, tenantId);
    const row = await db.queryOne<ContactRow>(
      `UPDATE contacts SET ${updates.join(', ')} WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex} RETURNING *`,
      values
    );

    if (!row) throw new Error('Failed to update contact');
    return mapRowToContact(row);
  }

  async getById(tenantId: string, id: string): Promise<Contact | null> {
    const row = await db.queryOne<ContactRow>(
      'SELECT * FROM contacts WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    return row ? mapRowToContact(row) : null;
  }

  async list(tenantId: string, params: ListQueryParams = {}): Promise<PaginatedResult<Contact>> {
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
        last_name ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${params.search}%`);
      paramIndex++;
    }

    if (params.filter) {
      if (params.filter.accountId) {
        whereClause += ` AND account_id = $${paramIndex++}`;
        queryParams.push(params.filter.accountId);
      }
      if (params.filter.isPrimary !== undefined) {
        whereClause += ` AND is_primary = $${paramIndex++}`;
        queryParams.push(params.filter.isPrimary);
      }
      if (params.filter.isDecisionMaker !== undefined) {
        whereClause += ` AND is_decision_maker = $${paramIndex++}`;
        queryParams.push(params.filter.isDecisionMaker);
      }
    }

    const validSortColumns = ['created_at', 'updated_at', 'first_name', 'last_name', 'email'];
    const safeSortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';

    const countResult = await db.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM contacts ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult?.count || '0', 10);

    queryParams.push(limit, offset);
    const rows = await db.query<ContactRow>(
      `SELECT * FROM contacts ${whereClause} ORDER BY ${safeSortColumn} ${sortOrder} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      queryParams
    );

    return {
      data: rows.map(mapRowToContact),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(tenantId: string, id: string, updates: Partial<Contact>): Promise<Contact | null> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      firstName: 'first_name',
      lastName: 'last_name',
      phone: 'phone',
      jobTitle: 'job_title',
      department: 'department',
      isPrimary: 'is_primary',
      isDecisionMaker: 'is_decision_maker',
      linkedInUrl: 'linkedin_url',
      twitterHandle: 'twitter_handle',
      avatar: 'avatar',
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (updates[key as keyof Contact] !== undefined) {
        setClauses.push(`${dbField} = $${paramIndex++}`);
        values.push(updates[key as keyof Contact]);
      }
    }

    if (updates.customFields) {
      setClauses.push(`custom_fields = $${paramIndex++}`);
      values.push(JSON.stringify(updates.customFields));
    }

    if (setClauses.length === 0) {
      return this.getById(tenantId, id);
    }

    values.push(id, tenantId);
    const row = await db.queryOne<ContactRow>(
      `UPDATE contacts SET ${setClauses.join(', ')} WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex} RETURNING *`,
      values
    );

    return row ? mapRowToContact(row) : null;
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const count = await db.execute(
      'DELETE FROM contacts WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    return count > 0;
  }

  async getTimeline(tenantId: string, contactId: string, params: ListQueryParams = {}): Promise<PaginatedResult<ContactTimeline>> {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const offset = (page - 1) * limit;

    const countResult = await db.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM contact_timeline WHERE contact_id = $1 AND tenant_id = $2',
      [contactId, tenantId]
    );
    const total = parseInt(countResult?.count || '0', 10);

    const rows = await db.query<TimelineRow>(
      `SELECT * FROM contact_timeline WHERE contact_id = $1 AND tenant_id = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
      [contactId, tenantId, limit, offset]
    );

    return {
      data: rows.map(mapRowToTimeline),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async logActivity(
    tenantId: string,
    contactId: string,
    input: { type: ContactTimeline['activityType']; subject: string; description?: string; userId?: string; metadata?: Record<string, unknown> }
  ): Promise<ContactTimeline> {
    const row = await db.queryOne<TimelineRow>(
      `INSERT INTO contact_timeline (contact_id, tenant_id, activity_type, subject, description, metadata, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        contactId,
        tenantId,
        input.type,
        input.subject,
        input.description || null,
        JSON.stringify(input.metadata || {}),
        input.userId || null,
      ]
    );

    if (!row) {
      throw new Error('Failed to log activity');
    }

    return mapRowToTimeline(row);
  }

  async resolveIdentity(tenantId: string, email: string, company?: string): Promise<Contact | null> {
    let contact = await this.findDuplicate(tenantId, email);
    
    if (contact && company && !contact.customFields?.company) {
      contact = await this.update(tenantId, contact.id, {
        customFields: { ...contact.customFields, company },
      } as Partial<Contact>);
    }

    return contact;
  }

  async getByAccount(tenantId: string, accountId: string): Promise<Contact[]> {
    const rows = await db.query<ContactRow>(
      'SELECT * FROM contacts WHERE tenant_id = $1 AND account_id = $2 ORDER BY is_primary DESC, created_at DESC',
      [tenantId, accountId]
    );
    return rows.map(mapRowToContact);
  }

  async setPrimary(tenantId: string, contactId: string, accountId: string): Promise<void> {
    await db.transaction(async () => {
      await db.execute(
        'UPDATE contacts SET is_primary = false WHERE account_id = $1 AND tenant_id = $2',
        [accountId, tenantId]
      );
      await db.execute(
        'UPDATE contacts SET is_primary = true WHERE id = $1 AND tenant_id = $2',
        [contactId, tenantId]
      );
    });
  }
}

export const contactService = new ContactService();
