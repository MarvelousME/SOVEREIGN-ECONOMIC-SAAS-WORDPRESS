# UBI-CMS Shared Libraries

Shared TypeScript libraries for event-driven microservices architecture.

## Overview

This directory contains reusable libraries and schemas shared across all UBI-CMS services:

- **`contracts/`** - JSON Schema contracts (e.g. bounded **agent run** envelope for orchestrators and audits)
- **`nats-client/`** - NATS JetStream client library for event publishing/consuming
- **`events/`** - CloudEvents-compliant event schemas and type definitions

## Quick Start

### Using NATS Client Library

```typescript
import { NatsClient, createCloudEvent } from '@ubi-cms/nats-client';
import { EventTypes } from '@ubi-cms/events';

// Initialize client
const client = new NatsClient({
  servers: process.env.NATS_URL || 'nats://localhost:4222',
  name: 'my-service',
});

await client.connect();

// Publish events
const publisher = client.getPublisher();
await publisher.publish(EventTypes.LEDGER_TRANSACTION_CREATED, event);

// Consume events
const consumer = await client.createConsumer('LEDGER', 'my-consumer');
await consumer.consume(async (msg) => {
  // Process message
});
```

### Using Event Schemas

```typescript
import {
  EventTypes,
  LedgerTransactionCreated,
  TransactionCreatedData,
  createCloudEvent,
} from '@ubi-cms/events';

const eventData: TransactionCreatedData = {
  transactionId: 'txn-123',
  tenantId: 'tenant-1',
  fromAccountId: 'acc-alice',
  toAccountId: 'acc-bob',
  amount: { amount: '100.00', currency: 'UBI' },
  type: 'transfer',
  description: 'Payment',
  timestamp: new Date().toISOString(),
};

const event: LedgerTransactionCreated = createCloudEvent(
  EventTypes.LEDGER_TRANSACTION_CREATED,
  'ledger-service',
  eventData,
  { tenantId: 'tenant-1' }
);
```

## Installation in Services

Add to your service's `package.json`:

```json
{
  "dependencies": {
    "@ubi-cms/nats-client": "file:../../shared/nats-client",
    "@ubi-cms/events": "file:../../shared/events"
  }
}
```

Then run:

```bash
npm install
```

## Libraries

### 📡 NATS Client (`nats-client/`)

High-level NATS JetStream client with:

- **Publishing**: Type-safe event publishing with deduplication
- **Consuming**: Automatic retry logic and error handling
- **Connection Management**: Auto-reconnection and health checks
- **Dead Letter Queue**: Failed message routing
- **CloudEvents**: Built-in CloudEvents support

[📖 Full Documentation](./nats-client/README.md)

**Key Features:**
- ✅ TypeScript support
- ✅ Exponential backoff retry
- ✅ Structured logging (Pino)
- ✅ Batch publishing
- ✅ Consumer groups

### 📋 Event Schemas (`events/`)

CloudEvents v1.0 compliant event schemas for:

- **Ledger**: Transactions and balances
- **UBI**: Distribution and claims
- **Treasury**: Operations and interest
- **Task**: Marketplace lifecycle
- **Reward**: Calculations and distributions
- **Agent**: AI agent operations
- **Governance**: Proposals and voting

**Features:**
- ✅ Full TypeScript types
- ✅ CloudEvents v1.0 spec
- ✅ Multi-tenancy support
- ✅ Correlation/causation tracking
- ✅ 25+ event types

## Directory Structure

```
shared/
├── contracts/            # JSON Schema contracts (agent runs, etc.)
├── nats-client/          # NATS JetStream client library
│   ├── src/
│   │   ├── index.ts      # Main exports
│   │   ├── nats-client.ts # Client class
│   │   ├── publisher.ts  # Event publisher
│   │   ├── consumer.ts   # Event consumer
│   │   ├── types.ts      # Type definitions
│   │   └── utils.ts      # Utility functions
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
├── events/               # Event schemas
│   ├── schemas.ts        # CloudEvents schemas
│   ├── examples/
│   │   └── ledger-service-example.ts
│   └── README.md (coming soon)
│
└── README.md            # This file
```

## Development

### Building Libraries

```bash
# Build NATS client
cd nats-client
npm install
npm run build

# Watch mode for development
npm run dev
```

### Type Checking

```bash
# Check types
npx tsc --noEmit
```

## Usage Examples

### Example 1: Publishing a Transaction Event

```typescript
import { NatsClient, createCloudEvent } from '@ubi-cms/nats-client';
import { EventTypes } from '@ubi-cms/events';

const client = new NatsClient({ servers: 'nats://localhost:4222' });
await client.connect();

const event = createCloudEvent(
  EventTypes.LEDGER_TRANSACTION_CREATED,
  'ledger-service',
  {
    transactionId: 'txn-123',
    tenantId: 'tenant-1',
    fromAccountId: 'acc-1',
    toAccountId: 'acc-2',
    amount: { amount: '100.00', currency: 'UBI' },
    type: 'transfer',
    description: 'Payment',
    timestamp: new Date().toISOString(),
  }
);

await client.getPublisher().publish(
  EventTypes.LEDGER_TRANSACTION_CREATED,
  event,
  { msgId: 'txn-123' }
);
```

### Example 2: Consuming UBI Distribution Events

```typescript
const consumer = await client.createConsumer('UBI', 'ubi-distributor');

await consumer.consume(async (msg) => {
  const event = JSON.parse(new TextDecoder().decode(msg.data));
  
  console.log('Processing UBI distribution:', event.data.distributionId);
  
  // Business logic here
  await distributeUBI(event.data);
  
  // Message auto-acknowledged on success
});
```

### Example 3: Publishing Multiple Events

```typescript
const events = [event1, event2, event3];

await client.getPublisher().publishBatch(
  EventTypes.REWARD_DISTRIBUTED,
  events
);
```

## Event Streams

| Stream | Subject | Retention | Purpose |
|--------|---------|-----------|---------|
| LEDGER | `ledger.*` | 30 days | Financial transactions |
| UBI | `ubi.*` | 100k msgs | UBI distributions |
| TREASURY | `treasury.*` | Keep all | Treasury operations |
| TASK | `task.*` | Work queue | Task marketplace |
| REWARD | `reward.*` | 50k msgs | Rewards |
| AGENT | `agent.*` | Work queue | AI agents |
| GOVERNANCE | `governance.*` | Keep all | Governance |

## Best Practices

1. **Always use CloudEvents**: Use `createCloudEvent()` helper
2. **Set msgId**: For idempotency and deduplication
3. **Use correlation IDs**: For distributed tracing
4. **Handle errors gracefully**: Library handles retries automatically
5. **Close connections**: Always call `client.close()` on shutdown
6. **Monitor DLQ**: Watch for messages in dead letter queue
7. **Use TypeScript**: Full type safety across events

## Testing

### Unit Tests

```bash
cd nats-client
npm test
```

### Integration Tests

```bash
# Start NATS
docker-compose up -d nats

# Run tests
npm run test:integration
```

## Versioning

Libraries follow semantic versioning:

- **Major**: Breaking API changes
- **Minor**: New features, backward compatible
- **Patch**: Bug fixes

## Contributing

When adding new event types:

1. Add TypeScript interface to `events/schemas.ts`
2. Add event type constant to `EventTypes`
3. Update documentation
4. Add example usage

When updating NATS client:

1. Make changes in `nats-client/src/`
2. Update types if needed
3. Rebuild: `npm run build`
4. Update version in `package.json`
5. Update documentation

## Documentation

- [NATS Client API](./nats-client/README.md)
- [NATS Architecture](../infrastructure/nats/ARCHITECTURE.md)
- [Quick Start Guide](../infrastructure/nats/QUICKSTART.md)
- [Event Schemas](./events/schemas.ts)
- [Integration Examples](./events/examples/)

## Troubleshooting

### Import Errors

```bash
# Reinstall dependencies
cd nats-client && npm install
cd ../events && npm install
```

### Type Errors

```bash
# Rebuild libraries
cd nats-client && npm run build
```

### Connection Issues

```bash
# Check NATS is running
docker ps | grep nats

# Check connection
nats --server=nats://localhost:4222 server ping
```

## Support

- **Issues**: GitHub Issues
- **Documentation**: `/infrastructure/nats/`
- **Examples**: `/shared/events/examples/`
- **NATS Docs**: https://docs.nats.io/
- **CloudEvents**: https://cloudevents.io/

## License

MIT
