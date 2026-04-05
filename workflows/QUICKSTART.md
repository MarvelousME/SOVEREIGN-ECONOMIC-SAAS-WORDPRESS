# Quick Start Guide - Temporal Workflows

Get the UBI CMS workflow system running in 5 minutes.

## Prerequisites

- Node.js 20+
- Docker (for Temporal server)
- PostgreSQL (for services)

## Step 1: Start Temporal Server

```bash
# Using Docker Compose
cd docker
docker-compose up -d temporal temporal-ui

# Verify Temporal is running
curl http://localhost:7233
# Temporal Web UI: http://localhost:8080
```

## Step 2: Install Dependencies

```bash
cd workflows
npm install
```

## Step 3: Configure Environment

```bash
cp .env.example .env

# Edit .env with your settings
# Minimum required:
TEMPORAL_ADDRESS=localhost:7233
DATABASE_URL=postgresql://user:pass@localhost:5432/ubi_cms
```

## Step 4: Start Worker

```bash
# Development mode with hot reload
npm run dev

# You should see:
# ✓ Temporal worker starting
# ✓ Task queue: ubi-cms
# ✓ Namespace: default
```

## Step 5: Test a Workflow

Create a test file `test-workflow.ts`:

```typescript
import { getTemporalClient } from './src/client';

async function test() {
  const client = await getTemporalClient();
  
  // Start UBI distribution (dry-run)
  const handle = await client.startUBIDistribution({
    distributionId: 'test-dist-001',
    dryRun: true,
  });
  
  console.log('Workflow started:', handle.workflowId);
  
  // Query progress
  const progress = await client.queryWorkflowProgress(handle.workflowId);
  console.log('Progress:', progress);
  
  // Wait for result
  const result = await handle.result();
  console.log('Result:', result);
}

test().catch(console.error);
```

Run it:

```bash
npx ts-node test-workflow.ts
```

## Step 6: View in Temporal UI

1. Open http://localhost:8080
2. Click on "Workflows"
3. Find your workflow by ID
4. View execution history, events, and results

## Common Commands

### Start Workflows

```typescript
const client = await getTemporalClient();

// UBI Distribution
await client.startUBIDistribution({
  distributionId: 'dist-001',
  dryRun: false,
});

// Treasury Rebalance
await client.startTreasuryRebalance({
  triggeredBy: 'manual',
  dryRun: true,
});

// Process Payout
await client.startPayout({
  id: 'payout-123',
  userId: 'user-456',
  amount: 100,
  currency: 'USD',
  paymentRail: 'bank',
  destination: 'account-789',
});

// Execute Agent
await client.startAgentExecution({
  id: 'exec-001',
  agentId: 'agent-gpt4',
  userId: 'user-789',
  input: { query: 'Analyze market trends' },
  timeout: 60000,
  maxCost: 10,
});
```

### Control Workflows

```typescript
// Pause
await client.pauseWorkflow('workflow-id');

// Resume
await client.resumeWorkflow('workflow-id');

// Cancel
await client.cancelWorkflow('workflow-id', 'User requested');

// Query status
const status = await client.queryWorkflowStatus('workflow-id');
console.log(status);
// { state: 'running', currentStep: 'updating_balances' }

// Query progress
const progress = await client.queryWorkflowProgress('workflow-id');
console.log(progress);
// { totalSteps: 7, completedSteps: 4, percentage: 57, details: {...} }
```

## Scheduled Workflows

Set up cron jobs to trigger workflows:

```bash
# Daily UBI distribution at midnight
0 0 * * * curl -X POST http://localhost:3000/api/workflows/ubi-distribution

# Weekly treasury rebalance on Sundays
0 0 * * 0 curl -X POST http://localhost:3000/api/workflows/treasury-rebalance

# Daily reputation recalc
0 1 * * * curl -X POST http://localhost:3000/api/workflows/reputation-recalc
```

Or use Temporal's built-in scheduling:

```typescript
await client.schedule.create({
  scheduleId: 'daily-ubi-distribution',
  spec: {
    cronExpressions: ['0 0 * * *'], // Daily at midnight
  },
  action: {
    type: 'startWorkflow',
    workflowType: 'ubiDistributionWorkflow',
    args: [{ distributionId: 'auto', dryRun: false }],
    taskQueue: 'ubi-cms',
  },
});
```

## Troubleshooting

### Worker Not Starting

**Error**: Cannot connect to Temporal server

**Solution**:
```bash
# Check Temporal is running
docker ps | grep temporal

# Check connection
nc -zv localhost 7233

# Restart Temporal
docker-compose restart temporal
```

### Workflow Stuck

**Solution**:
```typescript
// Check status
const status = await client.queryWorkflowStatus('workflow-id');
console.log(status);

// If paused, resume
if (status.state === 'paused') {
  await client.resumeWorkflow('workflow-id');
}

// If failed, check Temporal UI for error details
```

### Activity Timeout

**Solution**: Increase timeout in workflow:
```typescript
const activities = proxyActivities({
  startToCloseTimeout: '10m', // Increase from default
});
```

## Next Steps

1. **Read full docs**: `README.md`
2. **Review examples**: `examples/usage.ts`
3. **Implement scheduling**: Set up cron triggers
4. **Add monitoring**: Integrate with Datadog/Prometheus
5. **Deploy to production**: Use Docker/Kubernetes

## Production Checklist

- [ ] Configure proper DATABASE_URL
- [ ] Set up all service URLs
- [ ] Configure OPA policies
- [ ] Set up MinIO/S3 storage
- [ ] Configure Qdrant vector store
- [ ] Enable Temporal metrics
- [ ] Set up log aggregation
- [ ] Configure alerts
- [ ] Test failure scenarios
- [ ] Document runbooks

## Support

- Temporal Docs: https://docs.temporal.io
- UBI CMS Docs: `README.md`
- Issues: Create GitHub issue

---

**You're now ready to run durable workflows!** 🎉
