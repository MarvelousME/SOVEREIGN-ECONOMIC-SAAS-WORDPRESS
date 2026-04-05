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
