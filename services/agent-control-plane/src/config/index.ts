import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server Configuration
  port: parseInt(process.env.AGENT_CONTROL_PLANE_PORT || '3010', 10),
  env: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  database: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'ubinexus',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    max: parseInt(process.env.DB_POOL_MAX || '20', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
  },

  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },

  // NATS Configuration
  nats: {
    servers: process.env.NATS_SERVERS?.split(',') || ['nats://localhost:4222'],
    user: process.env.NATS_USER,
    pass: process.env.NATS_PASSWORD,
  },

  // OPA Configuration
  opa: {
    url: process.env.OPA_URL || 'http://localhost:8181',
    policy: process.env.OPA_POLICY || 'agent_control_plane',
  },

  // Temporal Configuration
  temporal: {
    address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
    namespace: process.env.TEMPORAL_NAMESPACE || 'default',
  },

  // Keycloak Configuration
  keycloak: {
    url: process.env.KEYCLOAK_URL || 'http://localhost:8080',
    realm: process.env.KEYCLOAK_REALM || 'ubinexus',
    clientId: process.env.KEYCLOAK_CLIENT_ID || 'agent-control-plane',
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
  },

  // Ledger Service Configuration
  ledger: {
    url: process.env.LEDGER_SERVICE_URL || 'http://localhost:3003',
  },

  // Task Marketplace Configuration
  marketplace: {
    url: process.env.TASK_MARKETPLACE_URL || 'http://localhost:3004',
  },

  // Agent Runner Configuration
  agentRunner: {
    url: process.env.AGENT_RUNNER_URL || 'http://localhost:3011',
  },

  // Default Resource Limits
  defaultLimits: {
    maxCpuCores: parseFloat(process.env.DEFAULT_MAX_CPU || '1'),
    maxMemoryMB: parseInt(process.env.DEFAULT_MAX_MEMORY_MB || '512', 10),
    maxStorageMB: parseInt(process.env.DEFAULT_MAX_STORAGE_MB || '1024', 10),
    maxApiCallsPerMinute: parseInt(process.env.DEFAULT_MAX_API_CALLS || '60', 10),
    maxTokensPerDay: parseInt(process.env.DEFAULT_MAX_TOKENS || '100000', 10),
    maxCostPerDay: parseFloat(process.env.DEFAULT_MAX_COST || '10'),
  },

  // Agent Configuration
  agent: {
    maxCodeSize: parseInt(process.env.MAX_AGENT_CODE_SIZE || '1048576', 10), // 1MB
    maxNameLength: parseInt(process.env.MAX_AGENT_NAME_LENGTH || '255', 10),
    maxDescriptionLength: parseInt(process.env.MAX_AGENT_DESC_LENGTH || '1000', 10),
    maxVersions: parseInt(process.env.MAX_AGENT_VERSIONS || '10', 10),
  },

  // Deployment Configuration
  deployment: {
    defaultStrategy: process.env.DEFAULT_DEPLOYMENT_STRATEGY || 'direct',
    canaryDefaultPercent: parseInt(process.env.CANARY_DEFAULT_PERCENT || '10', 10),
    maxRolloutDuration: parseInt(process.env.MAX_ROLLOUT_DURATION || '3600000', 10), // 1 hour
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },
};

export default config;
