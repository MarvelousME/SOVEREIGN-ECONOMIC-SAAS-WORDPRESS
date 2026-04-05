-- Migration: 008_create_agent_economy_schema.sql
-- Description: Create AI agent economy tables
-- Created: 2026-03-26

-- Create enum types
CREATE TYPE agent_type AS ENUM ('task_executor', 'content_creator', 'data_processor', 'moderator', 'analyst', 'trader', 'custom');
CREATE TYPE agent_status AS ENUM ('development', 'testing', 'active', 'paused', 'deprecated', 'failed');
CREATE TYPE execution_status AS ENUM ('queued', 'running', 'completed', 'failed', 'cancelled', 'timeout');
CREATE TYPE memory_type AS ENUM ('episodic', 'semantic', 'procedural', 'working');
CREATE TYPE listing_status AS ENUM ('draft', 'pending_review', 'active', 'paused', 'rejected', 'delisted');

-- Agents table
CREATE TABLE agents (
    id BIGSERIAL PRIMARY KEY,
    owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    agent_type agent_type NOT NULL,
    version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
    capabilities JSONB NOT NULL DEFAULT '[]',
    status agent_status NOT NULL DEFAULT 'development',
    config JSONB NOT NULL DEFAULT '{}',
    model_config JSONB NOT NULL DEFAULT '{}',
    rate_limit JSONB NOT NULL DEFAULT '{}',
    total_executions BIGINT NOT NULL DEFAULT 0,
    successful_executions BIGINT NOT NULL DEFAULT 0,
    failed_executions BIGINT NOT NULL DEFAULT 0,
    total_revenue NUMERIC(20, 8) NOT NULL DEFAULT 0,
    total_cost NUMERIC(20, 8) NOT NULL DEFAULT 0,
    average_rating NUMERIC(3, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deployed_at TIMESTAMPTZ,
    last_execution_at TIMESTAMPTZ,
    
    CONSTRAINT unique_tenant_agent_name UNIQUE (tenant_id, name),
    CONSTRAINT rating_range CHECK (average_rating IS NULL OR (average_rating >= 0 AND average_rating <= 5))
);

-- Create indexes for agents
CREATE INDEX idx_agents_owner_id ON agents(owner_id);
CREATE INDEX idx_agents_tenant_id ON agents(tenant_id);
CREATE INDEX idx_agents_type ON agents(agent_type);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_created_at ON agents(created_at DESC);
CREATE INDEX idx_agents_deployed_at ON agents(deployed_at DESC);
CREATE INDEX idx_agents_rating ON agents(average_rating DESC NULLS LAST);
CREATE INDEX idx_agents_capabilities ON agents USING GIN(capabilities);
CREATE INDEX idx_agents_config ON agents USING GIN(config);

-- Agent executions table
CREATE TABLE agent_executions (
    id BIGSERIAL PRIMARY KEY,
    agent_id BIGINT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    task_type VARCHAR(100) NOT NULL,
    input JSONB NOT NULL,
    output JSONB,
    status execution_status NOT NULL DEFAULT 'queued',
    error_message TEXT,
    tokens_used INTEGER,
    cost NUMERIC(20, 8) NOT NULL DEFAULT 0,
    revenue NUMERIC(20, 8),
    duration_ms INTEGER,
    metadata JSONB NOT NULL DEFAULT '{}',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    triggered_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    
    CONSTRAINT positive_cost CHECK (cost >= 0),
    CONSTRAINT positive_revenue CHECK (revenue IS NULL OR revenue >= 0),
    CONSTRAINT positive_duration CHECK (duration_ms IS NULL OR duration_ms >= 0)
);

-- Create indexes for agent_executions
CREATE INDEX idx_agent_executions_agent_id ON agent_executions(agent_id);
CREATE INDEX idx_agent_executions_task_type ON agent_executions(task_type);
CREATE INDEX idx_agent_executions_status ON agent_executions(status);
CREATE INDEX idx_agent_executions_created_at ON agent_executions(created_at DESC);
CREATE INDEX idx_agent_executions_started_at ON agent_executions(started_at DESC);
CREATE INDEX idx_agent_executions_completed_at ON agent_executions(completed_at DESC);
CREATE INDEX idx_agent_executions_agent_status ON agent_executions(agent_id, status);
CREATE INDEX idx_agent_executions_metadata ON agent_executions USING GIN(metadata);

-- Agent memory table
CREATE TABLE agent_memory (
    id BIGSERIAL PRIMARY KEY,
    agent_id BIGINT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    memory_type memory_type NOT NULL,
    embedding_id VARCHAR(255),
    content JSONB NOT NULL,
    summary TEXT,
    importance NUMERIC(3, 2) NOT NULL DEFAULT 0.5,
    access_count INTEGER NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    
    CONSTRAINT importance_range CHECK (importance >= 0 AND importance <= 1)
);

-- Create indexes for agent_memory
CREATE INDEX idx_agent_memory_agent_id ON agent_memory(agent_id);
CREATE INDEX idx_agent_memory_type ON agent_memory(memory_type);
CREATE INDEX idx_agent_memory_embedding_id ON agent_memory(embedding_id);
CREATE INDEX idx_agent_memory_importance ON agent_memory(importance DESC);
CREATE INDEX idx_agent_memory_created_at ON agent_memory(created_at DESC);
CREATE INDEX idx_agent_memory_accessed_at ON agent_memory(last_accessed_at DESC);
CREATE INDEX idx_agent_memory_content ON agent_memory USING GIN(content);

-- Agent marketplace listings table
CREATE TABLE agent_marketplace_listings (
    id BIGSERIAL PRIMARY KEY,
    agent_id BIGINT NOT NULL UNIQUE REFERENCES agents(id) ON DELETE CASCADE,
    price NUMERIC(20, 8) NOT NULL,
    pricing_model VARCHAR(50) NOT NULL DEFAULT 'per_execution',
    description TEXT NOT NULL,
    features JSONB NOT NULL DEFAULT '[]',
    terms_of_service TEXT,
    privacy_policy TEXT,
    rating NUMERIC(3, 2),
    total_ratings INTEGER NOT NULL DEFAULT 0,
    installs INTEGER NOT NULL DEFAULT 0,
    monthly_revenue NUMERIC(20, 8) NOT NULL DEFAULT 0,
    status listing_status NOT NULL DEFAULT 'draft',
    tags TEXT[] NOT NULL DEFAULT '{}',
    demo_url VARCHAR(500),
    documentation_url VARCHAR(500),
    support_url VARCHAR(500),
    listed_at TIMESTAMPTZ,
    featured BOOLEAN NOT NULL DEFAULT false,
    featured_until TIMESTAMPTZ,
    
    CONSTRAINT positive_price CHECK (price >= 0),
    CONSTRAINT rating_range CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
    CONSTRAINT valid_pricing_model CHECK (pricing_model IN ('per_execution', 'subscription', 'usage_based', 'free'))
);

-- Create indexes for agent_marketplace_listings
CREATE INDEX idx_agent_marketplace_agent_id ON agent_marketplace_listings(agent_id);
CREATE INDEX idx_agent_marketplace_status ON agent_marketplace_listings(status);
CREATE INDEX idx_agent_marketplace_rating ON agent_marketplace_listings(rating DESC NULLS LAST);
CREATE INDEX idx_agent_marketplace_installs ON agent_marketplace_listings(installs DESC);
CREATE INDEX idx_agent_marketplace_revenue ON agent_marketplace_listings(monthly_revenue DESC);
CREATE INDEX idx_agent_marketplace_listed_at ON agent_marketplace_listings(listed_at DESC);
CREATE INDEX idx_agent_marketplace_featured ON agent_marketplace_listings(featured, featured_until);
CREATE INDEX idx_agent_marketplace_tags ON agent_marketplace_listings USING GIN(tags);
CREATE INDEX idx_agent_marketplace_features ON agent_marketplace_listings USING GIN(features);

-- Agent installations table
CREATE TABLE agent_installations (
    id BIGSERIAL PRIMARY KEY,
    agent_id BIGINT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    config JSONB NOT NULL DEFAULT '{}',
    active BOOLEAN NOT NULL DEFAULT true,
    total_executions INTEGER NOT NULL DEFAULT 0,
    total_spent NUMERIC(20, 8) NOT NULL DEFAULT 0,
    installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    uninstalled_at TIMESTAMPTZ,
    
    CONSTRAINT unique_user_agent_install UNIQUE (user_id, agent_id)
);

-- Create indexes for agent_installations
CREATE INDEX idx_agent_installations_agent_id ON agent_installations(agent_id);
CREATE INDEX idx_agent_installations_user_id ON agent_installations(user_id);
CREATE INDEX idx_agent_installations_tenant_id ON agent_installations(tenant_id);
CREATE INDEX idx_agent_installations_active ON agent_installations(active);
CREATE INDEX idx_agent_installations_installed_at ON agent_installations(installed_at DESC);

-- Agent reviews table
CREATE TABLE agent_reviews (
    id BIGSERIAL PRIMARY KEY,
    agent_id BIGINT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating NUMERIC(3, 2) NOT NULL,
    review TEXT,
    helpful_count INTEGER NOT NULL DEFAULT 0,
    verified_purchase BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_user_agent_review UNIQUE (user_id, agent_id),
    CONSTRAINT rating_range CHECK (rating >= 0 AND rating <= 5)
);

-- Create indexes for agent_reviews
CREATE INDEX idx_agent_reviews_agent_id ON agent_reviews(agent_id);
CREATE INDEX idx_agent_reviews_user_id ON agent_reviews(user_id);
CREATE INDEX idx_agent_reviews_rating ON agent_reviews(rating DESC);
CREATE INDEX idx_agent_reviews_created_at ON agent_reviews(created_at DESC);
CREATE INDEX idx_agent_reviews_verified ON agent_reviews(verified_purchase);

-- Function to update agent stats on execution completion
CREATE OR REPLACE FUNCTION update_agent_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE agents
        SET 
            total_executions = total_executions + 1,
            successful_executions = successful_executions + 1,
            total_cost = total_cost + COALESCE(NEW.cost, 0),
            total_revenue = total_revenue + COALESCE(NEW.revenue, 0),
            last_execution_at = NEW.completed_at,
            updated_at = NOW()
        WHERE id = NEW.agent_id;
    ELSIF NEW.status = 'failed' AND OLD.status != 'failed' THEN
        UPDATE agents
        SET 
            total_executions = total_executions + 1,
            failed_executions = failed_executions + 1,
            total_cost = total_cost + COALESCE(NEW.cost, 0),
            last_execution_at = NEW.completed_at,
            updated_at = NOW()
        WHERE id = NEW.agent_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update agent stats
CREATE TRIGGER update_agent_stats_trigger
    AFTER UPDATE ON agent_executions
    FOR EACH ROW EXECUTE FUNCTION update_agent_stats();

-- Function to update agent rating
CREATE OR REPLACE FUNCTION update_agent_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE agents a
    SET average_rating = (
        SELECT AVG(rating)
        FROM agent_reviews
        WHERE agent_id = NEW.agent_id
    ),
    updated_at = NOW()
    WHERE id = NEW.agent_id;
    
    UPDATE agent_marketplace_listings
    SET rating = (
        SELECT AVG(rating)
        FROM agent_reviews
        WHERE agent_id = NEW.agent_id
    ),
    total_ratings = (
        SELECT COUNT(*)
        FROM agent_reviews
        WHERE agent_id = NEW.agent_id
    )
    WHERE agent_id = NEW.agent_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update agent rating
CREATE TRIGGER update_agent_rating_trigger
    AFTER INSERT OR UPDATE ON agent_reviews
    FOR EACH ROW EXECUTE FUNCTION update_agent_rating();

-- Update timestamps triggers
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_reviews_updated_at BEFORE UPDATE ON agent_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY tenant_isolation_policy ON agents
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT);

CREATE POLICY tenant_isolation_policy ON agent_executions
    USING (
        agent_id IN (
            SELECT id FROM agents 
            WHERE tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT
        )
    );

CREATE POLICY tenant_isolation_policy ON agent_memory
    USING (
        agent_id IN (
            SELECT id FROM agents 
            WHERE tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT
        )
    );

CREATE POLICY tenant_isolation_policy ON agent_installations
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT);

-- Rollback
-- DROP POLICY IF EXISTS tenant_isolation_policy ON agent_installations;
-- DROP POLICY IF EXISTS tenant_isolation_policy ON agent_memory;
-- DROP POLICY IF EXISTS tenant_isolation_policy ON agent_executions;
-- DROP POLICY IF EXISTS tenant_isolation_policy ON agents;
-- DROP TRIGGER IF EXISTS update_agent_reviews_updated_at ON agent_reviews;
-- DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
-- DROP TRIGGER IF EXISTS update_agent_rating_trigger ON agent_reviews;
-- DROP TRIGGER IF EXISTS update_agent_stats_trigger ON agent_executions;
-- DROP FUNCTION IF EXISTS update_agent_rating CASCADE;
-- DROP FUNCTION IF EXISTS update_agent_stats CASCADE;
-- DROP TABLE IF EXISTS agent_reviews CASCADE;
-- DROP TABLE IF EXISTS agent_installations CASCADE;
-- DROP TABLE IF EXISTS agent_marketplace_listings CASCADE;
-- DROP TABLE IF EXISTS agent_memory CASCADE;
-- DROP TABLE IF EXISTS agent_executions CASCADE;
-- DROP TABLE IF EXISTS agents CASCADE;
-- DROP TYPE IF EXISTS listing_status CASCADE;
-- DROP TYPE IF EXISTS memory_type CASCADE;
-- DROP TYPE IF EXISTS execution_status CASCADE;
-- DROP TYPE IF EXISTS agent_status CASCADE;
-- DROP TYPE IF EXISTS agent_type CASCADE;
