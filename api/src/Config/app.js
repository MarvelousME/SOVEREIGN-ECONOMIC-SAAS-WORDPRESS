/**
 * UBI CMS API Configuration
 * 
 * @version 1.0.1
 */

module.exports = {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    
    // Security - Fixed: Require explicit CORS origin, no wildcards
    security: {
        corsOrigin: process.env.CORS_ORIGIN, // Removed wildcard default
        rateLimitWindow: 15 * 60 * 1000,
        rateLimitMax: 100,
        bcryptRounds: 12,
        jwtExpiry: '24h',
    },
    
    // Database - Fixed: Require password
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        name: process.env.DB_NAME || 'ubi_cms',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD, // Removed empty string default
    },
    
    // Redis
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
    },
    
    // NATS
    nats: {
        url: process.env.NATS_URL || 'nats://localhost:4222',
    },
    
    // Logging
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: 'json',
    },
};
