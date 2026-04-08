-- Rollback for Migration 021: partner_referral_workspace_os_schema
-- Reverses: All tables in partner_referral_os schema, views, and the schema itself

-- Drop views first
DROP VIEW IF EXISTS partner_referral_os.v_contract_earnings CASCADE;
DROP VIEW IF EXISTS partner_referral_os.v_workspace_funnel CASCADE;

-- Drop tables in reverse order of creation (respecting foreign key dependencies)
DROP TABLE IF EXISTS partner_referral_os.dashboard_snapshots CASCADE;
DROP TABLE IF EXISTS partner_referral_os.dispute_cases CASCADE;
DROP TABLE IF EXISTS partner_referral_os.payout_instructions CASCADE;
DROP TABLE IF EXISTS partner_referral_os.commission_ledgers CASCADE;
DROP TABLE IF EXISTS partner_referral_os.match_results CASCADE;
DROP TABLE IF EXISTS partner_referral_os.conversion_records CASCADE;
DROP TABLE IF EXISTS partner_referral_os.conversion_import_batches CASCADE;
DROP TABLE IF EXISTS partner_referral_os.redirect_events CASCADE;
DROP TABLE IF EXISTS partner_referral_os.communication_events CASCADE;
DROP TABLE IF EXISTS partner_referral_os.leads CASCADE;
DROP TABLE IF EXISTS partner_referral_os.click_events CASCADE;
DROP TABLE IF EXISTS partner_referral_os.session_attributions CASCADE;
DROP TABLE IF EXISTS partner_referral_os.creative_assets CASCADE;
DROP TABLE IF EXISTS partner_referral_os.landing_page_versions CASCADE;
DROP TABLE IF EXISTS partner_referral_os.landing_pages CASCADE;
DROP TABLE IF EXISTS partner_referral_os.campaigns CASCADE;
DROP TABLE IF EXISTS partner_referral_os.tracking_assets CASCADE;
DROP TABLE IF EXISTS partner_referral_os.contract_versions CASCADE;
DROP TABLE IF EXISTS partner_referral_os.partner_contracts CASCADE;
DROP TABLE IF EXISTS partner_referral_os.partner_programs CASCADE;
DROP TABLE IF EXISTS partner_referral_os.payout_models CASCADE;
DROP TABLE IF EXISTS partner_referral_os.workspace_users CASCADE;
DROP TABLE IF EXISTS partner_referral_os.workspaces CASCADE;
DROP TABLE IF EXISTS partner_referral_os.companies CASCADE;

-- Drop schema
DROP SCHEMA IF EXISTS partner_referral_os CASCADE;
