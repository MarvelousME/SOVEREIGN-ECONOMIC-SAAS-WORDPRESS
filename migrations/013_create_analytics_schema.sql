-- Migration: 013_create_analytics_schema.sql
-- Foundation: Core analytics tables for event tracking, attribution, and real-time metrics

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Canonical Events Table (Partitioned by timestamp for scalability)
CREATE TABLE canonical_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id VARCHAR(255) NOT NULL UNIQUE,
    tenant_id UUID NOT NULL,
    workspace_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    source VARCHAR(100) NOT NULL,
    spec_version VARCHAR(20) DEFAULT '1.0',
    event_type_schema VARCHAR(255),
    data JSONB NOT NULL DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    correlation_id UUID,
    causation_id UUID,
    timestamp TIMESTAMPTZ NOT NULL,
    processing_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (timestamp);

CREATE TABLE canonical_events_2026_04 PARTITION OF canonical_events
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE canonical_events_2026_05 PARTITION OF canonical_events
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE canonical_events_2026_06 PARTITION OF canonical_events
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE canonical_events_2026_07 PARTITION OF canonical_events
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE canonical_events_2026_08 PARTITION OF canonical_events
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE canonical_events_2026_09 PARTITION OF canonical_events
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

CREATE INDEX idx_canonical_events_tenant ON canonical_events(tenant_id);
CREATE INDEX idx_canonical_events_workspace ON canonical_events(workspace_id);
CREATE INDEX idx_canonical_events_type ON canonical_events(event_type);
CREATE INDEX idx_canonical_events_timestamp ON canonical_events(timestamp);
CREATE INDEX idx_canonical_events_correlation ON canonical_events(correlation_id);
CREATE INDEX idx_canonical_events_data ON canonical_events USING GIN(data);

-- Attribution Touchpoints Table
CREATE TABLE attribution_touchpoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    workspace_id UUID NOT NULL,
    visitor_id VARCHAR(255) NOT NULL,
    session_id UUID NOT NULL,
    touchpoint_type VARCHAR(50) NOT NULL,
    touchpoint_id VARCHAR(255),
    touchpoint_data JSONB DEFAULT '{}',
    channel VARCHAR(100),
    source VARCHAR(100),
    medium VARCHAR(100),
    campaign VARCHAR(255),
    content VARCHAR(255),
    keyword VARCHAR(255),
    first_interaction_at TIMESTAMPTZ NOT NULL,
    last_interaction_at TIMESTAMPTZ NOT NULL,
    interaction_count INTEGER DEFAULT 1,
    conversion_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_touchpoints_tenant ON attribution_touchpoints(tenant_id);
CREATE INDEX idx_touchpoints_workspace ON attribution_touchpoints(workspace_id);
CREATE INDEX idx_touchpoints_visitor ON attribution_touchpoints(visitor_id);
CREATE INDEX idx_touchpoints_session ON attribution_touchpoints(session_id);
CREATE INDEX idx_touchpoints_conversion ON attribution_touchpoints(conversion_id);
CREATE INDEX idx_touchpoints_timestamp ON attribution_touchpoints(first_interaction_at);
CREATE INDEX idx_touchpoints_channel ON attribution_touchpoints(channel);
CREATE INDEX idx_touchpoints_type ON attribution_touchpoints(touchpoint_type);

-- Conversions Table
CREATE TABLE conversions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    workspace_id UUID NOT NULL,
    visitor_id VARCHAR(255) NOT NULL,
    session_id UUID NOT NULL,
    conversion_type VARCHAR(100) NOT NULL,
    conversion_value DECIMAL(15, 4) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    revenue DECIMAL(15, 4) DEFAULT 0,
    cost DECIMAL(15, 4) DEFAULT 0,
    touchpoints JSONB DEFAULT '[]',
    attributed_channel VARCHAR(100),
    attributed_source VARCHAR(100),
    attributed_medium VARCHAR(100),
    attributed_campaign VARCHAR(255),
    conversion_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversions_tenant ON conversions(tenant_id);
CREATE INDEX idx_conversions_workspace ON conversions(workspace_id);
CREATE INDEX idx_conversions_visitor ON conversions(visitor_id);
CREATE INDEX idx_conversions_type ON conversions(conversion_type);
CREATE INDEX idx_conversions_date ON conversions(conversion_date);
CREATE INDEX idx_conversions_channel ON conversions(attributed_channel);

-- Real-time Metrics Table
CREATE TABLE real_time_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    workspace_id UUID NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15, 4) NOT NULL,
    metric_type VARCHAR(50) NOT NULL,
    dimensions JSONB DEFAULT '{}',
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_realtime_metrics_tenant ON real_time_metrics(tenant_id);
CREATE INDEX idx_realtime_metrics_workspace ON real_time_metrics(workspace_id);
CREATE INDEX idx_realtime_metrics_name ON real_time_metrics(metric_name);
CREATE INDEX idx_realtime_metrics_recorded ON real_time_metrics(recorded_at);
CREATE INDEX idx_realtime_metrics_type ON real_time_metrics(metric_type);

-- Analytics Audit Events Table
CREATE TABLE analytics_audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    workspace_id UUID,
    actor_id UUID,
    actor_type VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_analytics_tenant ON analytics_audit_events(tenant_id);
CREATE INDEX idx_audit_analytics_timestamp ON analytics_audit_events(timestamp);
CREATE INDEX idx_audit_analytics_action ON analytics_audit_events(action);
CREATE INDEX idx_audit_analytics_resource ON analytics_audit_events(resource_type, resource_id);

-- Trigger for pg_notify on new canonical events
CREATE OR REPLACE FUNCTION notify_canonical_event()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify(
        'canonical_events_channel',
        json_build_object(
            'event_id', NEW.event_id,
            'event_type', NEW.event_type,
            'tenant_id', NEW.tenant_id,
            'workspace_id', NEW.workspace_id,
            'timestamp', NEW.timestamp
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_canonical_event
    AFTER INSERT ON canonical_events
    FOR EACH ROW EXECUTE FUNCTION notify_canonical_event();
