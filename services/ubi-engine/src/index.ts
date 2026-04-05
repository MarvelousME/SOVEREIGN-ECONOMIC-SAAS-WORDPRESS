import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { logger } from './utils/logger';
import { db } from './database';
import { cache } from './cache/redis';
import { natsClient } from './events/nats-client';
import { eventConsumer } from './events/event-consumer';
import routes from './api/routes';
import { errorHandler } from './api/middleware/error-handler';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(compression());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.api.rateLimitWindowMs,
  max: config.api.rateLimitMaxRequests,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Routes
app.use(routes);

// Error handling
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Received shutdown signal, closing connections...');
  
  await Promise.all([
    db.close(),
    cache.disconnect(),
    natsClient.close()
  ]);
  
  logger.info('All connections closed, exiting...');
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
async function start() {
  try {
    // Connect to dependencies
    logger.info('Connecting to dependencies...');
    await cache.connect();
    await natsClient.connect();
    
    // Check database connection
    const dbHealthy = await db.healthCheck();
    if (!dbHealthy) {
      throw new Error('Database connection failed');
    }

    // Start event consumer
    await eventConsumer.start();

    // Start HTTP server
    app.listen(config.server.port, () => {
      logger.info(`UBI Engine service started`, {
        port: config.server.port,
        environment: config.server.nodeEnv
      });
    });
  } catch (error) {
    logger.error('Failed to start service', { error });
    process.exit(1);
  }
}

start();
