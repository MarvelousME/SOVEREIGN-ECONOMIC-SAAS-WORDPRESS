-- Agent Control Plane Mission Schema
-- Supports full planner/executor/reviewer/publisher loop

-- Agent Missions Table
CREATE TABLE IF NOT EXISTS agent_missions (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    workspace_id UUID NOT NULL,
    objective TEXT NOT NULL,
    entity_ref VARCHAR(255),
    context_package JSONB NOT NULL DEFAULT '{}',
    tool_permissions JSONB NOT NULL DEFAULT '[]',
    policy_constraints JSONB NOT NULL DEFAULT '[]',
    approval_policy JSONB NOT NULL DEFAULT '{"type": "auto"}',
    success_metric JSONB NOT NULL DEFAULT '{}',
    time_budget INTEGER NOT NULL DEFAULT 3600,
    cost_budget DECIMAL(10, 4) NOT NULL DEFAULT 10.0000,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    priority INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_by UUID NOT NULL,
    assigned_to UUID,
    parent_mission_id UUID REFERENCES agent_missions(id),
    tags TEXT[] DEFAULT '{}'
);

CREATE INDEX idx_missions_tenant ON agent_missions(tenant_id);
CREATE INDEX idx_missions_workspace ON agent_missions(workspace_id);
CREATE INDEX idx_missions_status ON agent_missions(status);
CREATE INDEX idx_missions_created_at ON agent_missions(created_at DESC);
CREATE INDEX idx_missions_assigned_to ON agent_missions(assigned_to);
CREATE INDEX idx_missions_parent ON agent_missions(parent_mission_id);

-- Agent Tasks Table (Task Graph)
CREATE TABLE IF NOT EXISTS agent_tasks (
    id UUID PRIMARY KEY,
    mission_id UUID NOT NULL REFERENCES agent_missions(id) ON DELETE CASCADE,
    task_index INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(50) NOT NULL,
    tool_name VARCHAR(100),
    tool_params JSONB DEFAULT '{}',
    dependencies UUID[] DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    result JSONB,
    error TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    estimated_duration_ms INTEGER,
    actual_duration_ms INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_mission ON agent_tasks(mission_id);
CREATE INDEX idx_tasks_status ON agent_tasks(status);
CREATE INDEX idx_tasks_type ON agent_tasks(task_type);

-- Agent Artifacts Table
CREATE TABLE IF NOT EXISTS agent_artifacts (
    id UUID PRIMARY KEY,
    mission_id UUID NOT NULL REFERENCES agent_missions(id) ON DELETE CASCADE,
    task_id UUID REFERENCES agent_tasks(id),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    validation_status VARCHAR(50) DEFAULT 'pending',
    validation_errors JSONB DEFAULT '[]',
    quality_score DECIMAL(5, 4),
    published_at TIMESTAMP,
    published_by UUID,
    cdn_url VARCHAR(500),
    size_bytes INTEGER,
    checksum VARCHAR(64),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_artifacts_mission ON agent_artifacts(mission_id);
CREATE INDEX idx_artifacts_task ON agent_artifacts(task_id);
CREATE INDEX idx_artifacts_status ON agent_artifacts(validation_status);
CREATE INDEX idx_artifacts_type ON agent_artifacts(type);

-- Agent Approvals Table
CREATE TABLE IF NOT EXISTS agent_approvals (
    id UUID PRIMARY KEY,
    mission_id UUID NOT NULL REFERENCES agent_missions(id) ON DELETE CASCADE,
    artifact_ids UUID[] DEFAULT '{}',
    requested_by UUID NOT NULL,
    requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
    approved_by UUID,
    approved_at TIMESTAMP,
    rejected_by UUID,
    rejected_at TIMESTAMP,
    rejection_reason TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    priority INTEGER NOT NULL DEFAULT 0,
    due_at TIMESTAMP,
    notification_sent BOOLEAN DEFAULT FALSE,
    comments JSONB DEFAULT '[]'
);

CREATE INDEX idx_approvals_mission ON agent_approvals(mission_id);
CREATE INDEX idx_approvals_status ON agent_approvals(status);
CREATE INDEX idx_approvals_requested_at ON agent_approvals(requested_at DESC);

-- Agent Rollback Tokens Table
CREATE TABLE IF NOT EXISTS agent_rollback_tokens (
    id UUID PRIMARY KEY,
    mission_id UUID NOT NULL REFERENCES agent_missions(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    action_type VARCHAR(50) NOT NULL,
    target_state JSONB NOT NULL,
    previous_state JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    used_by UUID,
    status VARCHAR(50) NOT NULL DEFAULT 'active'
);

CREATE INDEX idx_rollback_tokens_token ON agent_rollback_tokens(token);
CREATE INDEX idx_rollback_tokens_mission ON agent_rollback_tokens(mission_id);
CREATE INDEX idx_rollback_tokens_expires ON agent_rollback_tokens(expires_at);

-- Agent Tool Permissions Table
CREATE TABLE IF NOT EXISTS agent_tool_permissions (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    tool_name VARCHAR(100) NOT NULL,
    tool_category VARCHAR(50),
    description TEXT,
    risk_level VARCHAR(20) DEFAULT 'low',
    requires_approval BOOLEAN DEFAULT FALSE,
    max_calls_per_hour INTEGER,
    config_schema JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tool_perms_tenant ON agent_tool_permissions(tenant_id);
CREATE INDEX idx_tool_perms_name ON agent_tool_permissions(tool_name);

-- Agent Policy Rules Table
CREATE TABLE IF NOT EXISTS agent_policy_rules (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rule_type VARCHAR(50) NOT NULL,
    resource_pattern VARCHAR(255),
    action_pattern VARCHAR(255),
    conditions JSONB DEFAULT '{}',
    effect VARCHAR(10) NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    enabled BOOLEAN DEFAULT TRUE,
    opa_policy_path VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_policy_rules_tenant ON agent_policy_rules(tenant_id);
CREATE INDEX idx_policy_rules_type ON agent_policy_rules(rule_type);
CREATE INDEX idx_policy_rules_enabled ON agent_policy_rules(enabled);

-- Agent Execution Logs Table
CREATE TABLE IF NOT EXISTS agent_execution_logs (
    id UUID PRIMARY KEY,
    mission_id UUID NOT NULL REFERENCES agent_missions(id) ON DELETE CASCADE,
    task_id UUID REFERENCES agent_tasks(id),
    log_level VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exec_logs_mission ON agent_execution_logs(mission_id);
CREATE INDEX idx_exec_logs_task ON agent_execution_logs(task_id);
CREATE INDEX idx_exec_logs_level ON agent_execution_logs(log_level);
CREATE INDEX idx_exec_logs_created ON agent_execution_logs(created_at DESC);

-- Agent Events Table
CREATE TABLE IF NOT EXISTS agent_events (
    id UUID PRIMARY KEY,
    mission_id UUID REFERENCES agent_missions(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    source VARCHAR(50) NOT NULL,
    payload JSONB DEFAULT '{}',
    correlation_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_mission ON agent_events(mission_id);
CREATE INDEX idx_events_type ON agent_events(event_type);
CREATE INDEX idx_events_created ON agent_events(created_at DESC);

-- Agent Memory Context Table
CREATE TABLE IF NOT EXISTS agent_memory_context (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    memory_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    embedding_id VARCHAR(255),
    relevance_score DECIMAL(5, 4),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP
);

CREATE INDEX idx_memory_tenant ON agent_memory_context(tenant_id);
CREATE INDEX idx_memory_entity ON agent_memory_context(entity_type, entity_id);
CREATE INDEX idx_memory_type ON agent_memory_context(memory_type);
CREATE INDEX idx_memory_embedding ON agent_memory_context(embedding_id);

-- Dry Run Results Table
CREATE TABLE IF NOT EXISTS agent_dry_runs (
    id UUID PRIMARY KEY,
    mission_id UUID REFERENCES agent_missions(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL,
    workspace_id UUID NOT NULL,
    input_snapshot JSONB NOT NULL,
    simulation_result JSONB NOT NULL,
    estimated_cost DECIMAL(10, 4),
    estimated_duration_ms INTEGER,
    risk_assessment JSONB DEFAULT '{}',
    policy_violations JSONB DEFAULT '[]',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_dry_runs_tenant ON agent_dry_runs(tenant_id);
CREATE INDEX idx_dry_runs_mission ON agent_dry_runs(mission_id);
