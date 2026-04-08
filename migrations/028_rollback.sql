-- Rollback for Migration 028: social_posts_campaign_link
-- Reverses: ADD COLUMN campaign_id to social_posts

-- Drop index
DROP INDEX IF EXISTS idx_social_posts_campaign_id;

-- Drop column
ALTER TABLE social_posts
    DROP COLUMN IF EXISTS campaign_id;
