-- Migration: 024_workspace_invitations.sql
-- Description: Workspace-scoped team invitations (invite -> signup -> membership)
-- Created: 2026-04-07

-- Ensure updated_at trigger function exists (safe to replace)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS workspace_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES tenant_workspaces(id) ON DELETE CASCADE,
    invited_email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    invited_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT workspace_invitations_email_format CHECK (
        invited_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    )
);

-- One active invite per email per workspace (until accepted)
CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_invites_active_unique
    ON workspace_invitations(workspace_id, invited_email)
    WHERE accepted_at IS NULL;

-- Token hash lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_invites_token_hash_unique
    ON workspace_invitations(token_hash);

CREATE INDEX IF NOT EXISTS idx_workspace_invites_workspace_id
    ON workspace_invitations(workspace_id);

CREATE INDEX IF NOT EXISTS idx_workspace_invites_invited_email
    ON workspace_invitations(invited_email);

CREATE INDEX IF NOT EXISTS idx_workspace_invites_expires_at
    ON workspace_invitations(expires_at);

DROP TRIGGER IF EXISTS update_workspace_invitations_updated_at ON workspace_invitations;
CREATE TRIGGER update_workspace_invitations_updated_at
    BEFORE UPDATE ON workspace_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS: workspace isolation (matches tenant_workspaces policy pattern)
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_workspace_invitations ON workspace_invitations;
CREATE POLICY tenant_isolation_workspace_invitations ON workspace_invitations
    USING (
        workspace_id = current_setting('app.current_tenant_id', true)::uuid
    );

ALTER TABLE workspace_invitations FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON workspace_invitations TO app_user;

COMMENT ON TABLE workspace_invitations IS 'Workspace team invitations (tokenized) used to add users to tenant_workspace_members after signup.';

