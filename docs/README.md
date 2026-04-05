# UBI CMS — Platform Documentation

> **Universal Basic Income Platform** — a task-to-earn ecosystem with treasury management, AI agents, and real-time rewards distribution.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Documentation Index](#documentation-index)
- [Monorepo & ADRs](#monorepo--adrs)
- [Technology Stack](#technology-stack)
- [Key Features](#key-features)
- [Demo Mode](#demo-mode)
- [Project Status](#project-status)

---

## Project Overview

UBI CMS is a full-stack platform that enables **Universal Basic Income (UBI) distribution** through a task-based economy. Users earn UBI tokens by completing tasks, managing treasury positions, and using AI agents. The platform is built on a microservices architecture with a modern Next.js portal UI backed by a Node.js/Express API.

### What It Does

| Feature | Description |
|---------|-------------|
| **UBI Distribution** | Users claim periodic UBI allocations based on participation |
| **Task Marketplace** | Earn tokens by completing verified tasks with proof-of-work |
| **Treasury Management** | Deposit, withdraw, and earn yield through DeFi-like strategies |
| **Rewards Engine** | Track all earnings — tasks, referrals, bonuses — in one place |
| **AI Agent Marketplace** | Discover, deploy, and execute AI agents; pay-per-call pricing |
| **Admin Control Panel** | Platform-wide governance, user management, and system monitoring |

---

## Quick Start

### Option A — Try the Demo (no backend needed)

1. Navigate to the portal login page
2. Click **"Try Demo (no account needed)"**
3. Explore all screens with realistic sample data

### Option B — Local Development

```bash
# 1. Clone the repository
git clone <repo-url>
cd UBI-CMS

# 2. Start the database and API
cp .env.example .env.local     # edit DB_PASSWORD, JWT_SECRET
docker compose -f docker-compose.local.yml up -d

# 3. Start the portal UI
cd frontend/portal-ui
npm install
cp .env.example .env.local
npm run dev
```

Portal is available at `http://localhost:3001`.  
API runs at `http://localhost:3000`.

> See [Developer Guide](./developer-guide.md) for full setup instructions.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Internet / CDN                     │
└─────────────────────────┬───────────────────────────────┘
                          │
                    ┌─────▼──────┐
                    │   Nginx    │  TLS termination, rate limiting,
                    │  (Reverse  │  security headers, static assets
                    │   Proxy)   │
                    └──┬─────┬───┘
                       │     │
          ┌────────────▼┐   ┌▼────────────┐
          │  Portal UI  │   │   API (x2   │
          │  Next.js 14 │   │  replicas)  │
          │  :3001      │   │  Node.js    │
          │             │   │  :3000      │
          └─────────────┘   └──────┬──────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
             ┌──────▼─────┐  ┌────▼────┐  ┌─────▼─────┐
             │ PostgreSQL │  │  Redis  │  │  Metrics  │
             │  (Primary) │  │ (Cache/ │  │ Prometheus│
             │            │  │ Session)│  │ + Grafana │
             └────────────┘  └─────────┘  └───────────┘
```

See [Architecture Guide](./architecture.md) for detailed diagrams and data flow.

---

## Documentation Index

| Document | Audience | Description |
|----------|----------|-------------|
| [API Reference](./api-reference.md) | Developers | All REST endpoints, request/response schemas, auth |
| [Architecture](./architecture.md) | Architects / Senior Devs | System design, services, data flow, Mermaid diagrams |
| [Developer Guide](./developer-guide.md) | Developers | Local setup, testing, CI/CD, contribution workflow |
| [User Guide](./user-guide.md) | End Users | Portal walkthrough, features, demo mode |
| [Database Schema](./database-schema.md) | Developers / DBAs | Tables, columns, indexes, relationships |
| [Environment Variables](./environment-variables.md) | DevOps / Developers | All config variables with defaults and requirements |
| [Security Hardening](./SECURITY-HARDENING.md) | Security / DevOps | Security controls and hardening checklist |
| [Deployment Setup](./deployment/setup.md) | DevOps | Production deployment steps |
| [Runbook](./deployment/runbook.md) | SRE / On-Call | Incident response procedures |
| [Troubleshooting](./deployment/troubleshooting.md) | All | Common issues and solutions |
| [Partner Referral + SA³-EOS wiring](./integration/partner-referral-sa3-eos-wiring.md) | Architects / backend | PR-OS schema, tenant bridge, SA³-EOS mapping to existing services |
| [Sovereign-Engine (NovasPlace)](./integration/sovereign-engine-integration.md) | Architects / ML-ops | Optional Python agent runtime: substrate ledger/blackboard, MCP-style tools, safe boundaries vs Ledger Service |
| [Event taxonomy crosswalk](./architecture/event-taxonomy-crosswalk.md) | Architects / integrators | SAAOS-style domain events mapped to NATS / CloudEvents in this repo |
| [Shared contracts](../shared/contracts/README.md) | Backend / agents | JSON Schema for bounded agent run contracts |

### Monorepo & ADRs

| Document | Audience | Description |
|----------|----------|-------------|
| [Monorepo playbook](./monorepo.md) | Contributors / maintainers | Per-package workflow, CI notes, improvement checklist |
| [ADR index](./adr/README.md) | Architects / leads | Numbered decisions (start with [0001](./adr/0001-monorepo-repository-layout.md)) |
| [Architecture decisions](./architecture-decisions.md) | All | Narrative ADs including [monorepo layout](./architecture-decisions.md#11-monorepo-repository-layout-tooling) |

---

## Technology Stack

### Frontend

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js | 14 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 3.x |
| Charts | Recharts | 2.x |
| Icons | Lucide React | latest |
| HTTP Client | Fetch API (native) | — |

### Backend API

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 18+ |
| Framework | Express.js | 4.x |
| Auth | JWT (jsonwebtoken) | 9.x |
| Password Hashing | bcrypt | 5.x |
| Validation | express-validator | 7.x |
| Security Headers | Helmet.js | 7.x |
| Rate Limiting | express-rate-limit | 7.x |
| Logging | Winston | 3.x |
| Compression | compression | 1.x |

### Data & Infrastructure

| Service | Technology | Purpose |
|---------|-----------|---------|
| Database | PostgreSQL 15+ | Primary data store |
| Cache/Sessions | Redis 7+ | Session tokens, rate limit counters |
| Reverse Proxy | Nginx | TLS, load balancing, static assets |
| Containerization | Docker / Docker Compose | Local and production deployment |
| CI/CD | GitHub Actions | Tests, builds, deploys |
| Observability | OpenTelemetry + Prometheus + Loki + Grafana | Metrics, tracing, logs |

---

## Key Features

### UBI Claims

- Periodic UBI allocation per active user
- Claim through the portal or API
- Full distribution history with timestamps
- Platform-wide statistics (total distributed, active users, total claims)

### Task Marketplace

- Tasks with difficulty ratings (easy / medium / hard / expert)
- Per-task reward in UBI tokens
- Participant limits and deadlines
- Proof submission and moderator verification workflow
- Real-time filter by category, difficulty, status, and search

### Treasury Management

- Personal treasury balance in UBI tokens
- Deposit and withdraw with atomic transactions
- Yield strategies with APY (low/medium/high risk tiers)
- Complete transaction history with pagination

### Rewards Engine

- Aggregated balance across all reward types
- History: task completions, UBI claims, bonuses, referrals
- Visual charts: monthly breakdown, reward type distribution

### AI Agent Marketplace

- Browse agents by capability
- Per-agent pricing (free / per-call)
- One-click execution with input/output logging
- Execution history with duration and cost tracking

### Admin & Monitoring

- Platform-wide KPI dashboard
- User management table with role assignment
- Live system monitoring (CPU, memory, request rates)
- God Mode control panel for platform configuration
- Analytics with trend charts

---

## Demo Mode

The platform includes a built-in **demo mode** that lets anyone explore all features without a running backend.

**To activate demo mode:**
1. Click **"Try Demo (no account needed)"** on the login page
2. The system will attempt to log in with demo credentials; if the backend is unavailable, it switches to client-side demo mode automatically

**Demo user credentials (if backend is running):**
```
Username: demo
Password: Demo@Platform1
```

**What demo mode provides:**
- All dashboard screens with realistic sample data
- Simulated actions (claim UBI, apply for tasks, execute agents, deposit/withdraw)
- A clearly visible **Demo** badge on every screen to prevent confusion

> ⚠️ All demo actions are simulated client-side — no real transactions are created.

---

## Project Status

| Component | Status | Notes |
|-----------|--------|-------|
| Portal UI | ✅ Complete | All 15 screens developed, wired to API |
| API (Core) | ✅ Complete | Auth, Tasks, Rewards, Treasury, Agents, UBI |
| Database Migrations | ✅ Complete | All schema files present |
| Docker / Nginx | ✅ Complete | Production-ready compose + Nginx config |
| CI/CD | ✅ Complete | GitHub Actions pipeline |
| Unit Tests | ✅ Complete | 8 test suites covering all controllers |
| Demo Mode | ✅ Complete | Client-side fallback with mock datasets |
| Observability | ⚠️ Partial | Stack deployed; app instrumentation pending |
| Admin UI | 🔲 Planned | Separate Next.js app (`admin-ui`) |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes following the [Developer Guide](./developer-guide.md)
4. Run tests: `cd api && npm test`
5. Run TypeScript checks: `cd frontend/portal-ui && npx tsc --noEmit`
6. Submit a pull request

---

## License

See `LICENSE` file in the repository root.
