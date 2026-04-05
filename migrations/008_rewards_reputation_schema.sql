-- Migration: Rewards Engine and Reputation Service Schema
-- Version: 008
-- Description: Database schema for rewards calculation and reputation scoring

-- ============================================================================
-- REWARDS ENGINE TABLES
-- ============================================================================

-- Rewards table
CREATE TABLE IF NOT EXISTS rewards (
    reward_id UUID PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    source VARCHAR(50) NOT NULL, -- TASK_COMPLETION, REFERRAL, AGENT_REVENUE, etc.
    base_amount DECIMAL(20, 2) NOT NULL,
    reputation_multiplier DECIMAL(5, 3) DEFAULT 1.000,
    loyalty_multiplier DECIMAL(5, 3) DEFAULT 1.000,
    staking_multiplier DECIMAL(5, 3) DEFAULT 1.000,
    volume_multiplier DECIMAL(5, 3) DEFAULT 1.000,
    total_multiplier DECIMAL(5, 3) NOT NULL,
    final_amount DECIMAL(20, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    metadata JSONB,
    calculated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    distributed_at TIMESTAMP,
    claimed_at TIMESTAMP,
    transaction_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    INDEX idx_rewards_user_id (user_id),
    INDEX idx_rewards_status (status),
    INDEX idx_rewards_source (source),
    INDEX idx_rewards_calculated_at (calculated_at)
);

-- Referral rewards table
CREATE TABLE IF NOT EXISTS referral_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id VARCHAR(255) NOT NULL,
    referee_id VARCHAR(255) NOT NULL,
    tier INT NOT NULL, -- 1, 2, 3
    percentage DECIMAL(5, 2) NOT NULL,
    amount DECIMAL(20, 2) NOT NULL,
    reward_id UUID REFERENCES rewards(reward_id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    INDEX idx_referral_rewards_referrer (referrer_id),
    INDEX idx_referral_rewards_referee (referee_id),
    INDEX idx_referral_rewards_tier (tier)
);

-- Agent revenue shares table
CREATE TABLE IF NOT EXISTS agent_revenue_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id VARCHAR(255) NOT NULL,
    creator_id VARCHAR(255) NOT NULL,
    sale_amount DECIMAL(20, 2) NOT NULL,
    creator_share_percentage DECIMAL(5, 2) NOT NULL,
    platform_fee_percentage DECIMAL(5, 2) NOT NULL,
    creator_reward DECIMAL(20, 2) NOT NULL,
    reward_id UUID REFERENCES rewards(reward_id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    INDEX idx_agent_revenue_agent (agent_id),
    INDEX idx_agent_revenue_creator (creator_id)
);

-- Reward pools table
CREATE TABLE IF NOT EXISTS reward_pools (
    pool_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(50) NOT NULL,
    total_allocated DECIMAL(20, 2) NOT NULL,
    total_distributed DECIMAL(20, 2) DEFAULT 0,
    remaining DECIMAL(20, 2) NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    INDEX idx_reward_pools_source (source),
    INDEX idx_reward_pools_active (is_active)
);

-- Reward distributions table
CREATE TABLE IF NOT EXISTS reward_distributions (
    distribution_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    total_amount DECIMAL(20, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'UBI',
    distributed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    transaction_id UUID NOT NULL,
    metadata JSONB,
    INDEX idx_reward_distributions_user (user_id),
    INDEX idx_reward_distributions_transaction (transaction_id)
);

-- ============================================================================
-- REPUTATION SERVICE TABLES
-- ============================================================================

-- Reputation scores table
CREATE TABLE IF NOT EXISTS reputation_scores (
    user_id VARCHAR(255) PRIMARY KEY,
    overall_score INT NOT NULL DEFAULT 0 CHECK (overall_score >= 0 AND overall_score <= 1000),
    trust_index INT NOT NULL DEFAULT 0 CHECK (trust_index >= 0 AND trust_index <= 100),
    level VARCHAR(20) NOT NULL DEFAULT 'NEWCOMER',
    task_score DECIMAL(6, 2) DEFAULT 0,
    quality_score DECIMAL(6, 2) DEFAULT 0,
    reliability_score DECIMAL(6, 2) DEFAULT 0,
    community_score DECIMAL(6, 2) DEFAULT 0,
    longevity_score DECIMAL(6, 2) DEFAULT 0,
    calculated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    INDEX idx_reputation_overall_score (overall_score DESC),
    INDEX idx_reputation_level (level),
    INDEX idx_reputation_trust_index (trust_index DESC)
);

-- Task metrics table
CREATE TABLE IF NOT EXISTS task_metrics (
    user_id VARCHAR(255) PRIMARY KEY,
    total_tasks INT DEFAULT 0,
    completed_tasks INT DEFAULT 0,
    approved_tasks INT DEFAULT 0,
    rejected_tasks INT DEFAULT 0,
    completion_rate DECIMAL(5, 2) DEFAULT 0,
    approval_rate DECIMAL(5, 2) DEFAULT 0,
    average_quality DECIMAL(5, 2) DEFAULT 0,
    on_time_delivery_rate DECIMAL(5, 2) DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Skill proficiencies table
CREATE TABLE IF NOT EXISTS skill_proficiencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    skill_id VARCHAR(255) NOT NULL,
    skill_name VARCHAR(255) NOT NULL,
    proficiency_level INT DEFAULT 0 CHECK (proficiency_level >= 0 AND proficiency_level <= 100),
    tasks_completed INT DEFAULT 0,
    average_rating DECIMAL(3, 2) DEFAULT 0,
    endorsements INT DEFAULT 0,
    last_validated TIMESTAMP,
    validated_by JSONB DEFAULT '[]',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, skill_id),
    INDEX idx_skill_proficiencies_user (user_id),
    INDEX idx_skill_proficiencies_skill (skill_id),
    INDEX idx_skill_proficiencies_level (proficiency_level DESC)
);

-- Referral metrics table
CREATE TABLE IF NOT EXISTS referral_metrics (
    user_id VARCHAR(255) PRIMARY KEY,
    total_referrals INT DEFAULT 0,
    active_referrals INT DEFAULT 0,
    referral_success_rate DECIMAL(5, 2) DEFAULT 0,
    referral_value DECIMAL(20, 2) DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Agent performance metrics table
CREATE TABLE IF NOT EXISTS agent_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    agent_id VARCHAR(255) NOT NULL,
    total_sales INT DEFAULT 0,
    revenue DECIMAL(20, 2) DEFAULT 0,
    average_rating DECIMAL(3, 2) DEFAULT 0,
    active_users INT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, agent_id),
    INDEX idx_agent_performance_user (user_id),
    INDEX idx_agent_performance_agent (agent_id)
);

-- Community endorsements table
CREATE TABLE IF NOT EXISTS community_endorsements (
    endorsement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endorser_id VARCHAR(255) NOT NULL,
    endorsee_id VARCHAR(255) NOT NULL,
    skill_id VARCHAR(255),
    message TEXT,
    weight DECIMAL(5, 3) DEFAULT 1.000,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    INDEX idx_endorsements_endorser (endorser_id),
    INDEX idx_endorsements_endorsee (endorsee_id),
    INDEX idx_endorsements_skill (skill_id)
);

-- Fraud alerts table
CREATE TABLE IF NOT EXISTS fraud_alerts (
    alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    detected_at TIMESTAMP NOT NULL DEFAULT NOW(),
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP,
    resolved_by VARCHAR(255),
    resolution_notes TEXT,
    INDEX idx_fraud_alerts_user (user_id),
    INDEX idx_fraud_alerts_type (alert_type),
    INDEX idx_fraud_alerts_severity (severity),
    INDEX idx_fraud_alerts_resolved (resolved)
);

-- Achievements table
CREATE TABLE IF NOT EXISTS achievements (
    achievement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    point_value INT DEFAULT 0,
    requirement JSONB NOT NULL,
    icon_url VARCHAR(512),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    INDEX idx_achievements_category (category)
);

-- User achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    achievement_id UUID REFERENCES achievements(achievement_id),
    unlocked_at TIMESTAMP NOT NULL DEFAULT NOW(),
    progress DECIMAL(5, 2) DEFAULT 0,
    UNIQUE(user_id, achievement_id),
    INDEX idx_user_achievements_user (user_id),
    INDEX idx_user_achievements_achievement (achievement_id)
);

-- Reputation history table
CREATE TABLE IF NOT EXISTS reputation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    score INT NOT NULL,
    change INT NOT NULL,
    reason VARCHAR(255) NOT NULL,
    metadata JSONB,
    INDEX idx_reputation_history_user (user_id),
    INDEX idx_reputation_history_timestamp (timestamp DESC)
);

-- Reputation stakes table
CREATE TABLE IF NOT EXISTS reputation_stakes (
    stake_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    amount DECIMAL(20, 2) NOT NULL,
    locked_until TIMESTAMP NOT NULL,
    multiplier_bonus DECIMAL(5, 3) DEFAULT 1.000,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    withdrawn_at TIMESTAMP,
    INDEX idx_reputation_stakes_user (user_id),
    INDEX idx_reputation_stakes_locked (locked_until)
);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE TRIGGER update_rewards_updated_at BEFORE UPDATE ON rewards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reward_pools_updated_at BEFORE UPDATE ON reward_pools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reputation_scores_updated_at BEFORE UPDATE ON reputation_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skill_proficiencies_updated_at BEFORE UPDATE ON skill_proficiencies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default achievements
INSERT INTO achievements (achievement_id, name, description, category, point_value, requirement) VALUES
    (gen_random_uuid(), 'First Task', 'Complete your first task', 'TASKS', 10, '{"tasks_completed": 1}'),
    (gen_random_uuid(), 'Task Master', 'Complete 100 tasks', 'TASKS', 100, '{"tasks_completed": 100}'),
    (gen_random_uuid(), 'Quality Pro', 'Maintain 95%+ quality rating', 'QUALITY', 150, '{"average_quality": 95}'),
    (gen_random_uuid(), 'Community Leader', 'Earn 50 endorsements', 'COMMUNITY', 120, '{"endorsements": 50}'),
    (gen_random_uuid(), 'Loyal Member', 'Active for 365 days', 'LONGEVITY', 200, '{"account_age_days": 365}'),
    (gen_random_uuid(), 'Referral King', 'Refer 25 active users', 'REFERRALS', 150, '{"active_referrals": 25}')
ON CONFLICT DO NOTHING;

-- Insert default reward pools
INSERT INTO reward_pools (pool_id, source, total_allocated, remaining, start_date, end_date, is_active) VALUES
    (gen_random_uuid(), 'TASK_COMPLETION', 1000000.00, 1000000.00, NOW(), NOW() + INTERVAL '90 days', true),
    (gen_random_uuid(), 'REFERRAL', 250000.00, 250000.00, NOW(), NOW() + INTERVAL '90 days', true),
    (gen_random_uuid(), 'LOYALTY_BONUS', 100000.00, 100000.00, NOW(), NOW() + INTERVAL '90 days', true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Leaderboard view
CREATE OR REPLACE VIEW reputation_leaderboard AS
SELECT 
    user_id,
    overall_score,
    level,
    trust_index,
    calculated_at,
    ROW_NUMBER() OVER (ORDER BY overall_score DESC, trust_index DESC) as rank
FROM reputation_scores
WHERE overall_score > 0
ORDER BY overall_score DESC
LIMIT 100;

-- User reward summary view
CREATE OR REPLACE VIEW user_reward_summary AS
SELECT 
    user_id,
    COUNT(*) as total_rewards,
    SUM(final_amount) as total_earned,
    SUM(CASE WHEN status = 'CLAIMED' THEN final_amount ELSE 0 END) as total_claimed,
    SUM(CASE WHEN status = 'PENDING' THEN final_amount ELSE 0 END) as total_pending,
    AVG(total_multiplier) as average_multiplier,
    MAX(calculated_at) as last_reward_date
FROM rewards
GROUP BY user_id;

COMMENT ON TABLE rewards IS 'Stores all calculated rewards with multipliers';
COMMENT ON TABLE reputation_scores IS 'Stores current reputation scores and components';
COMMENT ON TABLE fraud_alerts IS 'Tracks fraud detection alerts';
COMMENT ON VIEW reputation_leaderboard IS 'Top 100 users by reputation score';
