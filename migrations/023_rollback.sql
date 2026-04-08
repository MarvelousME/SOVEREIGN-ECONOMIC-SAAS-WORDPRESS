-- Rollback for Migration 023: iam_tenant_workspace_uuid_link
-- Reverses: ADD COLUMN workspace_tenant_uuid to tenants table

-- Drop index first
DROP INDEX IF EXISTS idx_tenants_workspace_tenant_uuid;

-- Drop column
ALTER TABLE tenants
    DROP COLUMN IF EXISTS workspace_tenant_uuid;
