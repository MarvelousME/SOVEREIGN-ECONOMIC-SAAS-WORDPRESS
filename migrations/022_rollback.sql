-- Rollback for Migration 022: tenant_workspace_main_treasury
-- Reverses: JSONB merge into tenant_workspaces.settings column

-- Revert the treasury settings merge (set back to original state)
-- Note: This is a data rollback - the specific treasury settings are removed
UPDATE tenant_workspaces
SET settings = settings - 'treasury'
WHERE settings IS NOT NULL
  AND settings ? 'treasury';
