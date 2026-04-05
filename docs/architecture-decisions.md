# Architecture Decisions

This document records key architectural decisions for UBI CMS, explaining the *why* behind technical choices.

---

## Table of Contents

- [Hybrid Monolith/Microservices Strategy](#1-hybrid-monolithmicroservices-strategy)
- [Express.js for Main API](#2-expressjs-for-main-api)
- [PostgreSQL as Primary Database](#3-postgresql-as-primary-database)
- [Redis for Session and Rate Limiting](#4-redis-for-session-and-rate-limiting)
- [NATS for Event Bus](#5-nats-for-event-bus)
- [Temporal for Workflow Orchestration](#6-temporal-for-workflow-orchestration)
- [Next.js 14 for Portal UI](#7-nextjs-14-for-portal-ui)
- [JWT Authentication](#7-jwt-authentication)
- [API Versioning Strategy](#8-api-versioning-strategy)
- [Monorepo repository layout (tooling)](#11-monorepo-repository-layout-tooling)

---

## 1. Hybrid Monolith/Microservices Strategy

### Decision

Maintain a **monolithic API** (`api/`) for current implementation while building **standalone microservices** (`services/`) for future extraction.

### Context

The project needs to ship quickly but also prepare for scale. A pure microservices approach would require significant infrastructure work before delivering value.

### Rationale

| Approach | Pros | Cons |
|----------|------|------|
| Pure Monolith | Fast to build, simple deployment | Hard to scale отдельные components |
| Pure Microservices | Independent scaling, fault isolation | Complex infrastructure, slower initial development |
| **Hybrid** | Ship fast now, extract later | Requires careful boundaries |

### Consequences

- **Positive**: Can ship MVP quickly; services can be developed in parallel
- **Negative**: Must maintain clean boundaries to enable future extraction
- **Constraint**: All services share the same PostgreSQL instance until event-driven integration is complete

### Implementation Notes

- `api/src/Controllers/` and `api/src/Services/` mirror future service boundaries
- NATS configuration exists in `api/src/Config/app.js` but is **not yet used**
- Each microservice in `services/` can run standalone for development

---

## 2. Express.js for Main API

### Decision

Use **Express.js** for the monolithic API.

### Rationale

- **Mature ecosystem**: Widely understood, extensive middleware
- **JavaScript/TypeScript**: Shared language with frontend
- **Fast to develop**: Minimal boilerplate, flexible routing
- **Production proven**: Used by major companies at scale

### Alternatives Considered

| Alternative | Rejected Because |
|-------------|-----------------|
| NestJS | Overkill for initial scope; adds complexity |
| Fastify | Newer ecosystem; less middleware support |
| Go (Gin/Echo) | Different skill set required; slower initial development |

---

## 3. PostgreSQL as Primary Database

### Decision

Use **PostgreSQL 15+** as the primary relational database.

### Rationale

- **ACID compliance**: Critical for financial transactions (UBI, rewards, treasury)
- **JSONB support**: Flexible metadata storage
- **PostGIS**: Future geo-spatial features possible
- **Mature**: Reliable, well-understood, excellent TypeScript support

### Consequences

- Single primary database (not yet distributed)
- All microservices currently share the same instance
- Future: Read replicas for reporting queries

---

## 4. Redis for Session and Rate Limiting

### Decision

Use **Redis 7+** for session caching and rate limiting.

### Rationale

- **In-memory speed**: Sub-millisecond response for hot data
- **TTL support**: Automatic session expiration
- **Atomic operations**: `INCR` for rate limiting counters
- **Simple**: Minimal configuration required

### Use Cases

| Use Case | Implementation |
|----------|----------------|
| Session cache | JWT blacklist on logout |
| Rate limiting | Sliding window counter per IP |
| API response cache | UBI eligibility (1hr TTL) |
| Pub/Sub | Future: real-time notifications |

---

## 5. NATS for Event Bus

### Decision

Use **NATS** as the message broker for future event-driven microservices.

### Rationale

- **Lightweight**: Minimal overhead, high throughput
- **No persistence required**: Works without JetStream for simple pub/sub
- **Multi-language support**: TypeScript, Go, Python, etc.
- **Future compatibility**: Can add persistence/streaming later with JetStream

### Current Status

| Component | NATS Usage |
|-----------|------------|
| `api/` | Configured but **not actively used** |
| `services/ubi-engine` | Event publisher (`ubi.distribution.completed`) |
| `services/task-marketplace` | Event publisher (`task.created`, `task.claimed`) |
| `services/treasury-engine` | Event publisher + consumer |
| `services/ledger-service` | Event publisher (`ledger.transaction.created`) |

### Events Published

```typescript
// Example: UBI distribution event
{
  "type": "ubi.distribution.completed",
  "timestamp": "2024-01-15T10:00:00Z",
  "data": {
    "poolId": "pool-1",
    "totalAmount": "50000.00",
    "recipients": 1250
  }
}
```

### Alternatives Considered

| Alternative | Rejected Because |
|-------------|-----------------|
| RabbitMQ | Heavier; requires more ops |
| Kafka | Overkill; no streaming use case yet |
| Redis Pub/Sub | No persistence; single-node only |

---

## 6. Temporal for Workflow Orchestration

### Decision

Use **Temporal** for complex workflow orchestration in microservices.

### Rationale

- **Durable execution**: Workflows survive process crashes
- **Built-in retries**: Automatic retry with backoff
- **No double-processing**: Idempotency built-in
- **Visibility**: Web UI for workflow debugging

### Use Cases in Services

| Service | Workflow |
|---------|----------|
| `ubi-engine` | Daily distribution, eligibility recalculation |
| `treasury-engine` | Auto-compounding, yield harvesting, rebalancing |
| `agent-runner` | Agent execution with checkpoint/resume |
| `governance-service` | Proposal voting timelines |

### Current Status

Temporal is **configured in service configs** but **workflows are not yet active** in production.

---

## 7. Next.js 14 for Portal UI

### Decision

Use **Next.js 14** for the portal frontend.

### Rationale

- **React 18**: Latest React features (Server Components)
- **Static generation**: Fast initial page loads
- **API routes**: Can proxy API requests
- **Deployment**: Vercel, AWS, self-hosted

### Architecture

```
frontend/portal-ui/
├── app/                    # Next.js App Router
├── components/             # React components
├── lib/                    # Utilities
└── Dockerfile              # Multi-stage build
```

---

## 8. JWT Authentication

### Decision

Use **JWT (HS256)** for stateless authentication with 24h expiry.

### Rationale

- **Stateless**: No session storage required
- **Compact**: Small token size
- **Industry standard**: Widely understood
- **Secret-based**: Simple HMAC validation

### Token Structure

```json
{
  "userId": "123",
  "username": "john_doe",
  "roles": ["user", "moderator"],
  "iat": 1705312200,
  "exp": 1705398600
}
```

### Security Considerations

| Concern | Mitigation |
|---------|------------|
| Token theft | Short expiry (24h); rate limiting |
| Logout | Redis blacklist (optional) |
| Dev secrets | Fail-fast in production if placeholder detected |
| Passwords | bcrypt with 12 rounds minimum |

---

## 9. API Versioning Strategy

### Decision

Use **URL path versioning** (`/api/v1/`).

### Rationale

- **Explicit**: Clear which version is being called
- **Cacheable**: V1 responses can be cached separately
- **Simple**: No header manipulation required

### Routes Structure

```
/api/v1/auth/login          # Authentication
/api/v1/auth/register       # Registration
/api/v1/tasks               # Task management
/api/v1/rewards             # Reward queries
/api/v1/treasury            # Treasury operations
/api/v1/ubi                 # UBI distribution
/api/v1/agents              # AI agent registry
```

### Future Migration

When extracting to microservices, maintain `/api/v1/` prefix:
- `services/auth-service` handles `/api/v1/auth/*`
- `services/task-marketplace` handles `/api/v1/tasks/*`
- Main API acts as gateway or deprecated monolith

---

## 10. Database Schema Design

### Decision

Use **shared database schema** with logical separation via `tenant_id`.

### Rationale

- **Simpler operations**: Single database to backup/monitor
- **ACID**: Transactions span all tables
- **Easier migration**: No cross-database foreign keys

### Multi-Tenancy

```sql
-- All tenant-scoped tables include tenant_id
CREATE TABLE rewards (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL,
  amount DECIMAL(18, 2) NOT NULL,
  ...
);

-- Queries always filter by tenant_id
SELECT * FROM rewards WHERE tenant_id = $1 AND user_id = $2;
```

### Consequences

| Positive | Negative |
|----------|----------|
| Simple operations | Tenant isolation at application level only |
| Single backup | Poor tenant isolation for security-sensitive data |
| Easy reporting across tenants | Must enforce tenant_id in all queries |

---

## 11. Monorepo repository layout (tooling)

### Decision

Keep the repository as a **single Git monorepo** with **per-package Node projects** (`api/`, `frontend/portal-ui/`, `services/*`), each with its own dependencies and lockfile, until a deliberate migration adds root-level workspaces or a task runner.

### Rationale

- Matches **deployable units** and existing **Docker / GitHub Actions** matrices.
- Avoids a disruptive one-shot migration while the hybrid monolith + services model is still evolving.

### Consequences

- Contributors install and test **inside each package directory** unless root helpers say otherwise.
- **Duplicate tooling and dependencies** are an accepted tradeoff until pnpm/Turborepo (or similar) is adopted.

### Detailed record and runbook

- **Formal ADR:** [ADR 0001 — Monorepo repository layout](./adr/0001-monorepo-repository-layout.md)
- **Checklist and backlog:** [Monorepo playbook](./monorepo.md)

---

## Document History

| Date | Decision | Status |
|------|----------|--------|
| 2024-01 | Initial architecture choices | Implemented |
| 2024-03 | Add NATS for event bus | Infrastructure ready |
| 2024-03 | Add Temporal for workflows | Configured, not active |
| 2024-04 | Hybrid monolith/microservices | Current state |
| 2026-04 | Monorepo layout & tooling (per-package installs) | Accepted — see ADR 0001 |

---

## Related Documents

- [System Architecture](./architecture.md) - Visual architecture diagrams
- [Monorepo playbook](./monorepo.md) - Checklist and improvement backlog
- [ADR index](./adr/README.md) - Numbered architecture decision records
- [services/*/README.md](./services/*/README.md) - Individual service documentation
