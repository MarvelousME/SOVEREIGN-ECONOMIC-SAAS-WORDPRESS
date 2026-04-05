import { createApp } from './server';
import { config } from './config';
import { logger } from './utils/logger';
import { db } from './utils/database';
import { eventsService } from './services/events.service';

const PORT = config.server.port;

async function start() {
  try {
    logger.info('Starting ledger service...', {
      env: config.server.env,
      version: config.server.version
    });

    // Connect to NATS (non-blocking - service can work without events)
    try {
      await eventsService.connect();
      logger.info('Connected to NATS');
    } catch (error) {
      logger.warn('Failed to connect to NATS, events will be skipped', { error });
    }

    // Verify database connection
    const dbHealthy = await db.healthCheck();
    if (!dbHealthy) {
      throw new Error('Database health check failed');
    }
    logger.info('Database connection verified');

    // Create and start server
    const app = createApp();
    const server = app.listen(PORT, () => {
      logger.info(`Ledger service listening on port ${PORT}`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await eventsService.close();
          logger.info('NATS connection closed');
        } catch (error) {
          logger.error('Error closing NATS connection', { error });
        }

        try {
          await db.close();
          logger.info('Database connection closed');
        } catch (error) {
          logger.error('Error closing database connection', { error });
        }

        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start ledger service', { error });
    process.exit(1);
  }
}

start();
