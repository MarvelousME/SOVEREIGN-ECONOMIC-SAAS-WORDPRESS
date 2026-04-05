-- UBI-CMS Development Database Schema
-- Run this against a fresh PostgreSQL database to set up the dev environment
-- Usage: psql -U postgres -d ubi_dev -f dev-schema.sql

-- ===================================
-- Extensions
-- ===================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===================================
-- Users
-- ===================================
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    roles TEXT[] NOT NULL DEFAULT ARRAY['subscriber'],
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    wallet_address VARCHAR(255),
    kyc_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT username_format CHECK (username ~* '^[a-zA-Z0-9_]+$')
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- ===================================
-- Tasks
-- ===================================
CREATE TABLE IF NOT EXISTS tasks (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL DEFAULT 'general',
    difficulty VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
    reward_amount DECIMAL(18,8) NOT NULL DEFAULT 0 CHECK (reward_amount >= 0),
    reward_currency VARCHAR(50) NOT NULL DEFAULT 'UBI',
    max_participants INT NOT NULL DEFAULT 1 CHECK (max_participants > 0),
    current_participants INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
    deadline TIMESTAMPTZ,
    proof_requirements JSONB NOT NULL DEFAULT '{}',
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);

-- ===================================
-- Task Assignments
-- ===================================
CREATE TABLE IF NOT EXISTS task_assignments (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'submitted', 'approved', 'rejected')),
    proof_data JSONB,
    submitted_at TIMESTAMPTZ,
    verified_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    reward_distributed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON task_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_status ON task_assignments(status);

-- ===================================
-- Rewards
-- ===================================
CREATE TABLE IF NOT EXISTS rewards (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(18,8) NOT NULL CHECK (amount > 0),
    currency VARCHAR(50) NOT NULL DEFAULT 'UBI',
    type VARCHAR(100),
    source_type VARCHAR(100),
    source_id BIGINT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rewards_user_id ON rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_rewards_type ON rewards(type);
CREATE INDEX IF NOT EXISTS idx_rewards_status ON rewards(status);
CREATE INDEX IF NOT EXISTS idx_rewards_created_at ON rewards(created_at DESC);

-- ===================================
-- Treasury Accounts
-- ===================================
CREATE TABLE IF NOT EXISTS treasury_accounts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    balance DECIMAL(18,8) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    currency VARCHAR(50) NOT NULL DEFAULT 'UBI',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_treasury_accounts_user_id ON treasury_accounts(user_id);

-- ===================================
-- Treasury Transactions
-- ===================================
CREATE TABLE IF NOT EXISTS treasury_transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('deposit', 'withdraw', 'ubi_credit', 'task_reward', 'fee')),
    amount DECIMAL(18,8) NOT NULL CHECK (amount > 0),
    currency VARCHAR(50) NOT NULL DEFAULT 'UBI',
    balance_after DECIMAL(18,8),
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_treasury_tx_user_id ON treasury_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_treasury_tx_type ON treasury_transactions(type);
CREATE INDEX IF NOT EXISTS idx_treasury_tx_created_at ON treasury_transactions(created_at DESC);

-- ===================================
-- Treasury Strategies
-- ===================================
CREATE TABLE IF NOT EXISTS treasury_strategies (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    apy DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (apy >= 0),
    risk_level VARCHAR(50) NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
    active BOOLEAN NOT NULL DEFAULT true,
    protocol VARCHAR(255),
    min_deposit DECIMAL(18,8) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===================================
-- Agents
-- ===================================
CREATE TABLE IF NOT EXISTS agents (
    id BIGSERIAL PRIMARY KEY,
    owner_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    capability VARCHAR(255),
    endpoint VARCHAR(500),
    auth_type VARCHAR(50) NOT NULL DEFAULT 'api_key',
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    pricing_model VARCHAR(50) NOT NULL DEFAULT 'free' CHECK (pricing_model IN ('free', 'per_call', 'subscription')),
    price_per_call DECIMAL(10,4) NOT NULL DEFAULT 0,
    total_calls BIGINT NOT NULL DEFAULT 0,
    rating DECIMAL(3,2) NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_capability ON agents(capability);
CREATE INDEX IF NOT EXISTS idx_agents_owner_id ON agents(owner_id);

-- ===================================
-- Agent Executions
-- ===================================
CREATE TABLE IF NOT EXISTS agent_executions (
    id BIGSERIAL PRIMARY KEY,
    agent_id BIGINT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    input_data JSONB NOT NULL DEFAULT '{}',
    output_data JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'completed' CHECK (status IN ('running', 'completed', 'failed')),
    duration_ms INT,
    cost DECIMAL(10,4) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_exec_agent_id ON agent_executions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_exec_user_id ON agent_executions(user_id);

-- ===================================
-- Auto-update updated_at trigger
-- ===================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===================================
-- Schema version tracking
-- ===================================
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(50) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO schema_migrations (version) VALUES ('dev-1.0.0') ON CONFLICT DO NOTHING;
