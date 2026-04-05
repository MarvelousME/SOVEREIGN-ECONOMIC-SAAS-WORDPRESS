-- Migration: 004_create_ubi_engine_schema.sql
-- Description: Create UBI engine tables
-- Created: 2026-03-26

-- Create enum types
CREATE TYPE pool_type AS ENUM ('universal', 'conditional', 'task_based', 'contribution_based', 'hybrid');
CREATE TYPE distribution_type AS ENUM ('periodic', 'instant', 'task_completion', 'achievement', 'referral');
CREATE TYPE distribution_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
CREATE TYPE rule_type AS ENUM ('eligibility', 'amount_calculation', 'frequency', 'cap', 'bonus');
CREATE TYPE activity_level AS ENUM ('inactive', 'low', 'medium', 'high', 'very_high');

-- UBI pools table
CREATE TABLE ubi_pools (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    pool_type pool_type NOT NULL,
    total_balance NUMERIC(20, 8) NOT NULL DEFAULT 0,
    distributed_amount NUMERIC(20, 8) NOT NULL DEFAULT 0,
    reserve_amount NUMERIC(20, 8) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    rules JSONB NOT NULL DEFAULT '{}',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_tenant_pool_name UNIQUE (tenant_id, name),
    CONSTRAINT positive_balance CHECK (total_balance >= 0),
    CONSTRAINT positive_distributed CHECK (distributed_amount >= 0),
    CONSTRAINT positive_reserve CHECK (reserve_amount >= 0),
    CONSTRAINT balance_integrity CHECK (distributed_amount + reserve_amount <= total_balance)
);

-- Create indexes for ubi_pools
CREATE INDEX idx_ubi_pools_tenant_id ON ubi_pools(tenant_id);
CREATE INDEX idx_ubi_pools_type ON ubi_pools(pool_type);
CREATE INDEX idx_ubi_pools_active ON ubi_pools(active);
CREATE INDEX idx_ubi_pools_rules ON ubi_pools USING GIN(rules);

-- UBI rules table
CREATE TABLE ubi_rules (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pool_id BIGINT REFERENCES ubi_pools(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    rule_type rule_type NOT NULL,
    weight NUMERIC(5, 4) NOT NULL DEFAULT 1.0,
    conditions JSONB NOT NULL DEFAULT '{}',
    parameters JSONB NOT NULL DEFAULT '{}',
    active BOOLEAN NOT NULL DEFAULT true,
    priority INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT weight_range CHECK (weight >= 0 AND weight <= 100)
);

-- Create indexes for ubi_rules
CREATE INDEX idx_ubi_rules_tenant_id ON ubi_rules(tenant_id);
CREATE INDEX idx_ubi_rules_pool_id ON ubi_rules(pool_id);
CREATE INDEX idx_ubi_rules_type ON ubi_rules(rule_type);
CREATE INDEX idx_ubi_rules_active ON ubi_rules(active);
CREATE INDEX idx_ubi_rules_priority ON ubi_rules(priority DESC);
CREATE INDEX idx_ubi_rules_conditions ON ubi_rules USING GIN(conditions);

-- UBI eligibility table
CREATE TABLE ubi_eligibility (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pool_id BIGINT REFERENCES ubi_pools(id) ON DELETE CASCADE,
    eligible BOOLEAN NOT NULL DEFAULT false,
    score NUMERIC(10, 4) NOT NULL DEFAULT 0,
    activity_level activity_level NOT NULL DEFAULT 'inactive',
    contribution_score NUMERIC(10, 4) NOT NULL DEFAULT 0,
    last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}',
    next_distribution_at TIMESTAMPTZ,
    
    PRIMARY KEY (user_id, tenant_id, pool_id),
    CONSTRAINT score_range CHECK (score >= 0 AND score <= 100),
    CONSTRAINT contribution_range CHECK (contribution_score >= 0)
);

-- Create indexes for ubi_eligibility
CREATE INDEX idx_ubi_eligibility_user_id ON ubi_eligibility(user_id);
CREATE INDEX idx_ubi_eligibility_tenant_id ON ubi_eligibility(tenant_id);
CREATE INDEX idx_ubi_eligibility_pool_id ON ubi_eligibility(pool_id);
CREATE INDEX idx_ubi_eligibility_eligible ON ubi_eligibility(eligible);
CREATE INDEX idx_ubi_eligibility_score ON ubi_eligibility(score DESC);
CREATE INDEX idx_ubi_eligibility_activity ON ubi_eligibility(activity_level);
CREATE INDEX idx_ubi_eligibility_next_distribution ON ubi_eligibility(next_distribution_at);
CREATE INDEX idx_ubi_eligibility_metadata ON ubi_eligibility USING GIN(metadata);

-- UBI distributions table
CREATE TABLE ubi_distributions (
    id BIGSERIAL PRIMARY KEY,
    pool_id BIGINT NOT NULL REFERENCES ubi_pools(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(20, 8) NOT NULL,
    distribution_type distribution_type NOT NULL,
    status distribution_status NOT NULL DEFAULT 'pending',
    proof JSONB,
    transaction_id BIGINT REFERENCES ledger_transactions(id) ON DELETE SET NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    scheduled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    CONSTRAINT positive_amount CHECK (amount > 0)
);

-- Create indexes for ubi_distributions
CREATE INDEX idx_ubi_distributions_pool_id ON ubi_distributions(pool_id);
CREATE INDEX idx_ubi_distributions_user_id ON ubi_distributions(user_id);
CREATE INDEX idx_ubi_distributions_type ON ubi_distributions(distribution_type);
CREATE INDEX idx_ubi_distributions_status ON ubi_distributions(status);
CREATE INDEX idx_ubi_distributions_created_at ON ubi_distributions(created_at DESC);
CREATE INDEX idx_ubi_distributions_scheduled_at ON ubi_distributions(scheduled_at);
CREATE INDEX idx_ubi_distributions_completed_at ON ubi_distributions(completed_at DESC);
CREATE INDEX idx_ubi_distributions_user_status ON ubi_distributions(user_id, status);
CREATE INDEX idx_ubi_distributions_proof ON ubi_distributions USING GIN(proof);

-- Function to update pool balance on distribution
CREATE OR REPLACE FUNCTION update_pool_on_distribution()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE ubi_pools
        SET distributed_amount = distributed_amount + NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.pool_id;
    ELSIF NEW.status = 'cancelled' AND OLD.status = 'completed' THEN
        UPDATE ubi_pools
        SET distributed_amount = distributed_amount - NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.pool_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update pool balance
CREATE TRIGGER update_pool_balance_trigger
    AFTER UPDATE ON ubi_distributions
    FOR EACH ROW EXECUTE FUNCTION update_pool_on_distribution();

-- Update timestamps trigger
CREATE TRIGGER update_ubi_pools_updated_at BEFORE UPDATE ON ubi_pools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ubi_rules_updated_at BEFORE UPDATE ON ubi_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE ubi_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE ubi_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ubi_eligibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE ubi_distributions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY tenant_isolation_policy ON ubi_pools
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT);

CREATE POLICY tenant_isolation_policy ON ubi_rules
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT);

CREATE POLICY tenant_isolation_policy ON ubi_eligibility
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT);

CREATE POLICY tenant_isolation_policy ON ubi_distributions
    USING (
        pool_id IN (
            SELECT id FROM ubi_pools 
            WHERE tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT
        )
    );

-- Rollback
-- DROP POLICY IF EXISTS tenant_isolation_policy ON ubi_distributions;
-- DROP POLICY IF EXISTS tenant_isolation_policy ON ubi_eligibility;
-- DROP POLICY IF EXISTS tenant_isolation_policy ON ubi_rules;
-- DROP POLICY IF EXISTS tenant_isolation_policy ON ubi_pools;
-- DROP TRIGGER IF EXISTS update_ubi_rules_updated_at ON ubi_rules;
-- DROP TRIGGER IF EXISTS update_ubi_pools_updated_at ON ubi_pools;
-- DROP TRIGGER IF EXISTS update_pool_balance_trigger ON ubi_distributions;
-- DROP FUNCTION IF EXISTS update_pool_on_distribution CASCADE;
-- DROP TABLE IF EXISTS ubi_distributions CASCADE;
-- DROP TABLE IF EXISTS ubi_eligibility CASCADE;
-- DROP TABLE IF EXISTS ubi_rules CASCADE;
-- DROP TABLE IF EXISTS ubi_pools CASCADE;
-- DROP TYPE IF EXISTS activity_level CASCADE;
-- DROP TYPE IF EXISTS rule_type CASCADE;
-- DROP TYPE IF EXISTS distribution_status CASCADE;
-- DROP TYPE IF EXISTS distribution_type CASCADE;
-- DROP TYPE IF EXISTS pool_type CASCADE;
