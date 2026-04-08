# UBI-CMS

> **Universal Basic Income — Content Management System** — A task-to-earn ecosystem with treasury management, AI agents, and real-time rewards distribution.

[![CI](https://github.com/ubi-cms/ubi-cms/actions/workflows/ci.yml/badge.svg)](https://github.com/ubi-cms/ubi-cms/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/ubi-cms/ubi-cms/branch/main/graph/badge.svg)](https://codecov.io/gh/ubi-cms/ubi-cms)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Overview

UBI-CMS is a full-stack microservices platform enabling **Universal Basic Income distribution** through a task-based economy. Users earn tokens by completing verified tasks, managing treasury positions, and using AI agents. Built with Next.js 14 (portal UI) and Node.js/Express (API), deployed via Docker Compose.

---

## Key Features

| Feature | Description |
|---------|-------------|
| **UBI Distribution** | Periodic allocation per active user with full history |
| **Task Marketplace** | Earn tokens via verified proof-of-work tasks |
| **Treasury Management** | Deposit/withdraw with yield strategies (APY tiers) |
| **Rewards Engine** | Aggregated earnings across tasks, referrals, bonuses |
| **AI Agent Marketplace** | Deploy and pay-per-call for AI agents |
| **Admin Control Panel** | Platform governance and system monitoring |

---

## Architecture

```
Internet/CDN
    │
    ▼
Nginx (TLS, Rate Limiting, Security Headers)
    │
    ├──► Portal UI (Next.js 14) :3001
    │
    └──► API (Node.js/Express) :3000
              │
         ┌────┴────┬────────┐
         ▼         ▼        ▼
      PostgreSQL  Redis  Prometheus
      (Primary)  (Cache)  + Grafana
```

Microservices: Traefik (gateway), Keycloak (IAM), NATS (events), Temporal (workflows), Qdrant (vector DB), OPA (policy)

---

## Tech Stack

**Frontend:** Next.js 14, TypeScript, Tailwind CSS, Recharts, Lucide Icons  
**Backend:** Node.js 18+, Express.js, JWT, bcrypt, express-validator, Helmet.js  
**Data:** PostgreSQL 15+, Redis 7+  
**Infrastructure:** Docker Compose, Nginx, Traefik v3, Keycloak 26.5  
**Observability:** OpenTelemetry, Prometheus 3.10, Loki, Grafana 12.4  

---

## Quick Start

```bash
# Clone and start all services
cp .env.example .env.local    # edit DB_PASSWORD, JWT_SECRET
docker compose -f docker-compose.local.yml up -d

# Start portal UI
cd frontend/portal-ui && npm install && npm run dev

# API available at http://localhost:3000
# Portal at http://localhost:3001
```

**Demo Mode:** Click "Try Demo" on login page — no backend required.

---

## Documentation

| Guide | Description |
|-------|-------------|
| [docs/README.md](docs/README.md) | Full platform documentation |
| [docs/architecture.md](docs/architecture.md) | System design and data flow |
| [docs/developer-guide.md](docs/developer-guide.md) | Local setup and testing |
| [docs/api-reference.md](docs/api-reference.md) | REST endpoints and schemas |
| [docs/user-guide.md](docs/user-guide.md) | End-user portal walkthrough |
| [docs/database-schema.md](docs/database-schema.md) | Tables and relationships |
| [docs/deployment/setup.md](docs/deployment/setup.md) | Production deployment |
| [DEVELOPMENT-STATUS.md](DEVELOPMENT-STATUS.md) | Current project status |

---

## Project Status

| Component | Status |
|-----------|--------|
| Portal UI | Complete — 15 screens, wired to API |
| API (Core) | Complete — Auth, Tasks, Rewards, Treasury, Agents, UBI |
| Database Migrations | Complete |
| Docker/Nginx | Production-ready |
| CI/CD | GitHub Actions pipeline |
| Unit Tests | 8 test suites covering all controllers |
| Demo Mode | Client-side fallback with mock data |
