-- Rollback for Migration 019: analytics_schema
-- Reverses: canonical_events (partitioned table), attribution_touchpoints, conversions, attribution_models,
--            experiments, experiment_results, anomaly_alerts, real_time_metrics, cohort_analysis,
--            funnel_analysis, analytics_audit_events, functions (calculate_attribution, detect_anomaly, notify_analytics_event)
-- Extensions uuid-ossp and pg_stat_statements are NOT dropped as they may be used by other migrations

-- Drop partitioned table first (cascades to partitions)
DROP TABLE IF EXISTS canonical_events CASCADE;

-- Drop regular tables in reverse order
DROP TABLE IF EXISTS analytics_audit_events CASCADE;
DROP TABLE IF EXISTS funnel_analysis CASCADE;
DROP TABLE IF EXISTS cohort_analysis CASCADE;
DROP TABLE IF EXISTS real_time_metrics CASCADE;
DROP TABLE IF EXISTS anomaly_alerts CASCADE;
DROP TABLE IF EXISTS experiment_results CASCADE;
DROP TABLE IF EXISTS experiments CASCADE;
DROP TABLE IF EXISTS attribution_models CASCADE;
DROP TABLE IF EXISTS conversions CASCADE;
DROP TABLE IF EXISTS attribution_touchpoints CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS calculate_attribution(UUID, VARCHAR);
DROP FUNCTION IF EXISTS detect_anomaly(UUID, VARCHAR, DECIMAL);
DROP FUNCTION IF EXISTS notify_analytics_event() CASCADE;
