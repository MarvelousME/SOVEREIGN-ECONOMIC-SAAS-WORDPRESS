# Shared Libraries Integration Guide

This guide explains how to integrate and use the UBI-CMS shared libraries in your services.

## Installation

### 1. Link the Shared Library

From your service directory:

```bash
cd /path/to/your/service
npm link ../../shared
```

### 2. Add to package.json

```json
{
  "dependencies": {
    "@ubi-cms/shared": "file:../../shared"
  }
}
```

### 3. Install Dependencies

```bash
npm install
```

---

## Configuration

### Environment Variables

Create a `.env` file in your service root:

```env
# Service Configuration
SERVICE_NAME=your-service-name
SERVICE_VERSION=1.0.0
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ubi_cms   # docker-compose.dev.yml; use ubi_dev for docker-compose.local.yml
DB_USER=postgres
DB_PASSWORD=postgres
DB_POOL_MIN=2
DB_POOL_MAX=10

# NATS
NATS_URL=nats://localhost:4222
NATS_CLUSTER_ID=ubi-cms-cluster

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_KEY_PREFIX=ubi-cms:

# OPA
OPA_URL=http://localhost:8181
OPA_TIMEOUT=5000

# Logging
LOG_LEVEL=info
CORRELATION_ID_HEADER=x-correlation-id

# OpenTelemetry
OTLP_ENDPOINT=http://localhost:4318
TRACES_SAMPLE_RATE=1.0
METRIC_INTERVAL=60000

# Feature Flags
FEATURE_UBI_DISTRIBUTION=true
FEATURE_TASK_MARKETPLACE=true
```

---

## Usage Examples

### 1. Database Client

```typescript
import { db } from '@ubi-cms/shared';

// Simple query
const users = await db.query('SELECT * FROM users WHERE active = $1', [true]);

// With tenant isolation
const tasks = await db.queryForTenant(
  tenantId,
  'SELECT * FROM tasks WHERE status = $1',
  ['open']
);

// Transaction
const result = await db.transaction(async (client) => {
  const user = await client.query('INSERT INTO users(...) VALUES(...) RETURNING *');
  const profile = await client.query('INSERT INTO profiles(...) VALUES(...)');
  return { user: user.rows[0], profile: profile.rows[0] };
});

// Pagination
const { data, total, totalPages } = await db.queryPaginated(
  'SELECT * FROM tasks WHERE category = $1',
  ['development'],
  1,  // page
  20  // limit
);

// Health check
const isHealthy = await db.healthCheck();
```

### 2. NATS Client (Events)

```typescript
import { natsClient } from '@ubi-cms/shared';

// Connect
await natsClient.connect();

// Publish event
await natsClient.publish('user.created', {
  userId: '123',
  email: 'user@example.com',
  username: 'johndoe'
}, {
  correlationId: 'abc-123',
  tenantId: 'tenant-1',
  userId: 'user-456'
});

// Subscribe to event
await natsClient.subscribe('user.created', async (event) => {
  console.log('User created:', event.data);
  // Process event
  await processUserCreated(event.data);
});

// Subscribe to multiple events
await natsClient.subscribeMultiple(
  ['task.created', 'task.updated', 'task.deleted'],
  async (event) => {
    console.log('Task event:', event.eventType, event.data);
  }
);

// Request-reply pattern
const response = await natsClient.request('user.get', { userId: '123' });
console.log('User:', response);
```

### 3. Logger

```typescript
import { logger } from '@ubi-cms/shared';

// Basic logging
logger.info('Service started');
logger.error('Database connection failed');
logger.warn('High memory usage detected');
logger.debug('Processing request', { requestId: '123' });

// Structured logging with context
logger.info('User created', {
  userId: '123',
  email: 'user@example.com',
  correlationId: 'abc-123'
});

// Log specific events
logger.logRequest('GET', '/api/users');
logger.logResponse('GET', '/api/users', 200, 150);
logger.logError(new Error('Something went wrong'), { context: 'user-creation' });
logger.logEvent('user.created', { userId: '123' });
logger.logQuery('SELECT * FROM users', 45);

// Child logger with preset context
const userLogger = logger.child({ userId: '123', tenantId: 'tenant-1' });
userLogger.info('User action'); // Automatically includes userId and tenantId
```

### 4. OPA Client (Authorization)

```typescript
import { opaClient } from '@ubi-cms/shared';

// Check permission
const decision = await opaClient.query('ubi/allow', {
  user: {
    id: 'user-123',
    roles: ['member'],
    permissions: ['read:tasks'],
    tenantId: 'tenant-1'
  },
  resource: {
    type: 'task',
    id: 'task-456',
    tenantId: 'tenant-1'
  },
  action: 'read'
});

if (decision.allowed) {
  // User is authorized
  console.log('Access granted');
} else {
  // User is not authorized
  console.log('Access denied:', decision.reasons);
}

// Simple allowed check
const isAllowed = await opaClient.isAllowed('ubi/allow', {
  user: { id: 'user-123', roles: ['admin'] },
  action: 'delete',
  resource: { type: 'proposal', id: 'prop-789' }
});

// Batch checks
const decisions = await opaClient.batchQuery('ubi/allow', [
  { user: {...}, action: 'read', resource: {...} },
  { user: {...}, action: 'write', resource: {...} },
]);

// Invalidate cache after policy update
await opaClient.invalidateCache('ubi/allow');
```

### 5. Circuit Breaker

```typescript
import { circuitBreaker } from '@ubi-cms/shared';

// Execute function with circuit breaker protection
const result = await circuitBreaker.execute(
  'external-api',
  async () => {
    const response = await fetch('https://api.external.com/data');
    return response.json();
  },
  {
    timeout: 5000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000
  }
);

// Get circuit breaker stats
const stats = circuitBreaker.getStats('external-api');
console.log('Circuit breaker state:', stats.state);
console.log('Success rate:', stats.stats);
```

### 6. Error Handling

```typescript
import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError
} from '@ubi-cms/shared';

// Throw custom errors
throw new NotFoundError('User', userId);
throw new ValidationError('Invalid email format', { field: 'email' });
throw new UnauthorizedError('Invalid token');
throw new ForbiddenError('Insufficient permissions');

// In Express error handler
app.use((error, req, res, next) => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    });
  } else {
    // Handle unexpected errors
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred'
      }
    });
  }
});
```

### 7. Validation

```typescript
import { validate, CommonSchemas } from '@ubi-cms/shared';
import { z } from 'zod';

// Define schema
const CreateUserSchema = z.object({
  email: CommonSchemas.email,
  username: z.string().min(3).max(20),
  age: CommonSchemas.positiveInt,
  phoneNumber: CommonSchemas.phoneNumber.optional()
});

// Validate data
try {
  const validData = validate(CreateUserSchema, requestBody);
  // Data is valid and typed
} catch (error) {
  // Validation failed
  // Error is a ValidationError with details
}

// Safe validation (doesn't throw)
const result = validateSafe(CreateUserSchema, requestBody);
if (result.success) {
  console.log('Valid data:', result.data);
} else {
  console.log('Validation errors:', result.errors);
}
```

### 8. Middleware

```typescript
import express from 'express';
import {
  correlationIdMiddleware,
  requestLoggingMiddleware,
  errorHandlingMiddleware,
  tenantIsolationMiddleware,
  responseFormatterMiddleware
} from '@ubi-cms/shared';

const app = express();

// Apply middleware in order
app.use(express.json());
app.use(correlationIdMiddleware);
app.use(requestLoggingMiddleware);
app.use(tenantIsolationMiddleware);  // If multi-tenant
app.use(responseFormatterMiddleware);

// Your routes
app.get('/api/users', async (req, res) => {
  const users = await userService.getUsers();
  res.json(users);  // Automatically formatted with metadata
});

// Error handling (must be last)
app.use(errorHandlingMiddleware);
```

### 9. Utilities

```typescript
import {
  generateId,
  sleep,
  retryWithBackoff,
  chunk,
  groupBy,
  formatBytes,
  formatDuration
} from '@ubi-cms/shared';

// Generate UUID
const id = generateId();

// Sleep
await sleep(1000);  // 1 second

// Retry with backoff
const result = await retryWithBackoff(
  async () => {
    return await fetchData();
  },
  3,     // max retries
  1000   // base delay
);

// Array operations
const chunks = chunk([1, 2, 3, 4, 5], 2);  // [[1, 2], [3, 4], [5]]
const grouped = groupBy(users, u => u.role);  // { admin: [...], member: [...] }

// Formatting
console.log(formatBytes(1536));  // "1.5 KB"
console.log(formatDuration(125000));  // "2.08m"
```

### 10. Telemetry

```typescript
import { telemetry } from '@ubi-cms/shared';

// Initialize in your service
telemetry.initialize();

// Automatic instrumentation for:
// - HTTP requests
// - Database queries
// - NATS messages
// - External API calls

// Shutdown on exit
process.on('SIGTERM', async () => {
  await telemetry.shutdown();
  process.exit(0);
});
```

---

## Complete Service Example

```typescript
// src/index.ts
import express from 'express';
import {
  config,
  db,
  natsClient,
  logger,
  telemetry,
  correlationIdMiddleware,
  requestLoggingMiddleware,
  errorHandlingMiddleware,
  NotFoundError
} from '@ubi-cms/shared';

const app = express();

// Initialize telemetry
telemetry.initialize();

// Middleware
app.use(express.json());
app.use(correlationIdMiddleware);
app.use(requestLoggingMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Routes
app.get('/api/users/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT * FROM users WHERE id = $1',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      throw new NotFoundError('User', req.params.id);
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Error handling
app.use(errorHandlingMiddleware);

// Startup
async function start() {
  try {
    const serviceConfig = config.getServiceConfig();
    
    // Connect to NATS
    await natsClient.connect();
    
    // Subscribe to events
    await natsClient.subscribe('user.created', async (event) => {
      logger.info('Processing user.created event', { userId: event.data.userId });
      // Handle event
    });
    
    // Start server
    app.listen(serviceConfig.port, () => {
      logger.info(`${serviceConfig.name} started on port ${serviceConfig.port}`);
    });
  } catch (error) {
    logger.error('Failed to start service', { error });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  
  await natsClient.close();
  await db.close();
  await telemetry.shutdown();
  
  process.exit(0);
});

start();
```

---

## Testing

### Unit Tests

```typescript
import { db, natsClient } from '@ubi-cms/shared';

describe('UserService', () => {
  beforeAll(async () => {
    await db.connect();
    await natsClient.connect();
  });

  afterAll(async () => {
    await db.close();
    await natsClient.close();
  });

  it('should create user', async () => {
    const user = await userService.create({ email: 'test@example.com' });
    expect(user.email).toBe('test@example.com');
  });
});
```

---

## Best Practices

1. **Always use correlation IDs** for tracking requests across services
2. **Use circuit breakers** for external service calls
3. **Implement proper error handling** with custom error types
4. **Log structured data** with context for better debugging
5. **Use tenant isolation** for multi-tenant queries
6. **Validate input data** with Zod schemas
7. **Handle events idempotently** using event IDs
8. **Monitor circuit breaker state** and adjust thresholds
9. **Cache OPA decisions** for performance
10. **Use transactions** for multi-step database operations

---

## Troubleshooting

### Database Connection Issues

```bash
# Check database health
curl http://localhost:3000/health

# View logs
docker logs ubi-cms-postgres
```

### NATS Connection Issues

```bash
# Check NATS health
curl http://localhost:8222/healthz

# View NATS logs
docker logs ubi-cms-nats
```

### OPA Policy Issues

```bash
# Check OPA health
curl http://localhost:8181/health

# Test policy
curl -X POST http://localhost:8181/v1/data/ubi/allow \
  -d '{"input": {...}}'
```

---

## Migration Guide

### From Service-Local Utils to Shared Libraries

1. Replace local imports:
```typescript
// Before
import { db } from './utils/database';
import { logger } from './utils/logger';

// After
import { db, logger } from '@ubi-cms/shared';
```

2. Update configuration:
```typescript
// Before
const config = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    // ...
  }
};

// After
import { config } from '@ubi-cms/shared';
const dbConfig = config.getDatabaseConfig();
```

3. Standardize event handling:
```typescript
// Before
await nc.publish('user.created', JSON.stringify(data));

// After
await natsClient.publish('user.created', data, {
  correlationId: req.headers['x-correlation-id'],
  userId: req.user.id
});
```

---

## Support

For issues or questions:
- Check the [API Documentation](/docs/api)
- Review [Event Flows](/docs/architecture/event-flows.md)
- See [Service Map](/docs/architecture/service-map.md)
