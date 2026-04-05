-- UBI Engine Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- UBI Pools Table
CREATE TABLE ubi_pools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(255) NOT NULL,
    total_amount DECIMAL(20, 2) NOT NULL DEFAULT 0,
    distributed_amount DECIMAL(20, 2) NOT NULL DEFAULT 0,
    remaining_amount DECIMAL(20, 2) NOT NULL DEFAULT 0,
    distribution_interval VARCHAR(50) NOT NULL DEFAULT 'daily',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ubi_pools_tenant ON ubi_pools(tenant_id);
CREATE INDEX idx_ubi_pools_active ON ubi_pools(is_active);

-- Distribution Rules Table
CREATE TABLE distribution_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pool_id UUID NOT NULL REFERENCES ubi_pools(id) ON DELETE CASCADE,
    weight_equal DECIMAL(5, 4) NOT NULL DEFAULT 0.4,
    weight_activity DECIMAL(5, 4) NOT NULL DEFAULT 0.3,
    weight_contribution DECIMAL(5, 4) NOT NULL DEFAULT 0.2,
    weight_reputation DECIMAL(5, 4) NOT NULL DEFAULT 0.1,
    min_participation_score INTEGER NOT NULL DEFAULT 10,
    max_cap_per_user DECIMAL(20, 2) NOT NULL DEFAULT 1000,
    activity_decay_days INTEGER NOT NULL DEFAULT 30,
    vesting_period_days INTEGER NOT NULL DEFAULT 7,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT weights_sum_check CHECK (
        weight_equal + weight_activity + weight_contribution + weight_reputation = 1.0
    )
);

CREATE INDEX idx_distribution_rules_pool ON distribution_rules(pool_id);

-- User Eligibility Table
CREATE TABLE user_eligibility (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    pool_id UUID NOT NULL REFERENCES ubi_pools(id) ON DELETE CASCADE,
    is_eligible BOOLEAN NOT NULL DEFAULT false,
    participation_score INTEGER NOT NULL DEFAULT 0,
    activity_score DECIMAL(10, 2) NOT NULL DEFAULT 0,
    contribution_score DECIMAL(10, 2) NOT NULL DEFAULT 0,
    reputation_score DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_score DECIMAL(10, 2) NOT NULL DEFAULT 0,
    account_age_days INTEGER NOT NULL DEFAULT 0,
    last_activity_at TIMESTAMP,
    flagged_for_abuse BOOLEAN NOT NULL DEFAULT false,
    abuse_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_eligibility_user ON user_eligibility(user_id);
CREATE INDEX idx_user_eligibility_pool ON user_eligibility(pool_id);
CREATE INDEX idx_user_eligibility_eligible ON user_eligibility(is_eligible);
CREATE INDEX idx_user_eligibility_tenant ON user_eligibility(tenant_id);
CREATE UNIQUE INDEX idx_user_eligibility_unique ON user_eligibility(user_id, pool_id);

-- Distribution History Table
CREATE TABLE distribution_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pool_id UUID NOT NULL REFERENCES ubi_pools(id) ON DELETE CASCADE,
    distribution_date TIMESTAMP NOT NULL,
    total_distributed DECIMAL(20, 2) NOT NULL,
    eligible_users_count INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_distribution_history_pool ON distribution_history(pool_id);
CREATE INDEX idx_distribution_history_date ON distribution_history(distribution_date);
CREATE INDEX idx_distribution_history_status ON distribution_history(status);

-- User Distribution Records Table
CREATE TABLE user_distributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    distribution_id UUID NOT NULL REFERENCES distribution_history(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    pool_id UUID NOT NULL REFERENCES ubi_pools(id) ON DELETE CASCADE,
    base_amount DECIMAL(20, 2) NOT NULL DEFAULT 0,
    activity_bonus DECIMAL(20, 2) NOT NULL DEFAULT 0,
    contribution_bonus DECIMAL(20, 2) NOT NULL DEFAULT 0,
    reputation_multiplier DECIMAL(5, 2) NOT NULL DEFAULT 1.0,
    total_amount DECIMAL(20, 2) NOT NULL,
    vested_amount DECIMAL(20, 2) NOT NULL DEFAULT 0,
    unvested_amount DECIMAL(20, 2) NOT NULL DEFAULT 0,
    vesting_complete_at TIMESTAMP,
    claimed BOOLEAN NOT NULL DEFAULT false,
    claimed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_distributions_distribution ON user_distributions(distribution_id);
CREATE INDEX idx_user_distributions_user ON user_distributions(user_id);
CREATE INDEX idx_user_distributions_pool ON user_distributions(pool_id);
CREATE INDEX idx_user_distributions_claimed ON user_distributions(claimed);

-- User UBI Balances Table
CREATE TABLE user_ubi_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    available_balance DECIMAL(20, 2) NOT NULL DEFAULT 0,
    pending_balance DECIMAL(20, 2) NOT NULL DEFAULT 0,
    lifetime_earned DECIMAL(20, 2) NOT NULL DEFAULT 0,
    lifetime_claimed DECIMAL(20, 2) NOT NULL DEFAULT 0,
    last_distribution_at TIMESTAMP,
    last_claim_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_ubi_balances_user ON user_ubi_balances(user_id);
CREATE INDEX idx_user_ubi_balances_tenant ON user_ubi_balances(tenant_id);
CREATE UNIQUE INDEX idx_user_ubi_balances_unique ON user_ubi_balances(user_id, tenant_id);

-- Activity Events Table (for scoring)
CREATE TABLE activity_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB,
    score_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
    occurred_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_events_user ON activity_events(user_id);
CREATE INDEX idx_activity_events_tenant ON activity_events(tenant_id);
CREATE INDEX idx_activity_events_type ON activity_events(event_type);
CREATE INDEX idx_activity_events_occurred ON activity_events(occurred_at);

-- Contribution Records Table
CREATE TABLE contribution_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    contribution_type VARCHAR(100) NOT NULL,
    contribution_value DECIMAL(20, 2) NOT NULL DEFAULT 0,
    score_multiplier DECIMAL(5, 2) NOT NULL DEFAULT 1.0,
    total_score DECIMAL(10, 2) NOT NULL DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contribution_records_user ON contribution_records(user_id);
CREATE INDEX idx_contribution_records_tenant ON contribution_records(tenant_id);
CREATE INDEX idx_contribution_records_type ON contribution_records(contribution_type);

-- Anti-Abuse Tracking Table
CREATE TABLE abuse_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    ip_address INET,
    device_fingerprint VARCHAR(255),
    related_accounts JSONB,
    abuse_score DECIMAL(10, 2) NOT NULL DEFAULT 0,
    is_flagged BOOLEAN NOT NULL DEFAULT false,
    flagged_reason TEXT,
    flagged_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_abuse_tracking_user ON abuse_tracking(user_id);
CREATE INDEX idx_abuse_tracking_ip ON abuse_tracking(ip_address);
CREATE INDEX idx_abuse_tracking_flagged ON abuse_tracking(is_flagged);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_ubi_pools_updated_at BEFORE UPDATE ON ubi_pools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_distribution_rules_updated_at BEFORE UPDATE ON distribution_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_eligibility_updated_at BEFORE UPDATE ON user_eligibility
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_ubi_balances_updated_at BEFORE UPDATE ON user_ubi_balances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_abuse_tracking_updated_at BEFORE UPDATE ON abuse_tracking
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
