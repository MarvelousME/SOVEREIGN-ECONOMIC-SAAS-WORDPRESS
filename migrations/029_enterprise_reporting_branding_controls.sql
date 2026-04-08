-- Enterprise controls for runtime white-label branding and report governance.

CREATE TABLE IF NOT EXISTS workspace_branding_bindings (
  workspace_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  theme_id TEXT NOT NULL DEFAULT 'castellar',
  theme_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  brand_assets JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspace_branding_bindings_tenant
  ON workspace_branding_bindings (tenant_id);

CREATE TABLE IF NOT EXISTS tenant_report_governance (
  tenant_id UUID PRIMARY KEY,
  min_role TEXT NOT NULL DEFAULT 'member',
  allowed_regions TEXT[] NOT NULL DEFAULT ARRAY['global'],
  restricted_metrics TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  requires_sso BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tenant_report_governance_min_role_check
    CHECK (min_role IN ('member', 'analyst', 'admin', 'owner'))
);
