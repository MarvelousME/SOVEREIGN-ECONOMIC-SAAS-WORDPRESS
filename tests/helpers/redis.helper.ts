import { createClient, RedisClientType } from 'redis';

export class RedisHelper {
  private client?: RedisClientType;

  async connect(): Promise<void> {
    if (this.client) return;
    
    this.client = createClient({
      url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
      password: process.env.REDIS_PASSWORD || undefined,
    });
    
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = undefined;
    }
  }

  async flushAll(): Promise<void> {
    if (!this.client) {
      throw new Error('Redis not connected');
    }
    await this.client.flushAll();
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.client) {
      throw new Error('Redis not connected');
    }
    if (ttl) {
      await this.client.setEx(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) {
      throw new Error('Redis not connected');
    }
    return await this.client.get(key);
  }

  async delete(key: string): Promise<void> {
    if (!this.client) {
      throw new Error('Redis not connected');
    }
    await this.client.del(key);
  }

  async setJSON(key: string, value: any, ttl?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttl);
  }

  async getJSON<T = any>(key: string): Promise<T | null> {
    const value = await this.get(key);
    return value ? JSON.parse(value) : null;
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) {
      throw new Error('Redis not connected');
    }
    return (await this.client.exists(key)) === 1;
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.client) {
      throw new Error('Redis not connected');
    }
    return await this.client.keys(pattern);
  }
}

// Singleton instance
let redisHelper: RedisHelper;

export function getRedisHelper(): RedisHelper {
  if (!redisHelper) {
    redisHelper = new RedisHelper();
  }
  return redisHelper;
}

// Global setup and cleanup
beforeAll(async () => {
  const helper = getRedisHelper();
  await helper.connect();
});

beforeEach(async () => {
  const helper = getRedisHelper();
  await helper.flushAll();
});

afterAll(async () => {
  if (redisHelper) {
    await redisHelper.disconnect();
  }
});
