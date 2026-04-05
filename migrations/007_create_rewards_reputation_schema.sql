-- Migration: 007_create_rewards_reputation_schema.sql
-- Description: Create rewards and reputation tables
-- Created: 2026-03-26

-- Create enum types
CREATE TYPE reward_type AS ENUM ('ubi', 'task', 'referral', 'achievement', 'bonus', 'staking', 'governance');
CREATE TYPE reward_status AS ENUM ('pending', 'approved', 'paid', 'rejected', 'expired');
CREATE TYPE referral_status AS ENUM ('pending', 'active', 'converted', 'expired', 'cancelled');

-- Rewards table
CREATE TABLE rewards (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    reward_type reward_type NOT NULL,
    amount NUMERIC(20, 8) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    source_type VARCHAR(100),
    source_id BIGINT,
    status reward_status NOT NULL DEFAULT 'pending',
    description TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    ledger_transaction_id BIGINT REFERENCES ledger_transactions(id) ON DELETE SET NULL,
    approved_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    
    CONSTRAINT positive_amount CHECK (amount > 0)
);

-- Create indexes for rewards
CREATE INDEX idx_rewards_user_id ON rewards(user_id);
CREATE INDEX idx_rewards_tenant_id ON rewards(tenant_id);
CREATE INDEX idx_rewards_type ON rewards(reward_type);
CREATE INDEX idx_rewards_status ON rewards(status);
CREATE INDEX idx_rewards_source ON rewards(source_type, source_id);
CREATE INDEX idx_rewards_created_at ON rewards(created_at DESC);
CREATE INDEX idx_rewards_paid_at ON rewards(paid_at DESC);
CREATE INDEX idx_rewards_user_status ON rewards(user_id, status);
CREATE INDEX idx_rewards_metadata ON rewards USING GIN(metadata);

-- Reputation scores table
CREATE TABLE reputation_scores (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    overall_score NUMERIC(10, 4) NOT NULL DEFAULT 0,
    skill_scores JSONB NOT NULL DEFAULT '{}',
    trust_index NUMERIC(5, 4) NOT NULL DEFAULT 0,
    completion_rate NUMERIC(5, 4) NOT NULL DEFAULT 0,
    quality_score NUMERIC(5, 4) NOT NULL DEFAULT 0,
    response_time_score NUMERIC(5, 4) NOT NULL DEFAULT 0,
    community_score NUMERIC(5, 4) NOT NULL DEFAULT 0,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    history JSONB NOT NULL DEFAULT '[]',
    badges JSONB NOT NULL DEFAULT '[]',
    
    PRIMARY KEY (user_id, tenant_id),
    CONSTRAINT overall_score_range CHECK (overall_score >= 0 AND overall_score <= 100),
    CONSTRAINT trust_index_range CHECK (trust_index >= 0 AND trust_index <= 1),
    CONSTRAINT completion_rate_range CHECK (completion_rate >= 0 AND completion_rate <= 1),
    CONSTRAINT quality_score_range CHECK (quality_score >= 0 AND quality_score <= 1),
    CONSTRAINT response_time_range CHECK (response_time_score >= 0 AND response_time_score <= 1),
    CONSTRAINT community_score_range CHECK (community_score >= 0 AND community_score <= 1)
);

-- Create indexes for reputation_scores
CREATE INDEX idx_reputation_scores_user_id ON reputation_scores(user_id);
CREATE INDEX idx_reputation_scores_tenant_id ON reputation_scores(tenant_id);
CREATE INDEX idx_reputation_scores_overall ON reputation_scores(overall_score DESC);
CREATE INDEX idx_reputation_scores_trust ON reputation_scores(trust_index DESC);
CREATE INDEX idx_reputation_scores_calculated_at ON reputation_scores(calculated_at DESC);
CREATE INDEX idx_reputation_scores_skill_scores ON reputation_scores USING GIN(skill_scores);
CREATE INDEX idx_reputation_scores_badges ON reputation_scores USING GIN(badges);

-- Skill validations table
CREATE TABLE skill_validations (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id BIGINT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    validator_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    proof JSONB NOT NULL,
    score NUMERIC(5, 2) NOT NULL,
    notes TEXT,
    valid BOOLEAN NOT NULL DEFAULT true,
    validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    CONSTRAINT score_range CHECK (score >= 0 AND score <= 100)
);

-- Create indexes for skill_validations
CREATE INDEX idx_skill_validations_user_id ON skill_validations(user_id);
CREATE INDEX idx_skill_validations_skill_id ON skill_validations(skill_id);
CREATE INDEX idx_skill_validations_validator_id ON skill_validations(validator_id);
CREATE INDEX idx_skill_validations_valid ON skill_validations(valid);
CREATE INDEX idx_skill_validations_validated_at ON skill_validations(validated_at DESC);
CREATE INDEX idx_skill_validations_user_skill ON skill_validations(user_id, skill_id);
CREATE INDEX idx_skill_validations_proof ON skill_validations USING GIN(proof);

-- Referrals table
CREATE TABLE referrals (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    referrer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referee_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    referee_email VARCHAR(255),
    status referral_status NOT NULL DEFAULT 'pending',
    reward_amount NUMERIC(20, 8),
    referrer_reward_id BIGINT REFERENCES rewards(id) ON DELETE SET NULL,
    referee_reward_id BIGINT REFERENCES rewards(id) ON DELETE SET NULL,
    referral_code VARCHAR(100),
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    converted_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    
    CONSTRAINT reward_amount_positive CHECK (reward_amount IS NULL OR reward_amount > 0),
    CONSTRAINT unique_referral_code UNIQUE (referral_code)
);

-- Create indexes for referrals
CREATE INDEX idx_referrals_tenant_id ON referrals(tenant_id);
CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX idx_referrals_referee_id ON referrals(referee_id);
CREATE INDEX idx_referrals_status ON referrals(status);
CREATE INDEX idx_referrals_created_at ON referrals(created_at DESC);
CREATE INDEX idx_referrals_converted_at ON referrals(converted_at DESC);
CREATE INDEX idx_referrals_code ON referrals(referral_code);
CREATE INDEX idx_referrals_metadata ON referrals USING GIN(metadata);

-- Achievements table
CREATE TABLE achievements (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(255),
    category VARCHAR(100),
    points NUMERIC(10, 2) NOT NULL DEFAULT 0,
    requirements JSONB NOT NULL DEFAULT '{}',
    reward_amount NUMERIC(20, 8),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_tenant_achievement_slug UNIQUE (tenant_id, slug),
    CONSTRAINT positive_points CHECK (points >= 0),
    CONSTRAINT positive_reward CHECK (reward_amount IS NULL OR reward_amount > 0)
);

-- Create indexes for achievements
CREATE INDEX idx_achievements_tenant_id ON achievements(tenant_id);
CREATE INDEX idx_achievements_slug ON achievements(slug);
CREATE INDEX idx_achievements_category ON achievements(category);
CREATE INDEX idx_achievements_active ON achievements(active);
CREATE INDEX idx_achievements_requirements ON achievements USING GIN(requirements);

-- User achievements table
CREATE TABLE user_achievements (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id BIGINT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    progress NUMERIC(5, 2) NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    reward_id BIGINT REFERENCES rewards(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    
    PRIMARY KEY (user_id, achievement_id),
    CONSTRAINT progress_range CHECK (progress >= 0 AND progress <= 100)
);

-- Create indexes for user_achievements
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX idx_user_achievements_completed ON user_achievements(completed);
CREATE INDEX idx_user_achievements_completed_at ON user_achievements(completed_at DESC);

-- Function to auto-expire rewards
CREATE OR REPLACE FUNCTION auto_expire_rewards()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.expires_at IS NOT NULL AND NEW.expires_at < NOW() AND NEW.status = 'pending' THEN
        NEW.status := 'expired';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-expire rewards
CREATE TRIGGER auto_expire_rewards_trigger
    BEFORE UPDATE ON rewards
    FOR EACH ROW EXECUTE FUNCTION auto_expire_rewards();

-- Function to update reputation on validation
CREATE OR REPLACE FUNCTION update_reputation_on_validation()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalculate user's skill scores when a new validation is added
    UPDATE reputation_scores
    SET skill_scores = (
        SELECT jsonb_object_agg(
            s.slug,
            AVG(sv.score)
        )
        FROM skill_validations sv
        JOIN skills s ON s.id = sv.skill_id
        WHERE sv.user_id = NEW.user_id AND sv.valid = true
        GROUP BY s.slug
    ),
    calculated_at = NOW()
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update reputation
CREATE TRIGGER update_reputation_trigger
    AFTER INSERT ON skill_validations
    FOR EACH ROW EXECUTE FUNCTION update_reputation_on_validation();

-- Enable Row Level Security
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reputation_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY tenant_isolation_policy ON rewards
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT);

CREATE POLICY tenant_isolation_policy ON reputation_scores
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT);

CREATE POLICY tenant_isolation_policy ON skill_validations
    USING (
        user_id IN (
            SELECT id FROM users 
            WHERE tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT
        )
    );

CREATE POLICY tenant_isolation_policy ON referrals
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT);

CREATE POLICY tenant_isolation_policy ON achievements
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT);

CREATE POLICY tenant_isolation_policy ON user_achievements
    USING (
        user_id IN (
            SELECT id FROM users 
            WHERE tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT
        )
    );

-- Rollback
-- DROP POLICY IF EXISTS tenant_isolation_policy ON user_achievements;
-- DROP POLICY IF EXISTS tenant_isolation_policy ON achievements;
-- DROP POLICY IF EXISTS tenant_isolation_policy ON referrals;
-- DROP POLICY IF EXISTS tenant_isolation_policy ON skill_validations;
-- DROP POLICY IF EXISTS tenant_isolation_policy ON reputation_scores;
-- DROP POLICY IF EXISTS tenant_isolation_policy ON rewards;
-- DROP TRIGGER IF EXISTS update_reputation_trigger ON skill_validations;
-- DROP TRIGGER IF EXISTS auto_expire_rewards_trigger ON rewards;
-- DROP FUNCTION IF EXISTS update_reputation_on_validation CASCADE;
-- DROP FUNCTION IF EXISTS auto_expire_rewards CASCADE;
-- DROP TABLE IF EXISTS user_achievements CASCADE;
-- DROP TABLE IF EXISTS achievements CASCADE;
-- DROP TABLE IF EXISTS referrals CASCADE;
-- DROP TABLE IF EXISTS skill_validations CASCADE;
-- DROP TABLE IF EXISTS reputation_scores CASCADE;
-- DROP TABLE IF EXISTS rewards CASCADE;
-- DROP TYPE IF EXISTS referral_status CASCADE;
-- DROP TYPE IF EXISTS reward_status CASCADE;
-- DROP TYPE IF EXISTS reward_type CASCADE;
