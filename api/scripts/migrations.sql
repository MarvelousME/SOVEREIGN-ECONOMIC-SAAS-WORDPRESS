-- UBI CMS Database Schema
-- PostgreSQL 18.x
-- Version: 1.0.0

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (extends WordPress users)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    wp_user_id BIGINT UNIQUE,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    roles TEXT[] DEFAULT '{subscriber}',
    wallet_address VARCHAR(66),
    kyc_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
-- Align with dev-schema: optional WordPress user link (idempotent)
ALTER TABLE users ADD COLUMN IF NOT EXISTS wp_user_id BIGINT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_wp_user_id ON users(wp_user_id) WHERE wp_user_id IS NOT NULL;

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    difficulty VARCHAR(20) DEFAULT 'medium',
    reward_amount DECIMAL(20, 8) NOT NULL,
    reward_currency VARCHAR(10) DEFAULT 'UBI',
    max_participants INTEGER DEFAULT 1,
    current_participants INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    deadline TIMESTAMP,
    proof_requirements JSONB,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Task indexes
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_category ON tasks(category);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);

-- Task assignments table
CREATE TABLE IF NOT EXISTS task_assignments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'assigned',
    proof_data JSONB,
    submitted_at TIMESTAMP,
    verified_by INTEGER REFERENCES users(id),
    verified_at TIMESTAMP,
    reward_distributed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(task_id, user_id)
);

-- Task assignment indexes
CREATE INDEX idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX idx_task_assignments_user_id ON task_assignments(user_id);
CREATE INDEX idx_task_assignments_status ON task_assignments(status);

-- Rewards table
CREATE TABLE IF NOT EXISTS rewards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(20, 8) NOT NULL,
    currency VARCHAR(10) DEFAULT 'UBI',
    type VARCHAR(20) NOT NULL,
    source_type VARCHAR(50),
    source_id INTEGER,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP
);

-- Reward indexes
CREATE INDEX idx_rewards_user_id ON rewards(user_id);
CREATE INDEX idx_rewards_status ON rewards(status);
CREATE INDEX idx_rewards_created_at ON rewards(created_at DESC);

-- Treasury table
CREATE TABLE IF NOT EXISTS treasury (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(20, 8) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'UBI',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, currency)
);

-- Treasury transaction history
CREATE TABLE IF NOT EXISTS treasury_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(20, 8) NOT NULL,
    currency VARCHAR(10) DEFAULT 'UBI',
    type VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    metadata JSONB,
    tx_hash VARCHAR(66),
    created_at TIMESTAMP DEFAULT NOW(),
    confirmed_at TIMESTAMP
);

-- Treasury transaction indexes
CREATE INDEX idx_treasury_transactions_user_id ON treasury_transactions(user_id);
CREATE INDEX idx_treasury_transactions_type ON treasury_transactions(type);
CREATE INDEX idx_treasury_transactions_created_at ON treasury_transactions(created_at DESC);

-- Yield strategies table
CREATE TABLE IF NOT EXISTS yield_strategies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    protocol VARCHAR(50),
    apy DECIMAL(10, 4),
    risk_level VARCHAR(20) DEFAULT 'medium',
    min_deposit DECIMAL(20, 8) DEFAULT 0,
    max_deposit DECIMAL(20, 8),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Agent marketplace table
CREATE TABLE IF NOT EXISTS agents (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    capability VARCHAR(50)[] DEFAULT '{}',
    endpoint VARCHAR(255),
    auth_type VARCHAR(20) DEFAULT 'api_key',
    status VARCHAR(20) DEFAULT 'active',
    pricing_model VARCHAR(20) DEFAULT 'free',
    price_per_call DECIMAL(10, 4) DEFAULT 0,
    rating DECIMAL(3, 2) DEFAULT 0,
    total_calls INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Agent indexes
CREATE INDEX idx_agents_owner_id ON agents(owner_id);
CREATE INDEX idx_agents_status ON agents(status);
-- B-tree on array is invalid; GIN on varchar[] can fail if legacy column type differs — skip until schema is normalized to text[]
-- CREATE INDEX IF NOT EXISTS idx_agents_capability ON agents USING GIN (capability);

-- Agent execution logs
CREATE TABLE IF NOT EXISTS agent_executions (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    input_data JSONB,
    output_data JSONB,
    status VARCHAR(20) DEFAULT 'running',
    duration_ms INTEGER,
    cost DECIMAL(10, 4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Agent execution indexes
CREATE INDEX idx_agent_executions_agent_id ON agent_executions(agent_id);
CREATE INDEX idx_agent_executions_user_id ON agent_executions(user_id);
CREATE INDEX idx_agent_executions_status ON agent_executions(status);
CREATE INDEX idx_agent_executions_created_at ON agent_executions(created_at DESC);

-- UBI distribution snapshots (for audit)
CREATE TABLE IF NOT EXISTS ubi_distributions (
    id SERIAL PRIMARY KEY,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    total_distributed DECIMAL(20, 8) NOT NULL,
    recipient_count INTEGER NOT NULL,
    transaction_hash VARCHAR(66),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default yield strategies
INSERT INTO yield_strategies (name, description, protocol, apy, risk_level, active) VALUES
    ('UBI Staking', 'Stake UBI tokens to earn yield', 'ubi-protocol', 5.25, 'low', TRUE),
    ('Liquidity Pool', 'Provide liquidity to earn trading fees', 'uniswap-v3', 12.50, 'medium', TRUE),
    ('Treasury Bond', 'Lock UBI for fixed yield bonds', 'ubi-treasury', 8.00, 'low', TRUE)
ON CONFLICT DO NOTHING;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers (idempotent)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
DROP TRIGGER IF EXISTS update_task_assignments_updated_at ON task_assignments;
DROP TRIGGER IF EXISTS update_treasury_updated_at ON treasury;
DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_task_assignments_updated_at BEFORE UPDATE ON task_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_treasury_updated_at BEFORE UPDATE ON treasury FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();