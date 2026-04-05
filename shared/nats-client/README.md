# UBI-CMS NATS Client Library

Shared TypeScript/Node.js library for publishing and consuming events via NATS JetStream.

## Features

- ✅ **CloudEvents Support** - Standardized event envelope format
- ✅ **Automatic Retries** - Exponential backoff with jitter
- ✅ **Dead Letter Queue** - Failed messages routed to DLQ
- ✅ **Type Safety** - Full TypeScript support
- ✅ **Connection Management** - Auto-reconnection handling
- ✅ **Structured Logging** - Pino logger integration
- ✅ **Batch Publishing** - Publish multiple events efficiently

## Installation

```bash
cd shared/nats-client
npm install
npm run build
```

## Usage

### Publisher Example

```typescript
import { NatsClient, createCloudEvent } from '@ubi-cms/nats-client';
import { EventTypes } from '../events/schemas';

// Initialize client
const client = new NatsClient({
  servers: 'nats://localhost:4222',
  name: 'ledger-service',
});

await client.connect();

// Get publisher
const publisher = client.getPublisher();

// Create and publish an event
const event = createCloudEvent(
  EventTypes.LEDGER_TRANSACTION_CREATED,
  'ledger-service',
  {
    transactionId: '123',
    tenantId: 'tenant-1',
    fromAccountId: 'acc-1',
    toAccountId: 'acc-2',
    amount: { amount: '100.00', currency: 'UBI' },
    type: 'transfer',
    description: 'Payment for services',
    timestamp: new Date().toISOString(),
  },
  {
    tenantId: 'tenant-1',
    correlationId: 'corr-123',
  }
);

await publisher.publish(
  EventTypes.LEDGER_TRANSACTION_CREATED,
  event,
  { msgId: '123' } // Deduplication ID
);

// Batch publish
await publisher.publishBatch(
  EventTypes.UBI_DISTRIBUTION_COMPLETED,
  [event1, event2, event3]
);

await client.close();
```

### Consumer Example

```typescript
import { NatsClient } from '@ubi-cms/nats-client';

// Initialize client
const client = new NatsClient({
  servers: 'nats://localhost:4222',
  name: 'ledger-processor',
});

await client.connect();

// Create consumer
const consumer = await client.createConsumer('LEDGER', 'ledger-processor', {
  batchSize: 10,
});

// Start consuming
await consumer.consume(async (msg) => {
  const decoder = new TextDecoder();
  const data = decoder.decode(msg.data);
  const event = JSON.parse(data);

  console.log('Received event:', event);

  // Process the event
  await processTransaction(event);

  // Message is auto-acknowledged on success
  // On error, it will be retried with exponential backoff
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await consumer.stop();
  await client.close();
});
```

## Configuration

### Client Options

```typescript
interface NatsClientOptions {
  servers: string | string[];           // NATS server URL(s)
  name?: string;                        // Client name
  maxReconnectAttempts?: number;        // -1 for infinite
  reconnectTimeWait?: number;           // ms between reconnects
  pingInterval?: number;                // ms between pings
  timeout?: number;                     // Connection timeout ms
}
```

### Publish Options

```typescript
interface PublishOptions {
  msgId?: string;                       // Message ID for deduplication
  headers?: Record<string, string>;     // Custom headers
  timeout?: number;                     // Publish timeout ms
}
```

### Consumer Options

```typescript
interface ConsumeOptions {
  stream: string;                       // Stream name
  consumer: string;                     // Consumer name
  batchSize?: number;                   // Messages per batch (default: 10)
  maxAckPending?: number;               // Max unacknowledged messages
  idleHeartbeat?: number;               // Heartbeat interval ms
  expires?: number;                     // Consumer expiration ms
}
```

## Retry Policy

Default retry policy (configured in `types.ts`):

```typescript
{
  maxAttempts: 3,
  backoffMs: 1000,
  maxBackoffMs: 30000,
  backoffMultiplier: 2,
}
```

Failed messages after max retries are:
1. Terminated (removed from stream)
2. Sent to dead letter queue: `dlq.<stream>.<subject>`

## Dead Letter Queue

Messages that fail after all retries are sent to:

```
dlq.<stream-name>.<original-subject>
```

Example: `dlq.ledger.ledger.transaction.created`

DLQ message format:

```json
{
  "original_subject": "ledger.transaction.created",
  "original_data": { ... },
  "error": "Error message",
  "error_stack": "Stack trace",
  "stream": "LEDGER",
  "consumer": "ledger-processor",
  "delivery_count": 4,
  "timestamp": "2026-03-26T05:00:00.000Z"
}
```

## Event Schema

All events follow CloudEvents v1.0 specification:

```typescript
interface CloudEvent<T> {
  specversion: '1.0';
  type: string;                    // Event type
  source: string;                  // Service that created event
  id: string;                      // Unique event ID (UUID)
  time: string;                    // ISO 8601 timestamp
  datacontenttype: string;         // 'application/json'
  tenantid: string;                // Tenant ID
  correlationid?: string;          // Correlation ID for tracing
  causationid?: string;            // ID of event that caused this
  data: T;                         // Event payload
  metadata?: Record<string, unknown>;
}
```

## Logging

The library uses `pino` for structured logging. Logs include:

- Connection events
- Publish confirmations
- Consumer processing
- Error details
- Retry attempts

## Best Practices

1. **Always use CloudEvents** - Use `createCloudEvent()` helper
2. **Set msgId for idempotency** - Prevents duplicate processing
3. **Use correlation IDs** - For distributed tracing
4. **Handle graceful shutdown** - Always call `client.close()`
5. **Monitor DLQ** - Set up alerts for DLQ messages
6. **Use batch publishing** - For multiple events

## Testing

```bash
# Start NATS with JetStream
docker-compose up nats

# Setup streams
./infrastructure/nats/setup.sh

# Run tests
npm test
```

## License

MIT
