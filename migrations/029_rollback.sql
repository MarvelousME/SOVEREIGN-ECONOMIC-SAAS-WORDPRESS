-- Rollback for Migration 029: enterprise_reporting_branding_controls
-- Reverses: workspace_branding_bindings, tenant_report_governance tables

-- Drop tables in reverse order
DROP TABLE IF EXISTS tenant_report_governance CASCADE;
DROP TABLE IF EXISTS workspace_branding_bindings CASCADE;
