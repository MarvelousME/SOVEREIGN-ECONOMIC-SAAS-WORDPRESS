-- Migration: 025_social_distribution_schema.sql
-- Description: Native social OAuth connections, scheduled post jobs, and publish lifecycle records
-- Created: 2026-04-07

CREATE TABLE IF NOT EXISTS social_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    provider VARCHAR(32) NOT NULL,
    account_ref VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    scopes TEXT[] NOT NULL DEFAULT '{}',
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT,
    expires_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT social_accounts_provider_chk CHECK (provider IN ('x', 'linkedin', 'facebook', 'tiktok')),
    CONSTRAINT social_accounts_unique UNIQUE (tenant_id, provider, account_ref)
);

CREATE INDEX IF NOT EXISTS idx_social_accounts_tenant ON social_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_provider ON social_accounts(provider);

CREATE TABLE IF NOT EXISTS social_oauth_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    provider VARCHAR(32) NOT NULL,
    state_hash TEXT NOT NULL UNIQUE,
    code_verifier_hash TEXT,
    redirect_uri TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT social_oauth_states_provider_chk CHECK (provider IN ('x', 'linkedin', 'facebook', 'tiktok'))
);

CREATE INDEX IF NOT EXISTS idx_social_oauth_states_tenant ON social_oauth_states(tenant_id);
CREATE INDEX IF NOT EXISTS idx_social_oauth_states_expires ON social_oauth_states(expires_at);

CREATE TABLE IF NOT EXISTS social_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
    social_account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
    provider VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'queued',
    text TEXT NOT NULL,
    link_url TEXT NOT NULL,
    utm_params JSONB NOT NULL DEFAULT '{}',
    scheduled_for TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    provider_post_id VARCHAR(255),
    provider_post_url TEXT,
    error_message TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,
    CONSTRAINT social_posts_provider_chk CHECK (provider IN ('x', 'linkedin', 'facebook', 'tiktok')),
    CONSTRAINT social_posts_status_chk CHECK (status IN (
        'queued',
        'scheduled',
        'publishing',
        'published',
        'failed',
        'dead_letter',
        'cancelled'
    ))
);

CREATE INDEX IF NOT EXISTS idx_social_posts_tenant ON social_posts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled ON social_posts(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_social_posts_page ON social_posts(page_id);

CREATE TABLE IF NOT EXISTS social_post_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    social_post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL,
    status VARCHAR(32) NOT NULL,
    response_payload JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_post_attempts_post_id ON social_post_attempts(social_post_id);

