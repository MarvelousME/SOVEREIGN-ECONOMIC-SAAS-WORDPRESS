# NATS Event-Driven Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              UBI-CMS Services Layer                          │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────────────────┤
│   Ledger    │ UBI Engine  │  Treasury   │    Task     │  Rewards  │ Agent   │
│   Service   │             │   Engine    │ Marketplace │  Engine   │ Runner  │
└──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────┴─────┬─────┴────┬────┘
       │             │             │             │            │          │
       │ Publish     │ Publish     │ Publish     │ Publish    │ Publish  │
       │ Subscribe   │ Subscribe   │ Subscribe   │ Subscribe  │Subscribe │
       │             │             │             │            │          │
       └─────────────┴─────────────┴─────────────┴────────────┴──────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NATS JetStream Core                                  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      Stream: LEDGER (30 days retention)               │  │
│  │  Subject: ledger.*                                                    │  │
│  │  Retention: Work Queue + Deduplication                                │  │
│  │  ┌──────────────────────┐  ┌──────────────────────┐                  │  │
│  │  │ ledger-processor     │  │ audit-logger         │                  │  │
│  │  │ (Ack: explicit, 30s) │  │ (Ack: explicit, 60s) │                  │  │
│  │  └──────────────────────┘  └──────────────────────┘                  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      Stream: UBI (100k messages)                      │  │
│  │  Subject: ubi.*                                                       │  │
│  │  Retention: Limits (100k messages)                                    │  │
│  │  ┌──────────────────────┐  ┌──────────────────────┐                  │  │
│  │  │ ubi-distributor      │  │ notification-sender  │                  │  │
│  │  │ (Ack: explicit, 60s) │  │ (Ack: explicit, 30s) │                  │  │
│  │  └──────────────────────┘  └──────────────────────┘                  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    Stream: TREASURY (Immutable)                       │  │
│  │  Subject: treasury.*                                                  │  │
│  │  Retention: Interest (Keep All) + Deny Delete/Purge                  │  │
│  │  ┌──────────────────────┐  ┌──────────────────────┐                  │  │
│  │  │ treasury-processor   │  │ treasury-reporter    │                  │  │
│  │  │ (Ack: explicit, 60s) │  │ (Ack: explicit, 120s)│                  │  │
│  │  └──────────────────────┘  └──────────────────────┘                  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      Stream: TASK (Work Queue)                        │  │
│  │  Subject: task.*                                                      │  │
│  │  Retention: Work Queue                                                │  │
│  │  ┌──────────────────────┐                                            │  │
│  │  │ task-processor       │                                            │  │
│  │  │ (Ack: explicit, 30s) │                                            │  │
│  │  └──────────────────────┘                                            │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    Stream: REWARD (50k messages)                      │  │
│  │  Subject: reward.*                                                    │  │
│  │  Retention: Limits (50k messages)                                     │  │
│  │  ┌──────────────────────┐  ┌──────────────────────┐                  │  │
│  │  │ reward-calculator    │  │ reward-distributor   │                  │  │
│  │  │ (Ack: explicit, 60s) │  │ (Filter: distributed)│                  │  │
│  │  └──────────────────────┘  └──────────────────────┘                  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      Stream: AGENT (Work Queue)                       │  │
│  │  Subject: agent.*                                                     │  │
│  │  Retention: Work Queue                                                │  │
│  │  ┌──────────────────────┐  ┌──────────────────────┐                  │  │
│  │  │ agent-runner         │  │ agent-monitor        │                  │  │
│  │  │ (Ack: explicit, 120s)│  │ (Ack: explicit, 30s) │                  │  │
│  │  └──────────────────────┘  └──────────────────────┘                  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                  Stream: GOVERNANCE (Immutable)                       │  │
│  │  Subject: governance.*                                                │  │
│  │  Retention: Interest (Keep All) + Deny Delete/Purge                  │  │
│  │  ┌──────────────────────┐  ┌──────────────────────┐                  │  │
│  │  │ governance-processor │  │ governance-auditor   │                  │  │
│  │  │ (Ack: explicit, 60s) │  │ (Ack: explicit, 120s)│                  │  │
│  │  └──────────────────────┘  └──────────────────────┘                  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Storage: File-based (10GB limit)                                           │
│  Memory: 1GB limit                                                           │
│  Ports: 4222 (client), 8222 (monitoring), 8080 (websocket)                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   Dead Letter Queue (DLQ)     │
                    │   Subject: dlq.<stream>.*     │
                    │   For failed messages         │
                    └───────────────────────────────┘
```

## Event Flow Example: Transaction Creation

```
1. Ledger Service
   │
   ├─► Create Transaction
   │   └─► Publish Event: ledger.transaction.created
   │
   ▼
2. NATS JetStream (LEDGER Stream)
   │
   ├─► Store in stream (deduplication check)
   │
   ├─► Route to consumers:
   │   ├─► ledger-processor (update balances)
   │   └─► audit-logger (write audit log)
   │
   ▼
3. ledger-processor Consumer
   │
   ├─► Receive message
   ├─► Process transaction
   ├─► Update account balances
   └─► Publish Event: ledger.balance.updated
   │
   ▼
4. NATS JetStream (LEDGER Stream)
   │
   └─► Store balance update event
```

## CloudEvents Message Structure

```json
{
  "specversion": "1.0",
  "type": "ledger.transaction.created",
  "source": "ledger-service",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "time": "2026-03-26T05:00:00.000Z",
  "datacontenttype": "application/json",
  "tenantid": "tenant-123",
  "correlationid": "corr-456",
  "causationid": "cause-789",
  "data": {
    "transactionId": "txn-123",
    "tenantId": "tenant-123",
    "fromAccountId": "acc-alice",
    "toAccountId": "acc-bob",
    "amount": {
      "amount": "100.00",
      "currency": "UBI"
    },
    "type": "transfer",
    "description": "Payment for services",
    "timestamp": "2026-03-26T05:00:00.000Z"
  }
}
```

## Retry and Error Handling Flow

```
Message Received
   │
   ▼
Process Message (Attempt 1)
   │
   ├─► Success → ACK → Done ✓
   │
   └─► Failure
       │
       ├─► NAK with delay (1000ms)
       ├─► Wait 1000ms
       │
       ▼
Process Message (Attempt 2)
   │
   ├─► Success → ACK → Done ✓
   │
   └─► Failure
       │
       ├─► NAK with delay (2000ms)
       ├─► Wait 2000ms
       │
       ▼
Process Message (Attempt 3)
   │
   ├─► Success → ACK → Done ✓
   │
   └─► Failure (Max retries exceeded)
       │
       ├─► TERM (terminate message)
       └─► Send to DLQ → dlq.ledger.ledger.transaction.created
```

## Multi-Tenant Architecture

```
Tenant A                      Tenant B                      Tenant C
   │                             │                             │
   ├─► Event (tenantid=A)        ├─► Event (tenantid=B)        ├─► Event (tenantid=C)
   │                             │                             │
   └───────────────┬─────────────┴─────────────┬───────────────┘
                   │                           │
                   ▼                           ▼
            ┌─────────────────────────────────────┐
            │     NATS Stream (All Tenants)       │
            └─────────────────────────────────────┘
                   │                           │
                   ▼                           ▼
            Consumer Filters by tenantid
                   │
                   ├─► Process Tenant A events
                   ├─► Process Tenant B events
                   └─► Process Tenant C events
```

## Network Topology

```
┌────────────────────────────────────────────────────────────────┐
│                        Docker Network                           │
│                      (ubi-cms-network)                          │
│                                                                 │
│  ┌──────────────┐         ┌──────────────┐                    │
│  │ Service A    │────────▶│              │                    │
│  └──────────────┘         │              │                    │
│                           │              │                    │
│  ┌──────────────┐         │              │                    │
│  │ Service B    │────────▶│  NATS        │◀────┐              │
│  └──────────────┘         │  JetStream   │     │              │
│                           │              │     │              │
│  ┌──────────────┐         │  Port 4222   │     │              │
│  │ Service C    │────────▶│              │     │              │
│  └──────────────┘         │              │     │              │
│                           └──────┬───────┘     │              │
│                                  │             │              │
└──────────────────────────────────┼─────────────┼──────────────┘
                                   │             │
                            Host:8222     Host:8080
                          (Monitoring)  (WebSocket)
                                   │             │
                                   ▼             ▼
                           ┌──────────┐  ┌──────────┐
                           │ Browser  │  │ Browser  │
                           │ /varz    │  │ WS Client│
                           └──────────┘  └──────────┘
```

## Component Responsibilities

### NATS JetStream (Core)
- **Message Storage**: Persist events to disk
- **Deduplication**: Prevent duplicate message processing
- **Routing**: Distribute messages to consumers
- **Replay**: Allow historical message replay
- **Monitoring**: Provide metrics and health checks

### Streams
- **LEDGER**: Financial transactions and balances
- **UBI**: Universal Basic Income distributions
- **TREASURY**: Treasury operations and interest
- **TASK**: Task marketplace lifecycle
- **REWARD**: Reward calculations and claims
- **AGENT**: AI agent deployments and executions
- **GOVERNANCE**: Proposals and voting

### Consumers
- **Processors**: Business logic execution
- **Loggers**: Audit trail and logging
- **Notifiers**: User notifications
- **Reporters**: Analytics and reporting
- **Monitors**: System health monitoring

### Client Library
- **NatsClient**: Connection management
- **Publisher**: Event publishing with deduplication
- **Consumer**: Event consumption with retry logic
- **Utils**: CloudEvent helpers and utilities

## Scaling Strategies

### Horizontal Scaling (Multiple Instances)
```
Service Instance 1 ──┐
Service Instance 2 ──┼──▶ NATS Stream ──┬──▶ Consumer Group A (Instance 1)
Service Instance 3 ──┘                   ├──▶ Consumer Group A (Instance 2)
                                         └──▶ Consumer Group A (Instance 3)
```

### Vertical Scaling (Resource Limits)
```
NATS Configuration:
- Max Memory: 1GB → 4GB
- Max Storage: 10GB → 100GB
- Max Connections: 1000 → 10000
```

## Monitoring Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│ NATS JetStream Dashboard (http://localhost:8222)            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Server Info:                                                │
│  - Uptime: 5d 12h 30m                                        │
│  - Connections: 45                                           │
│  - Subscriptions: 128                                        │
│                                                              │
│  Streams:                Messages    Consumers    Bytes      │
│  ├─ LEDGER             1,234,567          2       123 MB    │
│  ├─ UBI                   45,678          2        45 MB    │
│  ├─ TREASURY              12,345          2        12 MB    │
│  ├─ TASK                  98,765          1        98 MB    │
│  ├─ REWARD                23,456          2        23 MB    │
│  ├─ AGENT                  5,678          2         5 MB    │
│  └─ GOVERNANCE             1,234          2         1 MB    │
│                                                              │
│  Consumer Lag:                                               │
│  ├─ ledger-processor        0 (healthy)                     │
│  ├─ audit-logger           12 (warning)                     │
│  └─ ubi-distributor         0 (healthy)                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```
