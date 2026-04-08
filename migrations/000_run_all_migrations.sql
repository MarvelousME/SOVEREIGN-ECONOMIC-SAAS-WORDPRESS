-- Migration Runner: 000_run_all_migrations.sql
-- Description: Execute all migrations in order, then seed data
-- Created: 2026-03-26
-- Updated: 2026-04-08 (added migrations 012-029 and seed data)
-- Usage: psql -U postgres -d ubi_cms -f 000_run_all_migrations.sql

\set ON_ERROR_STOP on
\set VERBOSITY verbose

\echo '==============================================='
\echo 'UBI-CMS Database Migration Runner'
\echo 'Starting migration process...'
\echo '==============================================='

-- ============================================
-- PHASE 1: Schema Migrations (001-029)
-- ============================================

\echo ''
\echo '>>> PHASE 1: Running Schema Migrations'
\echo '==============================================='

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

\echo ''
\echo '>>> Running Migration 012: Business Builder Tenant Workspaces'
\i 012_business_builder_tenant_workspaces.sql

\echo ''
\echo '>>> Running Migration 013: Create Analytics Schema'
\i 013_create_analytics_schema.sql

\echo ''
\echo '>>> Running Migration 014: Create Affiliate Intelligence Schema'
\i 014_create_affiliate_intelligence_schema.sql

\echo ''
\echo '>>> Running Migration 015: Create Landing Page Factory Schema'
\i 015_create_landing_page_factory_schema.sql

\echo ''
\echo '>>> Running Migration 017: Create Compliance Schema'
\i 017_create_compliance_schema.sql

\echo ''
\echo '>>> Running Migration 018: Create Agent Control Plane Schema'
\i 018_create_agent_control_plane_schema.sql

\echo ''
\echo '>>> Running Migration 019: Create Analytics Schema (Extended)'
\i 019_create_analytics_schema.sql

\echo ''
\echo '>>> Running Migration 020: Add Row Level Security Policies'
\i 020_add_rls_policies.sql

\echo ''
\echo '>>> Running Migration 021: Partner Referral Workspace OS Schema'
\i 021_partner_referral_workspace_os_schema.sql

\echo ''
\echo '>>> Running Migration 022: Tenant Workspace Main Treasury'
\i 022_tenant_workspace_main_treasury.sql

\echo ''
\echo '>>> Running Migration 023: IAM Tenant Workspace UUID Link'
\i 023_iam_tenant_workspace_uuid_link.sql

\echo ''
\echo '>>> Running Migration 024: Workspace Invitations'
\i 024_workspace_invitations.sql

\echo ''
\echo '>>> Running Migration 025: Social Distribution Schema'
\i 025_social_distribution_schema.sql

\echo ''
\echo '>>> Running Migration 026: Page Templates Scope'
\i 026_page_templates_scope.sql

\echo ''
\echo '>>> Running Migration 027: Campaign Orchestration'
\i 027_campaign_orchestration.sql

\echo ''
\echo '>>> Running Migration 028: Social Posts Campaign Link'
\i 028_social_posts_campaign_link.sql

\echo ''
\echo '>>> Running Migration 029: Enterprise Reporting Branding Controls'
\i 029_enterprise_reporting_branding_controls.sql

-- ============================================
-- PHASE 2: Seed Data (Optional - Run separately)
-- ============================================

\echo ''
\echo '==============================================='
\echo 'PHASE 1 COMPLETE: All schema migrations applied'
\echo '==============================================='
\echo ''

-- NOTE: Seed data is NOT automatically run to allow for
-- fresh database verification. Run seed data manually:
-- psql -U postgres -d ubi_cms -f seed_data/SEED_MASTER.sql

-- ============================================
-- Verification
-- ============================================

\echo ''
\echo '==============================================='
\echo 'Migration Verification'
\echo '==============================================='

-- Display table count by schema
\echo ''
\echo 'Tables created:'
SELECT 
    schemaname,
    COUNT(*) as table_count
FROM pg_tables 
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
GROUP BY schemaname;

\echo ''
\echo 'Migration summary (sorted by size):'
SELECT 
    tablename as table_name,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

\echo ''
\echo '==============================================='
\echo 'All migrations completed successfully!'
\echo '==============================================='
\echo ''
\echo 'NEXT STEP: To populate with sample data, run:'
\echo '  psql -U postgres -d ubi_cms -f seed_data/SEED_MASTER.sql'
\echo ''
