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
GET    /api/v1/agents/:id/metrics - Get performance metrics
```

## Configuration

See `.env.example` for all configuration options.

Key configuration areas:

- **Database**: PostgreSQL connection settings
- **Redis**: Caching and session storage
- **NATS**: Event streaming configuration
- **OPA**: Policy engine integration
- **Temporal**: Workflow orchestration
- **Keycloak**: Authentication and authorization

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
