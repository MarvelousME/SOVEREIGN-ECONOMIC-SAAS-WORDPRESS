# Testing Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Test Environment
```bash
# Copy test environment file
cp .env.test .env.test.local

# Start test databases (using podman compose)
podman compose -f docker-compose.test.yml up -d
```

### 3. Run Your First Test
```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Open coverage report
open coverage/index.html
```

## 📝 Common Commands

### Unit Tests
```bash
# Run all unit tests
npm run test:unit

# Run specific service tests
cd services/ledger-service && npm test

# Watch mode for TDD
npm run test:watch
```

### Integration Tests
```bash
# Run all integration tests
npm run test:integration

# Run specific integration test
npm test -- accounts.api.test.ts
```

### E2E Tests
```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run specific test file
npx playwright test auth.spec.ts

# Debug mode
npm run test:e2e:debug
```

### Load Tests
```bash
# Run performance tests
npm run test:load

# View results
open performance-results/summary.html
```

## 🧪 Writing Your First Test

### Unit Test Example
Create `services/my-service/tests/unit/my-function.test.ts`:

```typescript
import { MyService } from '../../../src/services/my-service';
import { getDbHelper } from '@tests/helpers/database.helper';

describe('MyService', () => {
  let service: MyService;
  let dbHelper: ReturnType<typeof getDbHelper>;

  beforeAll(() => {
    dbHelper = getDbHelper();
  });

  beforeEach(async () => {
    await dbHelper.cleanDatabase();
    service = new MyService();
  });

  it('should do something', async () => {
    // Arrange
    const input = 'test';

    // Act
    const result = await service.doSomething(input);

    // Assert
    expect(result).toBe('expected output');
  });
});
```

### Integration Test Example
Create `services/my-service/tests/integration/api/my-endpoint.test.ts`:

```typescript
import request from 'supertest';
import { createApiHelper } from '@tests/helpers/api.helper';
import app from '../../../src/app';

describe('My API', () => {
  const api = createApiHelper(app);

  it('should return 200', async () => {
    const response = await api.get('/api/my-endpoint');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
  });
});
```

### E2E Test Example
Create `tests/e2e/my-feature.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test('my feature works', async ({ page }) => {
  await page.goto('/my-feature');
  
  await page.fill('input[name="name"]', 'Test');
  await page.click('button:has-text("Submit")');
  
  await expect(page.locator('text=Success')).toBeVisible();
});
```

## 🔍 Debugging Tests

### Jest Debugging
```bash
# Run with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Then attach your IDE debugger to port 9229
```

### Playwright Debugging
```bash
# Visual debugging with Playwright Inspector
npx playwright test --debug

# Headed mode (see browser)
npx playwright test --headed

# Slow motion
npx playwright test --headed --slow-mo=1000
```

## 📊 Checking Coverage

### View Coverage Report
```bash
npm test -- --coverage
open coverage/index.html
```

### Coverage by Service
```bash
cd services/ledger-service
npm test -- --coverage
```

### Enforce Thresholds
```bash
npm run test:coverage
# This will fail if coverage is below 80%
```

## 🛠️ Using Test Helpers

### Database Helper
```typescript
import { getDbHelper } from '@tests/helpers/database.helper';

const db = getDbHelper();

// Clean database
await db.cleanDatabase();

// Seed data
await db.seedDatabase({
  users: [user1, user2],
  accounts: [account1, account2],
});

// Run in transaction
const tx = await db.createTransaction();
try {
  await tx.client.query('INSERT INTO ...');
  await tx.commit();
} catch (error) {
  await tx.rollback();
}
```

### NATS Helper
```typescript
import { getNatsHelper } from '@tests/helpers/nats.helper';

const nats = getNatsHelper();

// Publish event
await nats.publish('task.created', { taskId: '123' });

// Subscribe and wait
await nats.subscribe('task.completed');
const event = await nats.waitForMessage('task.completed');

// Get all messages
const messages = nats.getMessages('task.*');
```

### Redis Helper
```typescript
import { getRedisHelper } from '@tests/helpers/redis.helper';

const redis = getRedisHelper();

// Set/get JSON
await redis.setJSON('user:123', { name: 'Test' });
const user = await redis.getJSON('user:123');

// Check existence
const exists = await redis.exists('user:123');

// Flush all
await redis.flushAll();
```

### API Helper
```typescript
import { createApiHelper } from '@tests/helpers/api.helper';
import app from './app';

const api = createApiHelper(app);

// Authenticate
await api.authenticate('username', 'password');

// Make requests (auto-includes auth token)
const response = await api.get('/api/users/me');
const created = await api.post('/api/tasks', { title: 'Test' });
```

## 🏭 Using Factories

### Create Test Data
```typescript
import { UserFactory } from '@tests/factories/user.factory';
import { AccountFactory } from '@tests/factories/account.factory';

// Single user
const user = UserFactory.create();

// With overrides
const admin = UserFactory.create({ 
  username: 'admin',
  email: 'admin@test.com' 
});

// Multiple users
const users = UserFactory.createMany(10);

// Specific account types
const userAccount = AccountFactory.createUserAccount('user-id', '1000');
const poolAccount = AccountFactory.createPoolAccount('100000');
```

## 🎯 Common Patterns

### Testing Async Operations
```typescript
it('should handle async operations', async () => {
  const promise = service.asyncOperation();
  await expect(promise).resolves.toBe('success');
});
```

### Testing Errors
```typescript
it('should throw error for invalid input', async () => {
  await expect(
    service.operation('invalid')
  ).rejects.toThrow('Invalid input');
});
```

### Testing Events
```typescript
it('should publish event', async () => {
  const nats = getNatsHelper();
  await nats.subscribe('my.event');
  
  await service.doSomething();
  
  const event = await nats.waitForMessage('my.event');
  expect(event.data).toBeDefined();
});
```

### Mocking Dependencies
```typescript
jest.mock('../../../src/services/external-service');

it('should use mocked service', async () => {
  const mockService = require('../../../src/services/external-service');
  mockService.getData.mockResolvedValue({ data: 'mocked' });
  
  const result = await service.useExternal();
  
  expect(mockService.getData).toHaveBeenCalled();
  expect(result).toBe('mocked');
});
```

## 🔧 Troubleshooting

### Tests Timeout
```typescript
// Increase timeout for specific test
it('slow test', async () => {
  // ...
}, 30000); // 30 seconds

// Or globally in jest.config.js
testTimeout: 30000
```

### Database Connection Issues
```bash
# Check if PostgreSQL is running
podman ps | grep postgres

# View logs
podman compose logs postgres

# Restart services
podman compose restart
```

### NATS/Redis Connection Issues
```bash
# Check services
podman compose ps

# Restart
podman compose restart nats redis
```

### Port Already in Use
```bash
# Find process using port
lsof -i :5432

# Kill process
kill -9 <PID>
```

## 📚 Next Steps

1. Read the full [Testing README](./tests/README.md)
2. Check out [example tests](./services/ledger-service/tests/)
3. Review [CI/CD workflow](./.github/workflows/tests.yml)
4. Join the testing best practices discussion

## 💡 Tips

- **Always clean database** before each test
- **Use factories** for consistent test data
- **Test edge cases** and error conditions
- **Keep tests isolated** - no dependencies between tests
- **Name tests descriptively** - describe what they do
- **Follow AAA pattern** - Arrange, Act, Assert
- **Mock external services** to keep tests fast
- **Use TypeScript** for better IDE support

## 🎉 You're Ready!

Start testing by running:
```bash
npm test
```

Happy testing! 🧪
