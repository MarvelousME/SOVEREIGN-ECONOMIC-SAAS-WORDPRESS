# Feature Implementation Status

Last updated: 2026-04-07

This document lists platform features that are implemented, partially implemented, or not implemented yet, based on current repository evidence (code paths and capability checks).

## Scope

- Source of truth for this snapshot:
  - `tests/capabilities/gtm-workflow-capabilities.test.mjs`
  - Landing Page Factory social-sharing additions under `services/landing-page-factory`
- This is a code-evidence view, not a product roadmap.

## Implemented

### Tenant and Workspace Foundation

- Tenant schema exists (`tenants` table): `migrations/002_create_iam_schema.sql`
- Tenant-workspace UUID link migration exists: `migrations/023_iam_tenant_workspace_uuid_link.sql`
- Workspace provisioning endpoint exists (`POST /workspaces`): `services/business-builder/src/routes/provision.routes.ts`
- Workspace persistence for provisioning exists (`INSERT INTO tenant_workspaces`): `services/business-builder/src/services/provision.service.ts`
- WordPress tenant onboarding plugin exists: `wordpress/wp-content/plugins/sovereign-tenant-onboarding/sovereign-tenant-onboarding.php`

### Landing Page Build and Publish

- Landing page API routes include generation/list/publish flow:
  - `services/landing-page-factory/src/routes/index.ts`
- Portal UI has page generator and editor screens:
  - `frontend/portal-ui/src/app/dashboard/pages/generator/page.tsx`
  - `frontend/portal-ui/src/app/dashboard/pages/editor/[id]/page.tsx`
- WordPress Elementor landing page document type exists:
  - `wordpress/wp-content/plugins/elementor/modules/landing-pages/documents/landing-page.php`
- AI-assisted page generation from affiliate URL context exists:
  - `services/landing-page-factory/src/services/pageGenerator.ts`
  - `POST /generate` route in `services/landing-page-factory/src/routes/index.ts`

### Social Sharing (Intent-Based)

- Social intent/share link builder implemented:
  - `services/landing-page-factory/src/services/socialShareLinks.ts`
- Public share-links endpoint implemented:
  - `services/landing-page-factory/src/routes/share-links.routes.ts`
  - Mounted via `services/landing-page-factory/src/index.ts`
- Optional outbound webhook on publish implemented:
  - `services/landing-page-factory/src/services/socialPublishWebhook.ts`
  - Env documented in `services/landing-page-factory/.env.example`
- Landing publish response includes computed share links:
  - `services/landing-page-factory/src/controllers/landing-page.controller.ts`

### Tracking Foundation

- Analytics event ingest route exists:
  - `services/analytics-service/src/routes/index.ts` (`/events`)
- WordPress click tracking plugin/class exists:
  - `wordpress/wp-content/plugins/saaos-traffic-router/includes/class-click-tracker.php`

## Partially Implemented

### Social Distribution

- Implemented:
  - Share links for X/Twitter, Facebook, LinkedIn, Reddit, WhatsApp, Email
  - Optional generic webhook to trigger external automations
- Missing for full native posting stack:
  - Direct first-party posting via platform OAuth APIs
  - Built-in post scheduling, retries, and queue management
  - Native social account connection management in this service

### Publish Pipeline Coverage

- Implemented target types in pipeline include CDN/subdomain/embed/custom-domain paths.
- Not yet a complete campaign orchestration layer (for social publishing and lifecycle) inside Landing Page Factory itself.

## Not Implemented (Current Evidence)

These features are not present in verified code paths for the social workflow:

- Native OAuth-based auto-posting to Meta/X/LinkedIn from Landing Page Factory
- Internal social publishing scheduler (calendar, delayed publish, retries, dead-letter handling)
- First-party social analytics ingestion for impressions/engagement tied to posts
- End-to-end closed-loop attribution in this service from social post -> click -> conversion

## Verification Snapshot

- Capability checks currently pass:
  - `node --test tests/capabilities/gtm-workflow-capabilities.test.mjs`
  - 16 tests passed in latest run
- Landing Page Factory local verification currently passes:
  - `npm run build`
  - `npm test`

## Notes

- This status file is intentionally conservative: items are marked implemented only when directly evidenced in repository files or capability checks.
- If you want, this document can be split into:
  - Product-facing feature table
  - Engineering implementation matrix
  - Roadmap gaps with priorities
