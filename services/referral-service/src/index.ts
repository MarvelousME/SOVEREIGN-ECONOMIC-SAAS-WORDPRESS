import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import 'express-async-errors';
import { config } from './config';
import { redis } from './config/redis';
import logger from './utils/logger';
import referralRoutes from './routes';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import EventListener from './services/eventListener';

class ReferralServiceApp {
  public app: Application;
  private eventListener: EventListener;

  constructor() {
    this.app = express();
    this.eventListener = new EventListener();
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
    this.app.use(cookieParser());
    this.app.use(authMiddleware);
  }

  private initializeRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', service: 'referral-service' });
    });

    // API routes
    this.app.use('/api/v1/referrals', referralRoutes);
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Connect to Redis
      await redis.connect();
      logger.info('Connected to Redis');

      // Start event listener
      await this.eventListener.start();
      logger.info('Event listener started');

      // Start server
      this.app.listen(config.port, () => {
        logger.info(`Referral service running on port ${config.port}`);
      });
    } catch (error) {
      logger.error('Failed to start referral service', { error });
      process.exit(1);
    }
  }

  public async shutdown(): Promise<void> {
    logger.info('Shutting down referral service...');
    
    try {
      await this.eventListener.stop();
      await redis.close();
      logger.info('Referral service shut down successfully');
    } catch (error) {
      logger.error('Error during shutdown', { error });
    }
  }
}

// Create and start the app
const app = new ReferralServiceApp();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  await app.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await app.shutdown();
  process.exit(0);
});

// Start the service
app.start();

export default app;
