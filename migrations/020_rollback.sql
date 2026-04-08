-- Rollback for Migration 020: add_rls_policies
-- Reverses: RLS policy additions and FORCE ROW LEVEL SECURITY settings
-- Note: This is a structural rollback - RLS policies restrict access

-- Disable FORCE ROW LEVEL SECURITY (reverse order)
ALTER TABLE ledger_entries NO FORCE ROW LEVEL SECURITY;
ALTER TABLE reward_wallets NO FORCE ROW LEVEL SECURITY;
ALTER TABLE leads NO FORCE ROW LEVEL SECURITY;
ALTER TABLE pages NO FORCE ROW LEVEL SECURITY;
ALTER TABLE offers NO FORCE ROW LEVEL SECURITY;
ALTER TABLE affiliate_links NO FORCE ROW LEVEL SECURITY;
ALTER TABLE businesses NO FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_workspaces NO FORCE ROW LEVEL SECURITY;

-- Drop RLS policies
DROP POLICY IF EXISTS tenant_isolation_ledger_entries ON ledger_entries;
DROP POLICY IF EXISTS tenant_isolation_reward_wallets ON reward_wallets;
DROP POLICY IF EXISTS tenant_isolation_leads ON leads;
DROP POLICY IF EXISTS tenant_isolation_pages ON pages;
DROP POLICY IF EXISTS tenant_isolation_offers ON offers;
DROP POLICY IF EXISTS tenant_isolation_affiliate_links ON affiliate_links;
DROP POLICY IF EXISTS tenant_isolation_businesses ON businesses;
DROP POLICY IF EXISTS tenant_isolation_tenant_workspaces ON tenant_workspaces;

-- Disable RLS
ALTER TABLE ledger_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE reward_wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE pages DISABLE ROW LEVEL SECURITY;
ALTER TABLE offers DISABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_links DISABLE ROW LEVEL SECURITY;
ALTER TABLE businesses DISABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_workspaces DISABLE ROW LEVEL SECURITY;

-- Revoke permissions from app_user role
REVOKE SELECT, INSERT, UPDATE, DELETE ON ledger_entries FROM app_user;
REVOKE SELECT, INSERT, UPDATE, DELETE ON reward_wallets FROM app_user;
REVOKE SELECT, INSERT, UPDATE, DELETE ON leads FROM app_user;
REVOKE SELECT, INSERT, UPDATE, DELETE ON pages FROM app_user;
REVOKE SELECT, INSERT, UPDATE, DELETE ON offers FROM app_user;
REVOKE SELECT, INSERT, UPDATE, DELETE ON affiliate_links FROM app_user;
REVOKE SELECT, INSERT, UPDATE, DELETE ON businesses FROM app_user;
REVOKE SELECT, INSERT, UPDATE, DELETE ON tenant_workspaces FROM app_user;

-- Drop function
DROP FUNCTION IF EXISTS set_tenant_context(UUID);

-- Note: The app_user role is NOT dropped as it may be used elsewhere
