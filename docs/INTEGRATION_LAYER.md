# UBI-CMS Integration Layer

## Overview

The UBI-CMS integration layer provides a comprehensive set of shared libraries, communication patterns, and infrastructure components that enable seamless service-to-service communication and system-wide consistency.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (Traefik)                     │
│  • Routing  • Load Balancing  • Rate Limiting  • SSL/TLS   │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
┌───────▼────────┐          ┌────────▼─────────┐
│   Microservices │          │  Shared Libraries │
│   (16 services) │◄─────────┤  (@ubi-cms/shared)│
└───────┬────────┘          └──────────────────┘
        │
    ┌───┴───────────────────────┐
    │                           │
┌───▼────┐  ┌────────┐  ┌──────▼──┐
│  NATS  │  │ Redis  │  │PostgreSQL│
│ Events │  │ Cache  │  │   DB    │
└────────┘  └────────┘  └─────────┘
```

## 📦 Components

### 1. Shared Libraries (`/shared`)

**Location**: `/shared/src/`

**Modules**:
- `config` - Environment configuration management
- `database` - PostgreSQL client with connection pooling
- `nats-client` - NATS JetStream event bus
- `opa-client` - Authorization policy decisions
- `logger` - Structured logging with OpenTelemetry
- `telemetry` - Distributed tracing and metrics
- `circuit-breaker` - Resilience patterns
- `errors` - Standardized error types
- `middleware` - Express middleware
- `validation` - Input validation with Zod
- `utils` - Common utility functions
- `types` - TypeScript type definitions

**Installation**:
```bash
cd /path/to/service
npm link ../../shared
```

### 2. Service Mesh (NATS JetStream)

**Purpose**: Event-driven communication between services

**Streams**:
- `EVENTS` - Domain events (7-day retention)
- `COMMANDS` - Service commands (1-day retention)

**Patterns**:
- Publish/Subscribe (async)
- Request/Reply (sync)
- Work Queues (load balanced)

**Features**:
- At-least-once delivery
- Dead letter queues
- Event replay
- Consumer groups

### 3. API Gateway (Traefik)

**Configuration**: `/docker/configs/traefik/`

**Features**:
- Service discovery
- Load balancing (round-robin)
- Rate limiting (100 req/min standard, 20 req/min strict)
- Circuit breaker
- CORS handling
- Authentication middleware
- Health checks

**Routes**:
- `/api/auth` → Auth Service (3001)
- `/api/ubi` → UBI Engine (3002)
- `/api/ledger` → Ledger Service (3003)
- `/api/treasury` → Treasury Engine (3004)
- `/api/governance` → Governance Service (3005)
- `/api/tasks` → Task Marketplace (3006)
- `/api/reputation` → Reputation Service (3007)
- `/api/rewards` → Rewards Engine (3008)
- `/api/notifications` → Notifications Service (3009)

### 4. Observability Stack

**Components**:
- **Prometheus** - Metrics collection (port 9090)
- **Loki** - Log aggregation (port 3100)
- **Grafana** - Visualization (port 3000)
- **OpenTelemetry Collector** - Traces & metrics (port 4318)

**Data Flow**:
```
Services → OpenTelemetry → Prometheus/Loki → Grafana
```

## 🔄 Communication Patterns

### Pattern 1: Event Choreography

**Use Case**: User registration

```typescript
// Auth Service
await natsClient.publish('user.created', {
  userId: '123',
  email: 'user@example.com'
}, { correlationId });

// Reputation Service subscribes
await natsClient.subscribe('user.created', async (event) => {
  await initializeReputation(event.data.userId);
});

// UBI Engine subscribes
await natsClient.subscribe('user.created', async (event) => {
  await checkEligibility(event.data.userId);
});
```

### Pattern 2: Request-Reply

**Use Case**: Get user balance

```typescript
// Task Service
const response = await natsClient.request('ledger.get_balance', {
  userId: '123'
});

// Ledger Service
await natsClient.respondTo('ledger.get_balance', async (req) => {
  return await getBalance(req.userId);
});
```

### Pattern 3: Saga Pattern

**Use Case**: Task completion with compensation

```typescript
// Task Marketplace coordinates
async function completeTask(taskId: string) {
  const sagaId = generateId();
  
  try {
    // Step 1: Verify work
    await verifyWork(taskId);
    
    // Step 2: Update reputation
    await natsClient.publish('reputation.update', { taskId, sagaId });
    
    // Step 3: Calculate reward
    await natsClient.publish('reward.calculate', { taskId, sagaId });
    
    // Step 4: Process payment
    await natsClient.publish('ledger.transfer', { taskId, sagaId });
    
  } catch (error) {
    // Compensate if any step fails
    await natsClient.publish('saga.compensate', { sagaId, error });
  }
}
```

## 🔐 Cross-Cutting Concerns

### 1. Authentication & Authorization

**Flow**:
```
Client → API Gateway → Auth Middleware → OPA Check → Service
```

**Implementation**:
```typescript
// Express middleware
app.use(async (req, res, next) => {
  const token = req.headers.authorization;
  const user = await verifyToken(token);
  
  const allowed = await opaClient.isAllowed('ubi/allow', {
    user: { id: user.id, roles: user.roles },
    action: req.method,
    resource: { type: 'task', id: req.params.id }
  });
  
  if (!allowed) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  req.user = user;
  next();
});
```

### 2. Error Handling

**Standardized Errors**:
```typescript
import { NotFoundError, ValidationError } from '@ubi-cms/shared';

// Service code
if (!user) {
  throw new NotFoundError('User', userId);
}

if (!isValidEmail(email)) {
  throw new ValidationError('Invalid email', { field: 'email' });
}

// Middleware catches and formats
app.use(errorHandlingMiddleware);
```

### 3. Logging & Tracing

**Correlation IDs**:
```typescript
// Automatically added by middleware
app.use(correlationIdMiddleware);

// All logs include correlationId
logger.info('Processing request', {
  correlationId: req.headers['x-correlation-id'],
  userId: req.user.id
});

// Events include correlationId
await natsClient.publish('user.updated', data, {
  correlationId: req.headers['x-correlation-id']
});
```

### 4. Rate Limiting

**Configuration** (Traefik):
```yaml
middlewares:
  rate-limit:
    rateLimit:
      average: 100    # 100 requests
      burst: 50       # Burst of 50
      period: 1m      # Per minute
```

### 5. Circuit Breaker

**Usage**:
```typescript
import { circuitBreaker } from '@ubi-cms/shared';

const result = await circuitBreaker.execute(
  'external-api',
  async () => await fetch('https://api.external.com/data'),
  {
    timeout: 5000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000
  }
);
```

## 🚀 Startup Orchestration

**Script**: `/scripts/startup.sh`

**Startup Order**:
1. Infrastructure (PostgreSQL, Redis, NATS, MinIO)
2. Observability (Prometheus, Loki, Grafana)
3. IAM (Keycloak, OPA)
4. Workflow Engine (Temporal)
5. Core Services (Auth, Ledger, Reputation)
6. Dependent Services (UBI, Treasury, Rewards)
7. Business Services (Governance, Tasks, Referrals)
8. AI Services (Agent Control Plane, Runner)
9. API Gateway (Traefik)

**Usage**:
```bash
chmod +x scripts/startup.sh
./scripts/startup.sh
```

## 📊 Monitoring & Alerts

### Metrics

**Service Metrics**:
- Request rate
- Response time (p50, p95, p99)
- Error rate
- Circuit breaker state

**Infrastructure Metrics**:
- CPU, Memory usage
- Database connections
- NATS message queue depth
- Redis cache hit rate

### Alerts

**Critical**:
- Service down > 1 minute
- Error rate > 5%
- Database connection pool exhausted
- NATS DLQ messages > 100

**Warning**:
- Response time p95 > 1s
- Circuit breaker opened
- High memory usage (>80%)

### Dashboards

**Grafana Dashboards**:
- Service Overview
- API Gateway Metrics
- Database Performance
- Event Bus Health
- Business Metrics

## 🧪 Testing

### Integration Tests

```typescript
import { db, natsClient, opaClient } from '@ubi-cms/shared';

describe('User Registration Flow', () => {
  beforeAll(async () => {
    await db.connect();
    await natsClient.connect();
  });

  it('should handle complete user registration', async () => {
    // Publish user.created event
    await natsClient.publish('user.created', {
      userId: 'test-123',
      email: 'test@example.com'
    });

    // Wait for async processing
    await sleep(1000);

    // Verify reputation created
    const reputation = await db.query(
      'SELECT * FROM reputation WHERE user_id = $1',
      ['test-123']
    );
    expect(reputation.rows.length).toBe(1);

    // Verify UBI eligibility checked
    const eligibility = await db.query(
      'SELECT * FROM ubi_eligibility WHERE user_id = $1',
      ['test-123']
    );
    expect(eligibility.rows.length).toBe(1);
  });
});
```

## 📚 Documentation

- [Service Map](/docs/architecture/service-map.md)
- [Event Flows](/docs/architecture/event-flows.md)
- [Shared Libraries Guide](/docs/integration/shared-libraries-guide.md)
- [API Documentation](/docs/api/)

## 🔧 Development Workflow

### Adding a New Service

1. **Create service directory**:
```bash
mkdir -p services/my-service/src
```

2. **Install shared library**:
```bash
cd services/my-service
npm init -y
npm link ../../shared
```

3. **Use shared components**:
```typescript
import { db, natsClient, logger, config } from '@ubi-cms/shared';
```

4. **Add to docker-compose.yml**

5. **Configure Traefik route**

6. **Add health checks**

### Deploying Changes

1. **Build shared library**:
```bash
cd shared
npm run build
```

2. **Restart affected services**:
```bash
docker-compose restart my-service
```

3. **Verify health**:
```bash
curl http://localhost:3000/health
```

## 🎯 Best Practices

1. **Event Design**:
   - Keep events < 64KB
   - Use past tense names (user.created, not user.create)
   - Include correlation IDs
   - Make events immutable

2. **Database**:
   - Use transactions for multi-step operations
   - Enable tenant isolation
   - Monitor connection pool
   - Use read replicas for reporting

3. **Error Handling**:
   - Use custom error types
   - Don't expose internal errors to clients
   - Log errors with context
   - Monitor error rates

4. **Performance**:
   - Cache authorization decisions
   - Use circuit breakers
   - Implement rate limiting
   - Monitor response times

5. **Security**:
   - Validate all inputs
   - Use OPA for authorization
   - Implement tenant isolation
   - Encrypt sensitive data

## 🆘 Troubleshooting

### Service Can't Connect to NATS

```bash
# Check NATS is running
docker ps | grep nats

# Check NATS health
curl http://localhost:8222/healthz

# View logs
docker logs ubi-cms-nats
```

### Database Connection Issues

```bash
# Check PostgreSQL
docker exec ubi-cms-postgres pg_isready -U postgres

# View connections
docker exec ubi-cms-postgres psql -U postgres -c "SELECT * FROM pg_stat_activity"
```

### Circuit Breaker Stuck Open

```bash
# Check stats
curl http://localhost:3000/api/circuit-breaker/stats

# Reset manually
curl -X POST http://localhost:3000/api/circuit-breaker/reset
```

## 📞 Support

- Technical Issues: GitHub Issues
- Documentation: `/docs/`
- Team Chat: Slack #ubi-cms-dev
- Architecture Questions: Review `/docs/architecture/`

---

**Last Updated**: 2024-03-26
**Version**: 1.0.0
**Maintainer**: UBI-CMS Platform Team
