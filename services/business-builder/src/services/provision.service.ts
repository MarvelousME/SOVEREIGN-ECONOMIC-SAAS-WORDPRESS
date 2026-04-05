import { Pool } from 'pg';

export interface TenantWorkspace {
  id: string;
  slug: string;
  name: string;
  status: string;
  createdAt: Date;
}

export class ProvisionService {
  constructor(private db: Pool) {}

  async createWorkspace(slug: string, name: string): Promise<TenantWorkspace> {
    const q = `
      INSERT INTO tenant_workspaces (slug, name, status)
      VALUES ($1, $2, 'active')
      RETURNING id, slug, name, status, created_at
    `;
    const r = await this.db.query(q, [slug, name]);
    const row = r.rows[0];
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      status: row.status,
      createdAt: new Date(row.created_at),
    };
  }

  async addMember(tenantId: string, userId: string, role = 'member'): Promise<void> {
    await this.db.query(
      `INSERT INTO tenant_workspace_members (tenant_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
      [tenantId, userId, role]
    );
  }

  async listWorkspaces(): Promise<TenantWorkspace[]> {
    const r = await this.db.query(
      `SELECT id, slug, name, status, created_at FROM tenant_workspaces ORDER BY created_at DESC`
    );
    return r.rows.map((row: { id: string; slug: string; name: string; status: string; created_at: Date }) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      status: row.status,
      createdAt: new Date(row.created_at),
    }));
  }

  async getWorkspaceBySlug(slug: string): Promise<TenantWorkspace | null> {
    const r = await this.db.query(
      `SELECT id, slug, name, status, created_at FROM tenant_workspaces WHERE slug = $1`,
      [slug]
    );
    if (r.rows.length === 0) return null;
    const row = r.rows[0];
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      status: row.status,
      createdAt: new Date(row.created_at),
    };
  }
}
