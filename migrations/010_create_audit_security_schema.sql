-- Migration: 010_create_audit_security_schema.sql
-- Description: Create audit and security tables
-- Created: 2026-03-26

-- Create enum types
CREATE TYPE audit_action AS ENUM ('create', 'read', 'update', 'delete', 'login', 'logout', 'permission_change', 'config_change');
CREATE TYPE policy_decision AS ENUM ('allow', 'deny');
CREATE TYPE security_event_type AS ENUM ('login_failure', 'rate_limit', 'suspicious_activity', 'data_breach', 'unauthorized_access', 'malware_detected');
CREATE TYPE severity_level AS ENUM ('low', 'medium', 'high', 'critical');

-- Audit logs table
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    action audit_action NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    request_id VARCHAR(255),
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for audit_logs
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_ip_address ON audit_logs(ip_address);
CREATE INDEX idx_audit_logs_session_id ON audit_logs(session_id);
CREATE INDEX idx_audit_logs_request_id ON audit_logs(request_id);
CREATE INDEX idx_audit_logs_changes ON audit_logs USING GIN(changes);
CREATE INDEX idx_audit_logs_metadata ON audit_logs USING GIN(metadata);

-- Partition audit_logs by month for better performance
-- Note: This would need to be set up with actual partitioning commands

-- Policy decisions table (for ABAC/RBAC logging)
CREATE TABLE policy_decisions (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    subject VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(255) NOT NULL,
    decision policy_decision NOT NULL,
    reason TEXT,
    policy_version VARCHAR(50),
    context JSONB NOT NULL DEFAULT '{}',
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for policy_decisions
CREATE INDEX idx_policy_decisions_tenant_id ON policy_decisions(tenant_id);
CREATE INDEX idx_policy_decisions_user_id ON policy_decisions(user_id);
CREATE INDEX idx_policy_decisions_decision ON policy_decisions(decision);
CREATE INDEX idx_policy_decisions_evaluated_at ON policy_decisions(evaluated_at DESC);
CREATE INDEX idx_policy_decisions_subject_action ON policy_decisions(subject, action);
CREATE INDEX idx_policy_decisions_context ON policy_decisions USING GIN(context);

-- Security events table
CREATE TABLE security_events (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT REFERENCES tenants(id) ON DELETE CASCADE,
    event_type security_event_type NOT NULL,
    severity severity_level NOT NULL,
    source VARCHAR(255) NOT NULL,
    target VARCHAR(255),
    description TEXT NOT NULL,
    ip_address INET,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT
);

-- Create indexes for security_events
CREATE INDEX idx_security_events_tenant_id ON security_events(tenant_id);
CREATE INDEX idx_security_events_type ON security_events(event_type);
CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_detected_at ON security_events(detected_at DESC);
CREATE INDEX idx_security_events_resolved_at ON security_events(resolved_at);
CREATE INDEX idx_security_events_user_id ON security_events(user_id);
CREATE INDEX idx_security_events_ip_address ON security_events(ip_address);
CREATE INDEX idx_security_events_metadata ON security_events USING GIN(metadata);

-- Rate limiting tracking table
CREATE TABLE rate_limit_buckets (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT REFERENCES tenants(id) ON DELETE CASCADE,
    identifier VARCHAR(255) NOT NULL,
    bucket_type VARCHAR(100) NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    reset_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_bucket UNIQUE (tenant_id, identifier, bucket_type, reset_at)
);

-- Create indexes for rate_limit_buckets
CREATE INDEX idx_rate_limit_tenant_id ON rate_limit_buckets(tenant_id);
CREATE INDEX idx_rate_limit_identifier ON rate_limit_buckets(identifier);
CREATE INDEX idx_rate_limit_type ON rate_limit_buckets(bucket_type);
CREATE INDEX idx_rate_limit_reset_at ON rate_limit_buckets(reset_at);

-- API keys table
CREATE TABLE api_keys (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    service_account_id BIGINT REFERENCES service_accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    key_prefix VARCHAR(20) NOT NULL,
    scopes TEXT[] NOT NULL DEFAULT '{}',
    rate_limit INTEGER,
    last_used_at TIMESTAMPTZ,
    last_used_ip INET,
    expires_at TIMESTAMPTZ,
    revoked BOOLEAN NOT NULL DEFAULT false,
    revoked_at TIMESTAMPTZ,
    revoked_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT has_owner CHECK (user_id IS NOT NULL OR service_account_id IS NOT NULL)
);

-- Create indexes for api_keys
CREATE INDEX idx_api_keys_tenant_id ON api_keys(tenant_id);
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_service_account_id ON api_keys(service_account_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_revoked ON api_keys(revoked);
CREATE INDEX idx_api_keys_expires_at ON api_keys(expires_at);
CREATE INDEX idx_api_keys_last_used_at ON api_keys(last_used_at DESC);

-- Sessions table
CREATE TABLE sessions (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL UNIQUE,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    data JSONB NOT NULL DEFAULT '{}',
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for sessions
CREATE INDEX idx_sessions_session_id ON sessions(session_id);
CREATE INDEX idx_sessions_tenant_id ON sessions(tenant_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_last_activity ON sessions(last_activity_at DESC);

-- Failed login attempts table
CREATE TABLE failed_login_attempts (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT REFERENCES tenants(id) ON DELETE CASCADE,
    username VARCHAR(255) NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT,
    reason VARCHAR(255),
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for failed_login_attempts
CREATE INDEX idx_failed_logins_tenant_id ON failed_login_attempts(tenant_id);
CREATE INDEX idx_failed_logins_username ON failed_login_attempts(username);
CREATE INDEX idx_failed_logins_ip_address ON failed_login_attempts(ip_address);
CREATE INDEX idx_failed_logins_attempted_at ON failed_login_attempts(attempted_at DESC);
CREATE INDEX idx_failed_logins_username_ip ON failed_login_attempts(username, ip_address, attempted_at DESC);

-- IP whitelist/blacklist table
CREATE TABLE ip_access_control (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT REFERENCES tenants(id) ON DELETE CASCADE,
    ip_address INET NOT NULL,
    ip_range CIDR,
    list_type VARCHAR(20) NOT NULL,
    reason TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ,
    
    CONSTRAINT valid_list_type CHECK (list_type IN ('whitelist', 'blacklist'))
);

-- Create indexes for ip_access_control
CREATE INDEX idx_ip_access_tenant_id ON ip_access_control(tenant_id);
CREATE INDEX idx_ip_access_ip_address ON ip_access_control(ip_address);
CREATE INDEX idx_ip_access_ip_range ON ip_access_control USING GIST(ip_range inet_ops);
CREATE INDEX idx_ip_access_list_type ON ip_access_control(list_type);
CREATE INDEX idx_ip_access_active ON ip_access_control(active);

-- Function to cleanup old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM audit_logs
    WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM sessions
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old rate limit buckets
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS void AS $$
BEGIN
    DELETE FROM rate_limit_buckets
    WHERE reset_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_access_control ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY tenant_isolation_policy ON audit_logs
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT);

CREATE POLICY tenant_isolation_policy ON policy_decisions
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT);

CREATE POLICY tenant_isolation_policy ON security_events
    USING (tenant_id IS NULL OR tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT);

CREATE POLICY tenant_isolation_policy ON rate_limit_buckets
    USING (tenant_id IS NULL OR tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT);

CREATE POLICY tenant_isolation_policy ON api_keys
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT);

CREATE POLICY tenant_isolation_policy ON sessions
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT);

CREATE POLICY tenant_isolation_policy ON failed_login_attempts
    USING (tenant_id IS NULL OR tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT);

CREATE POLICY tenant_isolation_policy ON ip_access_control
    USING (tenant_id IS NULL OR tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT);

-- Rollback
-- DROP POLICY IF EXISTS tenant_isolation_policy ON ip_access_control;
-- DROP POLICY IF EXISTS tenant_isolation_policy ON failed_login_attempts;
-- DROP POLICY IF EXISTS tenant_isolation_policy ON sessions;
-- DROP POLICY IF EXISTS tenant_isolation_policy ON api_keys;
-- DROP POLICY IF EXISTS tenant_isolation_policy ON rate_limit_buckets;
-- DROP POLICY IF EXISTS tenant_isolation_policy ON security_events;
-- DROP POLICY IF EXISTS tenant_isolation_policy ON policy_decisions;
-- DROP POLICY IF EXISTS tenant_isolation_policy ON audit_logs;
-- DROP FUNCTION IF EXISTS cleanup_expired_rate_limits CASCADE;
-- DROP FUNCTION IF EXISTS cleanup_expired_sessions CASCADE;
-- DROP FUNCTION IF EXISTS cleanup_old_audit_logs CASCADE;
-- DROP TABLE IF EXISTS ip_access_control CASCADE;
-- DROP TABLE IF EXISTS failed_login_attempts CASCADE;
-- DROP TABLE IF EXISTS sessions CASCADE;
-- DROP TABLE IF EXISTS api_keys CASCADE;
-- DROP TABLE IF EXISTS rate_limit_buckets CASCADE;
-- DROP TABLE IF EXISTS security_events CASCADE;
-- DROP TABLE IF EXISTS policy_decisions CASCADE;
-- DROP TABLE IF EXISTS audit_logs CASCADE;
-- DROP TYPE IF EXISTS severity_level CASCADE;
-- DROP TYPE IF EXISTS security_event_type CASCADE;
-- DROP TYPE IF EXISTS policy_decision CASCADE;
-- DROP TYPE IF EXISTS audit_action CASCADE;
