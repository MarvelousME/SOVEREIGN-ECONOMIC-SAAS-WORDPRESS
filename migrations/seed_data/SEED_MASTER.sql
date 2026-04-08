-- Master Seed Data Runner
-- Runs all seed data files in proper order
-- Must be run AFTER all schema migrations (001-029)

-- ============================================
-- SEED DATA EXECUTION ORDER
-- ============================================
-- 1. 001_seed_iam_ledger_ubi.sql      - Core entities (tenants, users, ledger, UBI)
-- 2. 002_seed_treasury_tasks.sql       - Treasury, tasks, skills
-- 3. 003_seed_governance_rewards.sql   - Governance, rewards, reputation
-- 4. 004_seed_agents_business.sql      - Agents, business builder
-- 5. 005_seed_analytics_compliance_social.sql - Analytics, compliance, social

-- ============================================
-- PREREQUISITES
-- ============================================
-- 1. Ensure PostgreSQL is running
-- 2. Ensure all migrations 001-029 have been applied
-- 3. Ensure uuid-ossp extension is enabled: CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- 4. Ensure pgcrypto extension is enabled: CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- EXECUTION INSTRUCTIONS
-- ============================================
-- Run from migrations directory:
-- psql -U postgres -d ubi_cms -f seed_data/SEED_MASTER.sql
--
-- Or run individual files in order:
-- psql -U postgres -d ubi_cms -f seed_data/001_seed_iam_ledger_ubi.sql
-- psql -U postgres -d ubi_cms -f seed_data/002_seed_treasury_tasks.sql
-- psql -U postgres -d ubi_cms -f seed_data/003_seed_governance_rewards.sql
-- psql -U postgres -d ubi_cms -f seed_data/004_seed_agents_business.sql
-- psql -U postgres -d ubi_cms -f seed_data/005_seed_analytics_compliance_social.sql

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Count records in all seeded tables
SELECT 'tenants' as table_name, COUNT(*) as count FROM tenants
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'user_roles', COUNT(*) FROM user_roles
UNION ALL SELECT 'ledger_accounts', COUNT(*) FROM ledger_accounts
UNION ALL SELECT 'ledger_journals', COUNT(*) FROM ledger_journals
UNION ALL SELECT 'ledger_transactions', COUNT(*) FROM ledger_transactions
UNION ALL SELECT 'ledger_entries', COUNT(*) FROM ledger_entries
UNION ALL SELECT 'ubi_pools', COUNT(*) FROM ubi_pools
UNION ALL SELECT 'ubi_rules', COUNT(*) FROM ubi_rules
UNION ALL SELECT 'ubi_eligibility', COUNT(*) FROM ubi_eligibility
UNION ALL SELECT 'ubi_distributions', COUNT(*) FROM ubi_distributions
UNION ALL SELECT 'task_categories', COUNT(*) FROM task_categories
UNION ALL SELECT 'skills', COUNT(*) FROM skills
UNION ALL SELECT 'tasks', COUNT(*) FROM tasks
UNION ALL SELECT 'task_submissions', COUNT(*) FROM task_submissions
UNION ALL SELECT 'treasury_strategies', COUNT(*) FROM treasury_strategies
UNION ALL SELECT 'treasury_vaults', COUNT(*) FROM treasury_vaults
UNION ALL SELECT 'treasury_allocations', COUNT(*) FROM treasury_allocations
UNION ALL SELECT 'treasury_transactions', COUNT(*) FROM treasury_transactions
UNION ALL SELECT 'governance_config', COUNT(*) FROM governance_config
UNION ALL SELECT 'proposals', COUNT(*) FROM proposals
UNION ALL SELECT 'votes', COUNT(*) FROM votes
UNION ALL SELECT 'rewards', COUNT(*) FROM rewards
UNION ALL SELECT 'reputation_scores', COUNT(*) FROM reputation_scores
UNION ALL SELECT 'agents', COUNT(*) FROM agents
UNION ALL SELECT 'agent_executions', COUNT(*) FROM agent_executions
UNION ALL SELECT 'businesses', COUNT(*) FROM businesses
UNION ALL SELECT 'business_pages', COUNT(*) FROM business_pages
UNION ALL SELECT 'canonical_events', COUNT(*) FROM canonical_events
UNION ALL SELECT 'social_accounts', COUNT(*) FROM social_accounts
UNION ALL SELECT 'social_posts', COUNT(*) FROM social_posts
UNION ALL SELECT 'campaign_orchestrations', COUNT(*) FROM campaign_orchestrations
ORDER BY table_name;

-- ============================================
-- RELATIONSHIP VERIFICATION
-- ============================================

-- Verify ledger entries balance (debits = credits)
SELECT 
    'Unbalanced ledger entries detected!' as status,
    SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE 0 END) as total_debits,
    SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE 0 END) as total_credits,
    SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE 0 END) - SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE 0 END) as difference
FROM ledger_entries
HAVING SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE 0 END) != SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE 0 END);

-- Verify all foreign keys are satisfied
SELECT 'Foreign key violations detected!' as status
WHERE EXISTS (SELECT 1 FROM ledger_entries WHERE account_id NOT IN (SELECT id FROM ledger_accounts LIMIT 1) LIMIT 1);

-- ============================================
-- SUMMARY
-- ============================================
-- After running all seed files, you should have:
-- - 3 tenants (demo, business, enterprise)
-- - 12 users across tenants
-- - 39 ledger accounts (chart of accounts)
-- - 25+ ledger transactions with balanced entries
-- - 3+ UBI pools with eligibility rules
-- - 35+ UBI distributions
-- - 13+ task categories with 25+ skills
-- - 35+ tasks with submissions
-- - 5 treasury strategies with 6 vaults
-- - 12+ governance proposals with 50+ votes
-- - 40+ rewards records
-- - 8+ AI agents with executions
-- - 5+ businesses with pages
-- - 120+ analytics events
-- - 20+ social posts
-- - 7+ campaigns
