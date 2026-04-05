import 'dotenv/config';
import 'express-async-errors';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { pool } from './config/database';
import { connectNats, disconnectNats, getNatsConnection } from './config/nats';
import { connectRedis, disconnectRedis } from './config/redis';
import { TaskService } from './services/task.service';
import { EventService } from './services/event.service';
import { createTaskRoutes } from './routes/task.routes';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 3005;
const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Compression
app.use(compression());

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'task-marketplace',
    timestamp: new Date().toISOString(),
  });
});

// Initialize services
let taskService: TaskService;
let eventService: EventService;

async function initializeServices() {
  try {
    // Connect to NATS
    await connectNats();
    const natsConnection = getNatsConnection();

    // Connect to Redis
    await connectRedis();

    // Initialize services
    eventService = new EventService(natsConnection);
    taskService = new TaskService(pool, eventService);

    // Subscribe to events
    await eventService.subscribeToReputationUpdates(async (userId, newReputation) => {
      logger.info('User reputation updated', { userId, newReputation });
      // TODO: Invalidate user cache, update recommendations
    });

    logger.info('Services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services', { error });
    throw error;
  }
}

// Mount routes
async function mountRoutes() {
  app.use('/api/v1/tasks', createTaskRoutes(taskService));
  logger.info('Routes mounted');
}

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Start server
async function startServer() {
  try {
    await initializeServices();
    await mountRoutes();

    app.listen(PORT, () => {
      logger.info(`Task Marketplace service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  logger.info(`${signal} received, starting graceful shutdown`);

  try {
    await disconnectNats();
    await disconnectRedis();
    await pool.end();

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error });
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server
startServer();

export { app };
