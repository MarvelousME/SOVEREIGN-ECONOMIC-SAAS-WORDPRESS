import { createClient, RedisClientType } from 'redis';
import { config } from '../config';
import { logger } from './logger';

class RedisCache {
  private client: RedisClientType | null = null;

  async connect(): Promise<void> {
    try {
      this.client = createClient({
        socket: {
          host: config.redis.host,
          port: config.redis.port
        },
        password: config.redis.password,
        database: config.redis.db
      });

      this.client.on('error', (err) => {
        logger.error('Redis error', { error: err });
      });

      this.client.on('connect', () => {
        logger.info('Redis connected');
      });

      await this.client.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis', { error });
      throw error;
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) {
      throw new Error('Redis client not connected');
    }
    return await this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.client) {
      throw new Error('Redis client not connected');
    }
    if (ttl) {
      await this.client.setEx(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) {
      throw new Error('Redis client not connected');
    }
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) {
      throw new Error('Redis client not connected');
    }
    return (await this.client.exists(key)) === 1;
  }

  async incr(key: string): Promise<number> {
    if (!this.client) {
      throw new Error('Redis client not connected');
    }
    return await this.client.incr(key);
  }

  async lpush(key: string, ...values: string[]): Promise<number> {
    if (!this.client) {
      throw new Error('Redis client not connected');
    }
    return await this.client.lPush(key, values);
  }

  async rpop(key: string): Promise<string | null> {
    if (!this.client) {
      throw new Error('Redis client not connected');
    }
    return await this.client.rPop(key);
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.client) {
        return false;
      }
      await this.client.ping();
      return true;
    } catch (error) {
      logger.error('Redis health check failed', { error });
      return false;
    }
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      logger.info('Redis connection closed');
    }
  }
}

export const redis = new RedisCache();
