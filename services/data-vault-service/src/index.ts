import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import 'express-async-errors';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { logger } from './utils/logger';
import { db } from './utils/database';
import { DataVaultController } from './controllers/data-vault.controller';
import { authMiddleware } from './middleware/auth.middleware';

const app = express();
const dataVaultController = new DataVaultController();

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Health check
app.get('/health', async (req, res) => {
  const dbHealthy = await db.healthCheck();
  res.status(dbHealthy ? 200 : 503).json({
    status: dbHealthy ? 'healthy' : 'unhealthy',
    service: config.server.name,
    version: config.server.version,
    timestamp: new Date().toISOString()
  });
});

// Data Vault routes
app.post('/api/v1/vault/data', authMiddleware, dataVaultController.storeData);
app.get('/api/v1/vault/data', authMiddleware, dataVaultController.retrieveData);
app.put('/api/v1/vault/data/:id', authMiddleware, dataVaultController.updateData);
app.delete('/api/v1/vault/data/:id', authMiddleware, dataVaultController.deleteData);
app.post('/api/v1/vault/consent', authMiddleware, dataVaultController.grantConsent);
app.get('/api/v1/vault/consent', authMiddleware, dataVaultController.listConsents);
app.delete('/api/v1/vault/consent/:id', authMiddleware, dataVaultController.revokeConsent);
app.get('/api/v1/vault/access/:consentId', authMiddleware, dataVaultController.accessData);
app.get('/api/v1/vault/export', authMiddleware, dataVaultController.exportData);
app.get('/api/v1/vault/revenue', authMiddleware, dataVaultController.getRevenue);

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err, path: req.path });
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const server = app.listen(config.server.port, () => {
  logger.info(`${config.server.name} listening on port ${config.server.port}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('HTTP server closed');
  });
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('HTTP server closed');
  });
  await db.close();
  process.exit(0);
});

export default app;
