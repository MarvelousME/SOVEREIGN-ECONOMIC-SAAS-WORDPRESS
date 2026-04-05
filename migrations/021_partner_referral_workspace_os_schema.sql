-- Migration: Partner Referral Workspace OS (isolated schema)
-- Description: Canonical tables from partner_referral_repo_ready_pack; lives in partner_referral_os to avoid
--              collisions with public.landing_pages (015), public.referrals (008), etc.
-- Date: 2026-04-03

CREATE SCHEMA IF NOT EXISTS partner_referral_os;

CREATE TABLE partner_referral_os.companies (
    id BIGSERIAL PRIMARY KEY,
    legal_name VARCHAR(255) NOT NULL,
    trading_name VARCHAR(255),
    company_type VARCHAR(64) NOT NULL,
    registration_number VARCHAR(128),
    tax_number VARCHAR(128),
    primary_country CHAR(2),
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE partner_referral_os.workspaces (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES partner_referral_os.companies(id) ON DELETE CASCADE,
    workspace_name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    custom_domain VARCHAR(255),
    brand_settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    ai_agent_settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    -- Soft link to public.tenant_workspaces(id) when Business Builder migration 012 is applied (no FK: dev-schema.sql DBs omit 012)
    linked_tenant_workspace_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pr_os_workspaces_company_id ON partner_referral_os.workspaces(company_id);
CREATE INDEX idx_pr_os_workspaces_linked_tenant ON partner_referral_os.workspaces(linked_tenant_workspace_id);

CREATE TABLE partner_referral_os.workspace_users (
    id BIGSERIAL PRIMARY KEY,
    workspace_id BIGINT NOT NULL REFERENCES partner_referral_os.workspaces(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    password_hash TEXT NOT NULL,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, email)
);
CREATE INDEX idx_pr_os_workspace_users_workspace_id ON partner_referral_os.workspace_users(workspace_id);

CREATE TABLE partner_referral_os.payout_models (
    id BIGSERIAL PRIMARY KEY,
    model_name VARCHAR(255) NOT NULL,
    model_type VARCHAR(64) NOT NULL,
    currency CHAR(3) NOT NULL,
    rules_json JSONB NOT NULL,
    reversal_window_days INTEGER NOT NULL DEFAULT 0,
    approval_required BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE partner_referral_os.partner_programs (
    id BIGSERIAL PRIMARY KEY,
    owner_company_id BIGINT NOT NULL REFERENCES partner_referral_os.companies(id) ON DELETE RESTRICT,
    program_name VARCHAR(255) NOT NULL,
    description TEXT,
    allowed_countries_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    allowed_channels_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    payout_model_id BIGINT REFERENCES partner_referral_os.payout_models(id) ON DELETE SET NULL,
    terms_version VARCHAR(64),
    reporting_frequency VARCHAR(32),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pr_os_partner_programs_owner_company_id ON partner_referral_os.partner_programs(owner_company_id);

CREATE TABLE partner_referral_os.partner_contracts (
    id BIGSERIAL PRIMARY KEY,
    program_id BIGINT NOT NULL REFERENCES partner_referral_os.partner_programs(id) ON DELETE CASCADE,
    partner_company_id BIGINT NOT NULL REFERENCES partner_referral_os.companies(id) ON DELETE RESTRICT,
    contract_number VARCHAR(128) NOT NULL UNIQUE,
    contract_hash VARCHAR(255),
    start_date DATE,
    end_date DATE,
    payout_terms_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    approval_rules_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    reporting_rules_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    currency CHAR(3) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pr_os_partner_contracts_program_id ON partner_referral_os.partner_contracts(program_id);
CREATE INDEX idx_pr_os_partner_contracts_partner_company_id ON partner_referral_os.partner_contracts(partner_company_id);

CREATE TABLE partner_referral_os.contract_versions (
    id BIGSERIAL PRIMARY KEY,
    contract_id BIGINT NOT NULL REFERENCES partner_referral_os.partner_contracts(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    contract_hash VARCHAR(255),
    terms_json JSONB NOT NULL,
    effective_from DATE,
    effective_to DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(contract_id, version_number)
);
CREATE INDEX idx_pr_os_contract_versions_contract_id ON partner_referral_os.contract_versions(contract_id);

CREATE TABLE partner_referral_os.tracking_assets (
    id BIGSERIAL PRIMARY KEY,
    contract_id BIGINT NOT NULL REFERENCES partner_referral_os.partner_contracts(id) ON DELETE CASCADE,
    asset_type VARCHAR(64) NOT NULL,
    base_url TEXT NOT NULL,
    tracking_code VARCHAR(255),
    subid_schema_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    encoded_partner_ref VARCHAR(255),
    validation_rules_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pr_os_tracking_assets_contract_id ON partner_referral_os.tracking_assets(contract_id);
CREATE INDEX idx_pr_os_tracking_assets_tracking_code ON partner_referral_os.tracking_assets(tracking_code);

CREATE TABLE partner_referral_os.campaigns (
    id BIGSERIAL PRIMARY KEY,
    workspace_id BIGINT NOT NULL REFERENCES partner_referral_os.workspaces(id) ON DELETE CASCADE,
    contract_id BIGINT NOT NULL REFERENCES partner_referral_os.partner_contracts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    objective VARCHAR(128),
    channel VARCHAR(64),
    audience VARCHAR(255),
    messaging_policy_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pr_os_campaigns_workspace_id ON partner_referral_os.campaigns(workspace_id);
CREATE INDEX idx_pr_os_campaigns_contract_id ON partner_referral_os.campaigns(contract_id);

CREATE TABLE partner_referral_os.landing_pages (
    id BIGSERIAL PRIMARY KEY,
    workspace_id BIGINT NOT NULL REFERENCES partner_referral_os.workspaces(id) ON DELETE CASCADE,
    campaign_id BIGINT NOT NULL REFERENCES partner_referral_os.campaigns(id) ON DELETE CASCADE,
    page_name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    published_url TEXT,
    attribution_token VARCHAR(255),
    external_redirect_url TEXT,
    variant VARCHAR(64),
    ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
    content_hash VARCHAR(255),
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(campaign_id, slug)
);
CREATE INDEX idx_pr_os_landing_pages_workspace_id ON partner_referral_os.landing_pages(workspace_id);
CREATE INDEX idx_pr_os_landing_pages_campaign_id ON partner_referral_os.landing_pages(campaign_id);

CREATE TABLE partner_referral_os.landing_page_versions (
    id BIGSERIAL PRIMARY KEY,
    landing_page_id BIGINT NOT NULL REFERENCES partner_referral_os.landing_pages(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    html_snapshot TEXT NOT NULL,
    content_hash VARCHAR(255),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(landing_page_id, version_number)
);
CREATE INDEX idx_pr_os_landing_page_versions_landing_page_id ON partner_referral_os.landing_page_versions(landing_page_id);

CREATE TABLE partner_referral_os.creative_assets (
    id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES partner_referral_os.campaigns(id) ON DELETE CASCADE,
    asset_type VARCHAR(64) NOT NULL,
    title VARCHAR(255),
    body TEXT,
    cta_text VARCHAR(255),
    destination_url TEXT,
    approval_status VARCHAR(32) NOT NULL DEFAULT 'draft',
    ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pr_os_creative_assets_campaign_id ON partner_referral_os.creative_assets(campaign_id);

CREATE TABLE partner_referral_os.session_attributions (
    id BIGSERIAL PRIMARY KEY,
    workspace_id BIGINT NOT NULL REFERENCES partner_referral_os.workspaces(id) ON DELETE CASCADE,
    campaign_id BIGINT NOT NULL REFERENCES partner_referral_os.campaigns(id) ON DELETE CASCADE,
    landing_page_id BIGINT NOT NULL REFERENCES partner_referral_os.landing_pages(id) ON DELETE CASCADE,
    tracking_asset_id BIGINT REFERENCES partner_referral_os.tracking_assets(id) ON DELETE SET NULL,
    session_id VARCHAR(255) NOT NULL,
    referrer_url TEXT,
    utm_source VARCHAR(255),
    utm_medium VARCHAR(255),
    utm_campaign VARCHAR(255),
    click_token VARCHAR(255),
    attribution_signature VARCHAR(255),
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(session_id, landing_page_id)
);
CREATE INDEX idx_pr_os_session_attributions_workspace_id ON partner_referral_os.session_attributions(workspace_id);
CREATE INDEX idx_pr_os_session_attributions_campaign_id ON partner_referral_os.session_attributions(campaign_id);
CREATE INDEX idx_pr_os_session_attributions_tracking_asset_id ON partner_referral_os.session_attributions(tracking_asset_id);
CREATE INDEX idx_pr_os_session_attributions_click_token ON partner_referral_os.session_attributions(click_token);

CREATE TABLE partner_referral_os.click_events (
    id BIGSERIAL PRIMARY KEY,
    session_attribution_id BIGINT NOT NULL REFERENCES partner_referral_os.session_attributions(id) ON DELETE CASCADE,
    clicked_url TEXT NOT NULL,
    ip_hash VARCHAR(255),
    user_agent_hash VARCHAR(255),
    country_code CHAR(2),
    device_type VARCHAR(64),
    clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pr_os_click_events_session_attribution_id ON partner_referral_os.click_events(session_attribution_id);
CREATE INDEX idx_pr_os_click_events_clicked_at ON partner_referral_os.click_events(clicked_at);

CREATE TABLE partner_referral_os.leads (
    id BIGSERIAL PRIMARY KEY,
    workspace_id BIGINT NOT NULL REFERENCES partner_referral_os.workspaces(id) ON DELETE CASCADE,
    campaign_id BIGINT REFERENCES partner_referral_os.campaigns(id) ON DELETE SET NULL,
    landing_page_id BIGINT REFERENCES partner_referral_os.landing_pages(id) ON DELETE SET NULL,
    session_attribution_id BIGINT REFERENCES partner_referral_os.session_attributions(id) ON DELETE SET NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(64),
    consent_email BOOLEAN NOT NULL DEFAULT FALSE,
    consent_sms BOOLEAN NOT NULL DEFAULT FALSE,
    consent_whatsapp BOOLEAN NOT NULL DEFAULT FALSE,
    source_status VARCHAR(64),
    crm_stage VARCHAR(64) NOT NULL DEFAULT 'new',
    lead_score NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pr_os_leads_workspace_id ON partner_referral_os.leads(workspace_id);
CREATE INDEX idx_pr_os_leads_campaign_id ON partner_referral_os.leads(campaign_id);
CREATE INDEX idx_pr_os_leads_session_attribution_id ON partner_referral_os.leads(session_attribution_id);
CREATE INDEX idx_pr_os_leads_email ON partner_referral_os.leads(email);
CREATE INDEX idx_pr_os_leads_phone ON partner_referral_os.leads(phone);

CREATE TABLE partner_referral_os.communication_events (
    id BIGSERIAL PRIMARY KEY,
    lead_id BIGINT NOT NULL REFERENCES partner_referral_os.leads(id) ON DELETE CASCADE,
    channel VARCHAR(32) NOT NULL,
    template_name VARCHAR(255),
    outbound_message_hash VARCHAR(255),
    delivery_status VARCHAR(32),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pr_os_communication_events_lead_id ON partner_referral_os.communication_events(lead_id);

CREATE TABLE partner_referral_os.redirect_events (
    id BIGSERIAL PRIMARY KEY,
    lead_id BIGINT NOT NULL UNIQUE REFERENCES partner_referral_os.leads(id) ON DELETE CASCADE,
    tracking_asset_id BIGINT REFERENCES partner_referral_os.tracking_assets(id) ON DELETE SET NULL,
    destination_url_snapshot TEXT NOT NULL,
    redirect_signature VARCHAR(255),
    redirected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pr_os_redirect_events_tracking_asset_id ON partner_referral_os.redirect_events(tracking_asset_id);
CREATE INDEX idx_pr_os_redirect_events_redirected_at ON partner_referral_os.redirect_events(redirected_at);

CREATE TABLE partner_referral_os.conversion_import_batches (
    id BIGSERIAL PRIMARY KEY,
    contract_id BIGINT NOT NULL REFERENCES partner_referral_os.partner_contracts(id) ON DELETE CASCADE,
    source_type VARCHAR(32) NOT NULL,
    source_file_name VARCHAR(255),
    source_hash VARCHAR(255),
    imported_by_user_id BIGINT REFERENCES partner_referral_os.workspace_users(id) ON DELETE SET NULL,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    row_count INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    failure_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'uploaded',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pr_os_conversion_import_batches_contract_id ON partner_referral_os.conversion_import_batches(contract_id);

CREATE TABLE partner_referral_os.conversion_records (
    id BIGSERIAL PRIMARY KEY,
    batch_id BIGINT NOT NULL REFERENCES partner_referral_os.conversion_import_batches(id) ON DELETE CASCADE,
    external_conversion_id VARCHAR(255),
    external_partner_ref VARCHAR(255),
    external_tracking_code VARCHAR(255),
    conversion_type VARCHAR(64),
    conversion_value NUMERIC(18,2),
    payout_amount NUMERIC(18,2),
    conversion_date TIMESTAMPTZ,
    approval_status VARCHAR(32) NOT NULL DEFAULT 'pending',
    raw_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    matched_lead_id BIGINT REFERENCES partner_referral_os.leads(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(batch_id, external_conversion_id)
);
CREATE INDEX idx_pr_os_conversion_records_batch_id ON partner_referral_os.conversion_records(batch_id);
CREATE INDEX idx_pr_os_conversion_records_external_partner_ref ON partner_referral_os.conversion_records(external_partner_ref);
CREATE INDEX idx_pr_os_conversion_records_external_tracking_code ON partner_referral_os.conversion_records(external_tracking_code);
CREATE INDEX idx_pr_os_conversion_records_matched_lead_id ON partner_referral_os.conversion_records(matched_lead_id);

CREATE TABLE partner_referral_os.match_results (
    id BIGSERIAL PRIMARY KEY,
    conversion_record_id BIGINT NOT NULL REFERENCES partner_referral_os.conversion_records(id) ON DELETE CASCADE,
    lead_id BIGINT REFERENCES partner_referral_os.leads(id) ON DELETE SET NULL,
    session_attribution_id BIGINT REFERENCES partner_referral_os.session_attributions(id) ON DELETE SET NULL,
    confidence_score NUMERIC(5,2) NOT NULL,
    match_method VARCHAR(64) NOT NULL,
    reviewed_by_user_id BIGINT REFERENCES partner_referral_os.workspace_users(id) ON DELETE SET NULL,
    matched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pr_os_match_results_conversion_record_id ON partner_referral_os.match_results(conversion_record_id);
CREATE INDEX idx_pr_os_match_results_lead_id ON partner_referral_os.match_results(lead_id);

CREATE TABLE partner_referral_os.commission_ledgers (
    id BIGSERIAL PRIMARY KEY,
    contract_id BIGINT NOT NULL REFERENCES partner_referral_os.partner_contracts(id) ON DELETE CASCADE,
    conversion_record_id BIGINT NOT NULL UNIQUE REFERENCES partner_referral_os.conversion_records(id) ON DELETE CASCADE,
    gross_reported_value NUMERIC(18,2) NOT NULL DEFAULT 0,
    partner_commission_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    platform_fee_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    net_partner_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    currency CHAR(3) NOT NULL,
    ledger_status VARCHAR(32) NOT NULL DEFAULT 'pending',
    payout_due_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pr_os_commission_ledgers_contract_id ON partner_referral_os.commission_ledgers(contract_id);
CREATE INDEX idx_pr_os_commission_ledgers_payout_due_date ON partner_referral_os.commission_ledgers(payout_due_date);

CREATE TABLE partner_referral_os.payout_instructions (
    id BIGSERIAL PRIMARY KEY,
    commission_ledger_id BIGINT NOT NULL REFERENCES partner_referral_os.commission_ledgers(id) ON DELETE CASCADE,
    beneficiary_company_id BIGINT NOT NULL REFERENCES partner_referral_os.companies(id) ON DELETE RESTRICT,
    amount NUMERIC(18,2) NOT NULL,
    currency CHAR(3) NOT NULL,
    payment_method VARCHAR(64),
    settlement_reference VARCHAR(255),
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    initiated_at TIMESTAMPTZ,
    settled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pr_os_payout_instructions_commission_ledger_id ON partner_referral_os.payout_instructions(commission_ledger_id);
CREATE INDEX idx_pr_os_payout_instructions_beneficiary_company_id ON partner_referral_os.payout_instructions(beneficiary_company_id);

CREATE TABLE partner_referral_os.dispute_cases (
    id BIGSERIAL PRIMARY KEY,
    contract_id BIGINT NOT NULL REFERENCES partner_referral_os.partner_contracts(id) ON DELETE CASCADE,
    conversion_record_id BIGINT REFERENCES partner_referral_os.conversion_records(id) ON DELETE SET NULL,
    lead_id BIGINT REFERENCES partner_referral_os.leads(id) ON DELETE SET NULL,
    opened_by_user_id BIGINT REFERENCES partner_referral_os.workspace_users(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'open',
    resolution_note TEXT,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pr_os_dispute_cases_contract_id ON partner_referral_os.dispute_cases(contract_id);
CREATE INDEX idx_pr_os_dispute_cases_status ON partner_referral_os.dispute_cases(status);

CREATE TABLE partner_referral_os.dashboard_snapshots (
    id BIGSERIAL PRIMARY KEY,
    workspace_id BIGINT NOT NULL REFERENCES partner_referral_os.workspaces(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    impressions BIGINT NOT NULL DEFAULT 0,
    clicks BIGINT NOT NULL DEFAULT 0,
    leads BIGINT NOT NULL DEFAULT 0,
    redirects BIGINT NOT NULL DEFAULT 0,
    reported_conversions BIGINT NOT NULL DEFAULT 0,
    matched_conversions BIGINT NOT NULL DEFAULT 0,
    payout_due NUMERIC(18,2) NOT NULL DEFAULT 0,
    revenue NUMERIC(18,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, period_start, period_end)
);
CREATE INDEX idx_pr_os_dashboard_snapshots_workspace_id ON partner_referral_os.dashboard_snapshots(workspace_id);

CREATE OR REPLACE VIEW partner_referral_os.v_workspace_funnel AS
SELECT
    w.id AS workspace_id,
    w.workspace_name,
    COUNT(DISTINCT ce.id) AS clicks,
    COUNT(DISTINCT l.id) AS leads,
    COUNT(DISTINCT re.id) AS redirects,
    COUNT(DISTINCT cr.id) AS conversions,
    COALESCE(SUM(cl.net_partner_amount), 0) AS payout_due
FROM partner_referral_os.workspaces w
LEFT JOIN partner_referral_os.campaigns c ON c.workspace_id = w.id
LEFT JOIN partner_referral_os.landing_pages lp ON lp.campaign_id = c.id
LEFT JOIN partner_referral_os.session_attributions sa ON sa.landing_page_id = lp.id
LEFT JOIN partner_referral_os.click_events ce ON ce.session_attribution_id = sa.id
LEFT JOIN partner_referral_os.leads l ON l.session_attribution_id = sa.id
LEFT JOIN partner_referral_os.redirect_events re ON re.lead_id = l.id
LEFT JOIN partner_referral_os.conversion_records cr ON cr.matched_lead_id = l.id
LEFT JOIN partner_referral_os.commission_ledgers cl ON cl.conversion_record_id = cr.id
GROUP BY w.id, w.workspace_name;

CREATE OR REPLACE VIEW partner_referral_os.v_contract_earnings AS
SELECT
    pc.id AS contract_id,
    pc.contract_number,
    COUNT(cl.id) AS ledger_rows,
    COALESCE(SUM(cl.gross_reported_value), 0) AS gross_value,
    COALESCE(SUM(cl.partner_commission_amount), 0) AS partner_commission,
    COALESCE(SUM(cl.platform_fee_amount), 0) AS platform_fee,
    COALESCE(SUM(cl.net_partner_amount), 0) AS net_partner_amount
FROM partner_referral_os.partner_contracts pc
LEFT JOIN partner_referral_os.commission_ledgers cl ON cl.contract_id = pc.id
GROUP BY pc.id, pc.contract_number;

-- Rollback (manual): DROP SCHEMA partner_referral_os CASCADE;
