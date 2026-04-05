/**
 * UBI CMS API Server Entry Point
 *
 * @version 2.0.0
 * Main Express application for UBI CMS
 */

'use strict';

// ─── Startup: fail fast on missing required env vars ────────────────────────
const REQUIRED_ENV = ['JWT_SECRET', 'DB_HOST', 'DB_NAME', 'DB_USER'];
const MISSING_ENV  = REQUIRED_ENV.filter(k => !process.env[k]);
if (MISSING_ENV.length > 0) {
    console.error(`[FATAL] Missing required environment variables: ${MISSING_ENV.join(', ')}`);
    process.exit(1);
}

// Refuse to start with the well-known dev placeholder in production
if (
    process.env.NODE_ENV === 'production' &&
    process.env.JWT_SECRET === 'dev-jwt-secret-change-in-production-must-be-at-least-32-chars'
) {
    console.error('[FATAL] JWT_SECRET is the dev placeholder. Set a real secret in production.');
    process.exit(1);
}
// ────────────────────────────────────────────────────────────────────────────

const express = require('express');
const compression = require('compression');
const config = require('./Config/app');
const authMiddleware = require('./Middleware/auth');
const securityMiddleware = require('./Middleware/security');
const authController = require('./Controllers/authController');
const marketplaceController = require('./Controllers/marketplaceController');
const notificationController = require('./Controllers/notificationController');
const { body, query, validationResult } = require('express-validator');
const adminEnvController = require('./Controllers/adminEnvController');

function expressValidate(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array(),
        });
    }
    next();
}

// ─── Logger ─────────────────────────────────────────────────────────────────
let logger;
try {
    const winston = require('winston');
    logger = winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            process.env.NODE_ENV === 'production'
                ? winston.format.json()
                : winston.format.simple()
        ),
        transports: [new winston.transports.Console()],
    });
} catch (_) {
    logger = { info: console.log, warn: console.warn, error: console.error };
}
// ────────────────────────────────────────────────────────────────────────────

// Initialize Express app
const app = express();

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Global middleware (SSE env stream must not be buffered)
app.use(
    compression({
        filter: (req, res) => {
            if (req.url && req.url.includes('/admin/env/events')) return false;
            return compression.filter(req, res);
        },
    })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security middleware (Helmet, CORS, Rate limiting)
app.use(securityMiddleware.helmet());
app.use(securityMiddleware.cors());
app.use(securityMiddleware.rateLimiter());

// Request logging
app.use(securityMiddleware.requestLogger());

// Health check endpoint (unauthenticated)
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: process.uptime(),
    });
});

app.get('/ready', async (req, res) => {
    try {
        // Check database connection
        const db = require('./Models/db');
        await db.query('SELECT 1');
        
        res.json({ status: 'ready' });
    } catch (error) {
        res.status(503).json({ status: 'not ready', error: error.message });
    }
});

// API Routes
const apiRouter = express.Router();

// Auth routes (public)
apiRouter.post('/auth/login', 
    body('username').isLength({ min: 3, max: 50 }).trim(),
    body('password').isLength({ min: 8 }),
    authController.login
);

apiRouter.post('/auth/register', 
    body('username').isLength({ min: 3, max: 50 }).trim().matches(/^[a-zA-Z0-9_]+$/),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 12 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
    authController.register
);

apiRouter.post('/auth/logout', authMiddleware.authenticate, authController.logout);

// Protected auth routes
apiRouter.get('/auth/me', authMiddleware.authenticate, authController.me);
apiRouter.patch(
    '/auth/profile',
    authMiddleware.authenticate,
    body('username').optional().isLength({ min: 3, max: 50 }).trim().matches(/^[a-zA-Z0-9_]+$/),
    body('email').optional().isEmail().normalizeEmail(),
    body('wallet_address').optional({ values: 'null' }).isString().trim().isLength({ max: 255 }),
    authController.updateProfile
);

// Task routes
const taskController = require('./Controllers/taskController');
apiRouter.get('/tasks', authMiddleware.authenticate, taskController.list);
apiRouter.get('/tasks/:id', authMiddleware.authenticate, taskController.get);
apiRouter.post('/tasks', authMiddleware.authenticate, authMiddleware.requireRole('admin', 'moderator'), taskController.create);
apiRouter.put('/tasks/:id', authMiddleware.authenticate, authMiddleware.requireRole('admin', 'moderator'), taskController.update);
apiRouter.delete('/tasks/:id', authMiddleware.authenticate, authMiddleware.requireRole('admin'), taskController.delete);

// Task assignment routes
apiRouter.post('/tasks/:id/assign', authMiddleware.authenticate, taskController.assign);
apiRouter.post('/tasks/:id/submit', authMiddleware.authenticate, taskController.submit);
apiRouter.post('/tasks/:id/verify', authMiddleware.authenticate, authMiddleware.requireRole('admin', 'moderator'), taskController.verify);

// Reward routes
const rewardController = require('./Controllers/rewardController');
apiRouter.get('/rewards', authMiddleware.authenticate, rewardController.list);
apiRouter.get('/rewards/balance', authMiddleware.authenticate, rewardController.balance);
apiRouter.get('/rewards/history', authMiddleware.authenticate, rewardController.history);

// Treasury routes
const treasuryController = require('./Controllers/treasuryController');
apiRouter.get('/treasury/balance', authMiddleware.authenticate, treasuryController.balance);
apiRouter.get('/treasury/strategies', authMiddleware.authenticate, treasuryController.listStrategies);
apiRouter.post('/treasury/deposit', authMiddleware.authenticate, treasuryController.deposit);
apiRouter.post('/treasury/withdraw', authMiddleware.authenticate, treasuryController.withdraw);
apiRouter.get('/treasury/yield', authMiddleware.authenticate, treasuryController.getYield);

// Agent routes
const agentController = require('./Controllers/agentController');
apiRouter.get('/agents', authMiddleware.authenticate, agentController.list);
apiRouter.get('/agents/:id', authMiddleware.authenticate, agentController.get);
apiRouter.post('/agents', authMiddleware.authenticate, authMiddleware.requireRole('admin'), agentController.register);
apiRouter.post('/agents/:id/execute', authMiddleware.authenticate, agentController.execute);

// Marketplace
apiRouter.get('/marketplace/apps', authMiddleware.authenticate, marketplaceController.listApps);
apiRouter.get('/marketplace/apps/:id', authMiddleware.authenticate, marketplaceController.getApp);
apiRouter.post(
    '/marketplace/apps',
    authMiddleware.authenticate,
    authMiddleware.requireRole('admin', 'developer'),
    marketplaceController.createApp
);
apiRouter.put('/marketplace/apps/:id', authMiddleware.authenticate, marketplaceController.updateApp);
apiRouter.delete('/marketplace/apps/:id', authMiddleware.authenticate, marketplaceController.deleteApp);
apiRouter.post('/marketplace/apps/:id/publish', authMiddleware.authenticate, marketplaceController.publish);
apiRouter.post('/marketplace/apps/:id/archive', authMiddleware.authenticate, marketplaceController.archive);
apiRouter.post('/marketplace/apps/:id/install', authMiddleware.authenticate, marketplaceController.install);
apiRouter.get('/marketplace/installs', authMiddleware.authenticate, marketplaceController.listInstalls);
apiRouter.post('/marketplace/installs/:installId/activate', authMiddleware.authenticate, marketplaceController.activateInstall);
apiRouter.post('/marketplace/installs/:installId/deactivate', authMiddleware.authenticate, marketplaceController.deactivateInstall);
apiRouter.delete('/marketplace/installs/:installId', authMiddleware.authenticate, marketplaceController.uninstall);

// Notifications
apiRouter.get('/notifications', authMiddleware.authenticate, notificationController.list);
apiRouter.get('/notifications/unread-count', authMiddleware.authenticate, notificationController.unreadCount);
apiRouter.patch('/notifications/:id/read', authMiddleware.authenticate, notificationController.markRead);
apiRouter.post('/notifications/read-all', authMiddleware.authenticate, notificationController.markAllRead);
apiRouter.delete('/notifications/:id', authMiddleware.authenticate, notificationController.remove);
apiRouter.post(
    '/notifications/admin',
    authMiddleware.authenticate,
    authMiddleware.requireRole('admin'),
    notificationController.adminCreate
);

// Admin: env file manager (opt-in ENABLE_ADMIN_ENV_EDITOR=1)
apiRouter.get(
    '/admin/env/manifest',
    adminEnvController.gate,
    authMiddleware.authenticate,
    authMiddleware.requireRole('admin'),
    adminEnvController.manifest
);
apiRouter.get(
    '/admin/env/file',
    adminEnvController.gate,
    authMiddleware.authenticate,
    authMiddleware.requireRole('admin'),
    query('id').isString().trim().notEmpty(),
    expressValidate,
    adminEnvController.getFile
);
apiRouter.put(
    '/admin/env/file',
    adminEnvController.gate,
    authMiddleware.authenticate,
    authMiddleware.requireRole('admin'),
    body('id').isString().trim().notEmpty(),
    body('content').isString(),
    expressValidate,
    adminEnvController.putFile
);
apiRouter.post(
    '/admin/env/apply',
    adminEnvController.gate,
    authMiddleware.authenticate,
    authMiddleware.requireRole('admin'),
    body('id').isString().trim().notEmpty(),
    expressValidate,
    adminEnvController.applyRuntime
);
apiRouter.get(
    '/admin/env/events',
    adminEnvController.gate,
    authMiddleware.authenticate,
    authMiddleware.requireRole('admin'),
    adminEnvController.stream
);

// UBI routes
const ubiService = require('./Services/ubiService');

apiRouter.get('/ubi/balance', authMiddleware.authenticate, async (req, res) => {
    try {
        const data = await ubiService.getBalance(req.user.userId);
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

apiRouter.get('/ubi/history', authMiddleware.authenticate, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const data = await ubiService.getDistributionHistory(req.user.userId, parseInt(page), parseInt(limit));
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

apiRouter.post('/ubi/claim', authMiddleware.authenticate, async (req, res) => {
    try {
        const result = await ubiService.claimUbi(req.user.userId);
        res.json(result);
    } catch (e) {
        if (e.message.includes('already claimed')) {
            return res.status(429).json({ error: e.message });
        }
        res.status(500).json({ error: e.message });
    }
});

apiRouter.get('/ubi/stats', async (req, res) => {
    try {
        const stats = await ubiService.getPlatformStats();
        res.json(stats);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Mount API router
app.use('/api/v1', apiRouter);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error', { message: err.message, stack: err.stack });
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
});

// Start server if this is main module
if (require.main === module) {
    const port = config.port;

    const server = app.listen(port, () => {
        logger.info(`UBI CMS API Server running on port ${port}`);
        logger.info(`Environment: ${config.nodeEnv}`);
        logger.info(`Health check: http://localhost:${port}/health`);
        adminEnvController.startWatching(logger);
    });

    // ─── Graceful shutdown ───────────────────────────────────────────────────
    const shutdown = (signal) => {
        logger.info(`${signal} received — shutting down gracefully`);
        server.close(async () => {
            try {
                const db = require('./Models/db');
                await db.pool.end();
                logger.info('Database pool closed');
            } catch (e) {
                logger.error('Error closing database pool', e);
            }
            logger.info('HTTP server closed');
            process.exit(0);
        });

        // Force-kill after 10 s if connections haven't drained
        setTimeout(() => {
            logger.error('Could not close connections in time — forcefully shutting down');
            process.exit(1);
        }, 10_000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
        logger.error('Unhandled promise rejection', { reason });
    });

    process.on('uncaughtException', (err) => {
        logger.error('Uncaught exception', err);
        process.exit(1);
    });
    // ────────────────────────────────────────────────────────────────────────
}

module.exports = app;