# UBI CMS Temporal Workflows

Durable, long-running workflow orchestration for the UBI CMS system using Temporal.io.

## Architecture

This package implements 10 critical workflows for the UBI CMS platform:

1. **UBI Distribution** - Daily automated universal basic income distribution
2. **Treasury Rebalancing** - Portfolio rebalancing based on drift thresholds
3. **Treasury Compounding** - Automated yield harvesting and compounding
4. **Payout Processing** - Secure payment processing with retry logic
5. **Task Expiration** - Automated task expiration and reward returns
6. **Agent Execution** - AI agent execution with resource management
7. **Reputation Recalculation** - Daily reputation score updates
8. **Governance Execution** - Time-locked proposal execution
9. **Referral Conversion** - Multi-tier referral reward distribution
10. **Data Vault Anonymization** - GDPR-compliant data anonymization and erasure

## Project Structure

```
workflows/
├── src/
│   ├── workflows/           # Workflow definitions
│   │   ├── ubi-distribution.workflow.ts
│   │   ├── treasury-rebalance.workflow.ts
│   │   ├── treasury-compound.workflow.ts
│   │   ├── payout.workflow.ts
│   │   ├── task-expiration.workflow.ts
│   │   ├── agent-execution.workflow.ts
│   │   ├── reputation-recalc.workflow.ts
│   │   ├── governance-execution.workflow.ts
│   │   └── referral-conversion.workflow.ts
│   │   └── data-vault-anonymization.workflow.ts
│   ├── activities/          # Activity implementations
│   │   ├── ubi.activities.ts
│   │   ├── treasury.activities.ts
│   │   ├── payout.activities.ts
│   │   ├── task.activities.ts
│   │   ├── agent.activities.ts
│   │   ├── reputation.activities.ts
│   │   ├── governance.activities.ts
│   │   ├── referral.activities.ts
│   │   └── dataVault.activities.ts
│   ├── worker.ts           # Temporal worker
│   ├── client.ts           # Temporal client
│   ├── config.ts           # Configuration
│   ├── types.ts            # Shared types
│   └── index.ts            # Public API
├── package.json
├── tsconfig.json
├── Dockerfile
└── README.md
```

## Features

### Workflow Capabilities

- **Signal Handling**: Pause, resume, and cancel workflows dynamically
- **Query Support**: Get real-time workflow status and progress
- **Saga Pattern**: Automatic compensation on failure
- **Retry Policies**: Exponential backoff with configurable limits
- **Timeouts**: Activity and workflow-level timeout protection
- **Version Management**: Safe workflow evolution

### Error Handling

- Automatic retries with exponential backoff
- Rollback/compensation logic for failed transactions
- Manual review queues for critical failures
- Comprehensive logging and monitoring

### Security

- OPA policy integration for authorization
- Resource allocation limits
- Daily payout limits
- Multi-signature approvals for governance

## Installation

```bash
cd workflows
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Temporal
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=default
TEMPORAL_TASK_QUEUE=ubi-cms

# Services
UBI_ENGINE_URL=http://localhost:4001
TREASURY_ENGINE_URL=http://localhost:4002
LEDGER_SERVICE_URL=http://localhost:4003
...
```

## Running

### Start Worker

```bash
# Development
npm run dev

# Production
npm run build
npm run worker
```

### Start Workflows

```typescript
import { getTemporalClient } from '@ubi-cms/workflows';

const client = await getTemporalClient();

// Start UBI distribution
const handle = await client.startUBIDistribution({
  distributionId: 'dist-2024-01-01',
  dryRun: false,
});

// Query workflow status
const status = await client.queryWorkflowStatus(handle.workflowId);

// Pause workflow
await client.pauseWorkflow(handle.workflowId);

// Resume workflow
await client.resumeWorkflow(handle.workflowId);

// Cancel workflow
await client.cancelWorkflow(handle.workflowId, 'User requested');
```

## Workflow Details

### 1. UBI Distribution Workflow

**Schedule**: Daily at 00:00 UTC  
**Duration**: ~5-10 minutes  

**Steps**:
1. Calculate eligible users
2. Calculate distribution amounts
3. Lock UBI pool
4. Create ledger transactions
5. Update user balances
6. Emit distribution events
7. Send notifications

**Error Handling**: Automatic rollback on failure, unlock pool

### 2. Treasury Rebalancing Workflow

**Trigger**: Drift threshold exceeded or weekly schedule  
**Duration**: ~10-15 minutes  

**Steps**:
1. Check OPA policy for permissions
2. Calculate target allocations
3. Execute rebalancing trades
4. Update vault balances
5. Record performance metrics
6. Emit rebalancing events

**Features**: Dry-run mode, slippage protection

### 3. Payout Processing Workflow

**Trigger**: User payout request  
**Duration**: ~1-2 minutes  

**Steps**:
1. Validate payout request
2. Check OPA policies (daily limits)
3. Lock funds
4. Process payment via payment rail
5. Update ledger
6. Send confirmation

**Error Handling**: Retry failed payments, hold for manual review

### 4. Agent Execution Workflow

**Trigger**: Agent execution request  
**Duration**: Variable (max 15 minutes)

**Steps**:
1. Validate agent permissions (OPA)
2. Allocate resources
3. Load agent memory from Qdrant
4. Execute agent code
5. Store results in MinIO
6. Update memory
7. Record costs/revenue
8. Emit completion event

**Features**: Timeout handling, automatic resource cleanup

### 10. Data Vault Anonymization Workflow

**Trigger**: GDPR data subject request or scheduled retention policy  
**Duration**: ~30 seconds - 2 minutes

**Steps**:
1. Check user consent status
2. Validate anonymization strategy
3. Fetch user PII data
4. Apply anonymization strategy to PII fields
5. Log anonymization audit event
6. Verify anonymization compliance
7. Update data vault

**Anonymization Strategies**:
- `k-anonymity`: Generalizes quasi-identifiers (dates to month/year, ages to 5-year buckets)
- `differential-privacy`: Adds calibrated noise to numeric values using epsilon parameter
- `pseudonymization`: Replaces PII with consistent pseudonyms (reversible with key)
- `full-anonymization`: Irreversibly redacts all PII fields

**Error Handling**: Retry failed activities, log failures for auditor review

**GDPR Compliance**: Supports right to erasure, data minimization, and consent withdrawal

## Monitoring

### Query Workflow Status

```typescript
const status = await client.queryWorkflowStatus(workflowId);
// { state: 'running', currentStep: 'updating_balances' }
```

### Query Workflow Progress

```typescript
const progress = await client.queryWorkflowProgress(workflowId);
// { totalSteps: 7, completedSteps: 4, percentage: 57, details: {...} }
```

### Temporal Web UI

Access Temporal Web UI at http://localhost:8080 for:
- Workflow execution history
- Event logs
- Retry attempts
- Performance metrics

## Deployment

### Docker

```bash
docker build -t ubi-cms/workflows .
docker run -e TEMPORAL_ADDRESS=temporal:7233 ubi-cms/workflows
```

### Kubernetes

See `infrastructure/k8s/workflows-deployment.yaml`

## Development

### Adding a New Workflow

1. Create workflow file in `src/workflows/`
2. Create activities in `src/activities/`
3. Add to worker in `src/worker.ts`
4. Add client methods in `src/client.ts`
5. Export types in `src/index.ts`

### Testing

```bash
npm test
```

## Best Practices

1. **Idempotency**: All activities must be idempotent
2. **Determinism**: Workflow code must be deterministic
3. **Small Workflows**: Break large workflows into child workflows
4. **Activity Timeouts**: Always set appropriate timeouts
5. **Retry Policies**: Configure retries based on activity type
6. **Compensation**: Always implement cleanup/rollback logic

## Troubleshooting

### Workflow Stuck

```typescript
// Check status
const status = await client.queryWorkflowStatus(workflowId);

// If paused, resume
if (status.state === 'paused') {
  await client.resumeWorkflow(workflowId);
}
```

### Activity Timeout

Increase timeout in activity proxy:

```typescript
const activities = proxyActivities({
  startToCloseTimeout: '10m', // Increase from default
});
```

### Connection Issues

Check Temporal server is running:

```bash
docker ps | grep temporal
```

## License

MIT
