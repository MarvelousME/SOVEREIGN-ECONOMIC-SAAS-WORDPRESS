-- Campaign orchestration core schema (Swarm 1 foundation)

CREATE TABLE IF NOT EXISTS campaign_orchestrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  page_id UUID REFERENCES landing_pages(id) ON DELETE SET NULL,
  name VARCHAR(180) NOT NULL,
  description TEXT,
  objective VARCHAR(120),
  budget NUMERIC(14,2),
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT campaign_orchestrations_status_chk CHECK (
    status IN ('draft','ready','scheduled','running','paused','completed','failed','archived')
  )
);

CREATE TABLE IF NOT EXISTS campaign_state_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaign_orchestrations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  from_status VARCHAR(32) NOT NULL,
  to_status VARCHAR(32) NOT NULL,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT campaign_state_events_status_chk CHECK (
    from_status IN ('draft','ready','scheduled','running','paused','completed','failed','archived')
    AND to_status IN ('draft','ready','scheduled','running','paused','completed','failed','archived')
  )
);

CREATE INDEX IF NOT EXISTS idx_campaign_orchestrations_tenant_status
  ON campaign_orchestrations (tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaign_orchestrations_tenant_created_by
  ON campaign_orchestrations (tenant_id, created_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaign_orchestrations_business
  ON campaign_orchestrations (business_id);

CREATE INDEX IF NOT EXISTS idx_campaign_orchestrations_page
  ON campaign_orchestrations (page_id);

CREATE INDEX IF NOT EXISTS idx_campaign_state_events_campaign_created
  ON campaign_state_events (campaign_id, created_at DESC);
