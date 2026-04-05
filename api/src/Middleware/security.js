/**
 * Security Middleware
 * 
 * @version 1.0.0
 * Implements security best practices: Helmet, CORS, Rate limiting, Input validation, Logging
 */

const helmetPkg = require('helmet');
const corsPkg = require('cors');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const config = require('../Config/app');

// Helmet.js security headers
function helmet() {
    return helmetPkg.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    });
}

// CORS configuration - strict origin matching
function cors() {
    const corsOptions = {
        origin: function (origin, callback) {
            // Allow requests with no origin (like mobile apps or curl)
            if (!origin) {
                return callback(null, true);
            }
            
            const allowedOrigins = config.security.corsOrigin 
                ? config.security.corsOrigin.split(',').map(o => o.trim())
                : [];
            
            // In development, allow localhost
            if (config.nodeEnv === 'development') {
                allowedOrigins.push(/^http:\/\/localhost(:\d+)?$/);
                allowedOrigins.push(/^http:\/\/127\.0\.0\.1(:\d+)?$/);
            }
            
            const isAllowed = allowedOrigins.some(allowed => {
                if (allowed instanceof RegExp) {
                    return allowed.test(origin);
                }
                return allowed === origin;
            });
            
            if (isAllowed) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
        exposedHeaders: ['X-Total-Count', 'X-Page-Total'],
        maxAge: 86400, // 24 hours
    };
    
    return corsPkg(corsOptions);
}

// Rate limiting - prevents abuse
function rateLimiter() {
    const generalLimiter = rateLimit({
        windowMs: config.security.rateLimitWindow || 15 * 60 * 1000,
        max: config.security.rateLimitMax || 100,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            error: 'Too many requests, please try again later',
            retryAfter: Math.ceil((config.security.rateLimitWindow || 15 * 60 * 1000) / 1000),
        },
        skip: (req) => {
            // Skip rate limiting for health checks
            return req.path === '/health' || req.path === '/ready';
        },
    });
    
    // Stricter limiter for auth endpoints
    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 10, // Only 10 attempts per 15 min
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            error: 'Too many authentication attempts, please try again later',
            retryAfter: 900,
        },
        skipSuccessfulRequests: true,
    });
    
    return (req, res, next) => {
        // Apply stricter rate limit to auth routes
        if (req.path.startsWith('/api/v1/auth/')) {
            return authLimiter(req, res, next);
        }
        return generalLimiter(req, res, next);
    };
}

// Request logging with security-relevant info
function requestLogger() {
    return (req, res, next) => {
        const start = Date.now();
        
        res.on('finish', () => {
            const duration = Date.now() - start;
            const logData = {
                timestamp: new Date().toISOString(),
                method: req.method,
                path: req.path,
                query: req.query,
                status: res.statusCode,
                duration: `${duration}ms`,
                ip: req.ip || req.connection.remoteAddress,
                userAgent: req.get('user-agent'),
                contentLength: res.get('content-length'),
            };
            
            // Log security-relevant events
            if (res.statusCode >= 400) {
                console.warn('Request error:', JSON.stringify(logData));
            } else {
                console.log('Request:', JSON.stringify(logData));
            }
        });
        
        next();
    };
}

// Input validation middleware
function validate(validations) {
    return async (req, res, next) => {
        await Promise.all(validations.map(validation => validation.run(req)));
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array().map(err => ({
                    field: err.path,
                    message: err.msg,
                })),
            });
        }
        
        next();
    };
}

// Common validation rules
const validationRules = {
    username: body('username')
        .isLength({ min: 3, max: 50 })
        .trim()
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username must be 3-50 characters, alphanumeric and underscores only'),
    
    email: body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email required'),
    
    password: body('password')
        .isLength({ min: 12 })
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must be at least 12 characters with uppercase, lowercase, number and special character'),
    
    positiveInteger: (field) => body(field)
        .isInt({ min: 1 })
        .withMessage(`${field} must be a positive integer`),
    
    optionalPositiveInteger: (field) => body(field)
        .optional()
        .isInt({ min: 1 })
        .withMessage(`${field} must be a positive integer`),
    
    pagination: [
        body('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
        body('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    ],
};

// Sanitize input to prevent XSS
function sanitize(req, res, next) {
    // Recursively sanitize object properties
    const sanitizeValue = (value) => {
        if (typeof value === 'string') {
            // Remove potential XSS vectors
            return value
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '');
        }
        if (Array.isArray(value)) {
            return value.map(sanitizeValue);
        }
        if (value && typeof value === 'object') {
            const sanitized = {};
            for (const key in value) {
                sanitized[key] = sanitizeValue(value[key]);
            }
            return sanitized;
        }
        return value;
    };
    
    if (req.body) {
        req.body = sanitizeValue(req.body);
    }
    if (req.query) {
        req.query = sanitizeValue(req.query);
    }
    
    next();
}

// SQL Injection Prevention
function preventSqlInjection(req, res, next) {
    const sqlPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)|(--)|(;)|(')|(\*\/)|(\bOR\b.*=.*)|(\bAND\b.*=.*)/gi;
    
    const checkValue = (value) => {
        if (typeof value === 'string') {
            if (sqlPattern.test(value)) {
                return true;
            }
        }
        if (Array.isArray(value)) {
            return value.some(checkValue);
        }
        if (value && typeof value === 'object') {
            return Object.values(value).some(checkValue);
        }
        return false;
    };
    
    if (checkValue(req.body) || checkValue(req.query) || checkValue(req.params)) {
        return res.status(400).json({
            error: 'Potential SQL injection detected',
            message: 'Request contains suspicious patterns',
        });
    }
    
    next();
}

// Request Size Limiting
function requestSizeLimit(maxBodySize = '10mb', maxFileSize = '50mb') {
    return (req, res, next) => {
        const contentLength = parseInt(req.get('content-length') || '0', 10);
        const maxBytes = maxBodySize.endsWith('mb') 
            ? parseInt(maxBodySize) * 1024 * 1024 
            : parseInt(maxBodySize);
        
        if (contentLength > maxBytes) {
            return res.status(413).json({
                error: 'Request too large',
                message: `Maximum request size is ${maxBodySize}`,
            });
        }
        
        next();
    };
}

// Content Type Validation
function validateContentType(allowedTypes = ['application/json']) {
    return (req, res, next) => {
        if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
            const contentType = req.get('content-type') || '';
            const isAllowed = allowedTypes.some(type => contentType.includes(type));
            
            if (!isAllowed) {
                return res.status(415).json({
                    error: 'Unsupported media type',
                    message: `Content-Type must be one of: ${allowedTypes.join(', ')}`,
                });
            }
        }
        
        next();
    };
}

// CSRF Token Validation
const crypto = require('crypto');

function generateCsrfToken(req) {
    const token = crypto.randomBytes(32).toString('hex');
    req.session = req.session || {};
    req.session.csrfToken = token;
    return token;
}

function validateCsrfToken(req, res, next) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }
    
    const token = req.get('X-CSRF-Token') || req.body?._csrf;
    const sessionToken = req.session?.csrfToken;
    
    if (!token || !sessionToken || token !== sessionToken) {
        return res.status(403).json({
            error: 'CSRF token validation failed',
            message: 'Invalid or missing CSRF token',
        });
    }
    
    next();
}

// Security Headers
function securityHeaders(req, res, next) {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Prevent MIME sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // XSS Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions Policy
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // Strict Transport Security (HTTPS only)
    if (req.secure) {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    
    next();
}

// Brute Force Protection
const loginAttempts = new Map();

function bruteForeProtection(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    return (req, res, next) => {
        const identifier = req.ip + ':' + (req.body?.username || req.body?.email || '');
        const now = Date.now();
        
        let attempts = loginAttempts.get(identifier) || { count: 0, resetAt: now + windowMs };
        
        if (now > attempts.resetAt) {
            attempts = { count: 0, resetAt: now + windowMs };
        }
        
        if (attempts.count >= maxAttempts) {
            return res.status(429).json({
                error: 'Too many login attempts',
                message: 'Account temporarily locked. Try again later.',
                retryAfter: Math.ceil((attempts.resetAt - now) / 1000),
            });
        }
        
        // Increment on authentication failure
        res.on('finish', () => {
            if (res.statusCode === 401) {
                attempts.count++;
                loginAttempts.set(identifier, attempts);
            } else if (res.statusCode === 200) {
                loginAttempts.delete(identifier);
            }
        });
        
        next();
    };
}

// Secret Scanning Prevention
function preventSecretExposure(req, res, next) {
    const secretPatterns = [
        /sk_live_[a-zA-Z0-9]{24,}/, // Stripe keys
        /AKIA[0-9A-Z]{16}/, // AWS keys
        /AIza[0-9A-Za-z\\-_]{35}/, // Google API keys
        /ghp_[a-zA-Z0-9]{36}/, // GitHub tokens
        /xox[baprs]-[0-9]{12}-[0-9]{12}-[a-zA-Z0-9]{24}/, // Slack tokens
        /-----BEGIN (RSA |EC )?PRIVATE KEY-----/, // Private keys
    ];
    
    const checkForSecrets = (value) => {
        if (typeof value === 'string') {
            return secretPatterns.some(pattern => pattern.test(value));
        }
        if (Array.isArray(value)) {
            return value.some(checkForSecrets);
        }
        if (value && typeof value === 'object') {
            return Object.values(value).some(checkForSecrets);
        }
        return false;
    };
    
    if (checkForSecrets(req.body) || checkForSecrets(req.query)) {
        console.error('SECRET EXPOSURE ATTEMPT DETECTED', {
            ip: req.ip,
            path: req.path,
            timestamp: new Date().toISOString(),
        });
        
        return res.status(400).json({
            error: 'Invalid request',
            message: 'Request contains sensitive data',
        });
    }
    
    next();
}

// Error handler for malformed JSON
function jsonErrorHandler(err, req, res, next) {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ error: 'Invalid JSON' });
    }
    next(err);
}

module.exports = {
    helmet,
    cors,
    rateLimiter,
    requestLogger,
    validate,
    validationRules,
    sanitize,
    preventSqlInjection,
    requestSizeLimit,
    validateContentType,
    generateCsrfToken,
    validateCsrfToken,
    securityHeaders,
    bruteForeProtection,
    preventSecretExposure,
    jsonErrorHandler,
};