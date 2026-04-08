-- Link social posts to campaign orchestration lifecycle

ALTER TABLE social_posts
  ADD COLUMN IF NOT EXISTS campaign_id UUID
  REFERENCES campaign_orchestrations(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_social_posts_campaign_id
  ON social_posts (campaign_id, status, created_at DESC);
