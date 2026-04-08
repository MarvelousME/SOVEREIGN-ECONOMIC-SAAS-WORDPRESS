-- Idempotent patches (run on every dev startup). Safe for existing DBs.
-- Marketplace apps, installs, notifications, extra seed users.

CREATE TABLE IF NOT EXISTS marketplace_apps (
    id BIGSERIAL PRIMARY KEY,
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    publisher_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'general',
    version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    manifest JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_apps_status ON marketplace_apps(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_apps_publisher ON marketplace_apps(publisher_id);

CREATE TABLE IF NOT EXISTS user_app_installs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    app_id BIGINT NOT NULL REFERENCES marketplace_apps(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'installed' CHECK (status IN ('installed', 'active', 'disabled')),
    installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    activated_at TIMESTAMPTZ,
    UNIQUE(user_id, app_id)
);

CREATE INDEX IF NOT EXISTS idx_user_app_installs_user ON user_app_installs(user_id);

CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    type VARCHAR(50) NOT NULL DEFAULT 'info',
    read BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);

INSERT INTO users (username, email, password_hash, roles, status) VALUES
('developer', 'developer@ubi-cms.dev', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeAEZ7CfMFmEBUwS2', ARRAY['developer','subscriber']::text[], 'active'),
('moduser', 'moduser@ubi-cms.dev', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeAEZ7CfMFmEBUwS2', ARRAY['moderator','subscriber']::text[], 'active')
ON CONFLICT (username) DO NOTHING;

INSERT INTO marketplace_apps (slug, name, description, publisher_id, category, version, status, manifest)
SELECT 'ubi-insights', 'UBI Insights', 'Dashboard widgets for UBI distribution analytics.', u.id, 'analytics', '1.2.0', 'published', '{"entry":"/widgets/insights"}'::jsonb
FROM users u WHERE u.username = 'developer' LIMIT 1
ON CONFLICT (slug) DO NOTHING;

INSERT INTO marketplace_apps (slug, name, description, publisher_id, category, version, status, manifest)
SELECT 'task-boost', 'Task Boost', 'Prioritize high-value tasks in your feed.', u.id, 'productivity', '0.9.1', 'published', '{"entry":"/boost"}'::jsonb
FROM users u WHERE u.username = 'developer' LIMIT 1
ON CONFLICT (slug) DO NOTHING;

INSERT INTO marketplace_apps (slug, name, description, publisher_id, category, version, status, manifest)
SELECT 'treasury-alerts', 'Treasury Alerts', 'Push alerts for treasury yield changes (draft).', u.id, 'finance', '0.1.0', 'draft', '{}'::jsonb
FROM users u WHERE u.username = 'developer' LIMIT 1
ON CONFLICT (slug) DO NOTHING;

INSERT INTO notifications (user_id, title, body, type, read)
SELECT u.id, 'Welcome to UBI Platform', 'Your account is ready. Claim daily UBI from the dashboard.', 'info', false
FROM users u
WHERE u.username = 'demo'
  AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.user_id = u.id AND n.title = 'Welcome to UBI Platform')
LIMIT 1;

INSERT INTO notifications (user_id, title, body, type, read)
SELECT u.id, 'New task in your category', 'A translation task matching your profile is now live.', 'task', false
FROM users u
WHERE u.username = 'alice'
  AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.user_id = u.id AND n.title = 'New task in your category')
LIMIT 1;

INSERT INTO notifications (user_id, title, body, type, read)
SELECT u.id, 'Platform maintenance', 'Scheduled window Sun 02:00–04:00 UTC.', 'system', true
FROM users u
WHERE u.username = 'admin'
  AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.user_id = u.id AND n.title = 'Platform maintenance')
LIMIT 1;

INSERT INTO notifications (user_id, title, body, type, read)
SELECT u.id, 'App review: Task Boost', 'Your submission passed automated checks. Pending moderator review.', 'info', false
FROM users u
WHERE u.username = 'developer'
  AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.user_id = u.id AND n.title = 'App review: Task Boost')
LIMIT 1;

INSERT INTO notifications (user_id, title, body, type, read)
SELECT u.id, 'Moderation queue', '12 items need review in the task marketplace.', 'task', false
FROM users u
WHERE u.username = 'moduser'
  AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.user_id = u.id AND n.title = 'Moderation queue')
LIMIT 1;

-- =============================================================================
-- Demo mode: align DB with portal demo persona + link previously empty tables
-- Idempotent: safe to re-run (guards / ON CONFLICT).
-- Password must match frontend/portal-ui/src/lib/demo.ts (DEMO_PASSWORD).
-- =============================================================================

UPDATE users
SET password_hash = '$2b$12$xB3eGveGduf3IuIgZdP6pupTWF3KJbzMA3VzgJ5JeYsddNXEE4rhm'
WHERE username = 'demo';

INSERT INTO treasury_accounts (user_id, balance, currency)
SELECT id, 5820.50000000, 'UBI'
FROM users
WHERE username = 'demo'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO treasury_transactions (user_id, type, amount, currency, balance_after, status, metadata)
SELECT u.id, v.typ, v.amt, 'UBI', v.bal_after, 'completed', v.meta::jsonb
FROM users u
CROSS JOIN (VALUES
  ('deposit', 3000::numeric, 3000::numeric, '{"seed":"demo","note":"Initial deposit"}'),
  ('ubi_credit', 500::numeric, 3500::numeric, '{"seed":"demo"}'),
  ('task_reward', 50::numeric, 3550::numeric, '{"seed":"demo"}'),
  ('deposit', 2270.5::numeric, 5820.5::numeric, '{"seed":"demo","note":"Top-up"}')
) AS v(typ, amt, bal_after, meta)
WHERE u.username = 'demo'
  AND NOT EXISTS (SELECT 1 FROM treasury_transactions t WHERE t.user_id = u.id);

INSERT INTO rewards (user_id, amount, currency, type, source_type, source_id, status, processed_at)
SELECT u.id, r.amt, 'UBI', r.typ, r.src, r.sid, 'completed', r.ts
FROM users u
CROSS JOIN (VALUES
  (100::numeric, 'ubi_distribution', 'ubi_engine', NULL::bigint, NOW() - INTERVAL '7 days'),
  (100::numeric, 'ubi_distribution', 'ubi_engine', NULL::bigint, NOW() - INTERVAL '6 days'),
  (100::numeric, 'ubi_distribution', 'ubi_engine', NULL::bigint, NOW() - INTERVAL '5 days'),
  (75::numeric, 'task_reward', 'task', NULL::bigint, NOW() - INTERVAL '3 days'),
  (50::numeric, 'bonus', 'platform', NULL::bigint, NOW() - INTERVAL '1 day')
) AS r(amt, typ, src, sid, ts)
WHERE u.username = 'demo'
  AND NOT EXISTS (SELECT 1 FROM rewards x WHERE x.user_id = u.id);

INSERT INTO task_assignments (task_id, user_id, status, proof_data)
SELECT t.id, u.id, 'assigned', '{}'::jsonb
FROM tasks t
JOIN users u ON u.username = 'demo'
WHERE t.title = 'Test Mobile App on Android'
  AND NOT EXISTS (
    SELECT 1 FROM task_assignments ta WHERE ta.task_id = t.id AND ta.user_id = u.id
  );

INSERT INTO task_assignments (task_id, user_id, status, proof_data, submitted_at, verified_by, verified_at, reward_distributed)
SELECT t.id, du.id, 'approved',
  '{"link":"https://example.com/demo-blog-proof","word_count":520}'::jsonb,
  NOW() - INTERVAL '3 days',
  adm.id,
  NOW() - INTERVAL '2 days',
  true
FROM tasks t
JOIN users du ON du.username = 'demo'
JOIN users adm ON adm.username = 'admin'
WHERE t.title = 'Write a Blog Post'
  AND NOT EXISTS (
    SELECT 1 FROM task_assignments ta WHERE ta.task_id = t.id AND ta.user_id = du.id
  );

INSERT INTO task_assignments (task_id, user_id, status, proof_data, submitted_at)
SELECT t.id, u.id, 'submitted',
  '{"translated_document":"https://example.com/demo-es.pdf","language":"es"}'::jsonb,
  NOW() - INTERVAL '1 day'
FROM tasks t
JOIN users u ON u.username = 'alice'
WHERE t.title = 'Translate Platform Documentation'
  AND NOT EXISTS (
    SELECT 1 FROM task_assignments ta WHERE ta.task_id = t.id AND ta.user_id = u.id
  );

UPDATE tasks t
SET current_participants = (
  SELECT COUNT(*)::int FROM task_assignments ta WHERE ta.task_id = t.id
)
WHERE EXISTS (SELECT 1 FROM task_assignments ta WHERE ta.task_id = t.id);

INSERT INTO agent_executions (agent_id, user_id, input_data, output_data, status, duration_ms, cost, completed_at)
SELECT a.id, u.id,
  '{"question":"Am I eligible for UBI?"}'::jsonb,
  '{"answer":"Yes — complete your profile and claim from the dashboard."}'::jsonb,
  'completed', 95, 0, NOW() - INTERVAL '2 hours'
FROM agents a
JOIN users u ON u.username = 'demo'
WHERE a.name = 'UBI Advisor Bot'
  AND NOT EXISTS (
    SELECT 1 FROM agent_executions e WHERE e.agent_id = a.id AND e.user_id = u.id
  );

INSERT INTO agent_executions (agent_id, user_id, input_data, output_data, status, duration_ms, cost, completed_at)
SELECT a.id, u.id,
  '{"skills":["react","typescript"]}'::jsonb,
  '{"matches":[{"task_id":1,"score":0.92}]}'::jsonb,
  'completed', 210, 0.50, NOW() - INTERVAL '1 day'
FROM agents a
JOIN users u ON u.username = 'demo'
WHERE a.name = 'Task Matcher'
  AND NOT EXISTS (
    SELECT 1 FROM agent_executions e
    WHERE e.agent_id = a.id AND e.user_id = u.id AND e.cost = 0.50
  );

INSERT INTO user_app_installs (user_id, app_id, status, activated_at)
SELECT u.id, m.id, 'active', NOW() - INTERVAL '5 days'
FROM users u
JOIN marketplace_apps m ON m.slug IN ('ubi-insights', 'task-boost')
WHERE u.username = 'demo'
ON CONFLICT (user_id, app_id) DO NOTHING;
