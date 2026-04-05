import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import 'express-async-errors';
import { config } from './config';
import { initDatabase } from './config/database';
import routes from './routes';
import { EventService } from './services/event.service';
import winston from 'winston';

const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    user: req.headers['x-user-id'],
  });
  next();
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'treasury-engine', timestamp: new Date() });
});

// API routes
app.use('/api/v1/treasury', routes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: config.nodeEnv === 'development' ? err.message : undefined,
  });
});

// Start server
const start = async () => {
  try {
    // Initialize database
    logger.info('Initializing database...');
    await initDatabase();

    // Connect to NATS
    logger.info('Connecting to NATS...');
    const eventService = new EventService();
    await eventService.connect();

    // Set up event listeners
    await eventService.subscribe('ledger.transaction.created', async (data) => {
      logger.info('Ledger transaction created:', data);
    });

    // Start HTTP server
    app.listen(config.port, () => {
      logger.info(`Treasury Engine service running on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Database: ${config.database.name}@${config.database.host}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      await eventService.disconnect();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully...');
      await eventService.disconnect();
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();
