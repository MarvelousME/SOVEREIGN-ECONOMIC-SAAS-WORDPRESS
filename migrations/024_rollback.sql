-- Rollback for Migration 024: workspace_invitations
-- Reverses: workspace_invitations table with RLS policies

-- Revoke permissions first
REVOKE SELECT, INSERT, UPDATE, DELETE ON workspace_invitations FROM app_user;

-- Disable RLS
ALTER TABLE workspace_invitations NO FORCE ROW LEVEL SECURITY;
ALTER TABLE workspace_invitations DISABLE ROW LEVEL SECURITY;

-- Drop trigger
DROP TRIGGER IF EXISTS update_workspace_invitations_updated_at ON workspace_invitations;

-- Drop table
DROP TABLE IF EXISTS workspace_invitations CASCADE;

-- Drop function (only if not used by other tables)
DROP FUNCTION IF EXISTS update_updated_at_column();
