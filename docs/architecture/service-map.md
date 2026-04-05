# UBI-CMS Service Map

This document provides a comprehensive overview of all services in the UBI-CMS platform, their responsibilities, dependencies, and communication patterns.

## Service Overview

### Core Services

#### 1. Auth Service
- **Port**: 3001
- **Responsibilities**:
  - User authentication and authorization
  - Keycloak integration
  - JWT token management
  - Session management
  - Role-based access control (RBAC)

- **Dependencies**:
  - PostgreSQL (user data)
  - Keycloak (IAM)
  - Redis (session storage)
  - NATS (event publishing)

- **Events Published**:
  - `user.created`
  - `user.updated`
  - `user.deleted`
  - `user.logged_in`
  - `user.logged_out`

- **Events Consumed**: None

---

#### 2. UBI Engine
- **Port**: 3002
- **Responsibilities**:
  - Universal Basic Income distribution
  - Eligibility verification
  - Distribution scheduling
  - Balance tracking

- **Dependencies**:
  - PostgreSQL (distribution data)
  - Ledger Service (transaction recording)
  - Treasury Engine (fund management)
  - NATS (event bus)

- **Events Published**:
  - `ubi.distribution`
  - `ubi.eligibility_verified`
  - `ubi.distribution_failed`

- **Events Consumed**:
  - `user.created`
  - `reputation.updated`

---

#### 3. Ledger Service
- **Port**: 3003
- **Responsibilities**:
  - Transaction recording
  - Double-entry bookkeeping
  - Account balance management
  - Transaction history
  - Audit trail

- **Dependencies**:
  - PostgreSQL (ledger data)
  - NATS (event bus)

- **Events Published**:
  - `transaction.created`
  - `transaction.completed`
  - `transaction.failed`
  - `balance.updated`

- **Events Consumed**:
  - `ubi.distribution`
  - `task.completed`
  - `reward.distributed`

---

#### 4. Treasury Engine
- **Port**: 3004
- **Responsibilities**:
  - Fund management
  - Reserve management
  - Budget allocation
  - Financial reporting
  - OPA policy enforcement

- **Dependencies**:
  - PostgreSQL (treasury data)
  - Ledger Service (transaction recording)
  - OPA (policy decisions)
  - NATS (event bus)

- **Events Published**:
  - `treasury.allocated`
  - `treasury.depleted`
  - `treasury.replenished`

- **Events Consumed**:
  - `ubi.distribution`
  - `reward.distributed`

---

#### 5. Governance Service
- **Port**: 3005
- **Responsibilities**:
  - Proposal management
  - Voting mechanisms
  - Execution of approved proposals
  - Quadratic voting
  - Conviction voting

- **Dependencies**:
  - PostgreSQL (proposal data)
  - NATS (event bus)
  - Temporal (workflow orchestration)

- **Events Published**:
  - `proposal.created`
  - `proposal.voted`
  - `proposal.passed`
  - `proposal.rejected`
  - `proposal.executed`

- **Events Consumed**:
  - `user.created`
  - `reputation.updated`

---

#### 6. Task Marketplace
- **Port**: 3006
- **Responsibilities**:
  - Task creation and management
  - Task assignment
  - Skill matching
  - Task completion verification
  - Reward distribution

- **Dependencies**:
  - PostgreSQL (task data)
  - Reputation Service (skill verification)
  - Ledger Service (payment processing)
  - NATS (event bus)

- **Events Published**:
  - `task.created`
  - `task.assigned`
  - `task.submitted`
  - `task.completed`
  - `task.cancelled`

- **Events Consumed**:
  - `user.created`
  - `reputation.updated`

---

#### 7. Reputation Service
- **Port**: 3007
- **Responsibilities**:
  - Reputation score management
  - Skill endorsements
  - Badge awards
  - Reputation decay
  - Reputation history

- **Dependencies**:
  - PostgreSQL (reputation data)
  - NATS (event bus)

- **Events Published**:
  - `reputation.updated`
  - `skill.endorsed`
  - `badge.awarded`

- **Events Consumed**:
  - `task.completed`
  - `proposal.executed`
  - `user.created`

---

#### 8. Rewards Engine
- **Port**: 3008
- **Responsibilities**:
  - Reward calculation
  - Bonus distribution
  - Incentive management
  - Gamification mechanics

- **Dependencies**:
  - PostgreSQL (reward data)
  - Ledger Service (reward distribution)
  - NATS (event bus)

- **Events Published**:
  - `reward.distributed`
  - `bonus.awarded`

- **Events Consumed**:
  - `task.completed`
  - `reputation.updated`

---

#### 9. Notifications Service
- **Port**: 3009
- **Responsibilities**:
  - Multi-channel notifications (email, SMS, push, in-app)
  - Template management
  - Delivery tracking
  - User preferences

- **Dependencies**:
  - PostgreSQL (notification data)
  - Redis (queue management)
  - NATS (event bus)
  - External services (SendGrid, Twilio, FCM)

- **Events Published**:
  - `notification.sent`
  - `notification.failed`

- **Events Consumed**:
  - All events (for user notifications)

---

#### 10. Referral Service
- **Port**: 3010
- **Responsibilities**:
  - Referral link generation
  - Referral tracking
  - Referral reward calculation
  - Multi-level referrals

- **Dependencies**:
  - PostgreSQL (referral data)
  - Ledger Service (reward distribution)
  - NATS (event bus)

- **Events Published**:
  - `referral.created`
  - `referral.converted`
  - `referral.rewarded`

- **Events Consumed**:
  - `user.created`

---

#### 10b. Partner Referral Workspace OS (data plane)

- **Schema**: `partner_referral_os` (PostgreSQL) — see migration `migrations/021_partner_referral_workspace_os_schema.sql`
- **Responsibilities** (target — API service TBD):
  - B2B partner companies, programs, versioned contracts, tracking assets
  - Campaigns and **schema-local** landing pages (`partner_referral_os.landing_pages` — distinct from Landing Page Factory `public.landing_pages`)
  - Session attribution, leads, conversion import/match, commission ledger, payout instructions, disputes
- **Integrations**:
  - **Business Builder**: `partner_referral_os.workspaces.linked_tenant_workspace_id` → `tenant_workspaces.id`
  - **Referral Service**: separate user-referral tree; integrate later via events if needed
  - **Landing Page Factory**: optional sync or deep-link using tenant + campaign metadata
  - **Ledger / Treasury**: consume payout instruction events (planned)
- **Documentation**: [Partner Referral + SA³-EOS wiring](../integration/partner-referral-sa3-eos-wiring.md)

---

#### 11. Agent Control Plane
- **Port**: 3011
- **Responsibilities**:
  - AI agent lifecycle management
  - Agent deployment and scaling
  - Agent monitoring
  - Agent configuration

- **Dependencies**:
  - PostgreSQL (agent data)
  - Knowledge Service (agent knowledge base)
  - NATS (event bus)

- **Events Published**:
  - `agent.created`
  - `agent.deployed`
  - `agent.terminated`

- **Events Consumed**:
  - `task.created`

---

#### 12. Agent Runner
- **Port**: 3012
- **Responsibilities**:
  - Execute AI agent tasks
  - Agent execution environment
  - Result aggregation

- **Dependencies**:
  - Agent Control Plane (agent metadata)
  - Knowledge Service (data access)
  - NATS (event bus)

- **Events Published**:
  - `agent.task_started`
  - `agent.task_completed`
  - `agent.task_failed`

- **Events Consumed**:
  - `agent.deployed`
  - `task.assigned`

---

### Support Services

#### 13. Business Builder
- **Port**: 3013
- **Responsibilities**:
  - Sovereign business creation
  - Business profile management
  - Business verification

- **Dependencies**:
  - PostgreSQL (business data)
  - NATS (event bus)

#### 14. Knowledge Service
- **Port**: 3014
- **Responsibilities**:
  - Knowledge graph management
  - Vector storage (Qdrant)
  - Semantic search
  - Knowledge retrieval for agents

- **Dependencies**:
  - Qdrant (vector database)
  - PostgreSQL (metadata)

#### 15. Data Vault Service
- **Port**: 3015
- **Responsibilities**:
  - Personal data encryption
  - Data access control
  - GDPR compliance
  - Data portability

- **Dependencies**:
  - PostgreSQL (encrypted data)
  - MinIO (file storage)

#### 16. Reporting Service
- **Port**: 3016
- **Responsibilities**:
  - Analytics and reporting
  - Dashboard data aggregation
  - Report generation
  - Data visualization

- **Dependencies**:
  - PostgreSQL (all databases - read replicas)
  - Redis (caching)

---

## Infrastructure Services

### 1. API Gateway (Traefik)
- **Port**: 2025 (HTTP), 2026 (HTTPS)
- **Responsibilities**:
  - Request routing
  - Load balancing
  - Rate limiting
  - SSL/TLS termination
  - Request/response transformation

### 2. PostgreSQL
- **Port**: 5432
- **Database per service** (multi-tenant ready)

### 3. Redis
- **Port**: 6379
- **Usage**:
  - Session storage
  - Caching
  - Rate limiting
  - OPA policy caching

### 4. NATS JetStream
- **Port**: 4222 (Client), 8222 (Monitoring)
- **Streams**:
  - EVENTS (7-day retention)
  - COMMANDS (1-day retention)

### 5. Temporal
- **Port**: 7233
- **Workflows**:
  - Saga orchestration
  - Long-running processes
  - Scheduled jobs

### 6. Keycloak
- **Port**: 8080
- **Responsibilities**:
  - Identity and Access Management
  - OAuth2/OIDC provider
  - User federation

### 7. OPA (Open Policy Agent)
- **Port**: 8181
- **Responsibilities**:
  - Authorization policies
  - Fine-grained access control

### 8. MinIO
- **Port**: 9000 (API), 9001 (Console)
- **Responsibilities**:
  - Object storage
  - File uploads
  - Document storage

### 9. Qdrant
- **Port**: 6333
- **Responsibilities**:
  - Vector database
  - Semantic search
  - Similarity matching

---

## Service Communication Patterns

### 1. Synchronous (HTTP/REST)
- Used for direct service-to-service calls
- Request-response pattern
- Circuit breaker protection

### 2. Asynchronous (NATS Events)
- Used for event-driven communication
- Publish-subscribe pattern
- Event sourcing

### 3. Workflows (Temporal)
- Used for long-running processes
- Saga pattern for distributed transactions
- Automatic retry and compensation

---

## Service Dependency Graph

```
┌─────────────────┐
│  API Gateway    │
│   (Traefik)     │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Services│
    └────┬────┘
         │
    ┌────┴──────────────┐
    │                   │
┌───▼───────┐    ┌──────▼──────┐
│PostgreSQL │    │    NATS     │
│  (Each    │    │(Event Bus)  │
│  Service) │    └──────┬──────┘
└───────────┘           │
                   ┌────▼────┐
                   │Temporal │
                   │(Workflows)
                   └─────────┘
```

---

## Scaling Recommendations

### Horizontal Scaling
- Auth Service: 3+ instances
- UBI Engine: 2+ instances
- Ledger Service: 2+ instances (with DB replication)
- Task Marketplace: 2+ instances
- Notifications Service: 3+ instances

### Vertical Scaling
- PostgreSQL: High memory, SSD storage
- Redis: High memory
- NATS: High throughput network

### Database Sharding
- Ledger Service: Shard by user_id
- Task Marketplace: Shard by region
- Reputation Service: Shard by user_id

---

## Health Check Endpoints

All services expose:
- `GET /health` - Overall health status
- `GET /health/live` - Liveness probe
- `GET /health/ready` - Readiness probe

---

## Monitoring & Observability

### Metrics (Prometheus)
- Service metrics: `/metrics` endpoint
- Custom business metrics
- Infrastructure metrics

### Logs (Loki)
- Structured JSON logs
- Correlation ID tracking
- Centralized log aggregation

### Traces (OpenTelemetry → Tempo)
- Distributed tracing
- Service dependency mapping
- Performance analysis

### Dashboards (Grafana)
- Service health overview
- Business metrics
- Infrastructure metrics
- Alert management

---

## Optional external runtime: Sovereign-Engine (NovasPlace)

The **[Sovereign-Engine](https://github.com/NovasPlace/Sovereign-Engine)** project is a **Python-heavy autonomous-agent stack** (substrate: Postgres blackboard + event ledger + nerve bus; cognitive “organs”; daemons; MCP-style HTTP tools). It is **not** a core dependency of this platform.

**When it adds value:** bounded **agent workers**, **ops telemetry**, **spawn-time context** assembly, or **internal MCP gateways**—always **behind** the existing auth stack and **never** as a substitute for the **Ledger Service** for financial transactions.

**Documentation:** [Sovereign-Engine integration guide](../integration/sovereign-engine-integration.md) (local clone path, phase plan, anti-patterns).

**License:** MIT in `core/sovereign/LICENSE` upstream; confirm per-component licenses before reuse.
