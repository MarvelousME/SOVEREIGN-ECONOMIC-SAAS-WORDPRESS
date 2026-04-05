import 'express-async-errors';
import express, { Express, Router } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import config from './config';
import { logger } from './utils/logger';
import { database } from './models/database';
import { knowledgeController } from './controllers/knowledge.controller';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';

// File upload configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

class KnowledgeServiceApp {
  private app: Express;
  private router: Router;

  constructor() {
    this.app = express();
    this.router = Router();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandlers();
  }

  private setupMiddleware(): void {
    // Security
    this.app.use(helmet());
    this.app.use(cors());

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
      message: 'Too many requests from this IP',
    });
    this.app.use('/api/', limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Compression
    this.app.use(compression());

    // Request logging
    this.app.use(requestLogger);
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', knowledgeController.health.bind(knowledgeController));

    // API routes
    const apiRouter = Router();

    // Collections
    apiRouter.post(
      '/collections',
      knowledgeController.createCollection.bind(knowledgeController)
    );
    apiRouter.get(
      '/collections',
      knowledgeController.getCollections.bind(knowledgeController)
    );
    apiRouter.delete(
      '/collections/:id',
      knowledgeController.deleteCollection.bind(knowledgeController)
    );

    // Documents
    apiRouter.post(
      '/ingest',
      upload.single('file'),
      knowledgeController.ingestDocument.bind(knowledgeController)
    );
    apiRouter.delete(
      '/documents/:id',
      knowledgeController.deleteDocument.bind(knowledgeController)
    );

    // Search & Query
    apiRouter.post('/search', knowledgeController.search.bind(knowledgeController));
    apiRouter.post('/query', knowledgeController.ragQuery.bind(knowledgeController));

    this.app.use('/api/v1/knowledge', apiRouter);
  }

  private setupErrorHandlers(): void {
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  async start(): Promise<void> {
    try {
      // Initialize database
      await database.initialize();
      logger.info('Database initialized');

      // Start server
      this.app.listen(config.port, () => {
        logger.info(`Knowledge service started on port ${config.port}`);
        logger.info(`Environment: ${config.env}`);
        logger.info(`Qdrant URL: ${config.qdrant.url}`);
      });
    } catch (error) {
      logger.error('Failed to start knowledge service:', error);
      process.exit(1);
    }
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down knowledge service...');
    await database.close();
    process.exit(0);
  }

  getApp(): Express {
    return this.app;
  }
}

// Start the service
const service = new KnowledgeServiceApp();

// Graceful shutdown
process.on('SIGTERM', () => service.shutdown());
process.on('SIGINT', () => service.shutdown());

// Start the service
service.start();

export default service;
