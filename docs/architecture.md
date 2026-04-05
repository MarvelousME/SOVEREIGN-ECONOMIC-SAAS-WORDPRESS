# UBI CMS — System Architecture

> **Document Status**: This document describes the **hybrid architecture** of UBI CMS, combining a **currently implemented monolithic API** with **planned microservices**.

---

## Table of Contents

- [Overview](#overview)
- [System Context](#system-context)
- [Component Architecture](#component-architecture)
- [Current vs Planned Architecture](#current-vs-planned-architecture)
- [Request Flow](#request-flow)
- [Data Flow — UBI Claim](#data-flow--ubi-claim)
- [Data Flow — Task Lifecycle](#data-flow--task-lifecycle)
- [Database Relationships](#database-relationships)
- [Security Architecture](#security-architecture)
- [Observability Stack](#observability-stack)
- [Deployment Topology](#deployment-topology)
- [Scalability Considerations](#scalability-considerations)

---

## Overview

UBI CMS uses a **hybrid architecture**:

| Layer | Status | Description |
|-------|--------|-------------|
| **API (`api/`)** | ✅ **Implemented** | Monolithic Express.js API handling all HTTP requests |
| **Services (`services/`)** | 🚧 **Planned/In Development** | 16 standalone microservices (not yet integrated) |
| **Event Bus (NATS)** | 🚧 **Infrastructure Ready** | Configured in services, not yet used by main API |
| **Portal UI (`frontend/`)** | ✅ **Implemented** | Next.js 14 portal front-end |

The codebase is structured to support **gradual extraction** from monolith to microservices as traffic demands grow.

### Design Principles

1. **Security first** — JWT auth, bcrypt passwords, parameterized queries, Helmet headers, rate limiting by default
2. **Fail fast** — Server refuses to start without required environment variables
3. **Demo-ready** — Client-side fallback mode allows UI exploration without backend
4. **Production-grade** — Multi-stage Docker builds, non-root containers, graceful shutdown, structured logging

---

## System Context

```mermaid
C4Context
    title UBI CMS — System Context

    Person(user, "Platform User", "Earns UBI through tasks, manages treasury")
    Person(admin, "Administrator", "Manages platform, verifies tasks, controls agents")

    System(ubisystem, "UBI CMS Platform", "Task-to-earn UBI distribution with AI agents and treasury management")

    System_Ext(blockchain, "Blockchain / DeFi", "Optional: on-chain settlement")
    System_Ext(email, "Email Service", "Notifications and alerts")

    Rel(user, ubisystem, "Uses portal", "HTTPS")
    Rel(admin, ubisystem, "Administers", "HTTPS")
    Rel(ubisystem, blockchain, "Optional settlement", "RPC")
    Rel(ubisystem, email, "Sends notifications", "SMTP/API")
```

---

## Component Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        Browser["Browser\n(Portal UI - Next.js 14)"]
        AdminBrowser["Browser\n(Admin UI - Planned)"]
    end

    subgraph "Edge Layer"
        Nginx["Nginx Reverse Proxy\n- TLS termination\n- Rate limiting\n- Security headers\n- Static asset caching"]
    end

    subgraph "Application Layer — CURRENT (Implemented)"
        PortalUI["Portal UI\nNext.js 14 + TypeScript\n:3001"]
        API["Monolithic API\nNode.js + Express\n:3000"]
        API2["API Instance 2\n(horizontal scale)"]
    end

    subgraph "Application Layer — PLANNED (Microservices)"
        subgraph "services/ubi-engine (:3002)"
            UBI1["UBI Engine"]
        end
        subgraph "services/task-marketplace (:3005)"
            TM1["Task Marketplace"]
        end
        subgraph "services/treasury-engine (:3006)"
            TE1["Treasury Engine"]
        end
        subgraph "services/auth-service (:3001)"
            AS1["Auth Service"]
        end
        subgraph "Other Services..."
            OTH["ledger,\nrewards,\nreputation,\nagents,\netc."]
        end
    end

    subgraph "Event Bus — PLANNED"
        NATS["NATS Messaging\n:4222"]
    end

    subgraph "Data Layer"
        PG[("PostgreSQL 15+\nPrimary database")]
        Redis[("Redis 7+\nSession cache")]
    end

    subgraph "Observability"
        OTel["OpenTelemetry\nCollector"]
        Prometheus["Prometheus\nMetrics store"]
        Loki["Loki\nLog aggregation"]
        Grafana["Grafana\nDashboards"]
    end

    Browser --> Nginx
    AdminBrowser --> Nginx
    Nginx --> PortalUI
    Nginx --> API

    API --> Security["Security Middleware\n- Helmet\n- CORS\n- Rate limiter"]
    API --> Auth["Auth Middleware\n- JWT verify\n- Role check"]
    API --> Controllers["Controllers\n- Auth\n- Tasks\n- Rewards\n- Treasury\n- Agents\n- UBI"]
    Controllers --> Models["Models\n- User\n- Task\n- Reward\n- Treasury\n- Agent"]
    Models --> PG
    Models --> Redis

    API -.-> |"Future: NATS events"| NATS
    NATS -.-> UBI1
    NATS -.-> TM1
    NATS -.-> TE1
    NATS -.-> AS1
    NATS -.-> OTH

    API --> OTel
    OTel --> Prometheus
    OTel --> Loki
    Prometheus --> Grafana
    Loki --> Grafana
```

---

## Current vs Planned Architecture

### Current State (Implemented)

The **monolithic API** at `api/src/index.js` is the **active HTTP interface**:

```
api/src/
├── index.js              # Express app entry point
├── Controllers/          # Route handlers (auth, tasks, rewards, treasury, agents, UBI)
├── Services/            # Business logic (ubiService.js)
├── Models/               # Database models (db.js, User, Task, Reward, etc.)
├── Middleware/           # auth.js, security.js
└── Config/              # app.js (NATS config present but unused)
```

**All requests go through this single Express server** running on port 3000.

### Planned State (Microservices)

The `services/` directory contains **16 standalone microservices**:

| Service | Port | Description | NATS | Temporal |
|---------|------|-------------|------|----------|
| `ubi-engine` | 3002 | UBI distribution engine | ✅ | ✅ |
| `task-marketplace` | 3005 | Task creation and management | ✅ | ❌ |
| `treasury-engine` | 3006 | Multi-vault yield optimization | ✅ | ✅ |
| `auth-service` | 3001 | Authentication (Keycloak) | ❌ | ❌ |
| `ledger-service` | 3001 | Double-entry accounting | ✅ | ❌ |
| `rewards-engine` | - | Reward distribution | ✅ | ✅ |
| `reputation-service` | - | Reputation scoring | ✅ | ❌ |
| `agent-runner` | - | AI agent sandbox execution | ✅ | ✅ |
| `agent-control-plane` | - | Agent orchestration | ✅ | ❌ |
| `notifications-service` | - | Email/push notifications | ✅ | ❌ |
| `referral-service` | - | Referral tracking | ✅ | ❌ |
| `knowledge-service` | - | Vector knowledge base | ✅ | ❌ |
| `governance-service` | - | DAO proposals | ✅ | ✅ |
| `reporting-service` | - | Analytics reporting | ✅ | ❌ |
| `data-vault-service` | - | Data encryption/storage | ✅ | ❌ |
| `business-builder` | - | Business logic builder | ✅ | ❌ |

### Integration Status

| Component | Status | Notes |
|-----------|--------|-------|
| Main API → Services | 🚧 **Not Integrated** | Services run standalone, not called by main API |
| NATS | 🚧 **Infrastructure Ready** | Configured in services, main API has config but no publisher/subscriber |
| Temporal | 🚧 **Infrastructure Ready** | Configured in services, workflows not active |
| Database | ✅ **Shared** | All services use same PostgreSQL instance |

### Migration Path

The planned migration to microservices:

1. **Phase 1**: Extract UBI logic → `services/ubi-engine` (NATS events for `ubi.claimed`, `ubi.distributed`)
2. **Phase 2**: Extract task marketplace → `services/task-marketplace`
3. **Phase 3**: Extract treasury → `services/treasury-engine`
4. **Phase 4**: Extract remaining services
5. **Phase 5**: Main API becomes API gateway only

---

## Request Flow

### Standard Authenticated Request

```mermaid
sequenceDiagram
    participant C as Client (Browser)
    participant N as Nginx
    participant A as API
    participant R as Redis
    participant D as PostgreSQL

    C->>N: GET /api/v1/tasks (Bearer token)
    N->>N: Check rate limit (IP)
    N->>A: Proxy request
    A->>A: Helmet headers
    A->>A: CORS check
    A->>A: Rate limit check
    A->>A: JWT verify (from Authorization header)
    A->>D: Query tasks with filters
    D-->>A: Task rows
    A-->>C: 200 { data: [...], pagination: {...} }
```

### Login Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API
    participant D as PostgreSQL

    C->>A: POST /api/v1/auth/login { username, password }
    A->>A: express-validator checks
    A->>D: SELECT user by username
    D-->>A: User row (with hashed password)
    A->>A: bcrypt.compare(password, hash)
    alt Password valid
        A->>A: jwt.sign({ userId, username, roles })
        A-->>C: 200 { token, user }
    else Password invalid
        A-->>C: 401 { error: "Invalid credentials" }
    end
```

---

## Data Flow — UBI Claim

```mermaid
flowchart TD
    A[User clicks Claim UBI] --> B{isDemoUser?}
    B -- Yes --> C[Simulate claim\nUpdate local state\nShow success toast]
    B -- No --> D[POST /api/v1/ubi/claim]
    D --> E{User has unclaimed UBI?}
    E -- No --> F[400 No UBI available]
    E -- Yes --> G[ubiService.claimUbi]
    G --> H[BEGIN TRANSACTION]
    H --> I[Insert into rewards table\ntype='ubi_distribution']
    I --> J[Update user UBI balance]
    J --> K[COMMIT]
    K --> L[200 { amount, message }]
    L --> M[Refresh balance in UI]
```

---

## Data Flow — Task Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Open : Admin creates task
    Open --> InProgress : User assigns (POST /tasks/:id/assign)
    InProgress --> PendingVerification : User submits proof (POST /tasks/:id/submit)
    PendingVerification --> Completed : Moderator approves (POST /tasks/:id/verify)
    PendingVerification --> Open : Moderator rejects → reassignable
    Completed --> [*]
    Open --> Cancelled : Admin deletes (DELETE /tasks/:id)
    InProgress --> Cancelled : Admin cancels
    Cancelled --> [*]
```

---

## Database Relationships

```mermaid
erDiagram
    USERS {
        serial id PK
        varchar username UK
        varchar email UK
        varchar password_hash
        varchar[] roles
        varchar status
        timestamp created_at
        timestamp updated_at
    }

    TASKS {
        serial id PK
        varchar title
        text description
        varchar category
        varchar difficulty
        decimal reward_amount
        varchar reward_currency
        integer max_participants
        integer current_participants
        varchar status
        timestamp deadline
        text proof_requirements
        timestamp created_at
    }

    TASK_ASSIGNMENTS {
        serial id PK
        integer task_id FK
        integer user_id FK
        varchar status
        text proof_url
        text feedback
        timestamp submitted_at
        timestamp verified_at
        timestamp created_at
    }

    REWARDS {
        serial id PK
        integer user_id FK
        decimal amount
        varchar currency
        varchar type
        varchar source_type
        integer source_id
        varchar status
        timestamp created_at
        timestamp processed_at
    }

    TREASURY_ACCOUNTS {
        serial id PK
        integer user_id FK UK
        decimal balance
        varchar currency
        timestamp updated_at
    }

    TREASURY_TRANSACTIONS {
        serial id PK
        integer user_id FK
        varchar type
        decimal amount
        varchar currency
        decimal balance_after
        jsonb metadata
        timestamp created_at
    }

    TREASURY_STRATEGIES {
        serial id PK
        varchar name
        varchar protocol
        decimal apy
        varchar risk_level
        decimal allocation
        boolean active
        timestamp created_at
    }

    AGENTS {
        uuid id PK
        integer owner_id FK
        varchar name
        text description
        varchar capability
        varchar endpoint
        varchar auth_type
        varchar pricing_model
        decimal price_per_call
        varchar status
        integer total_calls
        decimal rating
        timestamp created_at
        timestamp updated_at
    }

    AGENT_EXECUTIONS {
        uuid id PK
        uuid agent_id FK
        integer user_id FK
        jsonb input_data
        jsonb output_data
        varchar status
        integer duration_ms
        decimal cost
        timestamp completed_at
        timestamp created_at
    }

    USERS ||--o{ TASK_ASSIGNMENTS : "completes"
    TASKS ||--o{ TASK_ASSIGNMENTS : "has"
    USERS ||--o{ REWARDS : "earns"
    USERS ||--|| TREASURY_ACCOUNTS : "owns"
    USERS ||--o{ TREASURY_TRANSACTIONS : "makes"
    USERS ||--o{ AGENTS : "owns"
    USERS ||--o{ AGENT_EXECUTIONS : "runs"
    AGENTS ||--o{ AGENT_EXECUTIONS : "produces"
```

---

## Security Architecture

```mermaid
graph LR
    subgraph "Network Layer"
        CF["Cloudflare WAF\n(Optional)\nDDoS + Bot protection"]
        Nginx2["Nginx\n- TLS 1.2/1.3 only\n- HSTS headers\n- X-Frame-Options\n- CSP headers"]
    end

    subgraph "Application Layer"
        H["Helmet.js\nSecurity headers"]
        C["CORS\nWhitelist only"]
        RL["Rate Limiting\n100 req/15 min/IP"]
        V["Input Validation\nexpress-validator"]
        A["JWT Authentication\nHS256, 24h expiry"]
        R["RBAC\nuser/moderator/admin"]
    end

    subgraph "Data Layer"
        P["Parameterized Queries\nSQL injection prevention"]
        BC["bcrypt\nPassword hashing (rounds=10)"]
        S["Secrets in ENV\nNever in code"]
    end

    CF --> Nginx2 --> H --> C --> RL --> V --> A --> R --> P
    A --> BC
    H --> S
```

### Security Controls Summary

| Control | Implementation | Details |
|---------|---------------|---------|
| Transport Security | Nginx + TLS | TLS 1.2/1.3, HSTS, certificate management |
| Authentication | JWT / HS256 | 24h expiry, required `JWT_SECRET` env var |
| Password Security | bcrypt | 10 rounds minimum |
| Authorization | RBAC | 3 tiers: user, moderator, admin |
| Input Validation | express-validator | Per-route field validation |
| SQL Injection | Parameterized queries | All database calls use `$n` placeholders |
| XSS Prevention | Helmet CSP | Content-Security-Policy headers |
| Rate Limiting | express-rate-limit | 100 req/15 min per IP |
| Secrets Management | Environment variables | Fail-fast on missing required env vars in production |
| CORS | Whitelist | Only configured origins accepted |

---

## Observability Stack

```mermaid
graph TB
    API["API (Node.js)"] --> OTel["OpenTelemetry\nCollector :4317/:4318"]
    Portal["Portal UI (Next.js)"] --> OTel
    
    OTel --> Prom["Prometheus :9090\nMetrics store\nRetention: 15d"]
    OTel --> Loki["Loki :3100\nLog aggregation"]
    
    Prom --> Grafana["Grafana :3000\nDashboards"]
    Loki --> Grafana

    Grafana --> |"Alerts"| Alertmanager["Alertmanager\n(Email/Slack/PagerDuty)"]
```

### Key Metrics Tracked

| Metric | Type | Description |
|--------|------|-------------|
| `http_request_duration_seconds` | Histogram | Request latency per endpoint |
| `http_requests_total` | Counter | Total requests by method, path, status |
| `ubi_claims_total` | Counter | UBI claims processed |
| `tasks_completed_total` | Counter | Tasks verified and rewarded |
| `treasury_deposits_total` | Counter | Treasury deposit transactions |
| `active_users_gauge` | Gauge | Currently active users |

---

## Deployment Topology

### Production (Docker Compose)

```
                    ┌─────────────────────────────────────────┐
                    │             Host Machine                 │
                    │                                          │
         :443 ──────┤──► Nginx                                │
         :80  ──────┤     │                                    │
                    │     ├──► Portal UI (:3001)               │
                    │     └──► API (:3000) ×2 replicas         │
                    │                │                         │
                    │     ┌──────────┼──────────┐             │
                    │     ▼          ▼           ▼             │
                    │  PostgreSQL  Redis   Prometheus/Grafana  │
                    │  (:5432)    (:6379)     (:9090/:3000)    │
                    └─────────────────────────────────────────┘
```

### Container Summary

| Service | Image | Internal Port | Replicas | Health Check |
|---------|-------|---------------|----------|-------------|
| `nginx` | nginx:alpine | 80, 443 | 1 | TCP check |
| `api` | `ubi-api:latest` | 3000 | 2 | GET /health |
| `portal-ui` | `ubi-portal-ui:latest` | 3001 | 1 | GET /api/health |
| `postgres` | postgres:15 | 5432 | 1 | pg_isready |
| `redis` | redis:7-alpine | 6379 | 1 | redis-cli ping |
| `prometheus` | prom/prometheus:3.x | 9090 | 1 | HTTP check |
| `grafana` | grafana:12.x | 3000 | 1 | HTTP check |

---

## Scalability Considerations

### Current Constraints

| Component | Current Limit | Scaling Path |
|-----------|-------------|-------------|
| API | 2 replicas (configurable) | Horizontal: add more replicas behind Nginx |
| Database | Single primary | Vertical first; then read replicas for reporting |
| Redis | Single instance | Redis Cluster or Redis Sentinel for HA |
| File Storage | Not applicable | Add MinIO or S3 for file-based task proofs |
| Microservices | Standalone (not integrated) | Gradual integration via NATS events |

### Recommended Growth Milestones

**0 → 1,000 users:** Current monolithic architecture handles comfortably with 2 API replicas.

**1,000 → 10,000 users:**
- Add PostgreSQL read replica for reporting queries
- Enable Redis auth and connection pooling (pgBouncer)
- Move observability stack to dedicated host

**10,000+ users:**
- Extract UBI engine to `services/ubi-engine` with NATS event-driven architecture
- Extract task marketplace to `services/task-marketplace`
- Introduce Temporal for complex workflow orchestration
- Add CDN for Portal UI static assets

### Microservices Readiness

The codebase is **microservices-ready**:

| Infrastructure | Status | Location |
|----------------|--------|----------|
| NATS Server | Configured | `services/*/src/config/` |
| Temporal | Configured | `services/*/src/config/` |
| Service Discovery | Manual | Service READMEs document ports |
| Health Checks | Implemented | `/health` endpoints in all services |
| Docker Support | Ready | Each service has `Dockerfile` |
