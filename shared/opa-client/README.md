# OPA Client Library

TypeScript/JavaScript client library for Open Policy Agent (OPA) integration in UBI-CMS.

## Features

- ✅ Type-safe OPA client with TypeScript support
- ✅ Decision caching with LRU cache
- ✅ Fallback strategies for OPA unavailability
- ✅ Express middleware for policy enforcement
- ✅ Batch query support
- ✅ Testing utilities and mocks
- ✅ Pre-built helpers for common policies

## Installation

```bash
npm install @ubi-cms/opa-client
```

## Quick Start

### Initialize Client

```typescript
import { initializeOPA } from '@ubi-cms/opa-client';

const opaClient = initializeOPA({
    url: 'http://opa:8181',
    timeout: 5000,
    cache: true,
    cacheTTL: 60000, // 1 minute
    fallbackAllow: false, // Deny on OPA failure
});
```

### Check Permissions

```typescript
// Check tenant isolation
const canAccess = await opaClient.checkTenantIsolation({
    subject: {
        id: 'user-123',
        tenant_id: 'tenant-456',
    },
    resource: {
        id: 'resource-789',
        tenant_id: 'tenant-456',
    },
    action: 'read',
});

// Check RBAC
const hasPermission = await opaClient.checkRBAC({
    subject: {
        id: 'user-123',
        roles: ['admin'],
    },
    resource_type: 'treasury',
    action: 'withdraw',
});

// Check treasury operation
const canWithdraw = await opaClient.checkTreasury('withdraw', {
    subject: {
        id: 'user-123',
        kyc_status: 'verified',
    },
    resource: {
        balance: 10000,
        daily_withdrawal_limit: 5000,
        daily_spent: 2000,
    },
    amount: 1000,
});
```

### Express Middleware

```typescript
import express from 'express';
import { createOPAMiddleware, getOPAClient } from '@ubi-cms/opa-client';

const app = express();
const opaClient = getOPAClient();

// Apply OPA middleware to protected routes
app.use('/api/treasury/*', createOPAMiddleware(opaClient, 'treasury'));
app.use('/api/agents/*', createOPAMiddleware(opaClient, 'agents'));
app.use('/api/tasks/*', createOPAMiddleware(opaClient, 'tasks'));

app.get('/api/treasury/balance', (req, res) => {
    // Policy already checked by middleware
    // Access decision metadata
    console.log(req.policyDecision);
    res.json({ balance: 10000 });
});
```

## Policy Helpers

### Treasury Policies

```typescript
// Check withdrawal
const canWithdraw = await opaClient.checkTreasury('withdraw', {
    subject: { id: 'user-123', kyc_status: 'verified' },
    resource: { balance: 10000, daily_spent: 0 },
    amount: 1000,
});

// Check spending
const canSpend = await opaClient.checkTreasury('spend', {
    subject: { roles: ['treasury_admin'] },
    amount: 50000,
    approvals: [/* signatures */],
    required_signatures: 2,
});

// Check allocation change
const canAllocate = await opaClient.checkTreasury('change_allocation', {
    subject: { roles: ['treasury_admin'] },
    allocations: [
        { strategy: 'conservative', percentage: 60 },
        { strategy: 'aggressive', percentage: 40 },
    ],
});
```

### Agent Policies

```typescript
// Check agent deployment
const canDeploy = await opaClient.checkAgent('deploy_agent', {
    subject: {
        reputation_score: 75,
        subscription_tier: 'pro',
        deployed_agents: ['agent-1', 'agent-2'],
    },
});

// Check agent resource access
const canAccess = await opaClient.checkAgent('agent_access_resource', {
    agent: {
        scopes: ['read:tasks', 'write:data'],
        api_calls_today: 500,
        status: 'active',
    },
    resource: {
        required_scopes: ['read:tasks'],
    },
    subject: { subscription_tier: 'pro' },
});
```

### Task Policies

```typescript
// Check task creation
const canCreate = await opaClient.checkTask('create_task', {
    subject: {
        reputation_score: 50,
        balance: 1000,
        tasks_created_last_hour: 5,
    },
    task: {
        title: 'Complete documentation',
        description: 'Write comprehensive docs...',
        reward: 100,
        deadline: '2026-12-31T23:59:59Z',
    },
});

// Check task claiming
const canClaim = await opaClient.checkTask('claim_task', {
    subject: {
        reputation_score: 60,
        skills: ['javascript', 'typescript'],
        active_tasks: ['task-1', 'task-2'],
    },
    resource: {
        status: 'open',
        required_reputation: 50,
        required_skills: ['javascript'],
    },
});
```

### Governance Policies

```typescript
// Check proposal creation
const canPropose = await opaClient.checkGovernance('create_proposal', {
    subject: {
        reputation_score: 150,
        staked_tokens: 5000,
        proposals_created_24h: 1,
    },
    proposal: {
        title: 'Increase UBI payout',
        description: 'Proposal to increase daily UBI...',
        actions: [
            { type: 'parameter_change', target: 'ubi_amount', data: { new_value: 10 } },
        ],
    },
});

// Check voting
const canVote = await opaClient.checkGovernance('vote', {
    subject: {
        reputation_score: 50,
        staked_tokens: 1000,
    },
    resource: {
        status: 'active',
        voters: [],
    },
});
```

### Data Access Policies

```typescript
// Check data access with consent
const canAccessData = await opaClient.checkDataAccess('access_data', {
    subject: { id: 'user-123' },
    resource: {
        owner_id: 'user-456',
        consents: [
            {
                granted_to: 'user-123',
                status: 'active',
                expires_at: 1735689599000,
                allowed_fields: ['name', 'email'],
            },
        ],
    },
    fields: ['name', 'email'],
});
```

## Testing

### Mock OPA Client

```typescript
import { MockOPAClient } from '@ubi-cms/opa-client/testing';

describe('Treasury Service', () => {
    let mockOPA: MockOPAClient;

    beforeEach(() => {
        mockOPA = new MockOPAClient();
    });

    it('should allow withdrawal with sufficient balance', async () => {
        mockOPA.mockAllow('treasury', {
            action: 'withdraw',
            amount: 1000,
        });

        const result = await treasuryService.withdraw(1000);
        expect(result.success).toBe(true);
    });

    it('should deny withdrawal exceeding limit', async () => {
        mockOPA.mockDeny('treasury', {
            action: 'withdraw',
            amount: 10000,
        }, ['Daily withdrawal limit exceeded']);

        await expect(treasuryService.withdraw(10000)).rejects.toThrow();
    });
});
```

### Policy Test Builder

```typescript
import { OPAPolicyTest, testHelpers } from '@ubi-cms/opa-client/testing';

const tests = new OPAPolicyTest();

// Test tenant isolation
tests.expectAllow('same tenant access', 'tenant_isolation', {
    subject: testHelpers.createUser({ tenant_id: 'tenant-1' }),
    resource: testHelpers.createResource({ tenant_id: 'tenant-1' }),
});

tests.expectDeny('cross tenant access', 'tenant_isolation', {
    subject: testHelpers.createUser({ tenant_id: 'tenant-1' }),
    resource: testHelpers.createResource({ tenant_id: 'tenant-2' }),
}, ['Cross-tenant access denied']);

// Run tests
const results = await tests.run(opaClient);
console.log(`Passed: ${results.passed}, Failed: ${results.failed}`);
```

## Configuration

### Client Options

```typescript
interface OPAClientOptions {
    url: string;                // OPA server URL
    timeout?: number;           // Request timeout (default: 5000ms)
    cache?: boolean;            // Enable caching (default: true)
    cacheTTL?: number;          // Cache TTL (default: 60000ms)
    cacheMaxSize?: number;      // Max cache entries (default: 1000)
    fallbackAllow?: boolean;    // Allow on OPA failure (default: false)
    headers?: Record<string, string>; // Custom headers
}
```

### Environment Variables

```bash
OPA_URL=http://opa:8181
OPA_TIMEOUT=5000
OPA_CACHE_ENABLED=true
OPA_CACHE_TTL=60000
OPA_FALLBACK_ALLOW=false
```

## Advanced Usage

### Batch Queries

```typescript
const decisions = await opaClient.batchQuery([
    { policy: 'treasury', input: { action: 'withdraw', amount: 1000 } },
    { policy: 'agents', input: { action: 'deploy_agent' } },
    { policy: 'tasks', input: { action: 'create_task' } },
]);
```

### Custom Policy Queries

```typescript
const decision = await opaClient.query({
    policy: 'custom/my_policy',
    input: {
        subject: { id: 'user-123' },
        resource: { id: 'resource-456' },
        action: 'custom_action',
    },
    useCache: false, // Bypass cache
});
```

### Get Violations

```typescript
const violations = await opaClient.getViolations('treasury', {
    action: 'withdraw',
    amount: 999999,
});

console.log(violations);
// ["Daily withdrawal limit exceeded: limit is 5000, attempted 999999"]
```

### Health Check

```typescript
const isHealthy = await opaClient.healthCheck();
if (!isHealthy) {
    console.error('OPA service is unavailable');
}
```

## Best Practices

1. **Initialize once**: Create a single OPA client instance and reuse it
2. **Use caching**: Enable caching for frequently checked policies
3. **Fail closed**: Set `fallbackAllow: false` in production
4. **Test policies**: Use testing utilities to verify policy behavior
5. **Monitor health**: Regularly check OPA service health
6. **Audit decisions**: Log policy decisions for compliance
7. **Handle errors**: Always handle OPA unavailability gracefully

## License

MIT
