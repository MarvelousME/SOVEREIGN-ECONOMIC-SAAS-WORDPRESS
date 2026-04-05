# NATS Event-Driven Architecture for UBI-CMS

Complete NATS JetStream setup for event-driven microservices communication.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         NATS JetStream                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  LEDGER  │  │   UBI    │  │ TREASURY │  │   TASK   │       │
│  │  Stream  │  │  Stream  │  │  Stream  │  │  Stream  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                     │
│  │  REWARD  │  │  AGENT   │  │GOVERNANCE│                     │
│  │  Stream  │  │  Stream  │  │  Stream  │                     │
│  └──────────┘  └──────────┘  └──────────┘                     │
└─────────────────────────────────────────────────────────────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
┌─────────────┐  ┌────────────┐  ┌──────────┐  ┌──────────┐
│   Ledger    │  │ UBI Engine │  │ Treasury │  │   Task   │
│   Service   │  │            │  │  Engine  │  │Marketplace│
└─────────────┘  └────────────┘  └──────────┘  └──────────┘
```

## Streams

### 1. LEDGER Stream
**Subject:** `ledger.*`  
**Retention:** Work queue (30 days, deduplication enabled)  
**Purpose:** Financial transaction processing

**Events:**
- `ledger.transaction.created` - New transaction created
- `ledger.transaction.reversed` - Transaction reversed
- `ledger.balance.updated` - Account balance changed

**Consumers:**
- `ledger-processor` - Main transaction processor
- `audit-logger` - Audit trail logging

### 2. UBI Stream
**Subject:** `ubi.*`  
**Retention:** Limits-based (last 100k messages)  
**Purpose:** Universal Basic Income distributions

**Events:**
- `ubi.distribution.scheduled` - Distribution scheduled
- `ubi.distribution.completed` - Distribution finished
- `ubi.claimed` - User claimed UBI

**Consumers:**
- `ubi-distributor` - Distribution processor
- `notification-sender` - Send notifications

### 3. TREASURY Stream
**Subject:** `treasury.*`  
**Retention:** Interest (keep all, immutable)  
**Purpose:** Treasury operations and compound interest

**Events:**
- `treasury.deposit` - Funds deposited
- `treasury.withdraw` - Funds withdrawn
- `treasury.compounded` - Interest compounded
- `treasury.rebalanced` - Portfolio rebalanced

**Consumers:**
- `treasury-processor` - Operations processor
- `treasury-reporter` - Reporting and analytics

### 4. TASK Stream
**Subject:** `task.*`  
**Retention:** Work queue  
**Purpose:** Task marketplace lifecycle

**Events:**
- `task.created` - New task created
- `task.claimed` - Task claimed by user
- `task.submitted` - Task submission
- `task.approved` - Task approved and rewarded
- `task.rejected` - Task rejected

**Consumers:**
- `task-processor` - Task lifecycle management

### 5. REWARD Stream
**Subject:** `reward.*`  
**Retention:** Limits-based (last 50k messages)  
**Purpose:** Reward calculations and distributions

**Events:**
- `reward.calculated` - Reward calculated
- `reward.distributed` - Reward distributed
- `reward.claimed` - Reward claimed

**Consumers:**
- `reward-calculator` - Calculate rewards
- `reward-distributor` - Distribute rewards

### 6. AGENT Stream
**Subject:** `agent.*`  
**Retention:** Work queue  
**Purpose:** AI agent deployment and execution

**Events:**
- `agent.deployed` - Agent deployed
- `agent.executed` - Agent execution completed
- `agent.revenue` - Revenue generated
- `agent.error` - Agent error occurred

**Consumers:**
- `agent-runner` - Execute agents
- `agent-monitor` - Monitor health and errors

### 7. GOVERNANCE Stream
**Subject:** `governance.*`  
**Retention:** Interest (keep all, immutable)  
**Purpose:** Governance and voting

**Events:**
- `governance.proposal.created` - New proposal
- `governance.vote.cast` - Vote cast
- `governance.proposal.executed` - Proposal executed

**Consumers:**
- `governance-processor` - Process proposals
- `governance-auditor` - Audit trail

## Setup

### Prerequisites

- NATS Server 2.10+ with JetStream enabled
- NATS CLI tools (for setup script)

### Installation

1. **Start NATS with Docker Compose:**

```bash
cd docker
docker-compose up -d nats
```

2. **Verify NATS is running:**

```bash
docker logs ubi-cms-nats
```

3. **Run setup script:**

```bash
cd infrastructure/nats
./setup.sh
```

### Manual Setup

If you prefer manual setup:

```bash
# Create LEDGER stream
nats stream add LEDGER \
  --subjects="ledger.*" \
  --retention=workqueue \
  --storage=file \
  --max-age=30d \
  --dupe-window=120s \
  --deny-delete

# Create consumer
nats consumer add LEDGER ledger-processor \
  --deliver=all \
  --ack=explicit \
  --wait=30s \
  --max-deliver=3
```

## Configuration

### NATS Server Config
Location: `docker/configs/nats/nats-server.conf`

Key settings:
- JetStream enabled
- 1GB memory limit
- 10GB file storage limit
- WebSocket support on port 8080

### Stream Definitions
Location: `infrastructure/nats/streams.json`

Complete JSON definitions for all streams and consumers.

## Client Library

### Installation

```bash
cd shared/nats-client
npm install
npm run build
```

### Usage in Services

```typescript
import { NatsClient, createCloudEvent } from '@ubi-cms/nats-client';
import { EventTypes } from '@ubi-cms/events';

const client = new NatsClient({
  servers: process.env.NATS_URL || 'nats://localhost:4222',
  name: 'my-service',
});

await client.connect();

// Publish
const publisher = client.getPublisher();
await publisher.publish(
  EventTypes.LEDGER_TRANSACTION_CREATED,
  event
);

// Consume
const consumer = await client.createConsumer('LEDGER', 'my-consumer');
await consumer.consume(async (msg) => {
  // Process message
});
```

## Monitoring

### NATS Monitoring Endpoint

Access monitoring at: http://localhost:8222

Endpoints:
- `/varz` - Server stats
- `/connz` - Connection info
- `/routez` - Route info
- `/subsz` - Subscription info
- `/jsz` - JetStream info

### View Stream Info

```bash
# List all streams
nats stream list

# Stream details
nats stream info LEDGER

# Consumer details
nats consumer info LEDGER ledger-processor

# View messages
nats stream view LEDGER
```

### Monitoring Consumers

```bash
# Consumer pending messages
nats consumer next LEDGER ledger-processor --count=1

# Consumer stats
nats consumer report LEDGER
```

## Event Schema

All events use CloudEvents v1.0 specification:

```json
{
  "specversion": "1.0",
  "type": "ledger.transaction.created",
  "source": "ledger-service",
  "id": "uuid-here",
  "time": "2026-03-26T05:00:00.000Z",
  "datacontenttype": "application/json",
  "tenantid": "tenant-1",
  "correlationid": "correlation-uuid",
  "causationid": "causing-event-uuid",
  "data": {
    // Event-specific payload
  },
  "metadata": {
    // Additional metadata
  }
}
```

## Dead Letter Queue

Failed messages (after max retries) are sent to:

```
dlq.<stream-name>.<original-subject>
```

Example: `dlq.ledger.ledger.transaction.created`

Monitor DLQ:

```bash
# Subscribe to all DLQ messages
nats sub "dlq.>"

# View specific DLQ
nats sub "dlq.ledger.>"
```

## Best Practices

1. **Idempotency**: Always set `msgId` for deduplication
2. **Correlation IDs**: Use for distributed tracing
3. **Error Handling**: Let library handle retries
4. **Graceful Shutdown**: Always close connections properly
5. **Monitor DLQ**: Set up alerts for failed messages
6. **Stream Limits**: Configure appropriate retention policies
7. **Consumer Groups**: Use durable consumers for reliability

## Troubleshooting

### Connection Issues

```bash
# Check NATS server
docker logs ubi-cms-nats

# Test connection
nats --server=nats://localhost:4222 server ping
```

### Stream Issues

```bash
# Check stream health
nats stream info LEDGER

# Purge stream (careful!)
nats stream purge LEDGER

# Delete and recreate
nats stream rm LEDGER
./setup.sh
```

### Consumer Issues

```bash
# Check consumer lag
nats consumer info LEDGER ledger-processor

# Reset consumer
nats consumer rm LEDGER ledger-processor
./setup.sh
```

## Performance Tuning

### High Throughput

```typescript
// Batch publishing
await publisher.publishBatch(subject, events);

// Increase batch size
const consumer = await client.createConsumer('STREAM', 'consumer', {
  batchSize: 100
});
```

### Low Latency

```typescript
// Reduce batch size
const consumer = await client.createConsumer('STREAM', 'consumer', {
  batchSize: 1
});
```

## Security

Production deployments should:

1. Enable authentication
2. Use TLS encryption
3. Configure account limits
4. Implement RBAC
5. Monitor access logs

## Related Documentation

- [NATS JetStream Documentation](https://docs.nats.io/jetstream)
- [CloudEvents Specification](https://cloudevents.io/)
- [Client Library README](../../shared/nats-client/README.md)
- [Event Schemas](../../shared/events/schemas.ts)
