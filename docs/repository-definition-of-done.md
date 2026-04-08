# Repository Definition of Done (DoD) - Social Distribution and Attribution

Last updated: 2026-04-07
Owner: Platform Engineering
Status: Implementation-ready

## Purpose

This document defines the repository-level Definition of Done for the 8 remaining/partial implementation items in social distribution, campaign orchestration, and attribution.

Each item includes:
- Scope and intent
- Acceptance criteria
- Verification commands
- Rollout criteria
- Rollback criteria

---

## Global DoD Gates (Apply to All 8 Items)

An item is only "Done" when all gates pass:

1. Code complete and merged behind feature flags where applicable.
2. DB migrations applied and reversible (or forward-fix documented).
3. Tests added/updated:
   - Unit tests for core logic
   - Integration tests for service boundaries
   - Capability/e2e checks for user-visible behavior
4. Observability complete:
   - Structured logs
   - Metrics for success/failure/latency
   - Alert threshold defined
5. Security complete:
   - OAuth token handling encrypted at rest
   - No secrets in logs
   - Authorization checks on all workspace-scoped routes
6. Documentation updated:
   - `docs/feature-implementation-status.md`
   - API route docs and env var docs where changed
7. Rollout and rollback runbooks validated in staging.

---

## Item 1 - Workspace Social Account Connection Management

### Scope
Implement first-party account connection lifecycle per workspace (connect, refresh, disconnect, list status).

### Acceptance Criteria
- Workspace-scoped API endpoints exist for account management.
- Tokens are encrypted at rest and never returned in plaintext APIs.
- Account records include provider, workspace_id, status, scopes, expires_at, created_by.
- UI can show connection status per provider.
- Disconnect revokes/invalidates tokens where provider supports revocation.

### Verification Commands
```bash
# Service build/test
npm --prefix services/landing-page-factory run build
npm --prefix services/landing-page-factory run test

# Capability tests (add/update accordingly)
node --test tests/capabilities/gtm-workflow-capabilities.test.mjs
```

### Rollout Criteria
- Feature flag: `SOCIAL_ACCOUNT_CONNECTIONS_ENABLED=true` enabled in staging for one test workspace.
- Successful connect/disconnect cycle verified for all enabled providers.
- No auth/token errors > 1% over 24h in staging.

### Rollback Criteria
- Disable flag `SOCIAL_ACCOUNT_CONNECTIONS_ENABLED=false`.
- Revert UI surface to read-only "Not Connected".
- Preserve encrypted token rows for later recovery unless incident response requires token purge.

---

## Item 2 - Native OAuth Auto-Posting: Meta

### Scope
Enable direct publish to Meta using workspace-connected account.

### Acceptance Criteria
- Publish endpoint supports provider `meta`.
- API validates workspace ownership of connected account.
- Provider response IDs persisted for traceability.
- Failed publish events include provider error code and retry classification.

### Verification Commands
```bash
npm --prefix services/landing-page-factory run test -- social
npm --prefix services/landing-page-factory run build
```

### Rollout Criteria
- `SOCIAL_PUBLISH_META_ENABLED=true` for staging only.
- Minimum 10 successful staged publishes with captured provider IDs.
- No unclassified publish failures.

### Rollback Criteria
- Disable `SOCIAL_PUBLISH_META_ENABLED`.
- Queue accepts jobs but marks provider unsupported for Meta.
- Existing published links remain accessible.

---

## Item 3 - Native OAuth Auto-Posting: X

### Scope
Enable direct publish to X using workspace-connected account.

### Acceptance Criteria
- Provider adapter for X supports post create and error mapping.
- Rate-limit responses are classified as retryable with backoff.
- Idempotency key prevents duplicate posts on retry.

### Verification Commands
```bash
npm --prefix services/landing-page-factory run test -- social
npm --prefix services/landing-page-factory run build
```

### Rollout Criteria
- `SOCIAL_PUBLISH_X_ENABLED=true` in staging.
- Retry behavior validated with forced transient failure.
- Duplicate-post rate = 0 in staging validation suite.

### Rollback Criteria
- Disable `SOCIAL_PUBLISH_X_ENABLED`.
- Keep queued jobs for replay after re-enable.
- Disable provider adapter path without impacting other providers.

---

## Item 4 - Native OAuth Auto-Posting: LinkedIn

### Scope
Enable direct publish to LinkedIn using workspace-connected account.

### Acceptance Criteria
- Provider adapter supports text/link post flow and response ID capture.
- Required scopes validated before publish.
- Workspace authorization enforced on every publish request.

### Verification Commands
```bash
npm --prefix services/landing-page-factory run test -- social
npm --prefix services/landing-page-factory run build
```

### Rollout Criteria
- `SOCIAL_PUBLISH_LINKEDIN_ENABLED=true` in staging.
- End-to-end publish test passes with account that has required scopes.
- Publish latency p95 within defined SLO for 24h.

### Rollback Criteria
- Disable `SOCIAL_PUBLISH_LINKEDIN_ENABLED`.
- Mark pending LinkedIn jobs as paused (not failed) for replay.
- Maintain provider-independent queue health.

---

## Item 5 - Scheduler Calendar and Delayed Publish

### Scope
Implement first-party scheduling (immediate + delayed publish windows).

### Acceptance Criteria
- Jobs can be scheduled at a future UTC timestamp.
- Scheduler stores immutable execution intent (provider, content hash, landing_page_id, workspace_id, scheduled_at).
- User can list scheduled jobs and cancel before execution.
- Timezone conversion handled client-side; backend persists UTC only.

### Verification Commands
```bash
npm --prefix services/landing-page-factory run test -- scheduler
npm --prefix services/landing-page-factory run build
```

### Rollout Criteria
- `SOCIAL_SCHEDULER_ENABLED=true` in staging.
- Schedule, list, cancel, execute flow validated in integration tests.
- Drift between scheduled and executed time <= allowed threshold.

### Rollback Criteria
- Disable `SOCIAL_SCHEDULER_ENABLED`.
- Prevent new delayed jobs; allow already-running jobs to complete.
- Export pending schedule queue snapshot for recovery.

---

## Item 6 - Retry Policy, Queue Reliability, and Dead-Letter Handling

### Scope
Implement deterministic retries with exponential backoff and dead-letter queue (DLQ).

### Acceptance Criteria
- Retry policy differentiates retryable vs terminal provider errors.
- Max attempts and backoff strategy are configurable by env.
- DLQ persists full context for replay and postmortem.
- Replay endpoint exists for authorized operators.

### Verification Commands
```bash
npm --prefix services/landing-page-factory run test -- queue
npm --prefix services/landing-page-factory run build
```

### Rollout Criteria
- `SOCIAL_QUEUE_RETRY_ENABLED=true` in staging.
- Forced failure test demonstrates retry and DLQ route.
- DLQ alert configured and tested.

### Rollback Criteria
- Set retries to 0 via config and pause DLQ replay.
- Route all failed jobs to terminal state with explicit reason.
- Keep queue data intact for forward-fix.

---

## Item 7 - First-Party Social Analytics Ingestion

### Scope
Ingest provider analytics (impressions, clicks, engagement metrics) and link to published post records.

### Acceptance Criteria
- Analytics ingestion job exists per provider with normalized schema.
- Metrics are linked to workspace, post, campaign (if present), and landing page.
- Backfill path supports last N days without duplication.
- Data freshness SLO and lag metrics are emitted.

### Verification Commands
```bash
npm --prefix services/landing-page-factory run test -- analytics
npm --prefix services/landing-page-factory run build
```

### Rollout Criteria
- `SOCIAL_ANALYTICS_INGEST_ENABLED=true` in staging.
- Ingested metrics match provider source within tolerance.
- Ingestion lag remains below SLO for 24h.

### Rollback Criteria
- Disable `SOCIAL_ANALYTICS_INGEST_ENABLED`.
- Freeze analytics sync jobs, preserve stored data.
- Revert dashboards to "stale data" badge mode.

---

## Item 8 - Closed-Loop Attribution (Post -> Click -> Conversion)

### Scope
Deliver end-to-end attribution across social publish events, click tracking, and conversion events.

### Acceptance Criteria
- Stable attribution key exists and is propagated from post publish to click and conversion.
- Attribution model and lookback window are explicit and versioned.
- API/report endpoint returns attributed conversions by workspace/campaign/provider.
- Reconciliation job detects orphan clicks/conversions and reports mismatch rates.

### Verification Commands
```bash
npm --prefix services/analytics-service run build
npm --prefix services/analytics-service run test
node --test tests/capabilities/gtm-workflow-capabilities.test.mjs
```

### Rollout Criteria
- `CLOSED_LOOP_ATTRIBUTION_ENABLED=true` in staging.
- Golden-path scenario validated:
  - publish post
  - capture click
  - capture conversion
  - verify attributed report output
- Reconciliation mismatch rate below agreed threshold.

### Rollback Criteria
- Disable `CLOSED_LOOP_ATTRIBUTION_ENABLED`.
- Continue raw event collection without attribution joins.
- Mark attribution dashboards/reporting as temporarily unavailable.

---

## Implementation Sequence (Recommended)

1. Item 1 (Account connections)
2. Items 2-4 (Provider publishing adapters)
3. Item 6 (Queue/retry/DLQ)
4. Item 5 (Scheduler)
5. Item 7 (Analytics ingestion)
6. Item 8 (Closed-loop attribution)

Rationale: secure account foundation first, then publish paths, then reliability controls, then orchestration and analytics.

---

## Repository Evidence Checklist (PR Gate)

Each PR completing part of an item must include:
- Migration files (if schema changes) in `migrations/`
- Route/controller/service updates in relevant service package
- Tests for success, retryable failure, terminal failure
- Updated env examples (`.env.example`) for new flags/config
- Updated docs in `docs/` with behavior and runbook notes

---

## Exit Criteria for Declaring "All 8 Done"

All of the following must be true:
- All 8 item acceptance criteria are checked complete.
- All verification commands pass in CI.
- Staging rollout criteria pass for each item.
- Rollback drills executed successfully for at least one provider and one queue incident scenario.
- `docs/feature-implementation-status.md` updated from partial/not-implemented to implemented with code evidence.
