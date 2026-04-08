import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { createDatabasePool } from './config/database';
import { logger } from './config/logger';
import { BusinessService } from './services/business.service';
import { BusinessController } from './controllers/business.controller';
import { createBusinessRoutes } from './routes/business.routes';
import { createProvisionRoutes } from './routes/provision.routes';
import { createWorkspaceRoutes } from './routes/workspace.routes';
import { ProvisionService } from './services/provision.service';
import { ProvisionController } from './controllers/provision.controller';
import { errorHandler } from './middleware/error.middleware';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET', 'OPENAI_API_KEY'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    logger.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 3007;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'business-builder', timestamp: new Date().toISOString() });
});

// Initialize database
const db = createDatabasePool();

// Test database connection
db.query('SELECT NOW()', (err, _res) => {
  if (err) {
    logger.error('Database connection failed:', err);
    process.exit(1);
  }
  logger.info('Database connected successfully');
});

// Initialize services
const businessService = new BusinessService(db, process.env.OPENAI_API_KEY!);
const businessController = new BusinessController(businessService);

const provisionService = new ProvisionService(db);
const provisionController = new ProvisionController(provisionService);

// Routes (provision is internal — X-Provision-Key; business routes are tenant-scoped)
app.use('/api/v1/provision', createProvisionRoutes(provisionController));
app.use('/api/v1/business', createBusinessRoutes(db, businessController));
app.use('/api/v1/workspaces', createWorkspaceRoutes(db));

// Error handling
app.use(errorHandler);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Received shutdown signal, closing connections...');
  
  await db.end();
  
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
app.listen(PORT, () => {
  logger.info(`Business Builder service running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
