import { NativeConnection, Worker } from '@temporalio/worker';
import * as activities from './activities';
import { config } from './config';
import pino from 'pino';

const logger = pino({ level: config.logging.level });

async function run() {
  const connection = await NativeConnection.connect({
    address: config.temporal.address,
  });

  const worker = await Worker.create({
    connection,
    namespace: config.temporal.namespace,
    taskQueue: config.temporal.taskQueue,
    workflowsPath: require.resolve('./workflows'),
    activities: {
      // UBI activities
      ...require('./activities/ubi.activities'),
      // Treasury activities
      ...require('./activities/treasury.activities'),
      // Payout activities
      ...require('./activities/payout.activities'),
      // Task activities
      ...require('./activities/task.activities'),
      // Agent activities
      ...require('./activities/agent.activities'),
      // Reputation activities
      ...require('./activities/reputation.activities'),
      // Governance activities
      ...require('./activities/governance.activities'),
      // Referral activities
      ...require('./activities/referral.activities'),
    },
  });

  logger.info({
    taskQueue: config.temporal.taskQueue,
    namespace: config.temporal.namespace,
  }, 'Temporal worker starting');

  await worker.run();
}

run().catch((err) => {
  logger.error(err, 'Worker failed');
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});
