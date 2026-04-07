-- Migration: Link every Business Builder workspace to the platform main treasury
-- Description: Merges settings.treasury (platformTenantId, primaryVaultId, mode) on tenant_workspaces.
--              Defaults match seeds/001_seed_development_data.sql (tenants.id=1, treasury_vaults.id=1).
--              Partner Referral OS rows in partner_referral_os.workspaces inherit this indirectly via
--              linked_tenant_workspace_id -> tenant_workspaces when that link is set.
-- Date: 2026-04-07

-- Merge main treasury pointer into existing workspace rows (idempotent jsonb merge)
UPDATE tenant_workspaces
SET settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object(
  'treasury', jsonb_build_object(
    'platformTenantId', 1,
    'primaryVaultId', 1,
    'mode', 'platform_main'
  )
);

COMMENT ON COLUMN tenant_workspaces.settings IS
  'JSONB workspace options. treasury.platformTenantId + treasury.primaryVaultId reference the shared platform treasury (see migrations/005, seeds/001). business-builder sets this on create via MAIN_TREASURY_* env vars.';
