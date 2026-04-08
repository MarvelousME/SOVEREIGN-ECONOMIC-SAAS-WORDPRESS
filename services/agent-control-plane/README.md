# Agent Control Plane

AI Agent lifecycle and configuration management service for the UBI-CMS platform.

## Overview

The Agent Control Plane is responsible for:

- **Agent Registration**: Create and register new AI agents
- **Lifecycle Management**: Deploy, pause, resume, and delete agents
- **Configuration Management**: Manage agent settings, permissions, and resource limits
- **Version Control**: Track agent versions and enable rollbacks
- **Permission Management**: Integrate with OPA for fine-grained access control
- **Resource Allocation**: Set CPU, memory, storage, and API call limits
- **Agent Monitoring**: Track execution metrics, logs, and performance
- **Marketplace Integration**: Connect agents to the task marketplace

## Features

### Agent Types

- **Trading Agents**: Automated trading strategies and market analysis
- **Task Automation Agents**: Workflow automation and task execution
- **Marketing Agents**: Content creation, social media, and campaigns
- **Development Agents**: Code generation, testing, and deployment
- **Data Analysis Agents**: Data processing and insights generation
- **Personal Assistant Agents**: Scheduling, reminders, and personal tasks

### Deployment Strategies

- **Direct Deployment**: Immediate deployment to production
- **Canary Deployment**: Gradual rollout with traffic splitting
- **Blue-Green Deployment**: Zero-downtime deployments

### Resource Management

- CPU cores allocation
- Memory limits (MB)
- Storage quotas (MB)
- API call rate limiting
- Token usage limits
- Cost budgets

### Revenue Tracking

The Agent Control Plane integrates with the Ledger Service to track agent revenue in real-time.

- **Ledger Integration**: Each agent transaction is recorded in the ledger for immutable audit trails
- **Revenue Calculation**: Revenue is calculated based on completed tasks, successful executions, and any configured revenue sharing models
- **Balance Tracking**: Real-time balance updates via ledger service webhooks
- **Payout Scheduling**: Automated payout triggers based on configurable thresholds

### Resource Monitoring

Monitor agent resource consumption with built-in CPU and memory tracking.

- **CPU Monitoring**: Track CPU core usage per agent with configurable thresholds
- **Memory Tracking**: Monitor memory limits (MB) and alert when approaching limits
- **Storage Quotas**: Track storage usage against allocated quotas
- **API Rate Limiting**: Real-time tracking of API call volumes
- **Token Usage Limits**: Monitor token consumption for LLM-powered agents
- **Cost Budgets**: Alerting system for budget consumption

## API Endpoints

### Agent Management

```
POST   /api/v1/agents           - Create new agent
GET    /api/v1/agents           - List user's agents
GET    /api/v1/agents/:id       - Get agent details
PUT    /api/v1/agents/:id       - Update agent configuration
DELETE /api/v1/agents/:id       - Delete agent
```

### Agent Lifecycle

```
POST   /api/v1/agents/:id/deploy  - Deploy agent
POST   /api/v1/agents/:id/pause   - Pause running agent
```

### Monitoring

```
GET    /api/v1/agents/:id/logs    - Get execution logs
GET    /api/v1/agents/:id/metrics - Get performance metrics (revenue and resource usage)
```

**Metrics Response** includes:
- Revenue: Total earned, pending, and paid amounts
- Resources: CPU usage (%), memory usage (MB), storage (MB)
- Performance: Task completion rate, uptime, error count

## Configuration

See `.env.example` for all configuration options.

Key configuration areas:

- **Database**: PostgreSQL connection settings
- **Redis**: Caching and session storage
- **NATS**: Event streaming configuration
- **OPA**: Policy engine integration
- **Temporal**: Workflow orchestration
- **Keycloak**: Authentication and authorization

### Ledger Service Configuration

```bash
# Ledger service URL for revenue tracking
LEDGER_SERVICE_URL=http://ledger-service:4000

# Revenue calculation settings
REVENUE_TASK_RATE=0.05        # Base rate per completed task (USD)
REVENUE_SUCCESS_BONUS=0.02   # Bonus for successful executions (USD)
REVENUE_MIN_PAYOUT=10.00      # Minimum balance before payout trigger (USD)
```

### Resource Monitoring Configuration

```bash
# CPU monitoring
ENABLE_CPU_MONITORING=true
CPU_ALERT_THRESHOLD=80        # Alert when CPU exceeds 80%

# Memory monitoring
ENABLE_MEMORY_MONITORING=true
MEMORY_ALERT_THRESHOLD=90     # Alert when memory exceeds 90%

# Polling interval for resource checks (seconds)
RESOURCE_POLL_INTERVAL=30
```

## Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Build the service
npm run build

# Run migrations
psql -U postgres -d ubinexus -f ../../migrations/011_create_agent_tables.sql

# Start the service
npm start

# Development mode with auto-reload
npm run dev
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run integration tests
npm run test:integration

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Docker

```bash
# Build Docker image
docker build -t agent-control-plane:latest .

# Run container
docker run -p 3010:3010 --env-file .env agent-control-plane:latest
```

## Architecture

```
┌─────────────────────────────────────────────┐
│         Agent Control Plane                 │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │   API    │  │ Services │  │   OPA    │  │
│  │ Routes   │─▶│  Layer   │◀─│  Client  │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│                      │                       │
│                      ▼                       │
│  ┌──────────────────────────────────────┐  │
│  │         PostgreSQL Database          │  │
│  └──────────────────────────────────────┘  │
│                      │                       │
│                      ▼                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Redis   │  │   NATS   │  │ Temporal │  │
│  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────┘
         │                            │
         ▼                            ▼
  ┌──────────────┐          ┌─────────────────┐
  │ Agent Runner │          │  Task Market    │
  └──────────────┘          └─────────────────┘
```

## License

MIT
