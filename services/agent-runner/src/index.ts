import 'express-async-errors';
import config from './config';
import logger from './utils/logger';
import database from './utils/database';
import executionQueue from './queue/ExecutionQueue';
import memoryManager from './memory/MemoryManager';

async function start(): Promise<void> {
  try {
    logger.info('Starting Agent Runner', {
      env: config.env,
      port: config.port,
    });

    // Check database connection
    const dbHealthy = await database.healthCheck();
    if (!dbHealthy) {
      throw new Error('Database health check failed');
    }
    logger.info('Database connected');

    // Connect to execution queue
    await executionQueue.connect();
    logger.info('Execution queue connected');

    logger.info('Agent Runner started successfully');
  } catch (error: any) {
    logger.error('Failed to start Agent Runner', { error: error.message });
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(): Promise<void> {
  logger.info('Shutting down gracefully');

  try {
    await executionQueue.close();
    await database.close();
    await memoryManager.close();
    
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error: any) {
    logger.error('Error during shutdown', { error: error.message });
    process.exit(1);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Start the service
start();
