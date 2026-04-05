import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3020', 10),
    env: process.env.NODE_ENV || 'development',
    name: process.env.SERVICE_NAME || 'compliance-engine',
    version: process.env.SERVICE_VERSION || '1.0.0'
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'ubi_cms',
    user: process.env.DB_USER || 'ubi_user',
    password: process.env.DB_PASSWORD || 'ubi_password',
    min: parseInt(process.env.DB_POOL_MIN || '2', 10),
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  },
  nats: {
    url: process.env.NATS_URL || 'nats://localhost:4222',
    clusterId: process.env.NATS_CLUSTER_ID || 'ubi-cms-cluster'
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },
  compliance: {
    consentExpirationDays: parseInt(process.env.CONSENT_EXPIRATION_DAYS || '365', 10),
    reviewQueueHighPriorityThreshold: parseInt(process.env.REVIEW_QUEUE_HIGH_PRIORITY_THRESHOLD || '70', 10),
    abuseScoreBlockThreshold: parseInt(process.env.ABUSE_SCORE_BLOCK_THRESHOLD || '80', 10),
    geoRestrictionCacheMinutes: parseInt(process.env.GEO_RESTRICTION_CACHE_MINUTES || '60', 10)
  }
};
