# NATS Events Documentation

This document describes the NATS event system for the Sovereign Economic SaaS platform, including event schemas, publishers, consumers, and event flows.

## Overview

The platform uses NATS JetStream for asynchronous event-driven communication between services. Events follow the [CloudEvents v1.0](https://cloudevents.io/) specification for standardization.

## Event Schema Definition

**Location:** `shared/events/schemas.ts`

All events are wrapped in a CloudEvent envelope:

```typescript
interface CloudEvent<T = unknown> {
  specversion: '1.0';      // CloudEvents version
  type: string;             // Event type identifier
  source: string;           // Service that generated the event
  id: string;                // Unique event identifier
  time: string;             // ISO 8601 timestamp
  datacontenttype: string;  // MIME type
  tenantid: string;         // Tenant identifier
  correlationid?: string;   // For tracing related events
  causationid?: string;     // ID of event that caused this event
  data: T;                  // Event payload
  metadata?: Record<string, unknown>;
}
```

### Common Types

```typescript
type EventStatus = 'pending' | 'processing' | 'completed' | 'failed';
type Currency = 'UBI' | 'USD' | 'ETH';

interface MoneyAmount {
  amount: string;    // Decimal string to avoid precision issues
  currency: Currency;
}

interface UserReference {
  userId: string;
  username?: string;
  email?: string;
}
```

---

## Event Catalog

For SAAOS-style domain event names and how they map to this platform’s NATS subjects, see [Event taxonomy crosswalk](./architecture/event-taxonomy-crosswalk.md).

### Ledger Events

| Event Type | Subject | Description |
|------------|---------|-------------|
| `ledger.transaction.created` | `ledger.transaction.created` | New transaction created |
| `ledger.transaction.reversed` | `ledger.transaction.reversed` | Transaction reversed |
| `ledger.balance.updated` | `ledger.balance.updated` | Account balance changed |

#### TransactionCreatedData

```typescript
interface TransactionCreatedData {
  transactionId: string;
  tenantId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: MoneyAmount;
  type: 'transfer' | 'deposit' | 'withdrawal' | 'reward' | 'ubi_distribution';
  description: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}
```

#### BalanceUpdatedData

```typescript
interface BalanceUpdatedData {
  accountId: string;
  tenantId: string;
  previousBalance: MoneyAmount;
  newBalance: MoneyAmount;
  change: MoneyAmount;
  transactionId: string;
  timestamp: string;
}
```

---

### UBI Events

| Event Type | Subject | Description |
|------------|---------|-------------|
| `ubi.distribution.scheduled` | `ubi.distribution.scheduled` | Distribution scheduled |
| `ubi.distribution.completed` | `ubi.distribution.completed` | Distribution finished |
| `ubi.distribution.failed` | `ubi.distribution.failed` | Distribution failed |
| `ubi.claimed` | `ubi.claimed` | User claimed UBI |

#### UBIDistributionScheduledData

```typescript
interface UBIDistributionScheduledData {
  distributionId: string;
  tenantId: string;
  amount: MoneyAmount;
  recipientCount: number;
  scheduledFor: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  createdBy: UserReference;
}
```

#### UBIDistributionCompletedData

```typescript
interface UBIDistributionCompletedData {
  distributionId: string;
  tenantId: string;
  amount: MoneyAmount;
  recipientCount: number;
  successCount: number;
  failureCount: number;
  totalDistributed: MoneyAmount;
  completedAt: string;
  duration: number;  // milliseconds
}
```

#### UBIClaimedData

```typescript
interface UBIClaimedData {
  claimId: string;
  distributionId: string;
  tenantId: string;
  userId: string;
  amount: MoneyAmount;
  claimedAt: string;
  transactionId: string;
}
```

---

### Treasury Events

| Event Type | Subject | Description |
|------------|---------|-------------|
| `treasury.deposit` | `treasury.deposit` | Funds deposited |
| `treasury.withdraw` | `treasury.withdraw` | Funds withdrawn |
| `treasury.compounded` | `treasury.compounded` | Interest compounded |
| `treasury.rebalanced` | `treasury.rebalanced` | Portfolio rebalanced |

#### TreasuryDepositData

```typescript
interface TreasuryDepositData {
  depositId: string;
  tenantId: string;
  amount: MoneyAmount;
  source: string;
  depositedBy: UserReference;
  transactionId: string;
  timestamp: string;
}
```

#### TreasuryRebalancedData

```typescript
interface TreasuryRebalancedData {
  rebalanceId: string;
  tenantId: string;
  previousAllocation: Record<string, MoneyAmount>;
  newAllocation: Record<string, MoneyAmount>;
  strategy: string;
  triggeredBy: 'automatic' | 'manual';
  executor: UserReference;
  timestamp: string;
}
```

---

### Task Events

| Event Type | Subject | Description |
|------------|---------|-------------|
| `task.created` | `task.created` | New task created |
| `task.claimed` | `task.claimed` | Task claimed by user |
| `task.submitted` | `task.submitted` | Task submitted for review |
| `task.approved` | `task.approved` | Task approved, reward issued |
| `task.rejected` | `task.rejected` | Task rejected |

#### TaskApprovedData

```typescript
interface TaskApprovedData {
  taskId: string;
  tenantId: string;
  approvedBy: UserReference;
  approvedAt: string;
  reward: MoneyAmount;
  rating?: number;
  feedback?: string;
  transactionId: string;
}
```

---

### Reward Events

| Event Type | Subject | Description |
|------------|---------|-------------|
| `reward.calculated` | `reward.calculated` | Reward calculation complete |
| `reward.distributed` | `reward.distributed` | Reward distributed to user |
| `reward.claimed` | `reward.claimed` | Reward claimed by user |

#### RewardDistributedData

```typescript
interface RewardDistributedData {
  distributionId: string;
  calculationId: string;
  tenantId: string;
  userId: string;
  amount: MoneyAmount;
  distributedAt: string;
  transactionId: string;
  status: 'success' | 'failed';
  error?: string;
}
```

---

### Agent Events

| Event Type | Subject | Description |
|------------|---------|-------------|
| `agent.deployed` | `agent.deployed` | Agent deployed |
| `agent.executed` | `agent.executed` | Agent execution completed |
| `agent.revenue` | `agent.revenue` | Revenue recorded |
| `agent.error` | `agent.error` | Agent error occurred |

#### AgentExecutedData

```typescript
interface AgentExecutedData {
  executionId: string;
  agentId: string;
  tenantId: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: 'success' | 'failed';
  duration: number;  // milliseconds
  executedAt: string;
  error?: string;
}
```

---

### Governance Events

| Event Type | Subject | Description |
|------------|---------|-------------|
| `governance.proposal.created` | `governance.proposal.created` | New proposal created |
| `governance.vote.cast` | `governance.vote.cast` | Vote cast |
| `governance.proposal.executed` | `governance.proposal.executed` | Proposal executed |

#### VoteCastData

```typescript
interface VoteCastData {
  voteId: string;
  proposalId: string;
  tenantId: string;
  votedBy: UserReference;
  vote: 'for' | 'against' | 'abstain';
  weight: number;
  votedAt: string;
  reason?: string;
}
```

---

## Event Publisher/Consumer Implementation

### UBI Engine Event Publisher

**Location:** `services/ubi-engine/src/events/event-publisher.ts`

```typescript
export class EventPublisher {
  async publishDistributionScheduled(data: {
    distributionId: string;
    poolId: string;
    tenantId: string;
    scheduledDate: Date;
    totalAmount: number;
  }): Promise<void>;

  async publishDistributionCompleted(data: {
    distributionId: string;
    poolId: string;
    tenantId: string;
    totalDistributed: number;
    recipientCount: number;
    completedAt: Date;
  }): Promise<void>;

  async publishUBIClaimed(data: {
    userId: string;
    tenantId: string;
    amount: number;
    distributionId: string;
    claimedAt: Date;
  }): Promise<void>;

  async publishDistributionFailed(data: {
    distributionId: string;
    poolId: string;
    error: string;
    failedAt: Date;
  }): Promise<void>;
}
```

### UBI Engine Event Consumer

**Location:** `services/ubi-engine/src/events/event-consumer.ts`

The consumer listens to external events that affect user eligibility:

```typescript
export class EventConsumer {
  async start(): Promise<void>;
}
```

**Subscribed Subjects:**
- `task.completed` - Records task completion contribution
- `referral.converted` - Records referral conversion contribution  
- `agent.revenue` - Records agent revenue contribution

**Event Processing:**

| Event | Score Value | Contribution Type | Multiplier |
|-------|-------------|-------------------|------------|
| `task.completed` | 10 | `task_completion` | 1.0 |
| `referral.converted` | 25 | `referral` | 2.0 |
| `agent.revenue` | 15 (min: revenue/10, max: 100) | `agent_revenue` | 1.5 |

---

## NATS Client Configuration

**Location:** `services/ubi-engine/src/events/nats-client.ts`

```typescript
export class NatsClient {
  async connect(): Promise<void>;     // Connect to NATS
  async publish(subject: string, data: any): Promise<void>;
  async subscribe(subject: string, handler: (data: any) => Promise<void>): Promise<void>;
  async close(): Promise<void>;
  async healthCheck(): Promise<boolean>;
}
```

**Configuration (from `services/ubi-engine/src/config/index.ts`):**

```typescript
nats: {
  url: process.env.NATS_URL || 'nats://localhost:4222',
  user: process.env.NATS_USER,
  password: process.env.NATS_PASSWORD,
}
```

---

## Event Flow Diagrams

### UBI Distribution Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│   Admin API     │────▶│  Temporal        │────▶│  DailyDistribution  │
│   Trigger       │     │  Workflow        │     │  Workflow           │
└─────────────────┘     └──────────────────┘     └─────────────────────┘
                                                          │
                        ┌─────────────────────────────────┼─────────────────────────────────┐
                        ▼                                 ▼                                 ▼
               ┌────────────────┐              ┌────────────────────┐              ┌─────────────────────┐
               │  Calculate     │              │  Persist          │              │  Update Pool        │
               │  Distribution  │─────────────▶│  Distribution     │─────────────▶│  Balance            │
               └────────────────┘              └────────────────────┘              └─────────────────────┘
                                                                                           │
                                                                                           ▼
                                                                          ┌─────────────────────────────┐
                                                                          │  Publish NATS Event         │
                                                                          │  ubi.distribution.completed │
                                                                          └─────────────────────────────┘
                                                                                           │
                              ┌──────────────────────────────────────────────┘
                              ▼
               ┌─────────────────────┐     ┌─────────────────────┐
               │  Event Consumer    │────▶│  Update User        │
               │  (ubi-engine)      │     │  Eligibility Cache  │
               └─────────────────────┘     └─────────────────────┘
```

### User Activity Impact Flow

```
┌─────────────────┐     ┌─────────────────────┐     ┌──────────────────────┐
│  Task Service   │────▶│  NATS               │────▶│  UBI Engine          │
│  task.approved  │     │  (task.*)           │     │  Event Consumer      │
└─────────────────┘     └─────────────────────┘     └──────────────────────┘
                                                                 │
                        ┌────────────────────────────────────────┼────────────────┐
                        ▼                                        ▼                ▼
               ┌────────────────┐              ┌─────────────────────────┐  ┌────────────────┐
               │  Insert        │              │  Insert                 │  │  Invalidate    │
               │  activity_events│────────────▶│  contribution_records   │  │  Eligibility   │
               └────────────────┘              └─────────────────────────┘  │  Cache         │
                                                                               └────────────────┘
```

---

## Stream Subject Mapping

**Location:** `shared/events/schemas.ts`

```typescript
export const StreamSubjects = {
  LEDGER: 'ledger.*',
  UBI: 'ubi.*',
  TREASURY: 'treasury.*',
  TASK: 'task.*',
  REWARD: 'reward.*',
  AGENT: 'agent.*',
  GOVERNANCE: 'governance.*',
} as const;
```

---

## Event Type Constants

```typescript
export const EventTypes = {
  // Ledger
  LEDGER_TRANSACTION_CREATED: 'ledger.transaction.created',
  LEDGER_TRANSACTION_REVERSED: 'ledger.transaction.reversed',
  LEDGER_BALANCE_UPDATED: 'ledger.balance.updated',
  
  // UBI
  UBI_DISTRIBUTION_SCHEDULED: 'ubi.distribution.scheduled',
  UBI_DISTRIBUTION_COMPLETED: 'ubi.distribution.completed',
  UBI_CLAIMED: 'ubi.claimed',
  
  // Treasury
  TREASURY_DEPOSIT: 'treasury.deposit',
  TREASURY_WITHDRAW: 'treasury.withdraw',
  TREASURY_COMPOUNDED: 'treasury.compounded',
  TREASURY_REBALANCED: 'treasury.rebalanced',
  
  // Task
  TASK_CREATED: 'task.created',
  TASK_CLAIMED: 'task.claimed',
  TASK_SUBMITTED: 'task.submitted',
  TASK_APPROVED: 'task.approved',
  TASK_REJECTED: 'task.rejected',
  
  // Reward
  REWARD_CALCULATED: 'reward.calculated',
  REWARD_DISTRIBUTED: 'reward.distributed',
  REWARD_CLAIMED: 'reward.claimed',
  
  // Agent
  AGENT_DEPLOYED: 'agent.deployed',
  AGENT_EXECUTED: 'agent.executed',
  AGENT_REVENUE: 'agent.revenue',
  AGENT_ERROR: 'agent.error',
  
  // Governance
  GOVERNANCE_PROPOSAL_CREATED: 'governance.proposal.created',
  GOVERNANCE_VOTE_CAST: 'governance.vote.cast',
  GOVERNANCE_PROPOSAL_EXECUTED: 'governance.proposal.executed',
} as const;
```

---

## Publisher Example

```typescript
import { NatsClient, createCloudEvent } from '../../nats-client/src';
import { EventTypes, TransactionCreatedData } from '../schemas';

const client = new NatsClient({
  servers: process.env.NATS_URL || 'nats://localhost:4222',
  name: 'ledger-service',
  maxReconnectAttempts: -1,
  reconnectTimeWait: 2000,
});

await client.connect();

const event = createCloudEvent(
  EventTypes.LEDGER_TRANSACTION_CREATED,
  'ledger-service',
  {
    transactionId: 'txn-123',
    tenantId: 'tenant-1',
    fromAccountId: 'acc-alice',
    toAccountId: 'acc-bob',
    amount: { amount: '100.00', currency: 'UBI' },
    type: 'transfer',
    description: 'Payment for task completion',
    timestamp: new Date().toISOString(),
  },
  { tenantId: 'tenant-1' }
);

await client.getPublisher().publish(
  EventTypes.LEDGER_TRANSACTION_CREATED,
  event,
  { msgId: 'txn-123' }
);
```

---

## Consumer Example

```typescript
import { NatsClient } from '../../nats-client/src';

const client = new NatsClient({
  servers: process.env.NATS_URL || 'nats://localhost:4222',
  name: 'audit-service',
});

await client.connect();

await client.subscribe('ledger.*', async (event) => {
  console.log('Received event:', {
    type: event.type,
    id: event.id,
    tenantId: event.tenantid,
    timestamp: event.time,
    data: event.data,
  });
  
  // Process event...
});
```
