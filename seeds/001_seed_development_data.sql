-- Seed File: 001_seed_development_data.sql
-- Description: Development seed data for UBI-CMS
-- Created: 2026-03-26
-- WARNING: Only for development/testing environments!

\echo '==============================================='
\echo 'UBI-CMS Development Seed Data'
\echo 'Loading test data...'
\echo '==============================================='

BEGIN;

-- Disable Row Level Security for seeding
SET session_replication_role = replica;

-- ============================================
-- TENANTS
-- ============================================
\echo 'Seeding tenants...'

INSERT INTO tenants (id, slug, name, plan, status, settings) VALUES
(1, 'acme-corp', 'ACME Corporation', 'enterprise', 'active', '{"features": ["ubi", "tasks", "governance", "treasury"], "limits": {"users": 1000, "pools": 10}}'),
(2, 'demo-community', 'Demo Community', 'professional', 'active', '{"features": ["ubi", "tasks"], "limits": {"users": 100, "pools": 3}}'),
(3, 'startup-inc', 'Startup Inc', 'starter', 'trial', '{"features": ["ubi"], "limits": {"users": 50, "pools": 1}}');

SELECT setval('tenants_id_seq', 3, true);

-- ============================================
-- USERS
-- ============================================
\echo 'Seeding users...'

-- Password: password123 (hashed with bcrypt)
INSERT INTO users (id, tenant_id, username, email, password_hash, status, metadata) VALUES
(1, 1, 'admin', 'admin@acme-corp.test', '$2a$10$JQGlN8xqr.JmB9jVV4gVPuWxCJZqSQKxB/r0qQqH5vZmq6jZJqT8S', 'active', '{"firstName": "Admin", "lastName": "User", "role": "admin"}'),
(2, 1, 'alice', 'alice@acme-corp.test', '$2a$10$JQGlN8xqr.JmB9jVV4gVPuWxCJZqSQKxB/r0qQqH5vZmq6jZJqT8S', 'active', '{"firstName": "Alice", "lastName": "Johnson"}'),
(3, 1, 'bob', 'bob@acme-corp.test', '$2a$10$JQGlN8xqr.JmB9jVV4gVPuWxCJZqSQKxB/r0qQqH5vZmq6jZJqT8S', 'active', '{"firstName": "Bob", "lastName": "Smith"}'),
(4, 2, 'demo-admin', 'admin@demo-community.test', '$2a$10$JQGlN8xqr.JmB9jVV4gVPuWxCJZqSQKxB/r0qQqH5vZmq6jZJqT8S', 'active', '{"firstName": "Demo", "lastName": "Admin"}'),
(5, 2, 'charlie', 'charlie@demo-community.test', '$2a$10$JQGlN8xqr.JmB9jVV4gVPuWxCJZqSQKxB/r0qQqH5vZmq6jZJqT8S', 'active', '{"firstName": "Charlie", "lastName": "Brown"}');

SELECT setval('users_id_seq', 5, true);

-- ============================================
-- USER ROLES
-- ============================================
\echo 'Seeding user roles...'

INSERT INTO user_roles (user_id, role, tenant_id) VALUES
(1, 'owner', 1),
(1, 'admin', 1),
(2, 'member', 1),
(3, 'member', 1),
(4, 'owner', 2),
(5, 'member', 2);

-- ============================================
-- SERVICE ACCOUNTS
-- ============================================
\echo 'Seeding service accounts...'

INSERT INTO service_accounts (id, tenant_id, name, type, scopes, credentials, created_by) VALUES
(1, 1, 'API Integration', 'api', ARRAY['read:users', 'write:tasks'], '{"apiKey": "sk_test_1234567890"}', 1),
(2, 1, 'Task Bot', 'bot', ARRAY['read:tasks', 'write:submissions'], '{"webhookUrl": "https://example.com/webhook"}', 1);

SELECT setval('service_accounts_id_seq', 2, true);

-- ============================================
-- LEDGER ACCOUNTS
-- ============================================
\echo 'Seeding ledger accounts...'

INSERT INTO ledger_accounts (id, tenant_id, account_number, account_name, account_type, currency, balance) VALUES
(1, 1, '1000', 'Cash', 'asset', 'USD', 50000.00),
(2, 1, '2000', 'UBI Pool Liability', 'liability', 'USD', 0.00),
(3, 1, '3000', 'Equity', 'equity', 'USD', 50000.00),
(4, 1, '4000', 'UBI Distribution Revenue', 'revenue', 'USD', 0.00),
(5, 1, '5000', 'Operating Expenses', 'expense', 'USD', 0.00);

SELECT setval('ledger_accounts_id_seq', 5, true);

-- ============================================
-- UBI POOLS
-- ============================================
\echo 'Seeding UBI pools...'

INSERT INTO ubi_pools (id, tenant_id, name, description, pool_type, total_balance, distributed_amount, currency, rules, active) VALUES
(1, 1, 'Universal Basic Income Pool', 'Main UBI pool for all active members', 'universal', 25000.00, 5000.00, 'USD', '{"distribution_frequency": "monthly", "base_amount": 500}', true),
(2, 1, 'Task Completion Bonus Pool', 'Rewards for completing tasks', 'task_based', 10000.00, 2000.00, 'USD', '{"multiplier": 1.5}', true),
(3, 2, 'Community UBI Pool', 'Community basic income', 'universal', 5000.00, 1000.00, 'USD', '{"distribution_frequency": "weekly", "base_amount": 100}', true);

SELECT setval('ubi_pools_id_seq', 3, true);

-- ============================================
-- UBI RULES
-- ============================================
\echo 'Seeding UBI rules...'

INSERT INTO ubi_rules (id, tenant_id, pool_id, name, rule_type, weight, conditions, active, priority) VALUES
(1, 1, 1, 'Active User Eligibility', 'eligibility', 1.0, '{"min_activity_days": 30}', true, 1),
(2, 1, 1, 'Contribution Bonus', 'amount_calculation', 0.5, '{"task_completion_bonus": 50}', true, 2),
(3, 1, 2, 'Task Difficulty Multiplier', 'amount_calculation', 1.0, '{"expert": 2.0, "advanced": 1.5, "intermediate": 1.2}', true, 1);

SELECT setval('ubi_rules_id_seq', 3, true);

-- ============================================
-- UBI ELIGIBILITY
-- ============================================
\echo 'Seeding UBI eligibility...'

INSERT INTO ubi_eligibility (user_id, tenant_id, pool_id, eligible, score, activity_level, contribution_score, next_distribution_at) VALUES
(2, 1, 1, true, 85.5, 'high', 120.0, NOW() + INTERVAL '7 days'),
(3, 1, 1, true, 72.3, 'medium', 85.5, NOW() + INTERVAL '7 days'),
(5, 2, 3, true, 65.0, 'medium', 50.0, NOW() + INTERVAL '7 days');

-- ============================================
-- TREASURY STRATEGIES
-- ============================================
\echo 'Seeding treasury strategies...'

INSERT INTO treasury_strategies (id, tenant_id, name, description, strategy_type, target_apy, risk_level, active) VALUES
(1, 1, 'Conservative Yield', 'Low-risk stable yield strategy', 'conservative', 0.05, 'low', true),
(2, 1, 'Balanced Growth', 'Medium-risk balanced strategy', 'moderate', 0.12, 'medium', true),
(3, 1, 'Aggressive DeFi', 'High-risk DeFi yield farming', 'yield_farming', 0.35, 'high', true);

SELECT setval('treasury_strategies_id_seq', 3, true);

-- ============================================
-- TREASURY VAULTS
-- ============================================
\echo 'Seeding treasury vaults...'

INSERT INTO treasury_vaults (id, tenant_id, name, vault_type, balance, currency, strategy_id, minimum_balance) VALUES
(1, 1, 'Operational Vault', 'operational', 15000.00, 'USD', 1, 5000.00),
(2, 1, 'Reserve Vault', 'reserve', 30000.00, 'USD', 1, 10000.00),
(3, 1, 'Investment Vault', 'investment', 20000.00, 'USD', 2, 0.00);

SELECT setval('treasury_vaults_id_seq', 3, true);

-- ============================================
-- TASK CATEGORIES
-- ============================================
\echo 'Seeding task categories...'

INSERT INTO task_categories (id, tenant_id, name, slug, description) VALUES
(1, 1, 'Development', 'development', 'Software development tasks'),
(2, 1, 'Design', 'design', 'UI/UX design tasks'),
(3, 1, 'Content', 'content', 'Content creation tasks'),
(4, 1, 'Marketing', 'marketing', 'Marketing and promotion tasks');

SELECT setval('task_categories_id_seq', 4, true);

-- ============================================
-- SKILLS
-- ============================================
\echo 'Seeding skills...'

INSERT INTO skills (id, tenant_id, name, slug, category_id) VALUES
(1, 1, 'JavaScript', 'javascript', 1),
(2, 1, 'Python', 'python', 1),
(3, 1, 'React', 'react', 1),
(4, 1, 'Figma', 'figma', 2),
(5, 1, 'Copywriting', 'copywriting', 3);

SELECT setval('skills_id_seq', 5, true);

-- ============================================
-- TASKS
-- ============================================
\echo 'Seeding tasks...'

INSERT INTO tasks (id, tenant_id, category_id, title, description, difficulty, reward_amount, status, created_by, proof_required) VALUES
(1, 1, 1, 'Build API Endpoint', 'Create REST API endpoint for user authentication', 'intermediate', 150.00, 'open', 1, true),
(2, 1, 2, 'Design Dashboard UI', 'Design modern dashboard UI mockup in Figma', 'advanced', 200.00, 'open', 1, true),
(3, 1, 3, 'Write Blog Post', 'Write a 1000-word blog post about UBI', 'beginner', 50.00, 'assigned', 1, true);

SELECT setval('tasks_id_seq', 3, true);

-- ============================================
-- ACHIEVEMENTS
-- ============================================
\echo 'Seeding achievements...'

INSERT INTO achievements (id, tenant_id, name, slug, description, points, reward_amount, active) VALUES
(1, 1, 'First Task', 'first-task', 'Complete your first task', 10, 25.00, true),
(2, 1, 'Task Master', 'task-master', 'Complete 10 tasks', 50, 100.00, true),
(3, 1, 'Early Adopter', 'early-adopter', 'Join in the first month', 25, 50.00, true);

SELECT setval('achievements_id_seq', 3, true);

-- ============================================
-- REPUTATION SCORES
-- ============================================
\echo 'Seeding reputation scores...'

INSERT INTO reputation_scores (user_id, tenant_id, overall_score, trust_index, completion_rate, quality_score) VALUES
(2, 1, 85.5, 0.92, 0.95, 0.88),
(3, 1, 72.3, 0.85, 0.80, 0.75),
(5, 2, 68.0, 0.80, 0.85, 0.70);

-- ============================================
-- GOVERNANCE CONFIG
-- ============================================
\echo 'Seeding governance config...'

INSERT INTO governance_config (id, tenant_id, voting_mechanism, quorum, approval_threshold, execution_delay_hours, voting_period_hours) VALUES
(1, 1, 'simple_majority', 0.10, 0.51, 48, 168),
(2, 2, 'simple_majority', 0.15, 0.60, 24, 72);

SELECT setval('governance_config_id_seq', 2, true);

-- ============================================
-- PROPOSALS
-- ============================================
\echo 'Seeding proposals...'

INSERT INTO proposals (id, tenant_id, proposer_id, title, description, proposal_type, status, voting_starts_at, voting_ends_at) VALUES
(1, 1, 1, 'Increase UBI Base Amount', 'Proposal to increase the base UBI amount from $500 to $600 per month', 'parameter_change', 'active', NOW(), NOW() + INTERVAL '7 days'),
(2, 1, 2, 'New Task Category', 'Add a new task category for community management', 'feature_request', 'draft', NULL, NULL);

SELECT setval('proposals_id_seq', 2, true);

-- ============================================
-- AGENTS
-- ============================================
\echo 'Seeding agents...'

INSERT INTO agents (id, owner_id, tenant_id, name, description, agent_type, status, capabilities, deployed_at) VALUES
(1, 1, 1, 'Task Analyzer', 'Analyzes task complexity and suggests rewards', 'analyst', 'active', '["task_analysis", "reward_calculation"]', NOW()),
(2, 2, 1, 'Content Moderator', 'Moderates user-generated content', 'moderator', 'active', '["content_moderation", "spam_detection"]', NOW());

SELECT setval('agents_id_seq', 2, true);

-- ============================================
-- NOTIFICATIONS
-- ============================================
\echo 'Seeding notifications...'

INSERT INTO notifications (user_id, tenant_id, notification_type, priority, title, message, read, read_at) VALUES
(2, 1, 'task', 'medium', 'New Task Available', 'A new task matching your skills is available', false, NULL),
(2, 1, 'reward', 'high', 'UBI Payment Received', 'You received $500 UBI payment', true, NOW()),
(3, 1, 'governance', 'medium', 'New Proposal', 'Vote on the new UBI increase proposal', false, NULL);

-- Re-enable Row Level Security
SET session_replication_role = DEFAULT;

COMMIT;

\echo ''
\echo '==============================================='
\echo 'Seed data loaded successfully!'
\echo '==============================================='
\echo ''
\echo 'Test Users:'
\echo '  admin@acme-corp.test (password: password123)'
\echo '  alice@acme-corp.test (password: password123)'
\echo '  bob@acme-corp.test (password: password123)'
\echo ''
\echo 'Tenants:'
\echo '  1: acme-corp (Enterprise)'
\echo '  2: demo-community (Professional)'
\echo '  3: startup-inc (Starter - Trial)'
\echo ''
