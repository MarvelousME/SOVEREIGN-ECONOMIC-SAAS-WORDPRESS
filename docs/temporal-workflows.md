# Temporal Workflows Documentation

This document describes the Temporal workflow system for the Sovereign Economic SaaS platform, including workflow definitions, activities, and error handling.

## Overview

The platform uses [Temporal](https://temporal.io/) for workflow orchestration, enabling reliable execution of long-running business processes with built-in retry logic, durability, and observability.

## Configuration

### UBI Engine

**Location:** `services/ubi-engine/src/config/index.ts`

```typescript
temporal: {
  address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
  namespace: process.env.TEMPORAL_NAMESPACE || 'default',
  taskQueue: process.env.TEMPORAL_TASK_QUEUE || 'ubi-engine',
}
```

### Treasury Engine

**Location:** `services/treasury-engine/src/config/index.ts`

```typescript
temporal: {
  address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
  namespace: process.env.TEMPORAL_NAMESPACE || 'default',
}
```

---

## UBI Engine Workflows

### Daily Distribution Workflow

**Location:** `services/ubi-engine/src/workflows/distribution-workflow.ts`

Orchestrates daily UBI token distribution to eligible users.

```typescript
export interface DistributionWorkflowParams {
  poolId: string;
  tenantId: string;
  distributionDate: Date;
}

export async function dailyDistributionWorkflow(
  params: DistributionWorkflowParams
): Promise<void>
```

**Workflow Steps:**

1. **Calculate Distribution** - Calculate UBI amounts for all eligible users
2. **Persist Distribution Records** - Store distribution records in database
3. **Update Pool Balance** - Deduct distributed amount from pool
4. **Notify Completion** - Publish distribution completed event

**Activity Calls:**

```typescript
const { 
  calculateDistribution, 
  persistDistribution, 
  updatePoolBalance,
  notifyDistributionComplete 
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    maximumAttempts: 3,
  },
});
```

**Triggered By:**

```typescript
// From services/ubi-engine/src/api/controllers/admin-controller.ts
const handle = await client.workflow.start('dailyDistributionWorkflow', {
  taskQueue: config.temporal.taskQueue,
  args: [{
    poolId,
    tenantId,
    distributionDate: new Date()
  }],
  workflowId: `distribution-${poolId}-${Date.now()}`,
});
```

---

### Weekly Rebalancing Workflow

**Location:** `services/ubi-engine/src/workflows/distribution-workflow.ts`

Rebalances UBI pool and adjusts distribution parameters.

```typescript
export async function weeklyRebalancingWorkflow(
  poolId: string
): Promise<void>
```

**Workflow Steps:**

1. **Check Pool Sustainability** - Evaluate if pool is sustainable
2. **Adjust Pool Parameters** (conditional) - Reduce distribution rate if needed

**Activity Calls:**

```typescript
const { 
  checkPoolSustainability,
  adjustPoolParameters
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '2 minutes',
});
```

---

### Eligibility Recalculation Workflow

**Location:** `services/ubi-engine/src/workflows/distribution-workflow.ts`

Recalculates eligibility scores for all users.

```typescript
export async function eligibilityRecalculationWorkflow(
  params: {
    tenantId: string;
    poolId: string;
  }
): Promise<void>
```

**Activity Calls:**

```typescript
const { recalculateAllEligibility } = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 minutes',
});
```

---

## Treasury Engine Workflows

### Risk Assessment Workflow

**Location:** `services/treasury-engine/src/workflows/risk-assessment.workflow.ts`

Continuously monitors vault risk scores and pauses high-risk vaults.

```typescript
export async function RiskAssessmentWorkflow(): Promise<void>
```

**Execution:** Runs every 12 hours (continuous loop)

**Workflow Steps:**

```
1. Get all active vaults
2. For each vault:
   a. Assess vault risk score
   b. Update vault risk score
   c. If risk score > 8: pause vault
3. Sleep until next assessment cycle
```

**Activity Calls:**

```typescript
const { 
  assessVaultRisk, 
  updateVaultRiskScore, 
  getActiveVaults, 
  pauseHighRiskVault 
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    maximumAttempts: 3,
    initialInterval: '10 seconds',
    backoffCoefficient: 2,
  },
});
```

**Risk Score Calculation:**

```typescript
async function assessVaultRisk(vaultId: string): Promise<number> {
  // Base risk from strategy risk level
  let riskScore = strategy.risk_level;

  // Concentration risk adjustment
  if (maxAllocation > 50) {
    riskScore += 1;
  }

  // Protocol risk adjustment
  const avgProtocolRisk = strategy.allocations.reduce(...) / strategy.allocations.length;
  riskScore = (riskScore + avgProtocolRisk) / 2;

  return Math.min(Math.round(riskScore), 10);
}
```

---

### Yield Harvesting Workflow

**Location:** `services/treasury-engine/src/workflows/yield-harvest.workflow.ts`

Harvests yield from all vaults with pending rewards.

```typescript
export async function YieldHarvestingWorkflow(): Promise<void>
```

**Execution:** Runs every 6 hours (continuous loop)

**Workflow Steps:**

```
1. Get vaults with pending yield
2. For each vault:
   a. Harvest yield
   b. Log harvested amount
3. Sleep until next harvest cycle
```

**Activity Calls:**

```typescript
const { harvestYield, getVaultsWithPendingYield } = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 minutes',
  retry: {
    maximumAttempts: 3,
    initialInterval: '10 seconds',
    backoffCoefficient: 2,
  },
});
```

---

### Auto-Rebalancing Workflow

**Location:** `services/treasury-engine/src/workflows/rebalancing.workflow.ts`

Monitors and rebalances vault allocations.

```typescript
export async function AutoRebalancingWorkflow(): Promise<void>
```

**Execution:** Runs every 4 hours (continuous loop)

**Workflow Steps:**

```
1. Get all active vaults
2. For each vault:
   a. Check if rebalancing needed
   b. If needed: rebalance vault
3. Sleep until next check cycle
```

**Activity Calls:**

```typescript
const { 
  checkRebalanceNeeded, 
  rebalanceVault, 
  getActiveVaults 
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 minutes',
  retry: {
    maximumAttempts: 3,
    initialInterval: '10 seconds',
    backoffCoefficient: 2,
  },
});
```

**Rebalance Decision Logic:**

```typescript
async function checkRebalanceNeeded(vaultId: string): Promise<boolean> {
  const vault = await vaultRepo.getVaultById(vaultId);
  const lastCompound = vault.last_compound_at;
  
  // Trigger rebalance if no compound in 48 hours
  const hoursSinceLastCompound = (Date.now() - lastCompound.getTime()) / (1000 * 60 * 60);
  return hoursSinceLastCompound > 48;
}
```

---

### Auto-Compounding Workflow

**Location:** `services/treasury-engine/src/workflows/compounding.workflow.ts`

Compounds vault positions at configurable frequencies.

```typescript
export async function AutoCompoundingWorkflow(frequency: string): Promise<void>
```

**Parameters:**

| Frequency | Interval |
|-----------|----------|
| `hourly` | 1 hour |
| `daily` | 24 hours |
| `weekly` | 7 days |
| `monthly` | 30 days |

**Workflow Steps:**

```
1. Get vaults for compounding (filtered by frequency)
2. For each vault:
   a. Compound vault
   b. Log result
3. Sleep until next compounding cycle
```

**Activity Calls:**

```typescript
const { compoundVault, getVaultsForCompounding } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    maximumAttempts: 3,
    initialInterval: '10 seconds',
    backoffCoefficient: 2,
  },
});
```

---

## UBI Engine Activities

**Location:** `services/ubi-engine/src/activities/index.ts`

### calculateDistribution

```typescript
async function calculateDistribution(params: {
  poolId: string;
  tenantId: string;
  distributionDate: Date;
}): Promise<{
  success: boolean;
  distributionId?: string;
  distributions?: DistributionResult[];
  totalDistributed?: number;
  recipientCount?: number;
  error?: string;
}>
```

**Logic:**
1. Query pool details
2. Calculate eligible users (score >= minParticipationScore)
3. Calculate distribution amounts using weighted formula
4. Create distribution history record

---

### persistDistribution

```typescript
async function persistDistribution(params: {
  distributionId: string;
  distributions: DistributionResult[];
}): Promise<void>
```

**Logic:**
1. Insert user_distribution records
2. Update user_ubi_balances (pending_balance, lifetime_earned)
3. Update distribution_history status to 'completed'

---

### updatePoolBalance

```typescript
async function updatePoolBalance(params: {
  poolId: string;
  distributedAmount: number;
}): Promise<void>
```

---

### notifyDistributionComplete

```typescript
async function notifyDistributionComplete(params: {
  distributionId: string;
  poolId: string;
  tenantId: string;
  recipientCount: number;
  totalDistributed: number;
}): Promise<void>
```

**Action:** Publishes `ubi.distribution.completed` event via NATS

---

### checkPoolSustainability

```typescript
async function checkPoolSustainability(params: {
  poolId: string;
}): Promise<{
  isSustainable: boolean;
  recommendations?: any;
}>
```

**Logic:** Returns `isSustainable: false` if remaining pool balance < 20%

---

### recalculateAllEligibility

```typescript
async function recalculateAllEligibility(params: {
  tenantId: string;
  poolId: string;
}): Promise<void>
```

**Logic:**
1. Query all users with activity in tenant
2. Batch recalculate eligibility scores

---

## Treasury Engine Activities

**Location:** `services/treasury-engine/src/activities/index.ts`

### Vault Risk Activities

```typescript
async function assessVaultRisk(vaultId: string): Promise<number>
async function updateVaultRiskScore(vaultId: string, riskScore: number): Promise<void>
async function getActiveVaults(): Promise<string[]>
async function pauseHighRiskVault(vaultId: string, riskScore: number): Promise<void>
```

### Yield Activities

```typescript
async function getVaultsWithPendingYield(): Promise<string[]>
async function harvestYield(vaultId: string): Promise<string>
```

### Rebalancing Activities

```typescript
async function getActiveVaults(): Promise<string[]>
async function checkRebalanceNeeded(vaultId: string): Promise<boolean>
async function rebalanceVault(vaultId: string): Promise<void>
```

### Compounding Activities

```typescript
async function getVaultsForCompounding(frequency: string): Promise<string[]>
async function compoundVault(vaultId: string): Promise<void>
```

---

## Workflow Diagrams

### Daily Distribution Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         DailyDistributionWorkflow                            │
└──────────────────────────────────────────────────────────────────────────────┘
                                      │
            ┌─────────────────────────┼─────────────────────────┐
            ▼                         ▼                         ▼
   ┌─────────────────┐      ┌────────────────────┐     ┌────────────────────┐
   │  calculate      │      │  persist           │     │  updatePool        │
   │  Distribution   │─────▶│  Distribution      │────▶│  Balance           │
   │  (5 min timeout)│      │  (5 min timeout)   │     │  (5 min timeout)   │
   └─────────────────┘      └────────────────────┘     └────────────────────┘
                                                                 │
                                                                 ▼
                                                        ┌────────────────────┐
                                                        │  notify            │
                                                        │  DistributionComplete│
                                                        │  (5 min timeout)   │
                                                        └────────────────────┘
                                                                 │
                                                                 ▼
                                                        ┌────────────────────┐
                                                        │  NATS Event        │
                                                        │  Published         │
                                                        └────────────────────┘
```

### Risk Assessment Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         RiskAssessmentWorkflow (Continuous)                   │
│                         Runs every 12 hours                                  │
└──────────────────────────────────────────────────────────────────────────────┘
                                      │
            ┌─────────────────────────┴─────────────────────────┐
            ▼                                                   ▼
   ┌─────────────────┐                              ┌────────────────────┐
   │  getActiveVaults│                              │  For each vault:   │
   │  (5 min timeout)│                              │  assessVaultRisk   │
   └─────────────────┘                              │  updateVaultRisk  │
            │                                       └────────────────────┘
            │                                                   │
            │           ┌─────────────────────────────────────┘
            │           │
            │           ▼ (if riskScore > 8)
            │    ┌────────────────────┐
            │    │  pauseHighRiskVault│
            │    └────────────────────┘
            │           │
            └───────────┴──────▶ Sleep(12 hours) ──▶ Repeat
```

### Treasury Compounding Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    AutoCompoundingWorkflow (Configurable Frequency)          │
│                    hourly/daily/weekly/monthly                                │
└──────────────────────────────────────────────────────────────────────────────┘
                                      │
            ┌─────────────────────────┼─────────────────────────┐
            ▼                         ▼                         ▼
   ┌─────────────────┐      ┌────────────────────┐     ┌────────────────────┐
   │  getVaultsFor   │      │  For each vault:   │     │  Sleep(interval)   │
   │  Compounding    │─────▶│  compoundVault     │────▶│                    │
   │  (5 min timeout)│      │  (5 min timeout)   │     └────────────────────┘
   └─────────────────┘      └────────────────────┘              │
                                                                      │
                              └──────────────────────────────────────┘
```

---

## Error Handling

### Retry Policy

All activities use exponential backoff retry:

```typescript
retry: {
  maximumAttempts: 3,
  initialInterval: '10 seconds',
  backoffCoefficient: 2,
}
```

**Retry Timeline:**
- Attempt 1: Immediate
- Attempt 2: After 10 seconds
- Attempt 3: After 20 seconds (10 * 2)

### Activity Timeout

Activities have `startToCloseTimeout` to detect stuck executions:

| Activity | Timeout |
|----------|---------|
| calculateDistribution | 5 minutes |
| persistDistribution | 5 minutes |
| updatePoolBalance | 5 minutes |
| notifyDistributionComplete | 5 minutes |
| assessVaultRisk | 5 minutes |
| harvestYield | 10 minutes |
| rebalanceVault | 10 minutes |
| compoundVault | 5 minutes |
| checkPoolSustainability | 2 minutes |

### Workflow Failure Handling

```typescript
// In dailyDistributionWorkflow
const distributionResult = await calculateDistribution({...});

if (!distributionResult.success) {
  throw new Error(`Distribution calculation failed: ${distributionResult.error}`);
}
```

```typescript
// In RiskAssessmentWorkflow
try {
  const riskScore = await assessVaultRisk(vaultId);
  await updateVaultRiskScore(vaultId, riskScore);
  
  if (riskScore > 8) {
    await pauseHighRiskVault(vaultId, riskScore);
  }
} catch (error) {
  console.error(`Failed to assess risk for vault ${vaultId}:`, error);
  // Continue with next vault - individual failures don't stop workflow
}
```

### Dead Letter Handling

For NATS consumers, failed messages after max retries are sent to DLQ:

```
dlq.{stream}.{subject}
```

Example: `dlq.ledger.ledger.transaction.created`

---

## Starting Workflows

### Via Admin API

```typescript
// POST /api/v1/ubi/distribute
const client = new Client({
  connection: { address: config.temporal.address },
  namespace: config.temporal.namespace,
});

const handle = await client.workflow.start('dailyDistributionWorkflow', {
  taskQueue: config.temporal.taskQueue,
  args: [{ poolId, tenantId, distributionDate: new Date() }],
  workflowId: `distribution-${poolId}-${Date.now()}`,
});
```

### Via Temporal CLI

```bash
# Start workflow
temporal workflow start \
  --task-queue ubi-engine \
  --type dailyDistributionWorkflow \
  --input '{"poolId":"...","tenantId":"...","distributionDate":"..."}'

# View workflow history
temporal workflow show --workflow-id <id>

# Cancel workflow
temporal workflow cancel --workflow-id <id>
```
