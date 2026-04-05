import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { createDatabasePool, config } from './config';
import { logger } from './config/logger';
import { LandingPageController } from './controllers/landing-page.controller';
import { createLandingPageRoutes, createTemplateRoutes } from './routes';
import { errorHandler, notFoundHandler, requestLogger } from './middleware/error.middleware';
import { eventPublisher } from './utils/event-publisher';

dotenv.config();

const requiredEnvVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'OPENAI_API_KEY'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    logger.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const app = express();
const PORT = config.port;

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'landing-page-factory',
    timestamp: new Date().toISOString(),
  });
});

const db = createDatabasePool();

db.query('SELECT NOW()', (err, res) => {
  if (err) {
    logger.error('Database connection failed:', err);
    process.exit(1);
  }
  logger.info('Database connected successfully');
});

eventPublisher.connect().catch((err) => {
  logger.warn('Event publisher connection failed, continuing without NATS:', err);
});

const controller = new LandingPageController(db, config.openaiApiKey);

app.use('/api/v1/pages', createLandingPageRoutes(db, controller));
app.use('/api/v1/pages/templates', createTemplateRoutes(controller));

app.use(notFoundHandler);
app.use(errorHandler);

const gracefulShutdown = async () => {
  logger.info('Shutting down...');
  await eventPublisher.disconnect();
  await db.end();
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

app.listen(PORT, () => {
  logger.info(`Landing Page Factory running on port ${PORT}`);
  logger.info(`Environment: ${config.environment}`);
});

export default app;
