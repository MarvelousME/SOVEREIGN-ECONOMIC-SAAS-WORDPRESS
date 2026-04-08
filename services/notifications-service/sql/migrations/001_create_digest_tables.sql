-- Digest Preferences Table
CREATE TABLE IF NOT EXISTS digest_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  digest_frequency VARCHAR(20) NOT NULL DEFAULT 'immediate' CHECK (digest_frequency IN ('immediate', 'daily', 'weekly')),
  digest_day INTEGER NOT NULL DEFAULT 0 CHECK (digest_day >= 0 AND digest_day <= 6),
  digest_time VARCHAR(5) NOT NULL DEFAULT '09:00',
  last_digest_sent_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX idx_digest_preferences_user ON digest_preferences(user_id);
CREATE INDEX idx_digest_preferences_tenant ON digest_preferences(tenant_id);
CREATE INDEX idx_digest_preferences_frequency ON digest_preferences(digest_frequency);

-- Pending Notifications Table (for digest queuing)
CREATE TABLE IF NOT EXISTS pending_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  batch_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  channel VARCHAR(20) NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pending_notifications_user ON pending_notifications(user_id);
CREATE INDEX idx_pending_notifications_tenant ON pending_notifications(tenant_id);
CREATE INDEX idx_pending_notifications_batch ON pending_notifications(batch_id);
CREATE INDEX idx_pending_notifications_created ON pending_notifications(created_at);