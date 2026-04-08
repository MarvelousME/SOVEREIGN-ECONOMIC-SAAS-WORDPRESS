# SVG Requirements Evidence Matrix

Last updated: 2026-04-07

Scope: Repository evidence only (`C:\Users\marvi\Desktop\Projects\Production\SOVEREIGN-ECONOMIC-SAAS-WORDPRESS`).

Status rules used:
- **done**: requirement has direct schema + runtime/API/UI evidence
- **partial**: requirement has some implementation but important parts are incomplete or mocked
- **missing**: no concrete implementation evidence found in scoped code paths

## Storyboard 1: Tenant/workspace model, campaign/distribution flow, analytics touchpoints

| Requirement | Code Evidence (paths/symbols) | Status | Gap | Next Action |
|---|---|---|---|---|
| Workspace-scoped membership + invitation lifecycle | `migrations/024_workspace_invitations.sql` (`workspace_invitations`, RLS policy), `services/business-builder/src/routes/workspace.routes.ts` (`GET/POST /:workspaceId/invites`, `POST /invites/accept`), `services/business-builder/src/services/workspace-invites.service.ts` (`createInvite`, `listInvites`, `acceptInvite`) | done | None identified from current scope | Add integration tests covering invite expiry + role upsert conflicts |
| Campaign orchestration state machine and state history | `migrations/027_campaign_orchestration.sql` (`campaign_orchestrations`, `campaign_state_events`), `services/landing-page-factory/src/models/campaign.model.ts` (`canTransitionCampaignStatus`, `transitionStatus`, `listStateEvents`), `services/landing-page-factory/src/controllers/campaign.controller.ts` (`POST /:id/transition`) | done | None identified from current scope | Add migration checks for existing tenants before rollout |
| Social distribution queue tied to campaign lifecycle | `migrations/025_social_distribution_schema.sql` (`social_posts`, statuses incl. `dead_letter`), `migrations/028_social_posts_campaign_link.sql` (`social_posts.campaign_id`), `services/landing-page-factory/src/services/socialQueue.ts` (`enqueuePublishJob`, worker transitions to `running/completed/failed`) | done | None identified from current scope | Add end-to-end runbook for retry/dead-letter operational handling |
| Analytics touchpoints from publishing flow | `services/landing-page-factory/src/services/socialPublisher.ts` (`emitSocialPostPublished`), `services/analytics-service/src/services/dashboardService.ts` (`attribution_touchpoints`, `conversions`, `canonical_events` queries) | partial | Publisher emits event, but no direct proven pipeline here from emitted event to persisted `attribution_touchpoints` in same service boundary | Add explicit ingestion contract test from social publish event to analytics storage |
| List UX scaling for campaigns/social/team pages | `frontend/portal-ui/src/app/dashboard/campaigns/page.tsx` (`pageSize`, `page`, `total`, `Prev/Next`), `frontend/portal-ui/src/app/dashboard/social-distribution/page.tsx` (scope + pagination), `frontend/portal-ui/src/app/dashboard/workspace-team/page.tsx` (scope + pagination) | done | None for baseline pagination and scope controls | Add server-driven sorting/filter consistency tests across pages |

## Storyboard 2: Autonomous agent chain runtime for research/strategy/compliance

| Requirement | Code Evidence (paths/symbols) | Status | Gap | Next Action |
|---|---|---|---|---|
| Campaign-triggered autonomous agent chain endpoint | `services/landing-page-factory/src/routes/campaign.routes.ts` (`POST /:id/agent-chain/run`, `GET /:id/agent-chain/latest`), `services/landing-page-factory/src/controllers/campaign.controller.ts` (`runAgentChain`, `getLatestAgentChainRun`) | done | None for endpoint presence | Add contract tests for agent-chain payload/result schema stability |
| Planner for multi-step mission decomposition and risk/policy checks | `services/agent-control-plane/src/services/planner/PlannerService.ts` (`createTaskGraph`, `assessRisks`, `evaluatePolicies`) | done | None for planner logic presence | Add deterministic planning fixtures for research/strategy prompts |
| Executor runtime for task execution with artifact/provenance outputs | `services/agent-control-plane/src/services/executor/ExecutorService.ts` (`executeMission`, `buildProvenanceRecord`, `saveArtifacts`) | done | Execution currently simulates many tool outputs (`simulateSandboxExecution`, mock content path) | Replace simulated branches with real tool adapters and acceptance tests |
| Compliance review step in chain | `services/agent-control-plane/src/services/reviewer/ReviewerService.ts` (`verifyCompliance`, `reviewArtifact`) plus `services/compliance-engine/src/services/policyEngine.ts` (`checkContent`, channel requirements) | partial | Reviewer uses heuristic/mocked checks and random scoring sections; limited evidence of tight runtime integration with external compliance engine in this flow | Wire reviewer to compliance-engine API and add policy decision traceability |
| Runtime resilience (pause/resume/checkpoint/resource tracking) | `services/agent-runner/src/executors/AgentRuntime.ts` (`pause`, `resume`, `resumeFromCheckpoint`, `createCheckpoint`, resource polling/cost tracking) | done | None for runtime control primitives | Add chaos tests for interruption/restart recovery paths |

## Storyboard 3: UBI/reward ledger loops in campaign runtime

| Requirement | Code Evidence (paths/symbols) | Status | Gap | Next Action |
|---|---|---|---|---|
| UBI distribution workflow engine | `services/ubi-engine/src/workflows/distribution-workflow.ts` (`dailyDistributionWorkflow`), `services/ubi-engine/src/engine/distribution-calculator.ts` (`applyHybridAlgorithm`, `applyVesting`) | done | None for UBI calculation workflow presence | Add reconciliation report between planned vs persisted distributions |
| Reward issuance and claim flow with ledger transaction hook | `services/rewards-engine/src/domain/services/RewardsService.ts` (`calculateReward`, `claimRewards`, `createLedgerTransaction`) | partial | Ledger call depends on external HTTP contract; no verified cross-service idempotent saga linking reward claim and ledger settlement in current scope | Introduce transactional outbox/saga and integration tests with ledger-service |
| Double-entry ledger core loop | `services/ledger-service/src/services/ledger.service.ts` (`createTransaction`, `validateEntries`, `updateAccountBalance`, `reverseTransaction`) | done | None for core double-entry mechanics | Add high-volume concurrency test for optimistic locking conflicts |
| Campaign runtime directly triggers UBI/reward/ledger loop | No direct linkage found between campaign orchestration/social queue code and UBI/rewards/ledger services in reviewed files | missing | Campaign flow and UBI/reward/ledger loops exist, but no concrete orchestration bridge in scoped code evidence | Add event-driven bridge (campaign milestone -> rewards/UBI/ledger workflow trigger) |

## Storyboard 4: Analytics/reporting/list UX scaling + multi-region/white-label/enterprise reporting

| Requirement | Code Evidence (paths/symbols) | Status | Gap | Next Action |
|---|---|---|---|---|
| Backend analytics/reporting aggregation services | `services/analytics-service/src/services/dashboardService.ts` (tenant/workspace metrics), `services/reporting-service/src/services/reporting.service.ts` (`getDashboardMetrics`, financial/UBI/task/agent reports, Redis cache) | done | None for service-level report aggregation presence | Add shared schema contracts between analytics-service and reporting-service |
| Enterprise reporting depth (financial + UBI + agent performance views) | `services/reporting-service/src/services/reporting.service.ts` (`getFinancialSummary`, `getUBIStatistics`, `getAgentPerformanceReport`) | done | None for backend API capability evidence | Add RBAC-scoped report access tests (exec/ops/analyst personas) |
| Frontend analytics UX backed by live reporting APIs | `frontend/portal-ui/src/app/dashboard/analytics/page.tsx` uses in-file mock datasets and chart constants (`monthlyRevenue`, `userGrowth`, etc.) | partial | Dashboard currently presents mock data; no direct call to reporting-service/analytics-service in this file | Replace mock datasets with API-backed hooks and loading/error states |
| Multi-region reporting implementation | `frontend/portal-ui/src/app/dashboard/analytics/page.tsx` has mock `geoDistribution`; no backend region-aware aggregation contract found in reviewed report service methods | partial | Region view appears at UI level only; backend multi-region reporting path not clearly implemented in scoped evidence | Add region dimensions to reporting queries and expose region-filtered endpoints |
| White-label theming and tenant branding in portal | `frontend/portal-ui/src/themes/themes.ts` (theme catalog), `services/business-builder/src/services/branding.service.ts` (brand generation service) | partial | Theme catalog and branding generation exist, but no confirmed tenant-bound theme assignment/render pipeline in reviewed paths | Add tenant->theme persistence + runtime theme resolution middleware |
| Enterprise SSO / enterprise-specific reporting controls | No direct enterprise SSO/reporting control evidence found in reviewed scoped files | missing | Enterprise auth/report governance controls not evidenced in current scope | Define and implement enterprise auth + report-governance requirements with explicit APIs |

