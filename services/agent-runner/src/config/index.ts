import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server Configuration
  port: parseInt(process.env.AGENT_RUNNER_PORT || '3011', 10),
  env: process.env.NODE_ENV || 'development',
  
  // Database Configuration (for state persistence)
  database: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'ubinexus',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    max: parseInt(process.env.DB_POOL_MAX || '20', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
  },

  // Redis Configuration (short-term memory)
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '1', 10),
    ttl: parseInt(process.env.REDIS_TTL || '3600', 10), // 1 hour
  },

  // Qdrant Configuration (long-term vector memory)
  qdrant: {
    host: process.env.QDRANT_HOST || 'localhost',
    port: parseInt(process.env.QDRANT_PORT || '6333', 10),
    apiKey: process.env.QDRANT_API_KEY,
    collectionPrefix: process.env.QDRANT_COLLECTION_PREFIX || 'agent',
  },

  // MinIO Configuration (artifact storage)
  minio: {
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    bucket: process.env.MINIO_BUCKET || 'agent-artifacts',
  },

  // NATS Configuration (event communication)
  nats: {
    servers: process.env.NATS_SERVERS?.split(',') || ['nats://localhost:4222'],
    user: process.env.NATS_USER,
    pass: process.env.NATS_PASSWORD,
  },

  // Temporal Configuration (workflow orchestration)
  temporal: {
    address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
    namespace: process.env.TEMPORAL_NAMESPACE || 'default',
    taskQueue: process.env.TEMPORAL_TASK_QUEUE || 'agent-execution',
  },

  // OPA Configuration (permission checks)
  opa: {
    url: process.env.OPA_URL || 'http://localhost:8181',
    policy: process.env.OPA_POLICY || 'agent_runner',
  },

  // Ledger Service Configuration (cost tracking)
  ledger: {
    url: process.env.LEDGER_SERVICE_URL || 'http://localhost:3003',
  },

  // OpenAI Configuration (for embeddings and LLM calls)
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4096', 10),
  },

  // Execution Configuration
  execution: {
    defaultTimeout: parseInt(process.env.DEFAULT_EXECUTION_TIMEOUT || '300000', 10), // 5 minutes
    maxTimeout: parseInt(process.env.MAX_EXECUTION_TIMEOUT || '3600000', 10), // 1 hour
    maxConcurrentExecutions: parseInt(process.env.MAX_CONCURRENT_EXECUTIONS || '100', 10),
    checkpointInterval: parseInt(process.env.CHECKPOINT_INTERVAL || '30000', 10), // 30 seconds
  },

  // Sandbox Configuration
  sandbox: {
    allowedModules: process.env.SANDBOX_ALLOWED_MODULES?.split(',') || [
      'crypto', 'util', 'buffer', 'querystring', 'url', 'stream'
    ],
    allowedGlobals: process.env.SANDBOX_ALLOWED_GLOBALS?.split(',') || [
      'console', 'setTimeout', 'setInterval', 'Promise', 'JSON', 'Math', 'Date'
    ],
    memoryLimit: parseInt(process.env.SANDBOX_MEMORY_LIMIT || '512', 10), // MB
  },

  // Rate Limiting Configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
    checkInterval: parseInt(process.env.RATE_LIMIT_CHECK_INTERVAL || '10000', 10), // 10 seconds
  },

  // Memory Configuration
  memory: {
    shortTermTTL: parseInt(process.env.SHORT_TERM_MEMORY_TTL || '3600', 10), // 1 hour
    longTermMaxResults: parseInt(process.env.LONG_TERM_MAX_RESULTS || '10', 10),
    episodicRetentionDays: parseInt(process.env.EPISODIC_RETENTION_DAYS || '30', 10),
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },

  // Pricing Configuration
  pricing: {
    // Model pricing (per 1M tokens)
    models: {
      'gpt-4-turbo-preview': {
        inputTokenCost: 10.00,
        outputTokenCost: 30.00,
        apiCallCost: 0,
      },
      'gpt-4': {
        inputTokenCost: 30.00,
        outputTokenCost: 60.00,
        apiCallCost: 0,
      },
      'gpt-3.5-turbo': {
        inputTokenCost: 0.5,
        outputTokenCost: 1.5,
        apiCallCost: 0,
      },
      'claude-3-opus': {
        inputTokenCost: 15.00,
        outputTokenCost: 75.00,
        apiCallCost: 0,
      },
      'claude-3-sonnet': {
        inputTokenCost: 3.00,
        outputTokenCost: 15.00,
        apiCallCost: 0,
      },
      'claude-3-haiku': {
        inputTokenCost: 0.25,
        outputTokenCost: 1.25,
        apiCallCost: 0,
      },
      'default': {
        inputTokenCost: 1.00,
        outputTokenCost: 2.00,
        apiCallCost: 0,
      },
    },
    // API call costs (per call)
    apiCallCosts: {
      'openai': parseFloat(process.env.PRICING_OPENAI_API_CALL || '0'),
      'anthropic': parseFloat(process.env.PRICING_ANTHROPIC_API_CALL || '0'),
      'google': parseFloat(process.env.PRICING_GOOGLE_API_CALL || '0'),
      'custom': parseFloat(process.env.PRICING_CUSTOM_API_CALL || '0'),
    },
    // Compute cost (per second)
    computeCostPerSecond: parseFloat(process.env.PRICING_COMPUTE_PER_SEC || '0.0001'),
    // Storage cost (per GB per day)
    storageCostPerGBPerDay: parseFloat(process.env.PRICING_STORAGE_PER_GB_DAY || '0.026'),
  },
};

export default config;
