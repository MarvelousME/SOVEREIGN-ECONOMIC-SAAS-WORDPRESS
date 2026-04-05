import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

interface ClickHouseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

interface AppConfig {
  port: number;
  env: string;
  logLevel: string;
  jwtSecret: string;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}

interface Config {
  database: DatabaseConfig;
  clickhouse: ClickHouseConfig;
  app: AppConfig;
}

const config: Config = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'sovereign_saas',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: parseInt(process.env.DB_POOL_MAX || '20', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  },
  clickhouse: {
    host: process.env.CH_HOST || 'localhost',
    port: parseInt(process.env.CH_PORT || '8123', 10),
    database: process.env.CH_DATABASE || 'analytics',
    username: process.env.CH_USER || 'default',
    password: process.env.CH_PASSWORD || '',
  },
  app: {
    port: parseInt(process.env.ANALYTICS_PORT || '3004', 10),
    env: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
    jwtSecret: process.env.JWT_SECRET || 'sovereign-analytics-secret-change-in-production',
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000', 10),
  },
};

export const pool = new Pool(config.database);

export const createClickHousePool = () => {
  return {
    host: config.clickhouse.host,
    port: config.clickhouse.port,
    database: config.clickhouse.database,
    username: config.clickhouse.username,
    password: config.clickhouse.password,
  };
};

export default config;
