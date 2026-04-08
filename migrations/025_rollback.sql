-- Rollback for Migration 025: social_distribution_schema
-- Reverses: social_accounts, social_oauth_states, social_posts, social_post_attempts

-- Drop tables in reverse order of creation (respecting foreign key dependencies)
DROP TABLE IF EXISTS social_post_attempts CASCADE;
DROP TABLE IF EXISTS social_posts CASCADE;
DROP TABLE IF EXISTS social_oauth_states CASCADE;
DROP TABLE IF EXISTS social_accounts CASCADE;
