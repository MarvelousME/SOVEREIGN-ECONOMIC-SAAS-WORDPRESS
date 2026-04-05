# NATS JetStream Quick Start Guide

Get up and running with NATS event-driven architecture in 5 minutes.

## Step 1: Start NATS Server

```bash
cd docker
docker-compose up -d nats
```

Verify it's running:

```bash
docker ps | grep nats
docker logs ubi-cms-nats
```

## Step 2: Install NATS CLI (Optional)

For macOS:
```bash
brew install nats-io/nats-tools/nats
```

For Linux:
```bash
curl -sf https://binaries.nats.dev/nats-io/natscli/nats@latest | sh
```

For Windows:
```bash
choco install nats
```

## Step 3: Setup Streams and Consumers

```bash
cd infrastructure/nats
./setup.sh
```

This creates:
- 7 JetStream streams (LEDGER, UBI, TREASURY, TASK, REWARD, AGENT, GOVERNANCE)
- 13 durable consumers
- Proper retention policies and deduplication

## Step 4: Verify Setup

```bash
# List all streams
nats --server=nats://localhost:4222 stream list

# Check specific stream
nats --server=nats://localhost:4222 stream info LEDGER

# View consumers
nats --server=nats://localhost:4222 consumer list LEDGER
```

## Step 5: Install Client Library

```bash
cd shared/nats-client
npm install
npm run build
```

## Step 6: Test Publishing

Create a test file `test-publish.ts`:

```typescript
import { NatsClient, createCloudEvent } from './shared/nats-client/src';
import { EventTypes } from './shared/events/schemas';

async function test() {
  const client = new NatsClient({
    servers: 'nats://localhost:4222',
    name: 'test-publisher',
  });

  await client.connect();
  console.log('Connected to NATS');

  const publisher = client.getPublisher();

  const event = createCloudEvent(
    EventTypes.LEDGER_TRANSACTION_CREATED,
    'test-service',
    {
      transactionId: 'test-123',
      tenantId: 'test-tenant',
      fromAccountId: 'acc-1',
      toAccountId: 'acc-2',
      amount: { amount: '100.00', currency: 'UBI' },
      type: 'transfer',
      description: 'Test transaction',
      timestamp: new Date().toISOString(),
    }
  );

  await publisher.publish(EventTypes.LEDGER_TRANSACTION_CREATED, event);
  console.log('Event published!');

  await client.close();
}

test().catch(console.error);
```

Run it:

```bash
npx ts-node test-publish.ts
```

## Step 7: Test Consuming

Create a test file `test-consume.ts`:

```typescript
import { NatsClient } from './shared/nats-client/src';

async function test() {
  const client = new NatsClient({
    servers: 'nats://localhost:4222',
    name: 'test-consumer',
  });

  await client.connect();
  console.log('Connected to NATS');

  const consumer = await client.createConsumer('LEDGER', 'ledger-processor');

  console.log('Waiting for messages...');

  await consumer.consume(async (msg) => {
    const decoder = new TextDecoder();
    const data = decoder.decode(msg.data);
    const event = JSON.parse(data);
    
    console.log('Received event:', event);
  });
}

test().catch(console.error);
```

Run it:

```bash
npx ts-node test-consume.ts
```

## Monitoring

### Web Dashboard

Visit: http://localhost:8222

Available endpoints:
- `/varz` - Server variables and stats
- `/connz` - Connection information
- `/subsz` - Subscription information
- `/jsz` - JetStream information

### CLI Monitoring

```bash
# Stream stats
nats stream report

# Consumer stats
nats consumer report LEDGER

# Real-time events
nats sub "ledger.>"
```

## Common Operations

### Publish Test Message

```bash
nats pub ledger.transaction.created '{"test": "data"}'
```

### Subscribe to Events

```bash
# All ledger events
nats sub "ledger.*"

# All events
nats sub ">"
```

### View Messages

```bash
# View stream messages
nats stream view LEDGER

# Get next message from consumer
nats consumer next LEDGER ledger-processor
```

### Purge Stream

```bash
nats stream purge LEDGER --force
```

### Delete Stream

```bash
nats stream rm LEDGER --force
```

## Integration with Services

### In Your Service

1. **Add dependency:**

```json
{
  "dependencies": {
    "@ubi-cms/nats-client": "file:../../shared/nats-client",
    "@ubi-cms/events": "file:../../shared/events"
  }
}
```

2. **Use in code:**

```typescript
import { NatsClient, createCloudEvent } from '@ubi-cms/nats-client';
import { EventTypes } from '@ubi-cms/events';

// Initialize once at startup
const natsClient = new NatsClient({
  servers: process.env.NATS_URL || 'nats://localhost:4222',
  name: process.env.SERVICE_NAME || 'unknown-service',
});

await natsClient.connect();

// Use throughout your application
export { natsClient };
```

## Environment Variables

Add to `.env`:

```bash
NATS_URL=nats://localhost:4222
SERVICE_NAME=ledger-service
NATS_MAX_RECONNECT_ATTEMPTS=-1
NATS_RECONNECT_TIME_WAIT=2000
```

## Next Steps

1. Read the [full documentation](./README.md)
2. Review [event schemas](../../shared/events/schemas.ts)
3. Check [example integration](../../shared/events/examples/ledger-service-example.ts)
4. Implement in your services
5. Set up monitoring and alerting

## Troubleshooting

**Connection refused:**
```bash
# Check if NATS is running
docker ps | grep nats

# Check logs
docker logs ubi-cms-nats

# Restart NATS
docker-compose restart nats
```

**Stream not found:**
```bash
# Re-run setup
./infrastructure/nats/setup.sh
```

**Consumer not processing:**
```bash
# Check consumer status
nats consumer info LEDGER ledger-processor

# Check for pending messages
nats stream info LEDGER
```

## Support

- NATS Docs: https://docs.nats.io/
- CloudEvents: https://cloudevents.io/
- Project Issues: [GitHub Issues](https://github.com/your-repo/issues)
