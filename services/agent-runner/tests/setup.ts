jest.setTimeout(30000);

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../src/config', () => ({
  default: {
    execution: {
      defaultTimeout: 5000,
      maxTimeout: 60000,
      maxConcurrentExecutions: 100,
      checkpointInterval: 30000,
    },
    storage: {
      localPath: '/tmp/test-storage',
    },
    logging: {
      level: 'error',
      format: 'json',
    },
    env: 'test',
    redis: {
      host: 'localhost',
      port: 6379,
      password: undefined,
      db: 1,
      ttl: 3600,
    },
    qdrant: {
      host: 'localhost',
      port: 6333,
      apiKey: undefined,
      collectionPrefix: 'test_agent',
    },
    openai: {
      apiKey: 'test-key',
      model: 'gpt-4',
      embeddingModel: 'text-embedding-3-small',
      maxTokens: 4096,
    },
    memory: {
      shortTermTTL: 3600,
      longTermMaxResults: 10,
      episodicRetentionDays: 30,
    },
    minio: {
      endPoint: 'localhost',
      port: 9000,
      useSSL: false,
      accessKey: 'minioadmin',
      secretKey: 'minioadmin',
      bucket: 'test-bucket',
    },
    nats: {
      servers: ['nats://localhost:4222'],
      user: undefined,
      pass: undefined,
    },
    database: {
      host: 'localhost',
      port: 5432,
      database: 'test_db',
      user: 'postgres',
      password: 'postgres',
      max: 10,
      idleTimeoutMillis: 30000,
    },
    temporal: {
      address: 'localhost:7233',
      namespace: 'default',
      taskQueue: 'agent-execution',
    },
    opa: {
      url: 'http://localhost:8181',
      policy: 'agent_runner',
    },
    ledger: {
      url: 'http://localhost:3003',
    },
    sandbox: {
      allowedModules: ['crypto', 'util', 'buffer', 'querystring', 'url', 'stream'],
      allowedGlobals: ['console', 'setTimeout', 'setInterval', 'Promise', 'JSON', 'Math', 'Date'],
      memoryLimit: 512,
    },
    rateLimit: {
      windowMs: 60000,
      checkInterval: 10000,
    },
    pricing: {
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
        'default': {
          inputTokenCost: 1.00,
          outputTokenCost: 2.00,
          apiCallCost: 0,
        },
      },
      apiCallCosts: {
        'openai': 0,
        'anthropic': 0,
        'google': 0,
        'custom': 0,
      },
      computeCostPerSecond: 0.0001,
      storageCostPerGBPerDay: 0.026,
    },
  },
}));

jest.mock('os', () => ({
  cpus: jest.fn(() => [
    { times: { user: 100, nice: 0, system: 50, idle: 800, irq: 0 } },
    { times: { user: 100, nice: 0, system: 50, idle: 800, irq: 0 } },
  ]),
  totalmem: jest.fn(() => 16 * 1024 * 1024 * 1024),
  freemem: jest.fn(() => 8 * 1024 * 1024 * 1024),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  readdirSync: jest.fn(() => []),
  statSync: jest.fn(() => ({ size: 1024 })),
}));

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
}));

global.fetch = jest.fn();
