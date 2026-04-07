# UBI CMS — Database Schema Reference

**Database:** PostgreSQL 15+ (Compose in this repo typically uses **16**; DB name **`ubi_dev`** for `docker-compose.local.yml`, **`ubi_cms`** for `docker-compose.dev.yml`)  
**Migrations directory:** `migrations/`  
**Run all:** `psql $DATABASE_URL -f migrations/000_run_all_migrations.sql`

---

## Table of Contents

- [Schema Overview](#schema-overview)
- [Tables](#tables)
  - [users](#users)
  - [tasks](#tasks)
  - [task_assignments](#task_assignments)
  - [rewards](#rewards)
  - [treasury_accounts](#treasury_accounts)
  - [treasury_transactions](#treasury_transactions)
  - [treasury_strategies](#treasury_strategies)
  - [agents](#agents)
  - [agent_executions](#agent_executions)
- [Indexes](#indexes)
- [Relationships Summary](#relationships-summary)
- [Migration Files](#migration-files)

---

## Schema Overview

```
users
 ├── task_assignments (user_id)
 ├── rewards (user_id)
 ├── treasury_accounts (user_id) — 1:1
 ├── treasury_transactions (user_id)
 ├── agents (owner_id)
 └── agent_executions (user_id)

tasks
 └── task_assignments (task_id)

agents
 └── agent_executions (agent_id)
```

### PostgreSQL schema `partner_referral_os`

B2B partner referral workspace model (companies, programs, contracts, attribution, leads, commission ledger). **Not** the same as `public.landing_pages` (Landing Page Factory) or `public.referrals` (user referral tree). Created by `021_partner_referral_workspace_os_schema.sql`; optional link to platform tenants via `workspaces.linked_tenant_workspace_id` → `tenant_workspaces.id`. See [Partner Referral wiring](./integration/partner-referral-sa3-eos-wiring.md).

---

## Tables

### `users`

Core user accounts. Stores credentials, roles, and KYC status.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `SERIAL` | No | auto | Primary key |
| `username` | `VARCHAR(50)` | No | — | Unique login handle |
| `email` | `VARCHAR(255)` | No | — | Unique email address |
| `password_hash` | `VARCHAR(255)` | No | — | bcrypt hash (rounds=10) |
| `roles` | `TEXT[]` | No | `'{user}'` | Array: `user`, `moderator`, `admin` |
| `status` | `VARCHAR(20)` | No | `'active'` | `active`, `suspended`, `pending` |
| `wallet_address` | `VARCHAR(255)` | Yes | NULL | Optional blockchain wallet |
| `kyc_verified` | `BOOLEAN` | No | `FALSE` | Know-Your-Customer verified |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Account creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | Last update timestamp |

**Constraints:**
- `users_username_key` — UNIQUE on `username`
- `users_email_key` — UNIQUE on `email`

**Example:**
```sql
SELECT id, username, email, roles, status, created_at
FROM users
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 10;
```

---

### `tasks`

Task definitions in the marketplace.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `SERIAL` | No | auto | Primary key |
| `title` | `VARCHAR(255)` | No | — | Short task title |
| `description` | `TEXT` | No | — | Full task description |
| `category` | `VARCHAR(100)` | No | — | Task category (translation, research, etc.) |
| `difficulty` | `VARCHAR(20)` | No | `'medium'` | `easy`, `medium`, `hard`, `expert` |
| `reward_amount` | `DECIMAL(18,6)` | No | `0` | Reward in `reward_currency` |
| `reward_currency` | `VARCHAR(10)` | No | `'UBI'` | Token symbol |
| `max_participants` | `INTEGER` | No | `1` | Maximum concurrent workers |
| `current_participants` | `INTEGER` | No | `0` | Active assignment count |
| `status` | `VARCHAR(20)` | No | `'open'` | `open`, `in_progress`, `completed`, `cancelled` |
| `deadline` | `TIMESTAMPTZ` | Yes | NULL | Optional submission deadline |
| `proof_requirements` | `TEXT` | Yes | NULL | Instructions for proof submission |
| `created_by` | `INTEGER` | Yes | NULL | FK → `users.id` (creator) |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | Last update timestamp |

**Example:**
```sql
SELECT t.id, t.title, t.difficulty, t.reward_amount, t.status,
       COUNT(ta.id) AS assignment_count
FROM tasks t
LEFT JOIN task_assignments ta ON ta.task_id = t.id AND ta.status != 'cancelled'
WHERE t.status = 'open'
GROUP BY t.id
ORDER BY t.created_at DESC;
```

---

### `task_assignments`

Links users to tasks they are working on.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `SERIAL` | No | auto | Primary key |
| `task_id` | `INTEGER` | No | — | FK → `tasks.id` ON DELETE CASCADE |
| `user_id` | `INTEGER` | No | — | FK → `users.id` ON DELETE CASCADE |
| `status` | `VARCHAR(20)` | No | `'assigned'` | `assigned`, `submitted`, `verified`, `rejected`, `cancelled` |
| `proof_url` | `TEXT` | Yes | NULL | Submitted proof URL or reference |
| `feedback` | `TEXT` | Yes | NULL | Moderator feedback on verification |
| `submitted_at` | `TIMESTAMPTZ` | Yes | NULL | When proof was submitted |
| `verified_at` | `TIMESTAMPTZ` | Yes | NULL | When moderator verified |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Assignment creation timestamp |

**Constraints:**
- `task_assignments_task_id_user_id_key` — UNIQUE on `(task_id, user_id)` to prevent duplicate assignments

**Example — get user's active assignments:**
```sql
SELECT ta.id, t.title, t.reward_amount, ta.status, ta.created_at
FROM task_assignments ta
JOIN tasks t ON t.id = ta.task_id
WHERE ta.user_id = $1
  AND ta.status NOT IN ('verified', 'rejected', 'cancelled')
ORDER BY ta.created_at DESC;
```

---

### `rewards`

All reward transactions issued to users.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `SERIAL` | No | auto | Primary key |
| `user_id` | `INTEGER` | No | — | FK → `users.id` ON DELETE CASCADE |
| `amount` | `DECIMAL(18,6)` | No | — | Token amount |
| `currency` | `VARCHAR(10)` | No | `'UBI'` | Token symbol |
| `type` | `VARCHAR(50)` | No | — | `task_completion`, `ubi_distribution`, `bonus`, `referral` |
| `source_type` | `VARCHAR(50)` | Yes | NULL | Source entity type (e.g., `task`) |
| `source_id` | `INTEGER` | Yes | NULL | Source entity ID |
| `status` | `VARCHAR(20)` | No | `'pending'` | `pending`, `confirmed`, `cancelled` |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | When the reward was created |
| `processed_at` | `TIMESTAMPTZ` | Yes | NULL | When the reward was confirmed |

**Example — total earned by user:**
```sql
SELECT SUM(amount) AS total_earned, currency
FROM rewards
WHERE user_id = $1
  AND status = 'confirmed'
GROUP BY currency;
```

---

### `treasury_accounts`

One treasury account per user (enforced by UNIQUE constraint).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `SERIAL` | No | auto | Primary key |
| `user_id` | `INTEGER` | No | — | FK → `users.id` ON DELETE CASCADE |
| `balance` | `DECIMAL(18,6)` | No | `0` | Current token balance |
| `currency` | `VARCHAR(10)` | No | `'UBI'` | Token symbol |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Account creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | Last balance update |

**Constraints:**
- `treasury_accounts_user_id_key` — UNIQUE on `user_id` (one account per user)
- `treasury_balance_check` — CHECK `balance >= 0`

**Upsert pattern (deposit):**
```sql
INSERT INTO treasury_accounts (user_id, balance, currency)
VALUES ($1, $2, $3)
ON CONFLICT (user_id) DO UPDATE
    SET balance    = treasury_accounts.balance + EXCLUDED.balance,
        updated_at = NOW()
RETURNING balance;
```

---

### `treasury_transactions`

Immutable ledger of all treasury movements.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `SERIAL` | No | auto | Primary key |
| `user_id` | `INTEGER` | No | — | FK → `users.id` ON DELETE CASCADE |
| `type` | `VARCHAR(20)` | No | — | `deposit`, `withdraw`, `yield` |
| `amount` | `DECIMAL(18,6)` | No | — | Token amount |
| `currency` | `VARCHAR(10)` | No | `'UBI'` | Token symbol |
| `balance_after` | `DECIMAL(18,6)` | No | — | Balance snapshot after transaction |
| `metadata` | `JSONB` | Yes | `'{}'` | Arbitrary transaction metadata |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Transaction timestamp |

**Example — transaction history with running total:**
```sql
SELECT type, amount, balance_after, created_at,
       metadata->>'note' AS note
FROM treasury_transactions
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
```

---

### `treasury_strategies`

Available yield strategies for the treasury pool.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `SERIAL` | No | auto | Primary key |
| `name` | `VARCHAR(100)` | No | — | Strategy name |
| `protocol` | `VARCHAR(100)` | No | — | Underlying protocol or mechanism |
| `apy` | `DECIMAL(5,2)` | No | `0` | Annual percentage yield (e.g., 4.50 = 4.5%) |
| `risk_level` | `VARCHAR(20)` | No | `'medium'` | `low`, `medium`, `high` |
| `allocation` | `DECIMAL(5,2)` | No | `0` | % of pool allocated to this strategy |
| `active` | `BOOLEAN` | No | `TRUE` | Whether strategy is currently active |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Creation timestamp |

**Example — list active strategies sorted by APY:**
```sql
SELECT id, name, protocol, apy, risk_level, allocation
FROM treasury_strategies
WHERE active = TRUE
ORDER BY apy DESC;
```

---

### `agents`

AI agents registered in the marketplace.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | No | `gen_random_uuid()` | Primary key |
| `owner_id` | `INTEGER` | No | — | FK → `users.id` (admin who registered) |
| `name` | `VARCHAR(100)` | No | — | Agent display name |
| `description` | `TEXT` | No | — | Agent description |
| `capability` | `VARCHAR(100)` | No | — | Capability type (e.g., `text_processing`) |
| `endpoint` | `VARCHAR(500)` | No | — | HTTP endpoint URL |
| `auth_type` | `VARCHAR(20)` | No | `'api_key'` | Authentication method |
| `pricing_model` | `VARCHAR(20)` | No | `'free'` | `free`, `per_call`, `subscription` |
| `price_per_call` | `DECIMAL(10,6)` | No | `0` | Cost in UBI per execution |
| `status` | `VARCHAR(20)` | No | `'active'` | `active`, `inactive`, `deprecated` |
| `total_calls` | `INTEGER` | No | `0` | Cumulative execution count |
| `rating` | `DECIMAL(3,2)` | No | `5.0` | Average user rating (1.00–5.00) |
| `success_rate` | `DECIMAL(5,2)` | Yes | NULL | Success rate % (computed from executions) |
| `version` | `VARCHAR(20)` | Yes | NULL | Agent version string |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Registration timestamp |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | Last update timestamp |

**Example — list active agents by popularity:**
```sql
SELECT id, name, capability, pricing_model, price_per_call, total_calls, rating
FROM agents
WHERE status = 'active'
ORDER BY total_calls DESC, rating DESC;
```

---

### `agent_executions`

Immutable log of all agent execution events.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | No | `gen_random_uuid()` | Primary key |
| `agent_id` | `UUID` | No | — | FK → `agents.id` ON DELETE CASCADE |
| `user_id` | `INTEGER` | No | — | FK → `users.id` ON DELETE CASCADE |
| `input_data` | `JSONB` | No | — | Input payload sent to agent |
| `output_data` | `JSONB` | Yes | NULL | Output payload from agent |
| `status` | `VARCHAR(20)` | No | — | `completed`, `failed`, `timeout` |
| `duration_ms` | `INTEGER` | No | — | Execution duration in milliseconds |
| `cost` | `DECIMAL(10,6)` | No | `0` | UBI tokens charged for this execution |
| `completed_at` | `TIMESTAMPTZ` | Yes | NULL | When execution finished |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | When execution was initiated |

**Example — recent executions for a user:**
```sql
SELECT ae.id, a.name AS agent_name, ae.status, ae.duration_ms, ae.cost, ae.created_at
FROM agent_executions ae
JOIN agents a ON a.id = ae.agent_id
WHERE ae.user_id = $1
ORDER BY ae.created_at DESC
LIMIT 20;
```

---

## Indexes

Key indexes for query performance:

```sql
-- Users
CREATE INDEX idx_users_status       ON users(status);
CREATE INDEX idx_users_created_at   ON users(created_at);

-- Tasks
CREATE INDEX idx_tasks_status       ON tasks(status);
CREATE INDEX idx_tasks_category     ON tasks(category);
CREATE INDEX idx_tasks_difficulty   ON tasks(difficulty);
CREATE INDEX idx_tasks_deadline     ON tasks(deadline) WHERE deadline IS NOT NULL;

-- Task Assignments
CREATE INDEX idx_task_assignments_task_id    ON task_assignments(task_id);
CREATE INDEX idx_task_assignments_user_id    ON task_assignments(user_id);
CREATE INDEX idx_task_assignments_status     ON task_assignments(status);

-- Rewards
CREATE INDEX idx_rewards_user_id    ON rewards(user_id);
CREATE INDEX idx_rewards_status     ON rewards(status);
CREATE INDEX idx_rewards_type       ON rewards(type);
CREATE INDEX idx_rewards_created_at ON rewards(user_id, created_at DESC);

-- Treasury
CREATE INDEX idx_treasury_transactions_user_id    ON treasury_transactions(user_id);
CREATE INDEX idx_treasury_transactions_created_at ON treasury_transactions(user_id, created_at DESC);

-- Agents
CREATE INDEX idx_agents_status      ON agents(status);
CREATE INDEX idx_agents_capability  ON agents(capability);

-- Agent Executions
CREATE INDEX idx_agent_executions_agent_id  ON agent_executions(agent_id);
CREATE INDEX idx_agent_executions_user_id   ON agent_executions(user_id);
```

---

## Relationships Summary

| Parent Table | Child Table | FK Column | Relationship |
|-------------|-------------|-----------|-------------|
| `users` | `task_assignments` | `user_id` | One user → many assignments |
| `tasks` | `task_assignments` | `task_id` | One task → many assignments |
| `users` | `rewards` | `user_id` | One user → many rewards |
| `users` | `treasury_accounts` | `user_id` | One user → one treasury account |
| `users` | `treasury_transactions` | `user_id` | One user → many transactions |
| `users` | `agents` | `owner_id` | One user → many owned agents |
| `users` | `agent_executions` | `user_id` | One user → many executions |
| `agents` | `agent_executions` | `agent_id` | One agent → many executions |

All foreign keys use `ON DELETE CASCADE` to automatically clean up child records when a parent is deleted.

---

## Migration Files

| File | Contents |
|------|----------|
| `000_run_all_migrations.sql` | Master runner — includes **001–011** only (see note below) |
| `001_create_extensions.sql` | PostgreSQL extensions (uuid-ossp, pgcrypto) |
| `002_create_iam_schema.sql` | IAM / identity schema |
| `003_create_ledger_schema.sql` | Ledger / accounting schema |
| `004_create_ubi_engine_schema.sql` | UBI distribution tables |
| `005_create_treasury_schema.sql` | Treasury accounts and strategies |
| `006_auth_tables.sql` | Core auth (users) tables |
| `007_create_task_marketplace_tables.sql` | Tasks and assignments |
| `007_create_rewards_reputation_schema.sql` | Rewards tables |
| `008_create_agent_economy_schema.sql` | Agents and executions |
| `009_create_governance_schema.sql` | Governance voting tables |
| `010_create_audit_security_schema.sql` | Audit log tables |
| `011_create_agent_tables.sql` | Additional agent tables |
| `011_create_notifications_events_schema.sql` | Notifications and events |
| `012_business_builder_tenant_workspaces.sql` | Business Builder `tenant_workspaces` and related; prerequisite for later workspace features |
| `014_create_affiliate_intelligence_schema.sql` | Affiliate intelligence schema |
| `015_create_landing_page_factory_schema.sql` | Landing page factory tables |
| `017_create_compliance_schema.sql` | Compliance engine schema |
| `018_create_agent_control_plane_schema.sql` | Agent control plane schema |
| `019_create_analytics_schema.sql` | Analytics schema |
| `020_add_rls_policies.sql` | Row-level security policies |
| `021_partner_referral_workspace_os_schema.sql` | Partner Referral Workspace OS (`partner_referral_os` schema); run after `012` |
| `022_tenant_workspace_main_treasury.sql` | Points workspace treasury settings at platform main vault (`MAIN_TREASURY_*`) |
| `023_iam_tenant_workspace_uuid_link.sql` | IAM `tenants.workspace_tenant_uuid` ↔ workspace UUID; see [Tenant ID mapping](./integration/tenant-id-mapping.md) |

> **Note:** Some numbers have duplicates (e.g., multiple `007_` / `008_` / `011_` files) targeting different domains. The file `000_run_all_migrations.sql` currently stops at **`011_create_notifications_events_schema.sql`**. Migrations **`012` and above** must be applied **manually in order** (or your deployment pipeline should run them after the base bundle). See also `migrations/` for any newer files not yet listed here.
