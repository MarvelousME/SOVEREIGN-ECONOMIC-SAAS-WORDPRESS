-- Migration: Link IAM tenants (bigint) to Business Builder / WordPress workspace UUID
-- Description: tenants.workspace_tenant_uuid matches tenant_workspaces.id and typical WordPress sovereign_tenant_id.
-- Prerequisite: tenant_workspaces exists (migrations/012). Safe if column already present.
-- Date: 2026-04-07

ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS workspace_tenant_uuid UUID;

CREATE INDEX IF NOT EXISTS idx_tenants_workspace_tenant_uuid ON tenants(workspace_tenant_uuid);

COMMENT ON COLUMN tenants.workspace_tenant_uuid IS
    'UUID shared with tenant_workspaces.id and WordPress user meta sovereign_tenant_id. treasury uses tenants.id (bigint); APIs use JWT x-tenant-id UUID.';

-- Default workspace from 012_business_builder_tenant_workspaces.sql
UPDATE tenants
SET workspace_tenant_uuid = 'e0000000-0000-4000-8000-000000000001'::uuid
WHERE id = 1
  AND workspace_tenant_uuid IS NULL;

-- Optional: enforce referential integrity when both tables exist (run manually if your DB skipped 012)
-- ALTER TABLE tenants DROP CONSTRAINT IF EXISTS fk_tenants_workspace_tenant_uuid;
-- ALTER TABLE tenants ADD CONSTRAINT fk_tenants_workspace_tenant_uuid
--   FOREIGN KEY (workspace_tenant_uuid) REFERENCES tenant_workspaces(id) ON DELETE SET NULL;
