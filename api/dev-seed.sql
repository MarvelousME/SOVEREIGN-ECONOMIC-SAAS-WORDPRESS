-- UBI-CMS Development Seed Data
-- Run AFTER dev-schema.sql; dev-patch.sql runs next (docker-compose.dev / local / swarm).
-- Creates: admin user, sample users, tasks, strategies, agents
-- Demo user password: Demo@Platform1 (matches frontend portal-ui src/lib/demo.ts)

-- ===================================
-- Admin user (password: Admin@123456)
-- The hash below is bcrypt of 'Admin@123456' with 12 rounds
-- ===================================
INSERT INTO users (username, email, password_hash, roles, status) VALUES
('admin', 'admin@ubi-cms.dev', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeAEZ7CfMFmEBUwS2', ARRAY['admin', 'subscriber'], 'active'),
('alice', 'alice@ubi-cms.dev', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeAEZ7CfMFmEBUwS2', ARRAY['subscriber'], 'active'),
('bob', 'bob@ubi-cms.dev', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeAEZ7CfMFmEBUwS2', ARRAY['subscriber'], 'active'),
('demo', 'demo@ubi-cms.dev', '$2b$12$xB3eGveGduf3IuIgZdP6pupTWF3KJbzMA3VzgJ5JeYsddNXEE4rhm', ARRAY['subscriber'], 'active')
ON CONFLICT (username) DO NOTHING;

-- ===================================
-- Treasury strategies
-- ===================================
INSERT INTO treasury_strategies (name, description, apy, risk_level, protocol, min_deposit) VALUES
('Safe Savings', 'Low-risk stablecoin yield via Aave', 4.50, 'low', 'Aave v3', 10),
('Balanced Growth', 'Mixed portfolio across DeFi protocols', 8.20, 'medium', 'Compound + Curve', 50),
('High Yield', 'Aggressive yield farming strategy', 15.80, 'high', 'Yearn Finance', 100),
('UBI Reserve', 'Platform reserve fund - funds UBI distributions', 3.20, 'low', 'Platform', 0)
ON CONFLICT DO NOTHING;

-- ===================================
-- Sample tasks
-- ===================================
INSERT INTO tasks (title, description, category, difficulty, reward_amount, reward_currency, max_participants, status, proof_requirements, created_by)
SELECT
    'Write a Blog Post',
    'Create a 500-word blog post about Universal Basic Income. Include your personal perspective and at least 2 cited sources.',
    'content',
    'easy',
    50.00,
    'UBI',
    10,
    'active',
    '{"required": ["link", "word_count"], "min_word_count": 500}',
    u.id
FROM users u WHERE u.username = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO tasks (title, description, category, difficulty, reward_amount, reward_currency, max_participants, status, proof_requirements, created_by)
SELECT
    'Translate Platform Documentation',
    'Translate 2 pages of platform documentation into Spanish, French, or Portuguese. Native speakers preferred.',
    'translation',
    'medium',
    120.00,
    'UBI',
    5,
    'active',
    '{"required": ["translated_document", "language"], "verified_by": "native_speaker"}',
    u.id
FROM users u WHERE u.username = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO tasks (title, description, category, difficulty, reward_amount, reward_currency, max_participants, status, proof_requirements, created_by)
SELECT
    'Design a Logo Variant',
    'Create 3 alternative logo designs for the UBI Platform. Must be submitted as SVG files. Judged on creativity and brand alignment.',
    'design',
    'hard',
    300.00,
    'UBI',
    3,
    'active',
    '{"required": ["svg_files", "design_rationale"], "file_types": ["svg"]}',
    u.id
FROM users u WHERE u.username = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO tasks (title, description, category, difficulty, reward_amount, reward_currency, max_participants, status, proof_requirements, created_by)
SELECT
    'Test Mobile App on Android',
    'Test the UBI mobile app on Android 12+ device. Submit a bug report with screenshots for any issues found.',
    'testing',
    'easy',
    30.00,
    'UBI',
    20,
    'active',
    '{"required": ["bug_report", "device_info", "screenshots"]}',
    u.id
FROM users u WHERE u.username = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO tasks (title, description, category, difficulty, reward_amount, reward_currency, max_participants, status, proof_requirements, created_by)
SELECT
    'Build a UBI Calculator Tool',
    'Create a web-based UBI impact calculator. Must include source code on GitHub. React or Vue preferred.',
    'development',
    'expert',
    500.00,
    'UBI',
    1,
    'active',
    '{"required": ["github_url", "live_demo_url", "documentation"]}',
    u.id
FROM users u WHERE u.username = 'admin'
ON CONFLICT DO NOTHING;

-- ===================================
-- Sample agents
-- ===================================
INSERT INTO agents (owner_id, name, description, capability, endpoint, pricing_model, price_per_call, status)
SELECT
    u.id,
    'UBI Advisor Bot',
    'AI agent that answers questions about UBI eligibility, distribution schedules, and platform features.',
    'qa',
    'https://agents.ubi-cms.dev/ubi-advisor',
    'free',
    0,
    'active'
FROM users u WHERE u.username = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO agents (owner_id, name, description, capability, endpoint, pricing_model, price_per_call, status)
SELECT
    u.id,
    'Task Matcher',
    'Matches users to tasks based on their skills, availability, and reward preferences.',
    'matching',
    'https://agents.ubi-cms.dev/task-matcher',
    'per_call',
    0.50,
    'active'
FROM users u WHERE u.username = 'admin'
ON CONFLICT DO NOTHING;

-- ===================================
-- Seed summary
-- ===================================
DO $$
BEGIN
    RAISE NOTICE 'Seed complete. Users: %, Tasks: %, Strategies: %, Agents: %',
        (SELECT COUNT(*) FROM users),
        (SELECT COUNT(*) FROM tasks),
        (SELECT COUNT(*) FROM treasury_strategies),
        (SELECT COUNT(*) FROM agents);
    RAISE NOTICE 'Login: admin / Admin@123456 | demo / Demo@Platform1 | alice, bob / Admin@123456';
END $$;
