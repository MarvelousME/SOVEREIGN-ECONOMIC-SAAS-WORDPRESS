# UBI-CMS Testing Framework

Comprehensive testing suite for the UBI-CMS platform covering unit, integration, E2E, and performance tests.

## 📋 Table of Contents

- [Overview](#overview)
- [Test Stack](#test-stack)
- [Directory Structure](#directory-structure)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Coverage Requirements](#coverage-requirements)
- [CI/CD Integration](#cicd-integration)

## Overview

This testing framework ensures:
- **80%+ code coverage** for all services
- **100% coverage** for critical paths (ledger, UBI distribution, treasury)
- **All API endpoints** are integration tested
- **Critical user journeys** are E2E tested
- **Performance benchmarks** are met

## Test Stack

### Unit & Integration Tests
- **Jest** - Test runner and assertion library
- **Supertest** - HTTP integration testing
- **ts-jest** - TypeScript support for Jest

### E2E Tests
- **Playwright** - Browser automation and E2E testing
- **Multi-browser support** - Chrome, Firefox, Safari
- **Mobile testing** - Responsive design verification

### Performance Tests
- **K6** - Load and stress testing
- **Custom metrics** - Transaction duration, error rates

### Test Utilities
- **Database Helper** - Seeding, cleanup, transactions
- **NATS Helper** - Event testing
- **Redis Helper** - Cache testing
- **API Helper** - Authenticated requests

## Directory Structure

```
tests/
├── setup.ts                 # Global test setup
├── helpers/                 # Test utilities
│   ├── database.helper.ts
│   ├── nats.helper.ts
│   ├── redis.helper.ts
│   └── api.helper.ts
├── factories/               # Test data factories
│   ├── user.factory.ts
│   ├── account.factory.ts
│   ├── transaction.factory.ts
│   └── task.factory.ts
├── e2e/                     # End-to-end tests
│   ├── auth.spec.ts
│   ├── ubi-distribution.spec.ts
│   ├── task-marketplace.spec.ts
│   ├── global-setup.ts
│   └── global-teardown.ts
└── performance/             # Load tests
    └── load-test.js

services/<service>/tests/
├── unit/                    # Unit tests
│   ├── controllers/
│   ├── services/
│   └── utils/
└── integration/             # Integration tests
    ├── api/
    ├── database/
    └── events/
```

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Report
```bash
npm test -- --coverage
```

### Specific Service
```bash
cd services/ledger-service
npm test
```

### Load Tests
```bash
npm run test:load
```

## Writing Tests

### Unit Test Example

```typescript
import { LedgerService } from '../../../src/services/ledger.service';
import { getDbHelper } from '@tests/helpers/database.helper';
import { AccountFactory } from '@tests/factories/account.factory';

describe('LedgerService', () => {
  let ledgerService: LedgerService;
  let dbHelper: ReturnType<typeof getDbHelper>;

  beforeAll(() => {
    dbHelper = getDbHelper();
  });

  beforeEach(async () => {
    await dbHelper.cleanDatabase();
    ledgerService = new LedgerService();
  });

  it('should create a double-entry transaction', async () => {
    const fromAccount = AccountFactory.createUserAccount('user1', '1000');
    const toAccount = AccountFactory.createUserAccount('user2', '500');
    
    await dbHelper.seedDatabase({
      accounts: [fromAccount, toAccount],
    });

    const transaction = await ledgerService.createTransaction({
      fromAccountId: fromAccount.id,
      toAccountId: toAccount.id,
      amount: '100',
      currency: 'UBI',
      type: 'TRANSFER',
    });

    expect(transaction).toBeDefined();
    expect(transaction.status).toBe('COMPLETED');
  });
});
```

### Integration Test Example

```typescript
import request from 'supertest';
import { createApiHelper } from '@tests/helpers/api.helper';
import app from '../../../src/app';

describe('Accounts API', () => {
  const api = createApiHelper(app);

  it('should create a new account', async () => {
    const response = await api.post('/api/accounts', {
      userId: 'user123',
      accountType: 'USER',
      currency: 'UBI',
    });

    expect(response.status).toBe(201);
    expect(response.body.data).toHaveProperty('id');
  });
});
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test('complete task flow', async ({ page }) => {
  await page.goto('/tasks');
  await page.click('text=Create Task');
  
  await page.fill('input[name="title"]', 'Test Task');
  await page.fill('input[name="reward"]', '100');
  await page.click('button:has-text("Submit")');
  
  await expect(page.locator('text=Task created')).toBeVisible();
});
```

### Using Test Helpers

```typescript
// Database Helper
const dbHelper = getDbHelper();
await dbHelper.cleanDatabase();
await dbHelper.seedDatabase({
  users: [user1, user2],
  accounts: [account1, account2],
});

// NATS Helper
const natsHelper = getNatsHelper();
await natsHelper.publish('task.created', { taskId: '123' });
await natsHelper.waitForMessage('task.claimed');

// Redis Helper
const redisHelper = getRedisHelper();
await redisHelper.setJSON('user:123', { name: 'Test User' });
const user = await redisHelper.getJSON('user:123');
```

### Using Factories

```typescript
// Create single entity
const user = UserFactory.create({ username: 'testuser' });

// Create multiple entities
const users = UserFactory.createMany(10);

// Create with specific type
const poolAccount = AccountFactory.createPoolAccount('100000');
```

## Coverage Requirements

### Global Thresholds
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

### Critical Services (Higher Requirements)
- **Ledger Service**: 90%
- **UBI Engine**: 90%
- **Treasury Engine**: 85%

### Coverage Reports
Reports are generated in the `coverage/` directory:
- **HTML Report**: `coverage/index.html`
- **LCOV**: `coverage/lcov.info`
- **JSON Summary**: `coverage/coverage-summary.json`

## CI/CD Integration

### GitHub Actions Workflow
Tests run automatically on:
- **Push** to `main` or `develop` branches
- **Pull requests** to `main` or `develop`

### Test Stages
1. **Unit Tests** - Run on Node 18.x and 20.x
2. **Integration Tests** - Run after unit tests pass
3. **E2E Tests** - Run after integration tests pass
4. **Security Tests** - SAST, dependency audits
5. **Performance Tests** - Load tests on PRs

### Artifacts
- Coverage reports
- Test results (JUnit XML)
- Playwright reports
- Performance metrics

## Best Practices

### 1. Test Isolation
- Clean database before each test
- Use unique IDs (UUIDs)
- Clear Redis/NATS state

### 2. Descriptive Tests
```typescript
// Good
it('should reject transaction with insufficient balance', async () => {});

// Bad
it('should fail', async () => {});
```

### 3. Arrange-Act-Assert Pattern
```typescript
it('should calculate UBI distribution correctly', async () => {
  // Arrange
  const pool = createPool(10000);
  const users = createUsers(100);
  
  // Act
  const distribution = await calculateDistribution(pool, users);
  
  // Assert
  expect(distribution.totalDistributed).toBe(10000);
});
```

### 4. Test Edge Cases
- Empty inputs
- Boundary values
- Concurrent operations
- Error conditions

### 5. Mock External Services
```typescript
jest.mock('axios');
jest.mock('@temporalio/client');
```

## Debugging Tests

### Run Single Test File
```bash
npm test -- tests/unit/services/ledger.service.test.ts
```

### Run Single Test Case
```bash
npm test -- -t "should create a double-entry transaction"
```

### Debug Mode
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Playwright Debug
```bash
npx playwright test --debug
```

### View E2E Test Videos
Videos are saved in `test-results/` on failure.

## Performance Benchmarks

### API Response Times
- **P95**: < 500ms
- **P99**: < 1000ms

### Error Rates
- **< 1%** under normal load
- **< 5%** under stress

### Concurrent Users
- **50 users**: Sustained for 5 minutes
- **100 users**: Sustained for 5 minutes
- **200 users**: Sustained for 5 minutes

## Troubleshooting

### Tests Failing in CI but Passing Locally
- Check environment variables
- Ensure database is seeded correctly
- Check for race conditions

### Flaky Tests
- Add appropriate waits
- Use Playwright's auto-waiting features
- Check for timing-dependent logic

### Memory Issues
- Increase Jest timeout
- Use `--maxWorkers=2`
- Clean up resources in `afterEach`

## Contributing

When adding new features:
1. Write tests first (TDD)
2. Ensure 80%+ coverage
3. Add integration tests for APIs
4. Add E2E tests for user flows
5. Update this README if needed

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [K6 Documentation](https://k6.io/docs/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
