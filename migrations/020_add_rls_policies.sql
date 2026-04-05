-- Migration: Add Row-Level Security Policies for Multi-tenant Isolation
-- Description: PostgreSQL RLS policies for all tenant-scoped tables
-- Date: 2026-04-05

-- Enable RLS on tenant_workspaces
ALTER TABLE tenant_workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_tenant_workspaces ON tenant_workspaces;
CREATE POLICY tenant_isolation_tenant_workspaces ON tenant_workspaces
    USING (id = current_setting('app.current_tenant_id', true)::uuid);

-- Enable RLS on businesses
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_businesses ON businesses;
CREATE POLICY tenant_isolation_businesses ON businesses
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Enable RLS on affiliate_links (workspace_id -> tenant)
ALTER TABLE affiliate_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_affiliate_links ON affiliate_links;
CREATE POLICY tenant_isolation_affiliate_links ON affiliate_links
    USING (
        workspace_id IN (
            SELECT id FROM tenant_workspaces 
            WHERE id = current_setting('app.current_tenant_id', true)::uuid
        )
    );

-- Enable RLS on offers (workspace_id -> tenant)
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_offers ON offers;
CREATE POLICY tenant_isolation_offers ON offers
    USING (
        workspace_id IN (
            SELECT id FROM tenant_workspaces 
            WHERE id = current_setting('app.current_tenant_id', true)::uuid
        )
    );

-- Enable RLS on pages (workspace_id -> tenant)
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_pages ON pages;
CREATE POLICY tenant_isolation_pages ON pages
    USING (
        workspace_id IN (
            SELECT id FROM tenant_workspaces 
            WHERE id = current_setting('app.current_tenant_id', true)::uuid
        )
    );

-- Enable RLS on leads (workspace_id -> tenant)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_leads ON leads;
CREATE POLICY tenant_isolation_leads ON leads
    USING (
        workspace_id IN (
            SELECT id FROM tenant_workspaces 
            WHERE id = current_setting('app.current_tenant_id', true)::uuid
        )
    );

-- Enable RLS on reward_wallets (workspace_id -> tenant)
ALTER TABLE reward_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_reward_wallets ON reward_wallets;
CREATE POLICY tenant_isolation_reward_wallets ON reward_wallets
    USING (
        workspace_id IN (
            SELECT id FROM tenant_workspaces 
            WHERE id = current_setting('app.current_tenant_id', true)::uuid
        )
    );

-- Enable RLS on ledger_entries (wallet_id -> workspace_id -> tenant)
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_ledger_entries ON ledger_entries;
CREATE POLICY tenant_isolation_ledger_entries ON ledger_entries
    USING (
        wallet_id IN (
            SELECT rw.id FROM reward_wallets rw
            INNER JOIN tenant_workspaces tw ON rw.workspace_id = tw.id
            WHERE tw.id = current_setting('app.current_tenant_id', true)::uuid
        )
    );

-- Force RLS for table owners too (security best practice)
ALTER TABLE tenant_workspaces FORCE ROW LEVEL SECURITY;
ALTER TABLE businesses FORCE ROW LEVEL SECURITY;
ALTER TABLE affiliate_links FORCE ROW LEVEL SECURITY;
ALTER TABLE offers FORCE ROW LEVEL SECURITY;
ALTER TABLE pages FORCE ROW LEVEL SECURITY;
ALTER TABLE leads FORCE ROW LEVEL SECURITY;
ALTER TABLE reward_wallets FORCE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries FORCE ROW LEVEL SECURITY;

-- Create application role for API access
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
        CREATE ROLE app_user;
    END IF;
END
$$;

-- Grant permissions to app_user role
GRANT SELECT, INSERT, UPDATE, DELETE ON tenant_workspaces TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON businesses TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON affiliate_links TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON offers TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON pages TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON leads TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON reward_wallets TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ledger_entries TO app_user;

-- Optional: Create function to easily set tenant context
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_uuid UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_tenant_id', tenant_uuid::text, true);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_tenant_context IS 'Sets the tenant context for RLS policies. Call with SET LOCAL or SET after connecting.';
