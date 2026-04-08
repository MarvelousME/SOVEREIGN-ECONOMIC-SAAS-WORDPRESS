import { Pool } from 'pg';
import { WorkspaceBrandingBinding } from '../types';

export class WorkspaceBrandingService {
  constructor(private db: Pool) {}

  async getRuntimeBinding(workspaceId: string, tenantId: string): Promise<WorkspaceBrandingBinding> {
    const result = await this.db.query(
      `SELECT workspace_id, tenant_id, theme_id, theme_overrides, brand_assets, updated_by, updated_at
       FROM workspace_branding_bindings
       WHERE workspace_id = $1::uuid AND tenant_id = $2::uuid
       LIMIT 1`,
      [workspaceId, tenantId]
    );

    if (result.rowCount === 0) {
      return {
        workspaceId,
        tenantId,
        themeId: 'castellar',
        themeOverrides: {},
        brandAssets: {},
        updatedAt: new Date(),
      };
    }

    const row = result.rows[0] as {
      workspace_id: string;
      tenant_id: string;
      theme_id: string;
      theme_overrides: Record<string, string>;
      brand_assets: Record<string, string>;
      updated_by: string | null;
      updated_at: string | Date;
    };

    return {
      workspaceId: row.workspace_id,
      tenantId: row.tenant_id,
      themeId: row.theme_id,
      themeOverrides: row.theme_overrides || {},
      brandAssets: row.brand_assets || {},
      updatedBy: row.updated_by || undefined,
      updatedAt: new Date(row.updated_at),
    };
  }

  async upsertRuntimeBinding(input: {
    workspaceId: string;
    tenantId: string;
    themeId: string;
    themeOverrides?: Record<string, string>;
    brandAssets?: Record<string, string>;
    updatedBy?: string;
  }): Promise<WorkspaceBrandingBinding> {
    const result = await this.db.query(
      `INSERT INTO workspace_branding_bindings
        (workspace_id, tenant_id, theme_id, theme_overrides, brand_assets, updated_by, updated_at)
       VALUES ($1::uuid, $2::uuid, $3, $4::jsonb, $5::jsonb, $6::uuid, NOW())
       ON CONFLICT (workspace_id)
       DO UPDATE SET
         tenant_id = EXCLUDED.tenant_id,
         theme_id = EXCLUDED.theme_id,
         theme_overrides = EXCLUDED.theme_overrides,
         brand_assets = EXCLUDED.brand_assets,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()
       RETURNING workspace_id, tenant_id, theme_id, theme_overrides, brand_assets, updated_by, updated_at`,
      [
        input.workspaceId,
        input.tenantId,
        input.themeId,
        JSON.stringify(input.themeOverrides || {}),
        JSON.stringify(input.brandAssets || {}),
        input.updatedBy || null,
      ]
    );

    const row = result.rows[0] as {
      workspace_id: string;
      tenant_id: string;
      theme_id: string;
      theme_overrides: Record<string, string>;
      brand_assets: Record<string, string>;
      updated_by: string | null;
      updated_at: string | Date;
    };

    return {
      workspaceId: row.workspace_id,
      tenantId: row.tenant_id,
      themeId: row.theme_id,
      themeOverrides: row.theme_overrides || {},
      brandAssets: row.brand_assets || {},
      updatedBy: row.updated_by || undefined,
      updatedAt: new Date(row.updated_at),
    };
  }
}
