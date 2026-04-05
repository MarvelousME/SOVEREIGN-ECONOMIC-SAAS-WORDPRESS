describe('Config', () => {
  it('should export config object', () => {
    const config = require('../config').default;
    expect(config).toBeDefined();
    expect(typeof config).toBe('object');
  });

  it('should have database configuration', () => {
    const config = require('../config').default;
    
    expect(config.database).toBeDefined();
    expect(config.database.host).toBeDefined();
    expect(config.database.port).toBeDefined();
    expect(config.database.database).toBeDefined();
  });

  it('should have redis configuration', () => {
    const config = require('../config').default;
    
    expect(config.redis).toBeDefined();
    expect(config.redis.host).toBeDefined();
    expect(config.redis.port).toBeDefined();
  });

  it('should have nats configuration', () => {
    const config = require('../config').default;
    
    expect(config.nats).toBeDefined();
    expect(config.nats.servers).toBeDefined();
    expect(Array.isArray(config.nats.servers)).toBe(true);
  });

  it('should have execution configuration', () => {
    const config = require('../config').default;
    
    expect(config.execution).toBeDefined();
    expect(config.execution.defaultTimeout).toBeDefined();
    expect(config.execution.maxTimeout).toBeDefined();
    expect(config.execution.maxConcurrentExecutions).toBeDefined();
    expect(config.execution.checkpointInterval).toBeDefined();
  });

  it('should have memory configuration', () => {
    const config = require('../config').default;
    
    expect(config.memory).toBeDefined();
    expect(config.memory.shortTermTTL).toBeDefined();
    expect(config.memory.longTermMaxResults).toBeDefined();
    expect(config.memory.episodicRetentionDays).toBeDefined();
  });

  it('should have pricing configuration with model costs', () => {
    const config = require('../config').default;
    
    expect(config.pricing).toBeDefined();
    expect(config.pricing.models).toBeDefined();
    expect(config.pricing.models['gpt-4-turbo-preview']).toBeDefined();
    expect(config.pricing.models['gpt-4-turbo-preview'].inputTokenCost).toBe(10.00);
    expect(config.pricing.models['gpt-4-turbo-preview'].outputTokenCost).toBe(30.00);
  });

  it('should have sandbox configuration', () => {
    const config = require('../config').default;
    
    expect(config.sandbox).toBeDefined();
    expect(config.sandbox.allowedModules).toBeDefined();
    expect(Array.isArray(config.sandbox.allowedModules)).toBe(true);
    expect(config.sandbox.allowedGlobals).toBeDefined();
    expect(config.sandbox.memoryLimit).toBeDefined();
  });

  it('should have minio configuration', () => {
    const config = require('../config').default;
    
    expect(config.minio).toBeDefined();
    expect(config.minio.endPoint).toBeDefined();
    expect(config.minio.port).toBeDefined();
    expect(config.minio.bucket).toBeDefined();
  });

  it('should have temporal configuration', () => {
    const config = require('../config').default;
    
    expect(config.temporal).toBeDefined();
    expect(config.temporal.address).toBeDefined();
    expect(config.temporal.namespace).toBeDefined();
    expect(config.temporal.taskQueue).toBeDefined();
  });

  it('should have openai configuration', () => {
    const config = require('../config').default;
    
    expect(config.openai).toBeDefined();
    expect(config.openai.apiKey).toBeDefined();
    expect(config.openai.model).toBeDefined();
    expect(config.openai.embeddingModel).toBeDefined();
  });

  it('should have rate limit configuration', () => {
    const config = require('../config').default;
    
    expect(config.rateLimit).toBeDefined();
    expect(config.rateLimit.windowMs).toBeDefined();
    expect(config.rateLimit.checkInterval).toBeDefined();
  });

  it('should have logging configuration', () => {
    const config = require('../config').default;
    
    expect(config.logging).toBeDefined();
    expect(config.logging.level).toBeDefined();
    expect(config.logging.format).toBeDefined();
  });

  it('should parse NATS servers as array', () => {
    const config = require('../config').default;
    
    expect(config.nats.servers).toHaveLength(1);
    expect(config.nats.servers[0]).toContain('nats://');
  });
});
