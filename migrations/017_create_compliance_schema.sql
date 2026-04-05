-- Migration: 017_create_compliance_schema
-- Description: Compliance Engine Service Schema

CREATE SCHEMA IF NOT EXISTS compliance;

-- Consent Records Table
CREATE TABLE IF NOT EXISTS compliance.consent_records (
    id UUID PRIMARY KEY,
    contact_id VARCHAR(255) NOT NULL,
    purpose VARCHAR(255) NOT NULL,
    basis VARCHAR(50) NOT NULL,
    channels JSONB NOT NULL DEFAULT '[]',
    regulations JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(20) NOT NULL DEFAULT 'granted',
    granted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    proof_type VARCHAR(50) NOT NULL DEFAULT 'web_form',
    proof_data JSONB NOT NULL DEFAULT '{}',
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consent_records_contact_id ON compliance.consent_records(contact_id);
CREATE INDEX idx_consent_records_status ON compliance.consent_records(status);
CREATE INDEX idx_consent_records_granted_at ON compliance.consent_records(granted_at);
CREATE INDEX idx_consent_records_expires_at ON compliance.consent_records(expires_at);

-- Suppression List Table
CREATE TABLE IF NOT EXISTS compliance.suppression_list (
    id UUID PRIMARY KEY,
    contact_id VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    type VARCHAR(50) NOT NULL,
    channel VARCHAR(20) NOT NULL,
    reason TEXT,
    source VARCHAR(100),
    added_by VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT suppression_identifier CHECK (contact_id IS NOT NULL OR email IS NOT NULL OR phone IS NOT NULL)
);

CREATE INDEX idx_suppression_list_contact_id ON compliance.suppression_list(contact_id);
CREATE INDEX idx_suppression_list_email ON compliance.suppression_list(email);
CREATE INDEX idx_suppression_list_phone ON compliance.suppression_list(phone);
CREATE INDEX idx_suppression_list_type ON compliance.suppression_list(type);
CREATE INDEX idx_suppression_list_channel ON compliance.suppression_list(channel);
CREATE INDEX idx_suppression_list_expires_at ON compliance.suppression_list(expires_at);

-- Disclosure Templates Table
CREATE TABLE IF NOT EXISTS compliance.disclosure_templates (
    id UUID PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    channel VARCHAR(50) NOT NULL,
    regulation VARCHAR(50) NOT NULL,
    text TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_disclosure_templates_type ON compliance.disclosure_templates(type);
CREATE INDEX idx_disclosure_templates_channel ON compliance.disclosure_templates(channel);
CREATE INDEX idx_disclosure_templates_active ON compliance.disclosure_templates(is_active);

-- Channel Policies Table
CREATE TABLE IF NOT EXISTS compliance.channel_policies (
    id UUID PRIMARY KEY,
    channel VARCHAR(50) NOT NULL,
    regulation VARCHAR(50) NOT NULL,
    rule_set VARCHAR(100) NOT NULL,
    requirements JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_channel_policies_channel ON compliance.channel_policies(channel);
CREATE INDEX idx_channel_policies_active ON compliance.channel_policies(is_active);

-- Geo Restrictions Table
CREATE TABLE IF NOT EXISTS compliance.geo_restrictions (
    id UUID PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    country VARCHAR(10),
    state VARCHAR(100),
    region VARCHAR(100),
    is_blocked BOOLEAN NOT NULL DEFAULT false,
    requires_disclosure BOOLEAN NOT NULL DEFAULT false,
    disclosure_text TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_geo_restrictions_country ON compliance.geo_restrictions(country);
CREATE INDEX idx_geo_restrictions_state ON compliance.geo_restrictions(state);
CREATE INDEX idx_geo_restrictions_type ON compliance.geo_restrictions(type);
CREATE INDEX idx_geo_restrictions_blocked ON compliance.geo_restrictions(is_blocked);

-- Compliance Reviews Table
CREATE TABLE IF NOT EXISTS compliance.compliance_reviews (
    id UUID PRIMARY KEY,
    content_id VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    content JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    risk_score INTEGER NOT NULL DEFAULT 0,
    flags JSONB NOT NULL DEFAULT '[]',
    assigned_to VARCHAR(255),
    reviewed_by VARCHAR(255),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    decision TEXT,
    appeal_reason TEXT,
    appeal_reviewed_by VARCHAR(255),
    appeal_reviewed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_compliance_reviews_content_id ON compliance.compliance_reviews(content_id);
CREATE INDEX idx_compliance_reviews_status ON compliance.compliance_reviews(status);
CREATE INDEX idx_compliance_reviews_priority ON compliance.compliance_reviews(priority);
CREATE INDEX idx_compliance_reviews_risk_score ON compliance.compliance_reviews(risk_score);
CREATE INDEX idx_compliance_reviews_assigned_to ON compliance.compliance_reviews(assigned_to);
CREATE INDEX idx_compliance_reviews_created_at ON compliance.compliance_reviews(created_at);

-- Abuse Signals Table
CREATE TABLE IF NOT EXISTS compliance.abuse_signals (
    id UUID PRIMARY KEY,
    contact_id VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    type VARCHAR(50) NOT NULL,
    severity INTEGER NOT NULL DEFAULT 0,
    confidence INTEGER NOT NULL DEFAULT 0,
    details JSONB NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_abuse_signals_contact_id ON compliance.abuse_signals(contact_id);
CREATE INDEX idx_abuse_signals_email ON compliance.abuse_signals(email);
CREATE INDEX idx_abuse_signals_type ON compliance.abuse_signals(type);
CREATE INDEX idx_abuse_signals_severity ON compliance.abuse_signals(severity);
CREATE INDEX idx_abuse_signals_resolved ON compliance.abuse_signals(resolved_at);

-- Approval Workflows Table
CREATE TABLE IF NOT EXISTS compliance.approval_workflows (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    trigger_type VARCHAR(100) NOT NULL,
    conditions JSONB NOT NULL DEFAULT '{}',
    actions JSONB NOT NULL DEFAULT '{}',
    escalation_path JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_approval_workflows_trigger_type ON compliance.approval_workflows(trigger_type);
CREATE INDEX idx_approval_workflows_active ON compliance.approval_workflows(is_active);

-- Insert default disclosure templates
INSERT INTO compliance.disclosure_templates (id, type, channel, regulation, text, version) VALUES
    (gen_random_uuid(), 'ftc_affiliate', 'email', 'FTC', 'This page contains affiliate links. We may earn a commission at no extra cost to you if you make a purchase through links on this page. Full disclosure at [url]', '1.0.0'),
    (gen_random_uuid(), 'ftc_affiliate', 'social', 'FTC', 'Affiliate link. We earn a commission from purchases made through this link.', '1.0.0'),
    (gen_random_uuid(), 'ftc_affiliate', 'web', 'FTC', 'Advertising. This content contains affiliate links.', '1.0.0'),
    (gen_random_uuid(), 'sponsored_content', 'email', 'FTC', 'This email is sponsored content paid for by [brand].', '1.0.0'),
    (gen_random_uuid(), 'sponsored_content', 'social', 'FTC', 'This is a sponsored post by [brand].', '1.0.0'),
    (gen_random_uuid(), 'native_advertising', 'web', 'FTC', 'This is a paid advertisement.', '1.0.0'),
    (gen_random_uuid(), 'paid_partnership', 'social', 'FTC', 'Paid partnership with [brand].', '1.0.0'),
    (gen_random_uuid(), 'material_connection', 'web', 'FTC', 'We have a material connection with [partnerName] as described in our disclosure policy.', '1.0.0')
ON CONFLICT DO NOTHING;

-- Insert default channel policies
INSERT INTO compliance.channel_policies (id, channel, regulation, rule_set, requirements) VALUES
    (gen_random_uuid(), 'email', 'CAN_SPAM', 'can_spam_basic', 
     '{"requiresPhysicalAddress": true, "requiresUnsubscribeHeader": true, "requiresCompanyName": true, "requiresDisclosure": true}'),
    (gen_random_uuid(), 'email', 'CASL', 'casl_express', 
     '{"requiresWrittenConsent": true, "requiresOptInConsent": true, "requiresDisclosure": true}'),
    (gen_random_uuid(), 'sms', 'TCPA', 'tcpa_sms', 
     '{"requiresWrittenConsent": true, "requiresOptInConsent": true, "maxMessageLength": 160}'),
    (gen_random_uuid(), 'push', 'GENERAL', 'push_basic', 
     '{"requiresOptInConsent": true}'),
    (gen_random_uuid(), 'social', 'FTC', 'ftc_social', 
     '{"requiresDisclosure": true, "minimumAge": 13}'),
    (gen_random_uuid(), 'web', 'GDPR', 'gdpr_cookie', 
     '{"requiresConsent": true, "requiresDisclosure": true}'),
    (gen_random_uuid(), 'web', 'CCPA', 'ccpa_disclosure', 
     '{"requiresDisclosure": true, "requiresOptOut": true}')
ON CONFLICT DO NOTHING;

-- Insert default geo restrictions
INSERT INTO compliance.geo_restrictions (id, type, country, is_blocked, requires_disclosure, disclosure_text) VALUES
    (gen_random_uuid(), 'country_block', 'CU', true, false, NULL),
    (gen_random_uuid(), 'country_block', 'IR', true, false, NULL),
    (gen_random_uuid(), 'country_block', 'KP', true, false, NULL),
    (gen_random_uuid(), 'country_block', 'SY', true, false, NULL),
    (gen_random_uuid(), 'market_restriction', 'EU', false, true, 'This service is not available in your region due to regulatory restrictions.')
ON CONFLICT DO NOTHING;
