-- Rollback for Migration 017: compliance_schema
-- Reverses: compliance.consent_records, compliance.suppression_list, compliance.disclosure_templates,
--            compliance.channel_policies, compliance.geo_restrictions, compliance.compliance_reviews,
--            compliance.abuse_signals, compliance.approval_workflows

-- Drop tables in reverse order of creation (respecting foreign key dependencies)
DROP TABLE IF EXISTS compliance.approval_workflows CASCADE;
DROP TABLE IF EXISTS compliance.abuse_signals CASCADE;
DROP TABLE IF EXISTS compliance.compliance_reviews CASCADE;
DROP TABLE IF EXISTS compliance.geo_restrictions CASCADE;
DROP TABLE IF EXISTS compliance.channel_policies CASCADE;
DROP TABLE IF EXISTS compliance.disclosure_templates CASCADE;
DROP TABLE IF EXISTS compliance.suppression_list CASCADE;
DROP TABLE IF EXISTS compliance.consent_records CASCADE;

-- Drop schema (only if empty)
DROP SCHEMA IF EXISTS compliance CASCADE;
