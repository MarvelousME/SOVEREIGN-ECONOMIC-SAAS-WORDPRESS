# UBI-CMS Database Migrations

This directory contains PostgreSQL database migrations for the UBI-CMS platform.

## Migration Files

| File | Description |
|------|-------------|
| `000_run_all_migrations.sql` | Master migration runner (executes all migrations) |
| `001_create_extensions.sql` | PostgreSQL extensions (uuid-ossp, pg_trgm, hstore, pgcrypto) |
| `002_create_iam_schema.sql` | IAM & Multi-tenancy (tenants, users, roles, service accounts) |
| `003_create_ledger_schema.sql` | Double-entry ledger (accounts, transactions, entries, journals) |
| `004_create_ubi_engine_schema.sql` | UBI engine (pools, distributions, rules, eligibility) |
| `005_create_treasury_schema.sql` | Treasury management (vaults, strategies, allocations, transactions) |
| `006_create_task_marketplace_schema.sql` | Task marketplace (tasks, categories, skills, submissions) |
| `007_create_rewards_reputation_schema.sql` | Rewards & reputation (rewards, scores, validations, referrals, achievements) |
| `008_create_agent_economy_schema.sql` | AI agent economy (agents, executions, memory, marketplace) |
| `009_create_governance_schema.sql` | Governance (proposals, votes, config, delegations) |
| `010_create_audit_security_schema.sql` | Audit & security (logs, events, rate limits, API keys, sessions) |
| `011_create_notifications_events_schema.sql` | Notifications & events (notifications, event streams, webhooks) |

## Running Migrations

### Method 1: Run All Migrations

```bash
# Using psql
psql -U postgres -d ubi_cms -f migrations/000_run_all_migrations.sql

# Or with Docker
docker exec -i ubi-postgres psql -U postgres -d ubi_cms < migrations/000_run_all_migrations.sql
```

### Method 2: Run Individual Migrations

```bash
# Run migrations in order
psql -U postgres -d ubi_cms -f migrations/001_create_extensions.sql
psql -U postgres -d ubi_cms -f migrations/002_create_iam_schema.sql
# ... and so on
```

### Method 3: Using Migration Tools

```bash
# Using node-pg-migrate (if installed)
npm run migrate up

# Using Prisma (if configured)
npx prisma migrate deploy

# Using Flyway
flyway migrate
```

## Database Setup

### 1. Create Database

```sql
CREATE DATABASE ubi_cms;
CREATE USER ubi_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE ubi_cms TO ubi_user;
```

### 2. Configure Connection

```bash
# Set environment variables
export PGHOST=localhost
export PGPORT=5432
export PGDATABASE=ubi_cms
export PGUSER=ubi_user
export PGPASSWORD=your_secure_password
```

### 3. Run Migrations

```bash
cd migrations
psql -f 000_run_all_migrations.sql
```

## Features

### Row-Level Security (RLS)
All tables have RLS enabled for tenant isolation. Set the current tenant:

```sql
SET app.current_tenant_id = 1;
```

### Automatic Timestamps
Tables with `updated_at` columns automatically update on record modification.

### Data Validation
- CHECK constraints for data integrity
- UNIQUE constraints for business rules
- Foreign key constraints with CASCADE/RESTRICT

### Performance Optimizations
- Comprehensive indexes on frequently queried columns
- GIN indexes for JSONB columns
- Composite indexes for common query patterns
- Partial indexes for filtered queries

### Triggers & Functions
- Auto-update balances on transactions
- Auto-expire tasks, rewards, and proposals
- Validate double-entry accounting balance
- Update aggregate statistics

## Schema Overview

### IAM & Multi-tenancy (Migration 002)
- Multi-tenant isolation with RLS
- User management with roles
- Service accounts for API access
- Tenant settings and plans

### Ledger (Migration 003)
- Double-entry accounting system
- Account hierarchy support
- Transaction validation
- Automatic balance calculation
- Multi-currency support

### UBI Engine (Migration 004)
- Multiple pool types
- Distribution rules engine
- Eligibility scoring
- Activity level tracking

### Treasury (Migration 005)
- Vault management
- Investment strategies
- Automatic rebalancing
- Performance tracking

### Task Marketplace (Migration 006)
- Task categories and skills
- Proof-of-work validation
- Task assignment tracking
- Difficulty-based rewards

### Rewards & Reputation (Migration 007)
- Multi-source rewards
- Skill validation system
- Reputation scoring
- Achievement system
- Referral tracking

### Agent Economy (Migration 008)
- AI agent registry
- Execution tracking
- Agent memory system
- Marketplace listings
- Review system

### Governance (Migration 009)
- Proposal lifecycle
- Multiple voting mechanisms
- Vote delegation
- Quorum tracking
- Automatic execution

### Audit & Security (Migration 010)
- Comprehensive audit logs
- Security event tracking
- Rate limiting
- API key management
- Session management
- IP access control

### Notifications & Events (Migration 011)
- Multi-channel notifications
- Event streaming
- Webhook integrations
- Delivery tracking
- User preferences

## Rollback

Each migration file includes rollback commands in comments at the end. To rollback:

```sql
-- Example rollback for migration 011
DROP POLICY IF EXISTS tenant_isolation_policy ON webhook_deliveries;
-- ... (see migration file for complete rollback)
```

## Best Practices

1. **Always backup** before running migrations in production
2. **Test migrations** in development/staging first
3. **Run in transaction** to ensure atomicity
4. **Monitor performance** after adding indexes
5. **Review RLS policies** before enabling in production

## Seed Data

Seed data for development is available in the `/seeds/` directory:

```bash
psql -U postgres -d ubi_cms -f seeds/001_seed_development_data.sql
```

## Maintenance

### Cleanup Functions

```sql
-- Cleanup old audit logs (older than 1 year)
SELECT cleanup_old_audit_logs();

-- Cleanup expired sessions
SELECT cleanup_expired_sessions();

-- Cleanup expired rate limits
SELECT cleanup_expired_rate_limits();

-- Archive old notifications
SELECT auto_archive_notifications();

-- Cleanup archived notifications (older than 90 days)
SELECT cleanup_old_notifications();
```

### Schedule Maintenance (Cron)

```sql
-- Create pg_cron extension
CREATE EXTENSION pg_cron;

-- Schedule daily cleanup at 2 AM
SELECT cron.schedule('cleanup-audit-logs', '0 2 * * *', 'SELECT cleanup_old_audit_logs()');
SELECT cron.schedule('cleanup-sessions', '0 2 * * *', 'SELECT cleanup_expired_sessions()');
SELECT cron.schedule('cleanup-rate-limits', '*/15 * * * *', 'SELECT cleanup_expired_rate_limits()');
```

## Support

For issues or questions:
- Check migration logs for errors
- Verify PostgreSQL version (12+)
- Ensure all extensions are available
- Review RLS policies configuration

## Version History

- **v1.0.0** (2026-03-26): Initial schema with 11 migrations
  - IAM & Multi-tenancy
  - Double-entry ledger
  - UBI engine
  - Treasury management
  - Task marketplace
  - Rewards & reputation
  - Agent economy
  - Governance
  - Audit & security
  - Notifications & events
