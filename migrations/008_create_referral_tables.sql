-- Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    referral_code VARCHAR(12) NOT NULL UNIQUE,
    referrer_id VARCHAR(255),
    tier INTEGER NOT NULL DEFAULT 0,
    registered_at TIMESTAMP NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    device_fingerprint VARCHAR(64) NOT NULL,
    user_agent TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    fraud_score INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_referrer FOREIGN KEY (referrer_id) REFERENCES referrals(user_id) ON DELETE SET NULL
);

-- Create referral_rewards table
CREATE TABLE IF NOT EXISTS referral_rewards (
    id UUID PRIMARY KEY,
    referrer_id VARCHAR(255) NOT NULL,
    referee_id VARCHAR(255) NOT NULL,
    tier INTEGER NOT NULL,
    amount DECIMAL(18, 6) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    source VARCHAR(50) NOT NULL,
    source_id VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    calculated_at TIMESTAMP NOT NULL,
    distributed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_referrer_reward FOREIGN KEY (referrer_id) REFERENCES referrals(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_referee_reward FOREIGN KEY (referee_id) REFERENCES referrals(user_id) ON DELETE CASCADE
);

-- Create referral_conversions table
CREATE TABLE IF NOT EXISTS referral_conversions (
    id UUID PRIMARY KEY,
    referral_id UUID NOT NULL,
    milestone VARCHAR(50) NOT NULL,
    converted_at TIMESTAMP NOT NULL DEFAULT NOW(),
    metadata JSONB,
    CONSTRAINT fk_referral_conversion FOREIGN KEY (referral_id) REFERENCES referrals(id) ON DELETE CASCADE
);

-- Create referral_campaigns table
CREATE TABLE IF NOT EXISTS referral_campaigns (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    tier_multipliers JSONB NOT NULL DEFAULT '{}',
    bonus_rewards JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create payout_requests table
CREATE TABLE IF NOT EXISTS payout_requests (
    id UUID PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    amount DECIMAL(18, 6) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    method VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_user_payout FOREIGN KEY (user_id) REFERENCES referrals(user_id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_referrals_user_id ON referrals(user_id);
CREATE INDEX idx_referrals_referral_code ON referrals(referral_code);
CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX idx_referrals_status ON referrals(status);
CREATE INDEX idx_referrals_tier ON referrals(tier);
CREATE INDEX idx_referrals_created_at ON referrals(created_at);

CREATE INDEX idx_rewards_referrer_id ON referral_rewards(referrer_id);
CREATE INDEX idx_rewards_referee_id ON referral_rewards(referee_id);
CREATE INDEX idx_rewards_status ON referral_rewards(status);
CREATE INDEX idx_rewards_tier ON referral_rewards(tier);
CREATE INDEX idx_rewards_created_at ON referral_rewards(created_at);

CREATE INDEX idx_conversions_referral_id ON referral_conversions(referral_id);
CREATE INDEX idx_conversions_milestone ON referral_conversions(milestone);

CREATE INDEX idx_campaigns_code ON referral_campaigns(code);
CREATE INDEX idx_campaigns_is_active ON referral_campaigns(is_active);

CREATE INDEX idx_payouts_user_id ON payout_requests(user_id);
CREATE INDEX idx_payouts_status ON payout_requests(status);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_referrals_updated_at BEFORE UPDATE ON referrals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rewards_updated_at BEFORE UPDATE ON referral_rewards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON referral_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payouts_updated_at BEFORE UPDATE ON payout_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default tier configuration
COMMENT ON TABLE referrals IS 'Stores user referral information and hierarchy';
COMMENT ON TABLE referral_rewards IS 'Tracks rewards earned through referrals';
COMMENT ON TABLE referral_conversions IS 'Tracks referral conversion milestones';
COMMENT ON TABLE referral_campaigns IS 'Manages referral campaigns with custom rewards';
COMMENT ON TABLE payout_requests IS 'Tracks referral reward payout requests';
