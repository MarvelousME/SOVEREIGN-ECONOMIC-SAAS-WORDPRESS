-- Data Vault Service Schema

-- Vault data table (encrypted personal data)
CREATE TABLE IF NOT EXISTS vault_data (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    data_type VARCHAR(50) NOT NULL CHECK (data_type IN (
        'profile', 'activity', 'preference', 'behavioral', 
        'transaction', 'skills_credentials'
    )),
    encrypted_data TEXT NOT NULL,
    encryption_iv VARCHAR(32) NOT NULL,
    auth_tag VARCHAR(32) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vault_data_user ON vault_data(user_id);
CREATE INDEX idx_vault_data_type ON vault_data(data_type);
CREATE INDEX idx_vault_data_created_at ON vault_data(created_at DESC);

-- Data consents table
CREATE TABLE IF NOT EXISTS data_consents (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    data_id UUID REFERENCES vault_data(id) ON DELETE CASCADE,
    data_type VARCHAR(50) CHECK (data_type IN (
        'profile', 'activity', 'preference', 'behavioral', 
        'transaction', 'skills_credentials'
    )),
    granted_to UUID NOT NULL,
    purpose TEXT NOT NULL,
    anonymization_level INTEGER NOT NULL CHECK (anonymization_level BETWEEN 0 AND 4),
    fields JSONB DEFAULT '[]',
    status VARCHAR(20) NOT NULL CHECK (status IN ('granted', 'revoked', 'expired')),
    granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    revoked_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    CHECK (data_id IS NOT NULL OR data_type IS NOT NULL)
);

CREATE INDEX idx_consents_user ON data_consents(user_id);
CREATE INDEX idx_consents_granted_to ON data_consents(granted_to);
CREATE INDEX idx_consents_status ON data_consents(status);
CREATE INDEX idx_consents_data ON data_consents(data_id);

-- Data access logs table
CREATE TABLE IF NOT EXISTS data_access_logs (
    id UUID PRIMARY KEY,
    consent_id UUID NOT NULL REFERENCES data_consents(id) ON DELETE CASCADE,
    accessed_by UUID NOT NULL,
    accessed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_type VARCHAR(50) NOT NULL,
    fields_accessed JSONB NOT NULL,
    anonymization_level INTEGER NOT NULL,
    purpose TEXT NOT NULL
);

CREATE INDEX idx_access_logs_consent ON data_access_logs(consent_id);
CREATE INDEX idx_access_logs_accessor ON data_access_logs(accessed_by);
CREATE INDEX idx_access_logs_accessed_at ON data_access_logs(accessed_at DESC);

-- Data monetization table
CREATE TABLE IF NOT EXISTS data_monetization (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    data_type VARCHAR(50) NOT NULL,
    buyer_id UUID NOT NULL,
    price DECIMAL(18, 6) NOT NULL,
    revenue_share DECIMAL(18, 6) NOT NULL,
    anonymization_level INTEGER NOT NULL,
    transaction_id UUID NOT NULL,
    purchased_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_monetization_user ON data_monetization(user_id);
CREATE INDEX idx_monetization_buyer ON data_monetization(buyer_id);
CREATE INDEX idx_monetization_purchased_at ON data_monetization(purchased_at DESC);

-- Data buyers registry table
CREATE TABLE IF NOT EXISTS data_buyers (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    organization VARCHAR(255),
    email VARCHAR(255) NOT NULL UNIQUE,
    approved BOOLEAN DEFAULT FALSE,
    registered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_buyers_approved ON data_buyers(approved);
CREATE INDEX idx_buyers_email ON data_buyers(email);

-- User data pricing table
CREATE TABLE IF NOT EXISTS user_data_pricing (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    data_type VARCHAR(50) NOT NULL,
    price_per_access DECIMAL(18, 6) NOT NULL,
    min_anonymization_level INTEGER NOT NULL DEFAULT 2,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, data_type)
);

CREATE INDEX idx_pricing_user ON user_data_pricing(user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_vault_data_updated_at BEFORE UPDATE ON vault_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pricing_updated_at BEFORE UPDATE ON user_data_pricing
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-expire consents
CREATE OR REPLACE FUNCTION expire_consents()
RETURNS void AS $$
BEGIN
    UPDATE data_consents
    SET status = 'expired'
    WHERE status = 'granted'
    AND expires_at IS NOT NULL
    AND expires_at < CURRENT_TIMESTAMP;
END;
$$ language 'plpgsql';
