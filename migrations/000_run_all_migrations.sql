-- Migration Runner: 000_run_all_migrations.sql
-- Description: Execute all migrations in order
-- Created: 2026-03-26
-- Usage: psql -U postgres -d ubi_cms -f 000_run_all_migrations.sql

\echo '==============================================='
\echo 'UBI-CMS Database Migration Runner'
\echo 'Starting migration process...'
\echo '==============================================='

-- Set error handling
\set ON_ERROR_STOP on
\set VERBOSITY verbose

-- Start transaction
BEGIN;

\echo ''
\echo '>>> Running Migration 001: Create Extensions'
\i 001_create_extensions.sql

\echo ''
\echo '>>> Running Migration 002: Create IAM Schema'
\i 002_create_iam_schema.sql

\echo ''
\echo '>>> Running Migration 003: Create Ledger Schema'
\i 003_create_ledger_schema.sql

\echo ''
\echo '>>> Running Migration 004: Create UBI Engine Schema'
\i 004_create_ubi_engine_schema.sql

\echo ''
\echo '>>> Running Migration 005: Create Treasury Schema'
\i 005_create_treasury_schema.sql

\echo ''
\echo '>>> Running Migration 006: Create Task Marketplace Schema'
\i 006_create_task_marketplace_schema.sql

\echo ''
\echo '>>> Running Migration 007: Create Rewards & Reputation Schema'
\i 007_create_rewards_reputation_schema.sql

\echo ''
\echo '>>> Running Migration 008: Create Agent Economy Schema'
\i 008_create_agent_economy_schema.sql

\echo ''
\echo '>>> Running Migration 009: Create Governance Schema'
\i 009_create_governance_schema.sql

\echo ''
\echo '>>> Running Migration 010: Create Audit & Security Schema'
\i 010_create_audit_security_schema.sql

\echo ''
\echo '>>> Running Migration 011: Create Notifications & Events Schema'
\i 011_create_notifications_events_schema.sql

-- Commit transaction
COMMIT;

\echo ''
\echo '==============================================='
\echo 'All migrations completed successfully!'
\echo '==============================================='
\echo ''

-- Display table count
SELECT 
    schemaname,
    COUNT(*) as table_count
FROM pg_tables 
WHERE schemaname = 'public'
GROUP BY schemaname;

\echo ''
\echo 'Migration summary:'
SELECT 
    tablename as table_name,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
