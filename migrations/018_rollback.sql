-- Rollback for Migration 018: agent_control_plane_schema
-- Reverses: agent_missions, agent_tasks, agent_artifacts, agent_approvals, agent_rollback_tokens,
--            agent_tool_permissions, agent_policy_rules, agent_execution_logs, agent_events,
--            agent_memory_context, agent_dry_runs

-- Drop tables in reverse order of creation (respecting foreign key dependencies)
DROP TABLE IF EXISTS agent_dry_runs CASCADE;
DROP TABLE IF EXISTS agent_memory_context CASCADE;
DROP TABLE IF EXISTS agent_events CASCADE;
DROP TABLE IF EXISTS agent_execution_logs CASCADE;
DROP TABLE IF EXISTS agent_policy_rules CASCADE;
DROP TABLE IF EXISTS agent_tool_permissions CASCADE;
DROP TABLE IF EXISTS agent_rollback_tokens CASCADE;
DROP TABLE IF EXISTS agent_approvals CASCADE;
DROP TABLE IF EXISTS agent_artifacts CASCADE;
DROP TABLE IF EXISTS agent_tasks CASCADE;
DROP TABLE IF EXISTS agent_missions CASCADE;
