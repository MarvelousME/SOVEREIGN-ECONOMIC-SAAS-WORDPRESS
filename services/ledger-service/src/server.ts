import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import 'express-async-errors';
import { config } from './config';
import { db } from './utils/database';
import { logger } from './utils/logger';
import { eventsService } from './services/events.service';
import { tenantMiddleware } from './middleware/tenant.middleware';
import { authMiddleware } from './middleware/auth.middleware';
import { validate } from './middleware/validation.middleware';
import { errorHandler } from './middleware/error.middleware';
import { accountsController, createAccountSchema } from './controllers/accounts.controller';
import { transactionsController, createTransactionSchema } from './controllers/transactions.controller';

export const createApp = () => {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors());
  app.use(compression());

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/health', async (req, res) => {
    const dbHealthy = await db.healthCheck();
    const natsHealthy = eventsService.isConnected();

    const status = dbHealthy && natsHealthy ? 'healthy' : 'unhealthy';
    const statusCode = status === 'healthy' ? 200 : 503;

    res.status(statusCode).json({
      status,
      service: config.server.name,
      version: config.server.version,
      checks: {
        database: dbHealthy ? 'up' : 'down',
        nats: natsHealthy ? 'up' : 'down'
      }
    });
  });

  // API routes
  const apiRouter = express.Router();

  // All API routes require tenant and auth
  apiRouter.use(tenantMiddleware);
  apiRouter.use(authMiddleware);

  // Account routes
  apiRouter.post(
    '/accounts',
    validate(createAccountSchema),
    (req, res) => accountsController.createAccount(req, res)
  );
  
  apiRouter.get(
    '/accounts/:id',
    (req, res) => accountsController.getAccount(req, res)
  );
  
  apiRouter.get(
    '/accounts/:id/balance',
    (req, res) => accountsController.getAccountBalance(req, res)
  );
  
  apiRouter.get(
    '/accounts/:id/statement',
    (req, res) => accountsController.getAccountStatement(req, res)
  );
  
  apiRouter.get(
    '/accounts/:id/history',
    (req, res) => accountsController.getAccountHistory(req, res)
  );

  // Transaction routes
  apiRouter.post(
    '/transactions',
    validate(createTransactionSchema),
    (req, res) => transactionsController.createTransaction(req, res)
  );
  
  apiRouter.get(
    '/transactions/:id',
    (req, res) => transactionsController.getTransaction(req, res)
  );
  
  apiRouter.post(
    '/transactions/:id/reverse',
    (req, res) => transactionsController.reverseTransaction(req, res)
  );

  app.use('/api/v1/ledger', apiRouter);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.method} ${req.path} not found`
    });
  });

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
};
