import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import 'express-async-errors';
import config from './config';
import logger from './utils/logger';
import db from './utils/database';
import redis from './utils/redis';
import keycloakService from './services/keycloak.service';
import userService from './services/user.service';
import { authController } from './controllers/auth.controller';
import { verifyToken, optionalAuth } from './middleware/jwt.middleware';
import { extractTenant } from './middleware/tenant.middleware';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
});

app.use('/api/', limiter);

// Strict rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many authentication attempts, please try again later',
});

// Health check
app.get('/health', async (req, res) => {
  const dbHealthy = await db.healthCheck();
  const redisHealthy = await redis.healthCheck();

  const health = {
    status: dbHealthy && redisHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    service: config.serviceName,
    checks: {
      database: dbHealthy ? 'up' : 'down',
      redis: redisHealthy ? 'up' : 'down',
    },
  };

  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

// Auth routes
const router = express.Router();

router.post('/register', authLimiter, authController.register.bind(authController));
router.post('/login', authLimiter, authController.login.bind(authController));
router.post('/logout', optionalAuth, authController.logout.bind(authController));
router.post('/refresh', authController.refreshToken.bind(authController));
router.post('/forgot-password', authLimiter, authController.forgotPassword.bind(authController));
router.post('/reset-password', authLimiter, authController.resetPassword.bind(authController));
router.post('/verify-email', authController.verifyEmail.bind(authController));

// Protected routes
router.get('/me', verifyToken, extractTenant, authController.getCurrentUser.bind(authController));
router.put('/me', verifyToken, extractTenant, authController.updateProfile.bind(authController));
router.post(
  '/change-password',
  verifyToken,
  authController.changePassword.bind(authController)
);

app.use('/api/v1/auth', router);

// Error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logger.error('Unhandled error', { error: err, stack: err.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Startup
async function startServer() {
  try {
    // Initialize Keycloak admin client
    await keycloakService.initialize();
    logger.info('Keycloak service initialized');

    // Check database connection
    const dbHealthy = await db.healthCheck();
    if (!dbHealthy) {
      throw new Error('Database connection failed');
    }
    logger.info('Database connection established');

    // Check Redis connection
    const redisHealthy = await redis.healthCheck();
    if (!redisHealthy) {
      throw new Error('Redis connection failed');
    }
    logger.info('Redis connection established');

    // Cleanup expired sessions every hour
    setInterval(async () => {
      try {
        await userService.cleanupExpiredSessions();
      } catch (error) {
        logger.error('Failed to cleanup expired sessions', error);
      }
    }, 60 * 60 * 1000);

    // Start server
    app.listen(config.port, () => {
      logger.info(`Auth service listening on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Keycloak URL: ${config.keycloak.url}`);
      logger.info(`Keycloak Realm: ${config.keycloak.realm}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await db.close();
  await redis.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await db.close();
  await redis.close();
  process.exit(0);
});

startServer();

export default app;
