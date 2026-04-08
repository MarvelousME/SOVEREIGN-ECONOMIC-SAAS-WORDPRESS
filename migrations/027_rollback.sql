-- Rollback for Migration 027: campaign_orchestration
-- Reverses: campaign_orchestrations, campaign_state_events tables

-- Drop tables in reverse order of creation (respecting foreign key dependencies)
DROP TABLE IF EXISTS campaign_state_events CASCADE;
DROP TABLE IF EXISTS campaign_orchestrations CASCADE;
