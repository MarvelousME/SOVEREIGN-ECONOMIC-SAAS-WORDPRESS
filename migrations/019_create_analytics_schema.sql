-- Analytics Schema Migration
-- Migration: 019_create_analytics_schema.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Canonical Events Table (Partitioned by time)
CREATE TABLE canonical_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id VARCHAR(255) NOT NULL UNIQUE,
    tenant_id UUID NOT NULL,
    workspace_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    source VARCHAR(100) NOT NULL,
    spec_version VARCHAR(20) DEFAULT '1.0',
    event_type_schema VARCHAR(255),
    data JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    correlation_id UUID,
    causation_id UUID,
    timestamp TIMESTAMPTZ NOT NULL,
    processing_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (timestamp);

-- Create partitions for the current and next months
CREATE TABLE canonical_events_2026_04 PARTITION OF canonical_events
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE canonical_events_2026_05 PARTITION OF canonical_events
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE canonical_events_2026_06 PARTITION OF canonical_events
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

-- Indexes for canonical_events
CREATE INDEX idx_canonical_events_tenant ON canonical_events(tenant_id);
CREATE INDEX idx_canonical_events_workspace ON canonical_events(workspace_id);
CREATE INDEX idx_canonical_events_type ON canonical_events(event_type);
CREATE INDEX idx_canonical_events_timestamp ON canonical_events(timestamp);
CREATE INDEX idx_canonical_events_correlation ON canonical_events(correlation_id);

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
CREATE INDEX idx_touchpoints_visitor ON attribution_touchpoints(visitor_id);
CREATE INDEX idx_touchpoints_session ON attribution_touchpoints(session_id);
CREATE INDEX idx_touchpoints_conversion ON attribution_touchpoints(conversion_id);
CREATE INDEX idx_touchpoints_timestamp ON attribution_touchpoints(first_interaction_at);

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

-- Attribution Models Table
CREATE TABLE attribution_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    workspace_id UUID NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    model_type VARCHAR(50) NOT NULL,
    config JSONB DEFAULT '{}',
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-populate default attribution models
INSERT INTO attribution_models (tenant_id, workspace_id, model_name, model_type, config, is_default, is_active) VALUES
    (uuid_nil(), uuid_nil(), 'First Touch', 'first_touch', '{"description": "Credit to first touchpoint"}', TRUE, TRUE),
    (uuid_nil(), uuid_nil(), 'Last Touch', 'last_touch', '{"description": "Credit to last touchpoint"}', FALSE, TRUE),
    (uuid_nil(), uuid_nil(), 'Linear', 'linear', '{"description": "Equal credit to all touchpoints"}', FALSE, TRUE),
    (uuid_nil(), uuid_nil(), 'Time Decay', 'time_decay', '{"description": "More credit to recent touchpoints", "decay_factor": 0.5}', FALSE, TRUE),
    (uuid_nil(), uuid_nil(), 'Position Based', 'position_based', '{"description": "40% first, 20% middle, 40% last", "first_weight": 0.4, "last_weight": 0.4, "middle_weight": 0.2}', FALSE, TRUE),
    (uuid_nil(), uuid_nil(), 'Data Driven', 'data_driven', '{"description": "ML-based attribution"}', FALSE, FALSE);

-- Experiments Table
CREATE TABLE experiments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    workspace_id UUID NOT NULL,
    experiment_name VARCHAR(255) NOT NULL,
    experiment_description TEXT,
    hypothesis TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    variant_config JSONB NOT NULL DEFAULT '{}',
    traffic_allocation DECIMAL(5, 2) DEFAULT 100,
    attribution_model_id UUID,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_experiments_tenant ON experiments(tenant_id);
CREATE INDEX idx_experiments_status ON experiments(status);

-- Experiment Results Table
CREATE TABLE experiment_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experiment_id UUID NOT NULL REFERENCES experiments(id),
    variant_id VARCHAR(100) NOT NULL,
    variant_name VARCHAR(255),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15, 4) NOT NULL,
    sample_size INTEGER DEFAULT 0,
    confidence_level DECIMAL(5, 2),
    p_value DECIMAL(8, 6),
    statistical_significance BOOLEAN DEFAULT FALSE,
    winner BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_experiment_results_experiment ON experiment_results(experiment_id);

-- Anomaly Alerts Table
CREATE TABLE anomaly_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    workspace_id UUID NOT NULL,
    alert_type VARCHAR(100) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    current_value DECIMAL(15, 4),
    expected_value DECIMAL(15, 4),
    deviation_percentage DECIMAL(5, 2),
    severity VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'active',
    description TEXT,
    metadata JSONB DEFAULT '{}',
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_anomaly_alerts_tenant ON anomaly_alerts(tenant_id);
CREATE INDEX idx_anomaly_alerts_status ON anomaly_alerts(status);
CREATE INDEX idx_anomaly_alerts_detected ON anomaly_alerts(detected_at);

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
CREATE INDEX idx_realtime_metrics_name ON real_time_metrics(metric_name);
CREATE INDEX idx_realtime_metrics_recorded ON real_time_metrics(recorded_at);

-- Cohort Analysis Table
CREATE TABLE cohort_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    workspace_id UUID NOT NULL,
    cohort_type VARCHAR(50) NOT NULL,
    cohort_date DATE NOT NULL,
    cohort_size INTEGER NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_values JSONB NOT NULL,
    period_number INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cohort_tenant ON cohort_analysis(tenant_id);
CREATE INDEX idx_cohort_type ON cohort_analysis(cohort_type);

-- Funnel Analysis Table
CREATE TABLE funnel_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    workspace_id UUID NOT NULL,
    funnel_name VARCHAR(255) NOT NULL,
    funnel_steps JSONB NOT NULL,
    total_users INTEGER DEFAULT 0,
    conversion_rates JSONB DEFAULT '[]',
    drop_off_rates JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_funnel_tenant ON funnel_analysis(tenant_id);

-- Audit Events Table (for analytics system itself)
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

-- ClickHouse specific tables for high-performance analytics
-- This will be managed separately but documented here

-- Function to calculate attribution
CREATE OR REPLACE FUNCTION calculate_attribution(
    p_conversion_id UUID,
    p_model_type VARCHAR(50)
)
RETURNS TABLE (
    touchpoint_id UUID,
    touchpoint_type VARCHAR(50),
    credit DECIMAL(10, 4)
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH touchpoints AS (
        SELECT 
            t.id as touchpoint_id,
            t.touchpoint_type,
            t.first_interaction_at,
            t.last_interaction_at,
            COUNT(*) OVER() as total_count,
            EXTRACT(DAY FROM (c.conversion_date - t.first_interaction_at)) as days_ago
        FROM attribution_touchpoints t
        JOIN conversions c ON c.visitor_id = t.visitor_id
        WHERE c.id = p_conversion_id
    )
    SELECT 
        t.touchpoint_id,
        t.touchpoint_type,
        CASE p_model_type
            WHEN 'first_touch' THEN 
                CASE WHEN t.first_interaction_at = (SELECT MIN(first_interaction_at) FROM touchpoints) 
                     THEN 100.0 ELSE 0.0 END
            WHEN 'last_touch' THEN
                CASE WHEN t.last_interaction_at = (SELECT MAX(last_interaction_at) FROM touchpoints)
                     THEN 100.0 ELSE 0.0 END
            WHEN 'linear' THEN 100.0 / t.total_count
            WHEN 'time_decay' THEN 
                POWER(2, t.days_ago * 0.1) / (SELECT SUM(POWER(2, days_ago * 0.1)) FROM touchpoints) * 100.0
            WHEN 'position_based' THEN
                CASE 
                    WHEN t.first_interaction_at = (SELECT MIN(first_interaction_at) FROM touchpoints) THEN 40.0
                    WHEN t.last_interaction_at = (SELECT MAX(last_interaction_at) FROM touchpoints) THEN 40.0
                    ELSE 20.0 / NULLIF(t.total_count - 2, 0)
                END
            ELSE 100.0 / t.total_count
        END as credit
    FROM touchpoints t;
END;
$$;

-- Function to detect anomalies using z-score
CREATE OR REPLACE FUNCTION detect_anomaly(
    p_tenant_id UUID,
    p_metric_name VARCHAR(100),
    p_threshold DECIMAL(5, 2) DEFAULT 2.0
)
RETURNS TABLE (
    is_anomaly BOOLEAN,
    z_score DECIMAL(10, 4),
    current_value DECIMAL(15, 4)
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT 
            AVG(metric_value)::DECIMAL as mean,
            STDDEV(metric_value)::DECIMAL as stddev,
            (SELECT metric_value 
             FROM real_time_metrics 
             WHERE tenant_id = p_tenant_id 
               AND metric_name = p_metric_name 
             ORDER BY recorded_at DESC 
             LIMIT 1) as current
        FROM real_time_metrics
        WHERE tenant_id = p_tenant_id
          AND metric_name = p_metric_name
          AND recorded_at > NOW() - INTERVAL '30 days'
    )
    SELECT 
        CASE 
            WHEN s.stddev > 0 AND ABS((s.current - s.mean) / s.stddev) > p_threshold THEN TRUE
            ELSE FALSE
        END,
        CASE WHEN s.stddev > 0 THEN (s.current - s.mean) / s.stddev ELSE 0 END,
        s.current
    FROM stats s;
END;
$$;

-- Event for analytics operations
CREATE OR REPLACE FUNCTION notify_analytics_event()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify(
        'analytics_events',
        json_build_object(
            'event_type', NEW.event_type,
            'tenant_id', NEW.tenant_id,
            'workspace_id', NEW.workspace_id,
            'timestamp', NEW.timestamp
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
