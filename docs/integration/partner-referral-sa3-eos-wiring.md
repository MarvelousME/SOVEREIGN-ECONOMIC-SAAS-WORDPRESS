# Partner Referral Workspace OS + SA³-EOS — Monorepo wiring

This document connects the **Partner Referral Workspace OS** blueprint (`partner_referral_platform_blueprint.md`, `partner_referral_repo_ready_pack.md`) and the **SA³-EOS** scaffold packs to **this repository**. Source artifacts live under your local `Downloads/`; behavior is implemented here.

---

## System map

| Layer | Blueprint module | This repo |
|--------|------------------|-----------|
| **Data** | Companies, workspaces, programs, contracts, attribution, leads, imports, commission ledger | PostgreSQL schema `partner_referral_os` — migration `migrations/021_partner_referral_workspace_os_schema.sql` |
| **Platform tenant** | Partner “workspace” | `tenant_workspaces`, `tenant_workspace_members` (`012_business_builder_tenant_workspaces.sql`); optional **soft** link `partner_referral_os.workspaces.linked_tenant_workspace_id` (UUID, no FK so `021` runs on `api/dev-schema.sql` DBs; add a follow-up migration with `REFERENCES tenant_workspaces(id)` if you want DB-enforced integrity everywhere) |
| **Referrals (user tree)** | N/A (different model: B2B partner earnings) | `public.referrals`, `referral_service` (3010) — keep separate; integrate via events later if needed |
| **Landing pages (AI blocks)** | Campaign landing pages in PR-OS | `public.landing_pages` + `services/landing-page-factory` — sync or deep-link by `linked_tenant_workspace_id` + metadata |
| **Affiliate / tracking** | Tracking assets, UTM, clicks | `014_create_affiliate_intelligence_schema.sql`, WordPress `sovereign-affiliate-tracker` |
| **Ledger / payouts** | Commission ledger, payout instructions | `003_create_ledger_schema.sql`, `ledger-service`, treasury — map payout settlement in a future bounded context |
| **Agents / AI studio** | Campaign + creative generation | `018_create_agent_control_plane_schema.sql`, `services/agent-control-plane`, `agent-runner` — use `ai_agent_settings_json` as config surface |
| **Identity** | Workspace users (email/password in pack) | **Do not** mirror auth in frontend only: use Keycloak/JWT (`auth-service`, `002_create_iam_schema.sql`) and server-side RBAC for any new API |
| **Optional on-chain** | Contract hashes, attribution proofs, settlement | No Solidity in-repo requirement for v1; if added: minimal anchor contract + off-chain indexer; follow OpenZeppelin patterns and audit before mainnet |

---

## Risk areas

1. **Name collisions** — Pack SQL used `landing_pages`, `workspaces`, `companies` in `public`. That would clash with `015` (`landing_pages`) and business semantics. **Mitigation:** all PR-OS tables live in schema `partner_referral_os`.
2. **Dual workspace concepts** — `partner_referral_os.workspaces` (BIGINT, B2B partner) vs `tenant_workspaces` (UUID, platform tenant). **Mitigation:** `linked_tenant_workspace_id` bridges them; document which UI owns which.
3. **Auth drift** — Pack suggests local `password_hash` on `workspace_users`. **Mitigation:** new APIs must validate OIDC/JWT server-side; migrate workspace users to IAM or treat `workspace_users` as legacy until linked to `users`.
4. **SA³-EOS stack duplication** — Packs propose a standalone FastAPI + Vite app. **Mitigation:** do **not** duplicate; map EOS modules to existing Node services and `frontend/portal-ui` (see table above).
5. **Agent autonomy** — AI campaign studio needs tool boundaries, iteration caps, and durable jobs for imports/matching (**ai-agents-architect**).

---

## Enforcement plan

1. **DB** — Apply `021_partner_referral_workspace_os_schema.sql` after `012` (requires `tenant_workspaces`). Run via your standard migration path (`psql`, `api/scripts/migrate.js`, or compose init).
2. **API** — Add a dedicated service (e.g. `services/partner-referral-os`) or extend `api` with routes under `/partner-referral/v1/...` that use `SET search_path` or qualified names — **server-side auth required**.
3. **Events** — Publish `partner_referral.conversion_matched`, `partner_referral.payout_instruction_created` on NATS for ledger/treasury consumers.
4. **UI** — Partner dashboard: Next.js App Router, loading/error states, no emoji-as-icons; align with portal design tokens (**ui-ux-pro-max** checklist).
5. **Blockchain (optional)** — Store Merkle roots or contract hashes in a small `partner_referral_os.onchain_anchors` table later; contract code in `contracts/` with Slither/CI — **solidity-security** before production.

---

## SA³-EOS pack mapping (FastAPI scaffold → this monorepo)

| SA³-EOS module | Prefer |
|----------------|--------|
| Identity | `auth-service` + Keycloak |
| Wallet / UBI | `ubi-engine`, `frontend/portal-ui` wallet flows |
| Treasury | `treasury-engine` |
| Agent | `agent-control-plane`, `agent-runner`, `018` schema |
| Ledger | `ledger-service` |

---

## DB-ASSASSIN (schema → migration → indexes → rollback)

- **Schema:** `partner_referral_os` (all tables + views `v_workspace_funnel`, `v_contract_earnings`).
- **Migration:** `migrations/021_partner_referral_workspace_os_schema.sql`.
- **Indexes:** As in file (`idx_pr_os_*`); add partial indexes on hot filters when query plans warrant.
- **Queries:** Scope every query with `partner_referral_os.` or `SET search_path`; enforce `workspace_id` / `contract_id` in WHERE for tenant isolation.
- **Rollback:** `DROP SCHEMA partner_referral_os CASCADE;` (loses all PR-OS data).

---

## IAM-ENFORCER

- **Flow:** OIDC login → JWT with `sub`, roles, optional `tenant_workspace_id`.
- **Enforcement:** API gateway or service middleware validates JWT signature and issuer; authorize `partner_referral_os` rows by membership linked to `linked_tenant_workspace_id` or role claims.
- **Never:** trust client-only checks for payout or import endpoints.

---

## UI-ELITE (partner dashboard)

- **Goal:** Workspace-level funnel, campaigns, import status, disputes.
- **Structure:** Route group under portal or subdomain; server components for aggregates; client for forms.
- **Accessibility:** Focus rings, 4.5:1 contrast, `prefers-reduced-motion`.

---

## Final verification checklist

- [ ] Migration `021` applied on staging DB after `012`.
- [ ] No new tables in `public` named `workspaces` / `landing_pages` for PR-OS.
- [ ] At least one integration test or manual SQL check: insert company → workspace → program → contract.
- [ ] Service map updated (`docs/architecture/service-map.md`).
- [ ] OpenAPI from pack (if used) versioned next to the service that implements it.

---

## Source file references (local)

- `partner_referral_repo_ready_pack.md` — embedded `schema.sql`, OpenAPI starter, SVG diagrams.
- `partner_referral_platform_blueprint.md` — phased operating model and modules.
- `sa_3_eos_build_pack*.md` — reference architecture; implement via existing services, not a second stack.
