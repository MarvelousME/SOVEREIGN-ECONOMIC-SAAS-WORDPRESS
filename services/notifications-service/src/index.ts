import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import 'express-async-errors';

import { config } from './config';
import { logger } from './utils/logger';
import { db } from './utils/database';
import { redis } from './utils/redis';
import { eventsService } from './services/events.service';
import notificationsRoutes from './routes/notifications.routes';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip
  });
  next();
});

// Health check
app.get('/health', async (req, res) => {
  const dbHealthy = await db.healthCheck();
  const redisHealthy = await redis.healthCheck();
  const natsHealthy = eventsService.isConnected();

  const healthy = dbHealthy && redisHealthy && natsHealthy;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    service: config.server.name,
    version: config.server.version,
    checks: {
      database: dbHealthy,
      redis: redisHealthy,
      nats: natsHealthy
    }
  });
});

// Routes
app.use('/api/v1/notifications', notificationsRoutes);

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully`);

  await eventsService.close();
  await redis.close();
  await db.close();

  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start server
async function start() {
  try {
    // Initialize connections
    await redis.connect();
    await eventsService.connect();

    app.listen(config.server.port, () => {
      logger.info(`Notifications service started`, {
        port: config.server.port,
        env: config.server.env
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

start();
