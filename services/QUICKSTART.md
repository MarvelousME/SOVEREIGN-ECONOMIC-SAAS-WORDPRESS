# AI Agent Services - Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ running
- Redis running
- Qdrant running (for agent-runner)
- MinIO running (for agent-runner)
- NATS running

## Quick Setup (Development)

### 1. Install Dependencies

```bash
# Agent Control Plane
cd services/agent-control-plane
npm install

# Agent Runner
cd ../agent-runner
npm install
```

### 2. Set Up Environment

```bash
# Agent Control Plane
cd services/agent-control-plane
cp .env.example .env
# Edit .env with your settings

# Agent Runner
cd ../agent-runner
cp .env.example .env
# Edit .env with your settings
```

### 3. Run Database Migrations

```bash
# From project root
psql -U postgres -d ubinexus -f migrations/011_create_agent_tables.sql
```

### 4. Start Services

```bash
# Terminal 1: Agent Control Plane
cd services/agent-control-plane
npm run dev

# Terminal 2: Agent Runner
cd services/agent-runner
npm run dev
```

## Quick Test

### Create an Agent

```bash
curl -X POST http://localhost:3010/api/v1/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Agent",
    "description": "My first AI agent",
    "type": "task_automation",
    "version": "1.0.0",
    "code": "async function main() { console.log(\"Hello from agent!\"); return { message: \"Success\", input }; }",
    "triggers": [{ "type": "api", "config": {} }],
    "permissions": [],
    "resourceLimits": {
      "maxCpuCores": 1,
      "maxMemoryMB": 512,
      "maxStorageMB": 1024,
      "maxApiCallsPerMinute": 60,
      "maxTokensPerDay": 100000,
      "maxCostPerDay": 10
    },
    "environment": {},
    "memoryConfig": {
      "enableShortTerm": true,
      "enableLongTerm": false,
      "enableEpisodic": false
    }
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "agent-uuid",
    "name": "Test Agent",
    "status": "draft",
    ...
  }
}
```

### Deploy the Agent

```bash
# Replace {agentId} with the ID from previous response
curl -X POST http://localhost:3010/api/v1/agents/{agentId}/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "strategy": "direct",
    "rollbackOnFailure": true
  }'
```

### Trigger Execution via NATS

```javascript
// test-agent.js
const { connect } = require('nats');
const { v4: uuidv4 } = require('uuid');

async function triggerAgent() {
  const nc = await connect({ servers: 'nats://localhost:4222' });
  const js = nc.jetstream();

  const message = {
    type: 'execute_agent',
    agentId: 'YOUR_AGENT_ID_HERE',
    executionId: uuidv4(),
    payload: {
      input: { test: 'data' },
      priority: 5
    },
    timestamp: new Date()
  };

  await js.publish('agent.execute.5', JSON.stringify(message));
  console.log('Agent execution triggered');
  
  await nc.close();
}

triggerAgent().catch(console.error);
```

Run it:
```bash
node test-agent.js
```

### Check Execution Logs

```bash
curl http://localhost:3010/api/v1/agents/{agentId}/logs
```

## Docker Quick Start

### Build Images

```bash
# Agent Control Plane
cd services/agent-control-plane
docker build -t agent-control-plane:latest .

# Agent Runner
cd ../agent-runner
docker build -t agent-runner:latest .
```

### Run with Docker Compose

Create `docker-compose.agents.yml`:

```yaml
version: '3.8'

services:
  agent-control-plane:
    image: agent-control-plane:latest
    ports:
      - "3010:3010"
    environment:
      - NODE_ENV=production
      - POSTGRES_HOST=postgres
      - REDIS_HOST=redis
      - NATS_SERVERS=nats://nats:4222
    depends_on:
      - postgres
      - redis
      - nats

  agent-runner:
    image: agent-runner:latest
    environment:
      - NODE_ENV=production
      - POSTGRES_HOST=postgres
      - REDIS_HOST=redis
      - QDRANT_HOST=qdrant
      - MINIO_ENDPOINT=minio
      - NATS_SERVERS=nats://nats:4222
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - postgres
      - redis
      - qdrant
      - minio
      - nats

  postgres:
    image: postgres:14-alpine
    environment:
      - POSTGRES_DB=ubinexus
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      - MINIO_ROOT_USER=minioadmin
      - MINIO_ROOT_PASSWORD=minioadmin
    volumes:
      - minio_data:/data

  nats:
    image: nats:latest
    command: ["-js", "-sd", "/data"]
    ports:
      - "4222:4222"
      - "8222:8222"
    volumes:
      - nats_data:/data

volumes:
  postgres_data:
  redis_data:
  qdrant_data:
  minio_data:
  nats_data:
```

Start everything:
```bash
docker-compose -f docker-compose.agents.yml up -d
```

## Development Workflow

### 1. Run Tests

```bash
# Agent Control Plane
cd services/agent-control-plane
npm test

# Agent Runner
cd services/agent-runner
npm test
```

### 2. Type Checking

```bash
npm run typecheck
```

### 3. Linting

```bash
npm run lint
```

### 4. Build

```bash
npm run build
```

## Troubleshooting

### Service Won't Start

1. Check all dependencies are running:
   ```bash
   # PostgreSQL
   pg_isready -h localhost -p 5432
   
   # Redis
   redis-cli ping
   
   # NATS
   curl http://localhost:8222/varz
   ```

2. Check logs:
   ```bash
   # Agent Control Plane
   cd services/agent-control-plane
   npm run dev
   
   # Agent Runner
   cd services/agent-runner
   npm run dev
   ```

3. Verify environment variables in `.env`

### Database Connection Errors

```bash
# Check PostgreSQL is running
systemctl status postgresql

# Test connection
psql -U postgres -d ubinexus -c "SELECT 1"

# Run migrations
psql -U postgres -d ubinexus -f migrations/011_create_agent_tables.sql
```

### NATS Connection Errors

```bash
# Check NATS is running
curl http://localhost:8222/varz

# Test connection
nats pub test "hello"
nats sub test
```

### Agent Execution Failures

1. Check agent-runner logs
2. Verify agent code syntax
3. Check resource limits
4. Review execution logs via API:
   ```bash
   curl http://localhost:3010/api/v1/agents/{agentId}/logs
   ```

## Next Steps

1. Read the full documentation:
   - `services/agent-control-plane/README.md`
   - `services/agent-runner/README.md`

2. Review example agents:
   - `services/AGENT_USAGE_EXAMPLES.md`

3. Check the implementation summary:
   - `services/AGENT_SERVICES_SUMMARY.md`

4. Set up monitoring and alerting

5. Configure OPA policies

6. Set up Temporal workflows

## Support

- Check service health: `curl http://localhost:3010/health`
- Review logs in console
- Check NATS queue status
- Verify database connectivity

For issues, check the troubleshooting section in each service's README.
