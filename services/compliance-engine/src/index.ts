import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import 'express-async-errors';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { logger } from './utils/logger';
import { db } from './utils/database';
import { eventService } from './services/events.service';
import complianceRoutes from './routes';
import { errorHandler, requestLogger } from './middleware/error-handler';

const app = express();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000
});
app.use(limiter);

app.get('/health', async (_req, res) => {
  const dbHealthy = await db.healthCheck();
  res.status(dbHealthy ? 200 : 503).json({
    status: dbHealthy ? 'healthy' : 'unhealthy',
    service: config.server.name,
    version: config.server.version,
    timestamp: new Date().toISOString()
  });
});

app.use('/compliance', complianceRoutes);

app.use(errorHandler);

eventService.connect().catch((err) => {
  logger.warn('NATS connection failed, continuing without event service', { error: err });
});

const server = app.listen(config.server.port, () => {
  logger.info(`${config.server.name} listening on port ${config.server.port}`);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(async () => {
    logger.info('HTTP server closed');
    await db.close();
    await eventService.close();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(async () => {
    logger.info('HTTP server closed');
    await db.close();
    await eventService.close();
    process.exit(0);
  });
});

export default app;
