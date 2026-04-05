import { db } from '../models/database';
import {
  Account,
  CreateAccountInput,
  PaginatedResult,
  ListQueryParams,
} from '../types';

interface AccountRow {
  id: string;
  tenant_id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  sub_industry: string | null;
  employee_count: number | null;
  annual_revenue: number | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_postal_code: string | null;
  address_country: string | null;
  phone: string | null;
  website: string | null;
  linkedin_url: string | null;
  parent_account_id: string | null;
  type: string;
  score: number | null;
  custom_fields: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

function mapRowToAccount(row: AccountRow): Account {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    domain: row.domain || undefined,
    industry: row.industry || undefined,
    subIndustry: row.sub_industry || undefined,
    employeeCount: row.employee_count || undefined,
    annualRevenue: row.annual_revenue || undefined,
    address: {
      street: row.address_street || undefined,
      city: row.address_city || undefined,
      state: row.address_state || undefined,
      postalCode: row.address_postal_code || undefined,
      country: row.address_country || undefined,
    },
    phone: row.phone || undefined,
    website: row.website || undefined,
    linkedInUrl: row.linkedin_url || undefined,
    parentAccountId: row.parent_account_id || undefined,
    type: row.type as Account['type'],
    score: row.score || undefined,
    customFields: row.custom_fields || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class AccountService {
  async create(tenantId: string, input: CreateAccountInput): Promise<Account> {
    const existingAccount = await this.findByDomain(tenantId, input.domain || '');
    if (existingAccount) {
      return this.mergeAccounts(tenantId, existingAccount.id, input);
    }

    const row = await db.queryOne<AccountRow>(
      `INSERT INTO accounts (
        tenant_id, name, domain, industry, sub_industry, employee_count,
        annual_revenue, address_street, address_city, address_state,
        address_postal_code, address_country, phone, website, linkedin_url,
        parent_account_id, type, custom_fields
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *`,
      [
        tenantId,
        input.name,
        input.domain || null,
        input.industry || null,
        input.subIndustry || null,
        input.employeeCount || null,
        input.annualRevenue || null,
        input.address?.street || null,
        input.address?.city || null,
        input.address?.state || null,
        input.address?.postalCode || null,
        input.address?.country || null,
        input.phone || null,
        input.website || null,
        input.linkedInUrl || null,
        input.parentAccountId || null,
        input.type || 'prospect',
        JSON.stringify(input.customFields || {}),
      ]
    );

    if (!row) {
      throw new Error('Failed to create account');
    }

    return mapRowToAccount(row);
  }

  private async findByDomain(tenantId: string, domain: string): Promise<Account | null> {
    if (!domain) return null;
    const row = await db.queryOne<AccountRow>(
      'SELECT * FROM accounts WHERE tenant_id = $1 AND domain = $2',
      [tenantId, domain.toLowerCase()]
    );
    return row ? mapRowToAccount(row) : null;
  }

  private async mergeAccounts(tenantId: string, existingId: string, input: CreateAccountInput): Promise<Account> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.industry) {
      updates.push(`industry = $${paramIndex++}`);
      values.push(input.industry);
    }
    if (input.subIndustry) {
      updates.push(`sub_industry = $${paramIndex++}`);
      values.push(input.subIndustry);
    }
    if (input.employeeCount) {
      updates.push(`employee_count = $${paramIndex++}`);
      values.push(input.employeeCount);
    }
    if (input.annualRevenue) {
      updates.push(`annual_revenue = $${paramIndex++}`);
      values.push(input.annualRevenue);
    }
    if (input.phone) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(input.phone);
    }
    if (input.website) {
      updates.push(`website = $${paramIndex++}`);
      values.push(input.website);
    }
    if (input.customFields) {
      updates.push(`custom_fields = $${paramIndex++}`);
      values.push(JSON.stringify(input.customFields));
    }

    if (updates.length === 0) {
      const existing = await this.getById(tenantId, existingId);
      if (!existing) throw new Error('Account not found');
      return existing;
    }

    values.push(existingId, tenantId);
    const row = await db.queryOne<AccountRow>(
      `UPDATE accounts SET ${updates.join(', ')} WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex} RETURNING *`,
      values
    );

    if (!row) throw new Error('Failed to update account');
    return mapRowToAccount(row);
  }

  async getById(tenantId: string, id: string): Promise<Account | null> {
    const row = await db.queryOne<AccountRow>(
      'SELECT * FROM accounts WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    return row ? mapRowToAccount(row) : null;
  }

  async list(tenantId: string, params: ListQueryParams = {}): Promise<PaginatedResult<Account>> {
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
        name ILIKE $${paramIndex} OR
        domain ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${params.search}%`);
      paramIndex++;
    }

    if (params.filter) {
      if (params.filter.industry) {
        whereClause += ` AND industry = $${paramIndex++}`;
        queryParams.push(params.filter.industry);
      }
      if (params.filter.type) {
        whereClause += ` AND type = $${paramIndex++}`;
        queryParams.push(params.filter.type);
      }
      if (params.filter.parentAccountId) {
        whereClause += ` AND parent_account_id = $${paramIndex++}`;
        queryParams.push(params.filter.parentAccountId);
      }
    }

    const validSortColumns = ['created_at', 'updated_at', 'name', 'score', 'employee_count', 'annual_revenue'];
    const safeSortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';

    const countResult = await db.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM accounts ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult?.count || '0', 10);

    queryParams.push(limit, offset);
    const rows = await db.query<AccountRow>(
      `SELECT * FROM accounts ${whereClause} ORDER BY ${safeSortColumn} ${sortOrder} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      queryParams
    );

    return {
      data: rows.map(mapRowToAccount),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(tenantId: string, id: string, updates: Partial<Account>): Promise<Account | null> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      name: 'name',
      domain: 'domain',
      industry: 'industry',
      subIndustry: 'sub_industry',
      employeeCount: 'employee_count',
      annualRevenue: 'annual_revenue',
      phone: 'phone',
      website: 'website',
      linkedInUrl: 'linkedin_url',
      parentAccountId: 'parent_account_id',
      type: 'type',
    };

    if (updates.address) {
      if (updates.address.street) {
        setClauses.push(`address_street = $${paramIndex++}`);
        values.push(updates.address.street);
      }
      if (updates.address.city) {
        setClauses.push(`address_city = $${paramIndex++}`);
        values.push(updates.address.city);
      }
      if (updates.address.state) {
        setClauses.push(`address_state = $${paramIndex++}`);
        values.push(updates.address.state);
      }
      if (updates.address.postalCode) {
        setClauses.push(`address_postal_code = $${paramIndex++}`);
        values.push(updates.address.postalCode);
      }
      if (updates.address.country) {
        setClauses.push(`address_country = $${paramIndex++}`);
        values.push(updates.address.country);
      }
    }

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (updates[key as keyof Account] !== undefined) {
        setClauses.push(`${dbField} = $${paramIndex++}`);
        values.push(updates[key as keyof Account]);
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
    const row = await db.queryOne<AccountRow>(
      `UPDATE accounts SET ${setClauses.join(', ')} WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex} RETURNING *`,
      values
    );

    return row ? mapRowToAccount(row) : null;
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const count = await db.execute(
      'DELETE FROM accounts WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    return count > 0;
  }

  async getHierarchy(tenantId: string, accountId: string): Promise<{ ancestors: Account[]; current: Account; descendants: Account[] }> {
    const current = await this.getById(tenantId, accountId);
    if (!current) {
      throw new Error('Account not found');
    }

    const ancestors: Account[] = [];
    let parentId = current.parentAccountId;
    while (parentId) {
      const parent = await this.getById(tenantId, parentId);
      if (parent) {
        ancestors.unshift(parent);
        parentId = parent.parentAccountId;
      } else {
        parentId = undefined;
      }
    }

    const descendants = await this.getChildren(tenantId, accountId);

    return { ancestors, current, descendants };
  }

  async getChildren(tenantId: string, accountId: string): Promise<Account[]> {
    const rows = await db.query<AccountRow>(
      'SELECT * FROM accounts WHERE tenant_id = $1 AND parent_account_id = $2 ORDER BY name',
      [tenantId, accountId]
    );
    return rows.map(mapRowToAccount);
  }

  async calculateScore(tenantId: string, accountId: string): Promise<number> {
    const account = await this.getById(tenantId, accountId);
    if (!account) return 0;

    let score = 0;

    const industryWeights: Record<string, number> = {
      'Technology': 20,
      'Finance': 20,
      'Healthcare': 15,
      'SaaS': 15,
      'E-commerce': 10,
    };
    score += industryWeights[account.industry || ''] || 5;

    if (account.employeeCount) {
      if (account.employeeCount > 1000) score += 25;
      else if (account.employeeCount > 500) score += 20;
      else if (account.employeeCount > 100) score += 15;
      else if (account.employeeCount > 50) score += 10;
      else score += 5;
    }

    if (account.annualRevenue) {
      if (account.annualRevenue > 1000000000) score += 30;
      else if (account.annualRevenue > 100000000) score += 25;
      else if (account.annualRevenue > 10000000) score += 20;
      else if (account.annualRevenue > 1000000) score += 15;
      else score += 10;
    }

    if (account.linkedInUrl) score += 10;

    await db.execute(
      'UPDATE accounts SET score = $1 WHERE id = $2',
      [score, accountId]
    );

    return score;
  }

  async findByDomain(tenantId: string, domain: string): Promise<Account | null> {
    const row = await db.queryOne<AccountRow>(
      'SELECT * FROM accounts WHERE tenant_id = $1 AND domain = $2',
      [tenantId, domain.toLowerCase()]
    );
    return row ? mapRowToAccount(row) : null;
  }
}

export const accountService = new AccountService();
