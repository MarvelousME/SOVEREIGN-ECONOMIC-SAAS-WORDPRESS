/**
 * Platform treasury all workspaces use (shared vault on tenants.id from IAM schema).
 * Defaults match seeds/001_seed_development_data.sql and migrations/022_tenant_workspace_main_treasury.sql.
 */
export const MAIN_TREASURY_PLATFORM_TENANT_ID = parseInt(
  process.env.MAIN_TREASURY_PLATFORM_TENANT_ID || '1',
  10
);

export const MAIN_TREASURY_VAULT_ID = parseInt(process.env.MAIN_TREASURY_VAULT_ID || '1', 10);

export function mainTreasuryWorkspaceSettings(): Record<string, unknown> {
  return {
    treasury: {
      platformTenantId: MAIN_TREASURY_PLATFORM_TENANT_ID,
      primaryVaultId: MAIN_TREASURY_VAULT_ID,
      mode: 'platform_main',
    },
  };
}
