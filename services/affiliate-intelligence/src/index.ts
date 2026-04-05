import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import 'express-async-errors';
import { config } from './config';
import { natsClient } from './utils/nats-client';
import { redis } from './utils/redis';
import { db } from './utils/database';
import logger from './utils/logger';
import affiliateRoutes from './routes';
import { authMiddleware } from './middleware/auth.middleware';
import { errorHandler } from './middleware/errorHandler';

class AffiliateIntelligenceApp {
  public app: Application;

  constructor() {
    this.app = express();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(compression());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(authMiddleware);
  }

  private initializeRoutes(): void {
    this.app.get('/health', async (_req, res) => {
      const dbHealth = await db.healthCheck();
      const redisHealth = await redis.healthCheck();
      const natsHealth = await natsClient.healthCheck();

      const status = dbHealth && redisHealth && natsHealth ? 'healthy' : 'unhealthy';

      res.status(status === 'healthy' ? 200 : 503).json({
        status,
        service: 'affiliate-intelligence',
        checks: {
          database: dbHealth ? 'up' : 'down',
          redis: redisHealth ? 'up' : 'down',
          nats: natsHealth ? 'up' : 'down',
        },
        timestamp: new Date().toISOString(),
      });
    });

    this.app.use('/api/v1/affiliate', affiliateRoutes);
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      await natsClient.connect();
      logger.info('Connected to NATS');

      await redis.connect();
      logger.info('Connected to Redis');

      const dbHealthy = await db.healthCheck();
      if (!dbHealthy) {
        throw new Error('Database connection failed');
      }
      logger.info('Database connected');

      this.app.listen(config.server.port, () => {
        logger.info(`Affiliate Intelligence service running on port ${config.server.port}`);
      });
    } catch (error) {
      logger.error('Failed to start Affiliate Intelligence service', { error });
      process.exit(1);
    }
  }

  public async shutdown(): Promise<void> {
    logger.info('Shutting down Affiliate Intelligence service...');

    try {
      await natsClient.close();
      await redis.close();
      await db.close();
      logger.info('Affiliate Intelligence service shut down successfully');
    } catch (error) {
      logger.error('Error during shutdown', { error });
    }
  }
}

const app = new AffiliateIntelligenceApp();

process.on('SIGTERM', async () => {
  await app.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await app.shutdown();
  process.exit(0);
});

app.start();

export default app;
