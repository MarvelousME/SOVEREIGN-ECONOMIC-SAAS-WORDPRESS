import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3008', 10),
    env: process.env.NODE_ENV || 'development',
    name: process.env.SERVICE_NAME || 'reporting-service',
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
  databaseRead: {
    host: process.env.DB_READ_HOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_READ_PORT || process.env.DB_PORT || '5432', 10),
    database: process.env.DB_READ_NAME || process.env.DB_NAME || 'ubi_cms',
    user: process.env.DB_READ_USER || process.env.DB_USER || 'ubi_user',
    password: process.env.DB_READ_PASSWORD || process.env.DB_PASSWORD || 'ubi_password',
    min: parseInt(process.env.DB_POOL_MIN || '2', 10),
    max: parseInt(process.env.DB_POOL_MAX || '20', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10)
  },
  nats: {
    url: process.env.NATS_URL || 'nats://localhost:4222',
    clusterId: process.env.NATS_CLUSTER_ID || 'ubi-cms-cluster'
  },
  features: {
    enableExport: process.env.ENABLE_EXPORT === 'true',
    enableScheduledReports: process.env.ENABLE_SCHEDULED_REPORTS === 'true'
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};
