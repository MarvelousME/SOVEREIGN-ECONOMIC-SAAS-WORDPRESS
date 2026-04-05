import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3004'),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'treasury_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    poolMin: parseInt(process.env.DB_POOL_MIN || '2'),
    poolMax: parseInt(process.env.DB_POOL_MAX || '10'),
  },

  nats: {
    url: process.env.NATS_URL || 'nats://localhost:4222',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || '',
  },

  temporal: {
    address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
    namespace: process.env.TEMPORAL_NAMESPACE || 'default',
  },

  opa: {
    url: process.env.OPA_URL || 'http://localhost:8181',
  },

  treasury: {
    defaultCompoundingFrequency: process.env.DEFAULT_COMPOUNDING_FREQUENCY || 'daily',
    rebalanceDriftThreshold: parseFloat(process.env.REBALANCE_DRIFT_THRESHOLD || '0.05'),
    maxWithdrawalDaily: parseFloat(process.env.MAX_WITHDRAWAL_DAILY || '1000000'),
    emergencyPause: process.env.EMERGENCY_PAUSE === 'true',
  },

  ledgerService: {
    url: process.env.LEDGER_SERVICE_URL || 'http://localhost:3001',
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};
