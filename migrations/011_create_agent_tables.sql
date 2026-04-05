-- Agent Control Plane Tables

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    config JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deployed_at TIMESTAMP,
    last_executed_at TIMESTAMP,
    execution_count INTEGER NOT NULL DEFAULT 0,
    total_tokens_used BIGINT NOT NULL DEFAULT 0,
    total_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0,
    marketplace_listing_id UUID,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES keycloak_users(id) ON DELETE CASCADE
);

-- Indexes for agents
CREATE INDEX idx_agents_user_id ON agents(user_id);
CREATE INDEX idx_agents_type ON agents(type);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_created_at ON agents(created_at DESC);

-- Agent execution logs
CREATE TABLE IF NOT EXISTS agent_execution_logs (
    id UUID PRIMARY KEY,
    agent_id UUID NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    status VARCHAR(50) NOT NULL,
    input JSONB,
    output JSONB,
    error TEXT,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    cost DECIMAL(10, 4) NOT NULL DEFAULT 0,
    execution_time_ms INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT fk_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Indexes for execution logs
CREATE INDEX idx_execution_logs_agent_id ON agent_execution_logs(agent_id);
CREATE INDEX idx_execution_logs_started_at ON agent_execution_logs(started_at DESC);
CREATE INDEX idx_execution_logs_status ON agent_execution_logs(status);

-- Agent Runner Tables

-- Agent episodic memory (PostgreSQL-based)
CREATE TABLE IF NOT EXISTS agent_episodic_memory (
    id UUID PRIMARY KEY,
    agent_id UUID NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_agent_memory FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Indexes for episodic memory
CREATE INDEX idx_episodic_memory_agent_id ON agent_episodic_memory(agent_id);
CREATE INDEX idx_episodic_memory_created_at ON agent_episodic_memory(created_at DESC);
CREATE INDEX idx_episodic_memory_content ON agent_episodic_memory USING gin(to_tsvector('english', content));

-- Agent artifacts (MinIO metadata)
CREATE TABLE IF NOT EXISTS agent_artifacts (
    id UUID PRIMARY KEY,
    agent_id UUID NOT NULL,
    execution_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    path TEXT NOT NULL,
    size BIGINT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_agent_artifact FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    CONSTRAINT fk_execution_artifact FOREIGN KEY (execution_id) REFERENCES agent_execution_logs(id) ON DELETE CASCADE
);

-- Indexes for artifacts
CREATE INDEX idx_artifacts_agent_id ON agent_artifacts(agent_id);
CREATE INDEX idx_artifacts_execution_id ON agent_artifacts(execution_id);
CREATE INDEX idx_artifacts_created_at ON agent_artifacts(created_at DESC);

-- Agent execution state (for pause/resume)
CREATE TABLE IF NOT EXISTS agent_execution_state (
    id UUID PRIMARY KEY,
    agent_id UUID NOT NULL,
    execution_id UUID NOT NULL,
    state JSONB NOT NULL,
    checkpoint INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_agent_state FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    CONSTRAINT fk_execution_state FOREIGN KEY (execution_id) REFERENCES agent_execution_logs(id) ON DELETE CASCADE
);

-- Indexes for execution state
CREATE INDEX idx_execution_state_agent_id ON agent_execution_state(agent_id);
CREATE INDEX idx_execution_state_execution_id ON agent_execution_state(execution_id);

-- Agent versions (for version management)
CREATE TABLE IF NOT EXISTS agent_versions (
    id UUID PRIMARY KEY,
    agent_id UUID NOT NULL,
    version VARCHAR(20) NOT NULL,
    config JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT fk_agent_version FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    CONSTRAINT unique_agent_version UNIQUE (agent_id, version)
);

-- Indexes for versions
CREATE INDEX idx_agent_versions_agent_id ON agent_versions(agent_id);
CREATE INDEX idx_agent_versions_created_at ON agent_versions(created_at DESC);
CREATE INDEX idx_agent_versions_active ON agent_versions(is_active) WHERE is_active = true;

-- Agent deployments (deployment history)
CREATE TABLE IF NOT EXISTS agent_deployments (
    id UUID PRIMARY KEY,
    agent_id UUID NOT NULL,
    version_id UUID NOT NULL,
    strategy VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    config JSONB,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    deployed_by UUID NOT NULL,
    CONSTRAINT fk_agent_deployment FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    CONSTRAINT fk_version_deployment FOREIGN KEY (version_id) REFERENCES agent_versions(id) ON DELETE CASCADE
);

-- Indexes for deployments
CREATE INDEX idx_deployments_agent_id ON agent_deployments(agent_id);
CREATE INDEX idx_deployments_version_id ON agent_deployments(version_id);
CREATE INDEX idx_deployments_started_at ON agent_deployments(started_at DESC);

-- Keycloak users reference table (if not exists)
CREATE TABLE IF NOT EXISTS keycloak_users (
    id UUID PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Agent permissions (OPA integration)
CREATE TABLE IF NOT EXISTS agent_permissions (
    id UUID PRIMARY KEY,
    agent_id UUID NOT NULL,
    permission VARCHAR(255) NOT NULL,
    resource VARCHAR(255),
    action VARCHAR(100),
    granted_at TIMESTAMP NOT NULL DEFAULT NOW(),
    granted_by UUID NOT NULL,
    CONSTRAINT fk_agent_permission FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    CONSTRAINT unique_agent_permission UNIQUE (agent_id, permission, resource, action)
);

-- Indexes for permissions
CREATE INDEX idx_permissions_agent_id ON agent_permissions(agent_id);

-- Agent rate limits (tracking)
CREATE TABLE IF NOT EXISTS agent_rate_limits (
    id UUID PRIMARY KEY,
    agent_id UUID NOT NULL,
    resource VARCHAR(100) NOT NULL,
    current_usage INTEGER NOT NULL DEFAULT 0,
    max_limit INTEGER NOT NULL,
    window_start TIMESTAMP NOT NULL,
    window_end TIMESTAMP NOT NULL,
    CONSTRAINT fk_agent_rate_limit FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    CONSTRAINT unique_agent_resource_window UNIQUE (agent_id, resource, window_start)
);

-- Indexes for rate limits
CREATE INDEX idx_rate_limits_agent_id ON agent_rate_limits(agent_id);
CREATE INDEX idx_rate_limits_window ON agent_rate_limits(window_start, window_end);
