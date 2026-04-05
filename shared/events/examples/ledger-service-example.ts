/**
 * Example: Ledger Service Integration with NATS
 * Demonstrates how to publish and consume ledger events
 */

import { NatsClient, createCloudEvent } from '../../nats-client/src';
import {
  EventTypes,
  TransactionCreatedData,
  LedgerTransactionCreated,
} from '../schemas';

/**
 * Publisher Example - Ledger Service
 */
export class LedgerEventPublisher {
  constructor(private natsClient: NatsClient) {}

  async publishTransactionCreated(
    transactionData: TransactionCreatedData
  ): Promise<void> {
    const publisher = this.natsClient.getPublisher();

    const event: LedgerTransactionCreated = createCloudEvent(
      EventTypes.LEDGER_TRANSACTION_CREATED,
      'ledger-service',
      transactionData,
      {
        tenantId: transactionData.tenantId,
        msgId: transactionData.transactionId, // Use transaction ID for deduplication
      }
    );

    await publisher.publish(
      EventTypes.LEDGER_TRANSACTION_CREATED,
      event,
      { msgId: transactionData.transactionId }
    );

    console.log('Transaction event published:', transactionData.transactionId);
  }

  async publishBalanceUpdated(
    accountId: string,
    tenantId: string,
    previousBalance: string,
    newBalance: string,
    change: string,
    transactionId: string
  ): Promise<void> {
    const publisher = this.natsClient.getPublisher();

    const event = createCloudEvent(
      EventTypes.LEDGER_BALANCE_UPDATED,
      'ledger-service',
      {
        accountId,
        tenantId,
        previousBalance: { amount: previousBalance, currency: 'UBI' },
        newBalance: { amount: newBalance, currency: 'UBI' },
        change: { amount: change, currency: 'UBI' },
        transactionId,
        timestamp: new Date().toISOString(),
      },
      {
        tenantId,
        causationId: transactionId, // Balance update caused by transaction
      }
    );

    await publisher.publish(EventTypes.LEDGER_BALANCE_UPDATED, event);

    console.log('Balance updated event published:', accountId);
  }
}

/**
 * Consumer Example - Audit Logger
 */
export class LedgerAuditConsumer {
  constructor(private natsClient: NatsClient) {}

  async start(): Promise<void> {
    const consumer = await this.natsClient.createConsumer(
      'LEDGER',
      'audit-logger',
      { batchSize: 20 }
    );

    console.log('Starting ledger audit consumer...');

    await consumer.consume(async (msg) => {
      const decoder = new TextDecoder();
      const data = decoder.decode(msg.data);
      const event: LedgerTransactionCreated = JSON.parse(data);

      console.log('Audit log entry:', {
        eventType: event.type,
        eventId: event.id,
        tenantId: event.tenantid,
        timestamp: event.time,
        subject: msg.subject,
      });

      // Write to audit log database
      await this.writeAuditLog(event);
    });
  }

  private async writeAuditLog(event: LedgerTransactionCreated): Promise<void> {
    // Implementation: Write to audit database
    console.log('Writing audit log:', event.id);
  }
}

/**
 * Main Application Example
 */
async function main() {
  // Initialize NATS client
  const client = new NatsClient({
    servers: process.env.NATS_URL || 'nats://localhost:4222',
    name: 'ledger-service',
    maxReconnectAttempts: -1,
    reconnectTimeWait: 2000,
  });

  try {
    // Connect to NATS
    await client.connect();
    console.log('Connected to NATS');

    // Publisher example
    const publisher = new LedgerEventPublisher(client);

    await publisher.publishTransactionCreated({
      transactionId: 'txn-123',
      tenantId: 'tenant-1',
      fromAccountId: 'acc-alice',
      toAccountId: 'acc-bob',
      amount: { amount: '100.00', currency: 'UBI' },
      type: 'transfer',
      description: 'Payment for task completion',
      timestamp: new Date().toISOString(),
    });

    // Consumer example
    const consumer = new LedgerAuditConsumer(client);
    await consumer.start();

    // Keep running
    console.log('Service running. Press Ctrl+C to exit.');

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('Shutting down...');
      await client.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('Shutting down...');
      await client.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('Error:', error);
    await client.close();
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
