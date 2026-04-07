# Tenant identifiers — IAM bigint ↔ workspace UUID ↔ WordPress

The platform uses **two tenant identifiers** on purpose. This page maps them and tells you where each is authoritative.

---

## The three layers

| Layer | Identifier | Example | Used for |
|-------|------------|---------|----------|
| **IAM / treasury / ledger** | `tenants.id` (BIGINT) | `1` | `treasury_vaults.tenant_id`, `users.tenant_id`, `treasury_strategies.tenant_id`, seeds |
| **Business Builder workspace** | `tenant_workspaces.id` (UUID) | `e0000000-0000-4000-8000-000000000001` | Subdomain isolation, `businesses.tenant_id`, provision API |
| **WordPress Sovereign scope** | User meta + plugin default | Same UUID as workspace | Fluent tickets, CRM headers `x-tenant-id`, JWT `tenant_id` claim |

**Rule of thumb:** Treat the **workspace UUID** as the **canonical external / product tenant id**. The IAM **bigint** is the **internal row** for Postgres FKs on treasury and early IAM tables.

---

## Database link (after migration `023_iam_tenant_workspace_uuid_link.sql`)

Column **`tenants.workspace_tenant_uuid`** stores the UUID that matches **`tenant_workspaces.id`**.

- New IAM tenants: set `workspace_tenant_uuid` when you create the matching `tenant_workspaces` row (or vice versa).
- Existing dev data: migration sets `tenants.id = 1` → default workspace UUID from migration `012`.

Reverse link for money routing is already on the workspace:

- **`tenant_workspaces.settings.treasury`** — `{ platformTenantId, primaryVaultId, mode: "platform_main" }` points all workspaces at the **main platform vault** on `tenants.id` (see `022_tenant_workspace_main_treasury.sql` and `MAIN_TREASURY_*` env vars).

So:

- **UUID** → find IAM row: `SELECT * FROM tenants WHERE workspace_tenant_uuid = $uuid`
- **IAM bigint** → find workspace: `SELECT * FROM tenant_workspaces WHERE id = (SELECT workspace_tenant_uuid FROM tenants WHERE id = $id)` (when set)

---

## WordPress

- **`sovereign_tenant_id`** user meta (and plugin default in Sovereign OS settings) should equal **`tenant_workspaces.id`** for that customer/agent.
- JWTs built in `sovereign-os-core` embed that UUID as `tenant_id` for API calls.
- Do **not** put IAM bigint in WordPress unless you add a separate field; services that only understand UUID should keep using UUID.

---

## Related docs

- [Database schema — migration files](../database-schema.md#migration-files) (`023_*`)
- [Main treasury env sample](./main-treasury.env.sample)
- [Payouts flow](./payouts-flow.md)
- [WordPress plugins](../wordpress-plugins.md) (Sovereign OS Core, WooCommerce default gateway)
