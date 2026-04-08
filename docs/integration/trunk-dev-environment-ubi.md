# TRUNK `dev-environment/ubi` — relationship to this repository

This document explains how **this repo** (UBI-CMS / Sovereign Economic SaaS WordPress slice) relates to a **broader UBI platform tree** often checked out at:

`C:\DEV\TRUNK\dev-environment\ubi` (Windows; adjust for your OS).

That tree typically contains many top-level packages (`api`, `backend`, `docker`, `core`, `engines`, `wordpress`, …). **This repository is not a full copy of that tree** — it is the **shipping integration** for WordPress, aligned Node microservices (`services/*`), shared contracts, and infrastructure configs maintained here.

---

## When to use which checkout

| Goal | Use |
|------|-----|
| Portal + API + `services/*` + Docker stack as documented in root `README.md` | **This repository** |
| WordPress + Sovereign plugins + Fluent Support / CRM-style multi-tenant behavior | **This repository** (`wordpress/wp-content/plugins/...`) |
| Experimental modules, legacy backends, or org-specific orchestration under TRUNK | **TRUNK `ubi`** (or your org’s equivalent monorepo) |

**Do not** merge the entire TRUNK tree into this repo. Prefer **documented boundaries**: HTTP URLs, NATS subjects, JWT issuers, and [shared contracts](../../shared/contracts/README.md).

---

## Aligning runtime configuration

If WordPress in this repo must talk to APIs or workers started from **TRUNK** instead of this repo’s Compose files:

1. **Single source of truth for ports** — match [Architecture — service ports](../architecture.md) where possible:
   - API: `3000`
   - Portal UI: `3001`
   - UBI Engine: `3002`
   - NATS, Postgres, Redis, Keycloak: same hostnames/ports as your TRUNK stack (often via Docker network name).

2. **Environment variables** — mirror values in:
   - Root `.env` / `.env.example`
   - `services/*/.env` or `.env.example`
   - WordPress plugin options that store API base URLs (UBI Auth / Treasury / Engine plugins)

3. **Temporal** — If TRUNK runs a different Temporal worker or task queue, see [Temporal workflows](../temporal-workflows.md): queue names and workflow type names must match between client and worker.

4. **NATS** — Subject names used here are summarized in [NATS events](../nats-events.md). A TRUNK publisher or consumer must use the **same subject strings** (or an explicit bridge) to avoid silent desync.

---

## Suggested local workflow (Windows)

1. Start infrastructure and services from **either** this repo’s Compose **or** TRUNK’s Docker stack — **not two competing Postgres/NATS instances on the same ports**.
2. Point WordPress (this repo) at the running API/UBI endpoints via plugin settings or `wp-config.php` constants, as your integration requires.
3. Keep **tenant IDs** and JWT signing keys consistent if you test multi-tenant flows across portal and WordPress.

---

## Main treasury (single vault for all workspaces)

Business Builder `tenant_workspaces.settings.treasury` should reference **one** platform `tenants` row and **one** primary `treasury_vaults` row (see [main-treasury.env.sample](./main-treasury.env.sample) and migration `022_tenant_workspace_main_treasury.sql`).

## Related documentation

| Topic | Location |
|-------|----------|
| Monorepo layout & CI | [Monorepo playbook](../monorepo.md) |
| WordPress plugins + Sovereign | [WordPress plugins](../wordpress-plugins.md) |
| Service map | [Service map](../architecture/service-map.md) |
| Integration layer (routing) | [INTEGRATION_LAYER.md](../INTEGRATION_LAYER.md) |

If TRUNK uses a private runbook, link it from your team wiki and keep **only** stable, public integration contracts in this repo.
