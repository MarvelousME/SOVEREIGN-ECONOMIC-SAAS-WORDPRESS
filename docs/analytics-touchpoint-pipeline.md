# Analytics Touchpoint Pipeline and Frontend API Wiring

Last updated: 2026-04-07

## Scope

This document captures:

- Backend touchpoint flow from social publish to analytics ingestion.
- Frontend analytics API wiring currently used by the dashboard.
- Gaps and normalization requirements between services.
- A draft Definition of Done (DoD) for this domain.

## Backend Touchpoint Pipeline (Current State)

### Source event emission

- Service: `services/landing-page-factory`
- Trigger: social publish execution in `socialPublisher.ts`
- Action: calls `emitSocialPostPublished(...)` after provider publish succeeds.

Published payload fields include:

- `tenantId`, `workspaceId`, `pageId`, `socialPostId`
- `provider`, `postId`, `postUrl`
- `campaign`, `linkUrl`, `publishedAt`

### Analytics emission client

- File: `services/landing-page-factory/src/services/analyticsClient.ts`
- Endpoint used: `POST {ANALYTICS_SERVICE_URL}/api/v1/events/ingest`
- Headers set:
  - `Content-Type: application/json`
  - `x-tenant-id`
  - `x-workspace-id`
- Event envelope sent:
  - `eventType: social.post_published`
  - `visitorId`, `sessionId`, `timestamp`, `source`
  - `data` (full publish payload)
  - `campaign`

### Analytics service ingest surface

- File: `services/analytics-service/src/routes/index.ts`
- Current ingest routes:
  - `POST /analytics/events`
  - `POST /analytics/events/batch`

### Integration note

Current code evidence shows a route-shape mismatch:

- Producer emits to `/api/v1/events/ingest`
- Analytics service exposes `/analytics/events`

Until one side is normalized (or aliasing/proxy is introduced), this can block end-to-end touchpoint persistence from social publish events.

## Frontend Analytics API Wiring (Current State)

## Dashboard entrypoint wiring

- Page: `frontend/portal-ui/src/app/dashboard/analytics/page.tsx`
- API client import: `getCampaignReport` from `@/lib/workspace-social-api`
- Runtime behavior:
  - Requests campaign report data for last 30 days
  - Supports scope, query, sort, direction, pagination
  - Uses abort-controller based request cancellation
  - Renders loading/error/empty states for campaign report table

## API client wiring

- File: `frontend/portal-ui/src/lib/workspace-social-api.ts`
- Base URLs:
  - `NEXT_PUBLIC_LANDING_FACTORY_URL` for campaign/social endpoints
  - `NEXT_PUBLIC_BUSINESS_BUILDER_URL` for workspace invite endpoints
- `getCampaignReport(...)` route:
  - `GET {LANDING_FACTORY_BASE}/campaigns/reports?...`
- Auth and tenancy headers:
  - `Authorization: Bearer <token>` (when available)
  - `x-tenant-id`
  - `x-user-id`

## Frontend analytics coverage note

Current analytics page is hybrid:

- Campaign runtime report is API-backed.
- Several chart sections remain mock-data driven in the same page.

This is important when defining done criteria, because "frontend analytics wired" is currently only partially true per-widget.

## DoD Draft: Analytics Touchpoint + Frontend Analytics Wiring

The domain is considered done when all items below are true:

- A single canonical ingest contract is implemented and documented for social touchpoint events (path, auth, headers, schema).
- Social publish events are verifiably persisted into analytics storage and queryable in attribution/report endpoints.
- A contract/integration test proves end-to-end flow:
  - publish event emitted by landing-page-factory
  - analytics ingestion accepted
  - touchpoint visible in analytics read model
- Frontend analytics pages use API-backed data for all production widgets in scope (no silent mock fallback for shipped cards/charts).
- Frontend API client error semantics are standardized (HTTP errors, schema errors, empty-state behavior, retry behavior).
- Tenant/workspace isolation is validated for analytics reads and writes via automated tests.
- Required env vars are documented in one place for local/dev/staging/prod (`ANALYTICS_SERVICE_URL`, frontend `NEXT_PUBLIC_*` URLs, auth expectations).
- Dashboard-level smoke test passes for:
  - campaign report load
  - attribution page load
  - revenue page load
  - expected error UX when API is unavailable
- Observability exists for this flow:
  - ingest success/failure metrics
  - structured logs with tenant/workspace correlation
  - dashboard to monitor touchpoint ingestion health
- Documentation is updated in `docs/` with:
  - flow diagram or step map
  - API route map
  - ownership (which service owns emit, ingest, and report contracts)

## Recommended Follow-ups

- Add an explicit compatibility decision: producer route update vs analytics alias route.
- Add typed shared event schema package for `social.post_published`.
- Add a short "verification runbook" section once integration tests are in place.
