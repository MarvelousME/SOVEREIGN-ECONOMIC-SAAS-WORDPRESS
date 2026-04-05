-- Migration: 005_create_treasury_schema.sql
-- Description: Create treasury management tables
-- Created: 2026-03-26

-- Create enum types
CREATE TYPE vault_type AS ENUM ('operational', 'reserve', 'investment', 'insurance', 'community');
CREATE TYPE strategy_type AS ENUM ('conservative', 'moderate', 'aggressive', 'yield_farming', 'staking', 'liquidity_pool');
CREATE TYPE risk_level AS ENUM ('very_low', 'low', 'medium', 'high', 'very_high');
CREATE TYPE treasury_transaction_type AS ENUM ('deposit', 'withdrawal', 'allocation', 'rebalance', 'yield', 'fee');
CREATE TYPE treasury_transaction_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');

-- Treasury strategies table
CREATE TABLE treasury_strategies (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    strategy_type strategy_type NOT NULL,
    target_apy NUMERIC(5, 4),
    risk_level risk_level NOT NULL,
    rules JSONB NOT NULL DEFAULT '{}',
    parameters JSONB NOT NULL DEFAULT '{}',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_tenant_strategy_name UNIQUE (tenant_id, name),
    CONSTRAINT apy_range CHECK (target_apy IS NULL OR (target_apy >= 0 AND target_apy <= 10))
);

-- Create indexes for treasury_strategies
CREATE INDEX idx_treasury_strategies_tenant_id ON treasury_strategies(tenant_id);
CREATE INDEX idx_treasury_strategies_type ON treasury_strategies(strategy_type);
CREATE INDEX idx_treasury_strategies_risk ON treasury_strategies(risk_level);
CREATE INDEX idx_treasury_strategies_active ON treasury_strategies(active);
CREATE INDEX idx_treasury_strategies_rules ON treasury_strategies USING GIN(rules);

-- Treasury vaults table
CREATE TABLE treasury_vaults (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    vault_type vault_type NOT NULL,
    balance NUMERIC(20, 8) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    strategy_id BIGINT REFERENCES treasury_strategies(id) ON DELETE SET NULL,
    target_balance NUMERIC(20, 8),
    minimum_balance NUMERIC(20, 8) NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_tenant_vault_name UNIQUE (tenant_id, name),
    CONSTRAINT positive_balance CHECK (balance >= 0),
    CONSTRAINT positive_minimum CHECK (minimum_balance >= 0),
    CONSTRAINT balance_minimum CHECK (balance >= minimum_balance)
);

-- Create indexes for treasury_vaults
CREATE INDEX idx_treasury_vaults_tenant_id ON treasury_vaults(tenant_id);
CREATE INDEX idx_treasury_vaults_type ON treasury_vaults(vault_type);
CREATE INDEX idx_treasury_vaults_strategy_id ON treasury_vaults(strategy_id);
CREATE INDEX idx_treasury_vaults_currency ON treasury_vaults(currency);
CREATE INDEX idx_treasury_vaults_metadata ON treasury_vaults USING GIN(metadata);

-- Treasury allocations table
CREATE TABLE treasury_allocations (
    id BIGSERIAL PRIMARY KEY,
    vault_id BIGINT NOT NULL REFERENCES treasury_vaults(id) ON DELETE CASCADE,
    strategy_id BIGINT NOT NULL REFERENCES treasury_strategies(id) ON DELETE RESTRICT,
    amount NUMERIC(20, 8) NOT NULL,
    allocation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    current_value NUMERIC(20, 8) NOT NULL DEFAULT 0,
    yield_earned NUMERIC(20, 8) NOT NULL DEFAULT 0,
    performance JSONB NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    active BOOLEAN NOT NULL DEFAULT true,
    
    CONSTRAINT positive_amount CHECK (amount > 0),
    CONSTRAINT positive_current_value CHECK (current_value >= 0),
    CONSTRAINT positive_yield CHECK (yield_earned >= 0)
);

-- Create indexes for treasury_allocations
CREATE INDEX idx_treasury_allocations_vault_id ON treasury_allocations(vault_id);
CREATE INDEX idx_treasury_allocations_strategy_id ON treasury_allocations(strategy_id);
CREATE INDEX idx_treasury_allocations_date ON treasury_allocations(allocation_date DESC);
CREATE INDEX idx_treasury_allocations_active ON treasury_allocations(active);
CREATE INDEX idx_treasury_allocations_performance ON treasury_allocations USING GIN(performance);

-- Treasury transactions table
CREATE TABLE treasury_transactions (
    id BIGSERIAL PRIMARY KEY,
    vault_id BIGINT NOT NULL REFERENCES treasury_vaults(id) ON DELETE CASCADE,
    transaction_type treasury_transaction_type NOT NULL,
    amount NUMERIC(20, 8) NOT NULL,
    balance_before NUMERIC(20, 8) NOT NULL,
    balance_after NUMERIC(20, 8) NOT NULL,
    status treasury_transaction_status NOT NULL DEFAULT 'pending',
    reference_id VARCHAR(255),
    description TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    ledger_transaction_id BIGINT REFERENCES ledger_transactions(id) ON DELETE SET NULL,
    executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    
    CONSTRAINT positive_amount CHECK (amount > 0),
    CONSTRAINT valid_balance_change CHECK (
        (transaction_type IN ('deposit', 'yield') AND balance_after = balance_before + amount) OR
        (transaction_type IN ('withdrawal', 'allocation', 'fee') AND balance_after = balance_before - amount) OR
        (transaction_type = 'rebalance')
    )
);

-- Create indexes for treasury_transactions
CREATE INDEX idx_treasury_transactions_vault_id ON treasury_transactions(vault_id);
CREATE INDEX idx_treasury_transactions_type ON treasury_transactions(transaction_type);
CREATE INDEX idx_treasury_transactions_status ON treasury_transactions(status);
CREATE INDEX idx_treasury_transactions_reference ON treasury_transactions(reference_id);
CREATE INDEX idx_treasury_transactions_created_at ON treasury_transactions(created_at DESC);
CREATE INDEX idx_treasury_transactions_executed_at ON treasury_transactions(executed_at DESC);
CREATE INDEX idx_treasury_transactions_metadata ON treasury_transactions USING GIN(metadata);

-- Function to update vault balance
CREATE OR REPLACE FUNCTION update_vault_balance()
RETURNS TRIGGER AS $$
DECLARE
    current_balance NUMERIC(20, 8);
BEGIN
    -- Get current vault balance
    SELECT balance INTO current_balance
    FROM treasury_vaults
    WHERE id = NEW.vault_id;
    
    NEW.balance_before := current_balance;
    
    -- Calculate new balance
    IF NEW.transaction_type IN ('deposit', 'yield') THEN
        NEW.balance_after := current_balance + NEW.amount;
    ELSIF NEW.transaction_type IN ('withdrawal', 'allocation', 'fee') THEN
        NEW.balance_after := current_balance - NEW.amount;
    ELSE
        -- For rebalance, balance_after should be set explicitly
        IF NEW.balance_after IS NULL THEN
            RAISE EXCEPTION 'balance_after must be set for rebalance transactions';
        END IF;
    END IF;
    
    -- Update vault balance if transaction is completed
    IF NEW.status = 'completed' THEN
        UPDATE treasury_vaults
        SET balance = NEW.balance_after,
            updated_at = NOW()
        WHERE id = NEW.vault_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update vault balance
CREATE TRIGGER update_vault_balance_trigger
    BEFORE INSERT ON treasury_transactions
    FOR EACH ROW EXECUTE FUNCTION update_vault_balance();

-- Update timestamps triggers
CREATE TRIGGER update_treasury_strategies_updated_at BEFORE UPDATE ON treasury_strategies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_treasury_vaults_updated_at BEFORE UPDATE ON treasury_vaults
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE treasury_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE treasury_vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE treasury_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE treasury_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY tenant_isolation_policy ON treasury_strategies
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT);

CREATE POLICY tenant_isolation_policy ON treasury_vaults
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT);

CREATE POLICY tenant_isolation_policy ON treasury_allocations
    USING (
        vault_id IN (
            SELECT id FROM treasury_vaults 
            WHERE tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT
        )
    );

CREATE POLICY tenant_isolation_policy ON treasury_transactions
    USING (
        vault_id IN (
            SELECT id FROM treasury_vaults 
            WHERE tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT
        )
    );

-- Rollback
-- DROP POLICY IF EXISTS tenant_isolation_policy ON treasury_transactions;
-- DROP POLICY IF EXISTS tenant_isolation_policy ON treasury_allocations;
-- DROP POLICY IF EXISTS tenant_isolation_policy ON treasury_vaults;
-- DROP POLICY IF EXISTS tenant_isolation_policy ON treasury_strategies;
-- DROP TRIGGER IF EXISTS update_treasury_vaults_updated_at ON treasury_vaults;
-- DROP TRIGGER IF EXISTS update_treasury_strategies_updated_at ON treasury_strategies;
-- DROP TRIGGER IF EXISTS update_vault_balance_trigger ON treasury_transactions;
-- DROP FUNCTION IF EXISTS update_vault_balance CASCADE;
-- DROP TABLE IF EXISTS treasury_transactions CASCADE;
-- DROP TABLE IF EXISTS treasury_allocations CASCADE;
-- DROP TABLE IF EXISTS treasury_vaults CASCADE;
-- DROP TABLE IF EXISTS treasury_strategies CASCADE;
-- DROP TYPE IF EXISTS treasury_transaction_status CASCADE;
-- DROP TYPE IF EXISTS treasury_transaction_type CASCADE;
-- DROP TYPE IF EXISTS risk_level CASCADE;
-- DROP TYPE IF EXISTS strategy_type CASCADE;
-- DROP TYPE IF EXISTS vault_type CASCADE;
