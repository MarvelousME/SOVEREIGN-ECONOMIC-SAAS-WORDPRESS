-- Migration: 011_create_notifications_events_schema.sql
-- Description: Create notifications and event streaming tables
-- Created: 2026-03-26

-- Create enum types
CREATE TYPE notification_type AS ENUM ('info', 'success', 'warning', 'error', 'task', 'reward', 'governance', 'system');
CREATE TYPE notification_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE notification_channel AS ENUM ('in_app', 'email', 'sms', 'push', 'webhook');
CREATE TYPE delivery_status AS ENUM ('pending', 'sent', 'delivered', 'failed', 'bounced');

-- Notifications table
CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    notification_type notification_type NOT NULL,
    priority notification_priority NOT NULL DEFAULT 'medium',
    title VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    action_url VARCHAR(500),
    action_label VARCHAR(100),
    data JSONB NOT NULL DEFAULT '{}',
    read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    archived BOOLEAN NOT NULL DEFAULT false,
    archived_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    CONSTRAINT valid_read_at CHECK (NOT read OR read_at IS NOT NULL),
    CONSTRAINT valid_archived_at CHECK (NOT archived OR archived_at IS NOT NULL)
);

-- Create indexes for notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX idx_notifications_type ON notifications(notification_type);
CREATE INDEX idx_notifications_priority ON notifications(priority);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_archived ON notifications(archived);
CREATE INDEX idx_notifications_sent_at ON notifications(sent_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read) WHERE NOT read;
CREATE INDEX idx_notifications_expires_at ON notifications(expires_at);
CREATE INDEX idx_notifications_data ON notifications USING GIN(data);

-- Notification preferences table
CREATE TABLE notification_preferences (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    notification_type notification_type NOT NULL,
    channels notification_channel[] NOT NULL DEFAULT '{}',
    enabled BOOLEAN NOT NULL DEFAULT true,
    frequency VARCHAR(50) NOT NULL DEFAULT 'immediate',
    quiet_hours JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (user_id, tenant_id, notification_type)
);

-- Create indexes for notification_preferences
CREATE INDEX idx_notification_prefs_user_id ON notification_preferences(user_id);
CREATE INDEX idx_notification_prefs_tenant_id ON notification_preferences(tenant_id);
CREATE INDEX idx_notification_prefs_enabled ON notification_preferences(enabled);

-- Notification delivery log table
CREATE TABLE notification_deliveries (
    id BIGSERIAL PRIMARY KEY,
    notification_id BIGINT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    channel notification_channel NOT NULL,
    status delivery_status NOT NULL DEFAULT 'pending',
    recipient VARCHAR(500) NOT NULL,
    provider VARCHAR(100),
    provider_message_id VARCHAR(255),
    error_message TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for notification_deliveries
CREATE INDEX idx_notification_deliveries_notification_id ON notification_deliveries(notification_id);
CREATE INDEX idx_notification_deliveries_channel ON notification_deliveries(channel);
CREATE INDEX idx_notification_deliveries_status ON notification_deliveries(status);
CREATE INDEX idx_notification_deliveries_created_at ON notification_deliveries(created_at DESC);
CREATE INDEX idx_notification_deliveries_provider_msg_id ON notification_deliveries(provider_message_id);

-- Event streams table
CREATE TABLE event_streams (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT REFERENCES tenants(id) ON DELETE CASCADE,
    stream_name VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    aggregate_id VARCHAR(255),
    aggregate_type VARCHAR(100),
    payload JSONB NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    correlation_id VARCHAR(255),
    causation_id VARCHAR(255),
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed BOOLEAN NOT NULL DEFAULT false,
    processed_at TIMESTAMPTZ,
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT
);

-- Create indexes for event_streams
CREATE INDEX idx_event_streams_tenant_id ON event_streams(tenant_id);
CREATE INDEX idx_event_streams_stream_name ON event_streams(stream_name);
CREATE INDEX idx_event_streams_event_type ON event_streams(event_type);
CREATE INDEX idx_event_streams_aggregate ON event_streams(aggregate_type, aggregate_id);
CREATE INDEX idx_event_streams_published_at ON event_streams(published_at DESC);
CREATE INDEX idx_event_streams_processed ON event_streams(processed);
CREATE INDEX idx_event_streams_correlation_id ON event_streams(correlation_id);
CREATE INDEX idx_event_streams_causation_id ON event_streams(causation_id);
CREATE INDEX idx_event_streams_payload ON event_streams USING GIN(payload);
CREATE INDEX idx_event_streams_metadata ON event_streams USING GIN(metadata);

-- Event subscriptions table
CREATE TABLE event_subscriptions (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    event_types TEXT[] NOT NULL,
    stream_names TEXT[],
    filter_expression JSONB,
    webhook_url VARCHAR(500),
    webhook_secret VARCHAR(255),
    active BOOLEAN NOT NULL DEFAULT true,
    last_event_id BIGINT,
    last_processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    
    CONSTRAINT unique_tenant_subscription_name UNIQUE (tenant_id, name)
);

-- Create indexes for event_subscriptions
CREATE INDEX idx_event_subscriptions_tenant_id ON event_subscriptions(tenant_id);
CREATE INDEX idx_event_subscriptions_active ON event_subscriptions(active);
CREATE INDEX idx_event_subscriptions_event_types ON event_subscriptions USING GIN(event_types);

-- Webhooks table
CREATE TABLE webhooks (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    secret VARCHAR(255) NOT NULL,
    events TEXT[] NOT NULL,
    headers JSONB NOT NULL DEFAULT '{}',
    active BOOLEAN NOT NULL DEFAULT true,
    verify_ssl BOOLEAN NOT NULL DEFAULT true,
    timeout_seconds INTEGER NOT NULL DEFAULT 30,
    max_retries INTEGER NOT NULL DEFAULT 3,
    last_triggered_at TIMESTAMPTZ,
    last_status delivery_status,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    
    CONSTRAINT unique_tenant_webhook_name UNIQUE (tenant_id, name),
    CONSTRAINT positive_timeout CHECK (timeout_seconds > 0),
    CONSTRAINT valid_retries CHECK (max_retries >= 0)
);

-- Create indexes for webhooks
CREATE INDEX idx_webhooks_tenant_id ON webhooks(tenant_id);
CREATE INDEX idx_webhooks_active ON webhooks(active);
CREATE INDEX idx_webhooks_events ON webhooks USING GIN(events);
CREATE INDEX idx_webhooks_last_triggered ON webhooks(last_triggered_at DESC);

-- Webhook deliveries table
CREATE TABLE webhook_deliveries (
    id BIGSERIAL PRIMARY KEY,
    webhook_id BIGINT NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event_id BIGINT REFERENCES event_streams(id) ON DELETE CASCADE,
    status delivery_status NOT NULL DEFAULT 'pending',
    request_headers JSONB,
    request_body JSONB,
    response_status INTEGER,
    response_headers JSONB,
    response_body TEXT,
    error_message TEXT,
    duration_ms INTEGER,
    attempts INTEGER NOT NULL DEFAULT 0,
    next_retry_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ
);

-- Create indexes for webhook_deliveries
CREATE INDEX idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_event_id ON webhook_deliveries(event_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_created_at ON webhook_deliveries(created_at DESC);
CREATE INDEX idx_webhook_deliveries_next_retry ON webhook_deliveries(next_retry_at) WHERE status = 'failed';

-- Function to auto-archive old notifications
CREATE OR REPLACE FUNCTION auto_archive_notifications()
RETURNS void AS $$
BEGIN
    UPDATE notifications
    SET archived = true, archived_at = NOW()
    WHERE read = true 
        AND read_at < NOW() - INTERVAL '30 days'
        AND archived = false;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM notifications
    WHERE archived = true 
        AND archived_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Function to publish event
CREATE OR REPLACE FUNCTION publish_event(
    p_tenant_id BIGINT,
    p_stream_name VARCHAR,
    p_event_type VARCHAR,
    p_payload JSONB,
    p_aggregate_id VARCHAR DEFAULT NULL,
    p_aggregate_type VARCHAR DEFAULT NULL,
    p_user_id BIGINT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS BIGINT AS $$
DECLARE
    event_id BIGINT;
BEGIN
    INSERT INTO event_streams (
        tenant_id, stream_name, event_type, payload, 
        aggregate_id, aggregate_type, user_id, metadata
    )
    VALUES (
        p_tenant_id, p_stream_name, p_event_type, p_payload,
        p_aggregate_id, p_aggregate_type, p_user_id, p_metadata
    )
    RETURNING id INTO event_id;
    
    RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- Update timestamps trigger
CREATE TRIGGER update_notification_prefs_updated_at BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY tenant_isolation_policy ON notifications
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT);

CREATE POLICY tenant_isolation_policy ON notification_preferences
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT);

CREATE POLICY tenant_isolation_policy ON notification_deliveries
    USING (
        notification_id IN (
            SELECT id FROM notifications 
            WHERE tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT
        )
    );

CREATE POLICY tenant_isolation_policy ON event_streams
    USING (tenant_id IS NULL OR tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT);

CREATE POLICY tenant_isolation_policy ON event_subscriptions
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT);

CREATE POLICY tenant_isolation_policy ON webhooks
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT);

CREATE POLICY tenant_isolation_policy ON webhook_deliveries
    USING (
        webhook_id IN (
            SELECT id FROM webhooks 
            WHERE tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT
        )
    );

-- Rollback
-- DROP POLICY IF EXISTS tenant_isolation_policy ON webhook_deliveries;
-- DROP POLICY IF EXISTS tenant_isolation_policy ON webhooks;
-- DROP POLICY IF EXISTS tenant_isolation_policy ON event_subscriptions;
-- DROP POLICY IF EXISTS tenant_isolation_policy ON event_streams;
-- DROP POLICY IF EXISTS tenant_isolation_policy ON notification_deliveries;
-- DROP POLICY IF EXISTS tenant_isolation_policy ON notification_preferences;
-- DROP POLICY IF EXISTS tenant_isolation_policy ON notifications;
-- DROP TRIGGER IF EXISTS update_notification_prefs_updated_at ON notification_preferences;
-- DROP FUNCTION IF EXISTS publish_event CASCADE;
-- DROP FUNCTION IF EXISTS cleanup_old_notifications CASCADE;
-- DROP FUNCTION IF EXISTS auto_archive_notifications CASCADE;
-- DROP TABLE IF EXISTS webhook_deliveries CASCADE;
-- DROP TABLE IF EXISTS webhooks CASCADE;
-- DROP TABLE IF EXISTS event_subscriptions CASCADE;
-- DROP TABLE IF EXISTS event_streams CASCADE;
-- DROP TABLE IF EXISTS notification_deliveries CASCADE;
-- DROP TABLE IF EXISTS notification_preferences CASCADE;
-- DROP TABLE IF EXISTS notifications CASCADE;
-- DROP TYPE IF EXISTS delivery_status CASCADE;
-- DROP TYPE IF EXISTS notification_channel CASCADE;
-- DROP TYPE IF EXISTS notification_priority CASCADE;
-- DROP TYPE IF EXISTS notification_type CASCADE;
