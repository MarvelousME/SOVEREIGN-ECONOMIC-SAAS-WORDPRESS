import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import 'express-async-errors';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { logger } from './utils/logger';
import { db } from './utils/database';
import { GovernanceController } from './controllers/governance.controller';
import { authMiddleware } from './middleware/auth.middleware';

const app = express();
const governanceController = new GovernanceController();

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

// Governance routes
app.post('/api/v1/governance/proposals', authMiddleware, governanceController.createProposal);
app.get('/api/v1/governance/proposals', governanceController.listProposals);
app.get('/api/v1/governance/proposals/:id', governanceController.getProposal);
app.post('/api/v1/governance/proposals/:id/vote', authMiddleware, governanceController.castVote);
app.post('/api/v1/governance/proposals/:id/execute', authMiddleware, governanceController.executeProposal);
app.post('/api/v1/governance/proposals/:id/finalize', authMiddleware, governanceController.finalizeVoting);
app.get('/api/v1/governance/proposals/:id/results', governanceController.getProposalResults);
app.post('/api/v1/governance/delegate', authMiddleware, governanceController.delegateVotingPower);
app.get('/api/v1/governance/voting-power/:userId', governanceController.getVotingPower);

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
