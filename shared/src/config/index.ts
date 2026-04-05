import dotenv from 'dotenv';
import {
  ServiceConfig,
  DatabaseConfig,
  NatsConfig,
  RedisConfig,
  OpaConfig,
  LoggingConfig,
  TelemetryConfig,
} from '../types';

dotenv.config();

export class ConfigManager {
  private static instance: ConfigManager;
  private featureFlags: Map<string, boolean> = new Map();

  private constructor() {
    this.loadFeatureFlags();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  getServiceConfig(): ServiceConfig {
    return {
      name: process.env.SERVICE_NAME || 'unknown-service',
      version: process.env.SERVICE_VERSION || '1.0.0',
      port: parseInt(process.env.PORT || '3000', 10),
      env: (process.env.NODE_ENV as any) || 'development',
    };
  }

  getDatabaseConfig(): DatabaseConfig {
    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'ubi_cms',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      min: parseInt(process.env.DB_POOL_MIN || '2', 10),
      max: parseInt(process.env.DB_POOL_MAX || '10', 10),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000', 10),
    };
  }

  getNatsConfig(): NatsConfig {
    return {
      url: process.env.NATS_URL || 'nats://localhost:4222',
      clusterId: process.env.NATS_CLUSTER_ID || 'ubi-cms-cluster',
      reconnect: process.env.NATS_RECONNECT !== 'false',
      maxReconnectAttempts: parseInt(process.env.NATS_MAX_RECONNECT_ATTEMPTS || '10', 10),
      reconnectTimeWait: parseInt(process.env.NATS_RECONNECT_TIME_WAIT || '2000', 10),
    };
  }

  getRedisConfig(): RedisConfig {
    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'ubi-cms:',
    };
  }

  getOpaConfig(): OpaConfig {
    return {
      url: process.env.OPA_URL || 'http://localhost:8181',
      timeout: parseInt(process.env.OPA_TIMEOUT || '5000', 10),
    };
  }

  getLoggingConfig(): LoggingConfig {
    return {
      level: (process.env.LOG_LEVEL as any) || 'info',
      correlationIdHeader: process.env.CORRELATION_ID_HEADER || 'x-correlation-id',
    };
  }

  getTelemetryConfig(): TelemetryConfig {
    const serviceConfig = this.getServiceConfig();
    return {
      serviceName: serviceConfig.name,
      serviceVersion: serviceConfig.version,
      otlpEndpoint: process.env.OTLP_ENDPOINT || 'http://localhost:4318',
      tracesSampleRate: parseFloat(process.env.TRACES_SAMPLE_RATE || '1.0'),
      metricInterval: parseInt(process.env.METRIC_INTERVAL || '60000', 10),
    };
  }

  isFeatureEnabled(featureName: string): boolean {
    return this.featureFlags.get(featureName) ?? false;
  }

  setFeatureFlag(featureName: string, enabled: boolean): void {
    this.featureFlags.set(featureName, enabled);
  }

  private loadFeatureFlags(): void {
    // Load feature flags from environment variables
    const flagPrefix = 'FEATURE_';
    Object.keys(process.env).forEach((key) => {
      if (key.startsWith(flagPrefix)) {
        const featureName = key.substring(flagPrefix.length).toLowerCase();
        const value = process.env[key] === 'true';
        this.featureFlags.set(featureName, value);
      }
    });
  }

  getEnv(key: string, defaultValue?: string): string {
    return process.env[key] || defaultValue || '';
  }

  getEnvInt(key: string, defaultValue: number = 0): number {
    return parseInt(process.env[key] || String(defaultValue), 10);
  }

  getEnvBool(key: string, defaultValue: boolean = false): boolean {
    return process.env[key] === 'true' || defaultValue;
  }

  getEnvFloat(key: string, defaultValue: number = 0): number {
    return parseFloat(process.env[key] || String(defaultValue));
  }

  validateRequired(keys: string[]): void {
    const missing = keys.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }
}

export const config = ConfigManager.getInstance();
