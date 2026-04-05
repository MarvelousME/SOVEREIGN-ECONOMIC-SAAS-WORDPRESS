-- Migration: Business Builder tenant workspaces & isolation
-- Description: Workspace registry, membership, and tenant_id on businesses (per-tenant subdomain uniqueness)
-- Date: 2026-03-29

-- Well-known default workspace for existing rows and dev (override via DEFAULT_WORKSPACE_ID in app)
CREATE TABLE IF NOT EXISTS tenant_workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT tenant_workspaces_slug_format CHECK (slug ~* '^[a-z0-9][a-z0-9-]{1,98}[a-z0-9]$'),
    CONSTRAINT tenant_workspaces_slug_unique UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS idx_tenant_workspaces_status ON tenant_workspaces(status);

CREATE TABLE IF NOT EXISTS tenant_workspace_members (
    tenant_id UUID NOT NULL REFERENCES tenant_workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_workspace_members_user ON tenant_workspace_members(user_id);

-- Seed default workspace (stable id for env DEFAULT_WORKSPACE_ID / constants/tenant.ts)
INSERT INTO tenant_workspaces (id, slug, name, status)
SELECT 'e0000000-0000-4000-8000-000000000001', 'default', 'Default workspace', 'active'
WHERE NOT EXISTS (
    SELECT 1 FROM tenant_workspaces WHERE id = 'e0000000-0000-4000-8000-000000000001'
);

-- Attach businesses to a workspace
ALTER TABLE businesses
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenant_workspaces(id);

UPDATE businesses
SET tenant_id = 'e0000000-0000-4000-8000-000000000001'
WHERE tenant_id IS NULL;

ALTER TABLE businesses
    ALTER COLUMN tenant_id SET NOT NULL;

-- Subdomain unique per tenant, not globally
DROP INDEX IF EXISTS idx_businesses_subdomain;

CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_tenant_subdomain
    ON businesses (tenant_id, ((domain->>'subdomain')));

CREATE INDEX IF NOT EXISTS idx_businesses_tenant_id ON businesses(tenant_id);

COMMENT ON TABLE tenant_workspaces IS 'Isolated workspace / tenant for Business Builder data';
COMMENT ON TABLE tenant_workspace_members IS 'User membership in a workspace; enforced by API for non-default tenants';
COMMENT ON COLUMN businesses.tenant_id IS 'Workspace that owns this business; all queries must scope by this column';
