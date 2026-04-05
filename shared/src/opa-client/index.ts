import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { logger } from '../logger';
import Redis from 'ioredis';

export interface PolicyInput {
  user?: {
    id: string;
    roles: string[];
    permissions: string[];
    tenantId?: string;
  };
  resource?: {
    type: string;
    id?: string;
    tenantId?: string;
    attributes?: Record<string, any>;
  };
  action: string;
  context?: Record<string, any>;
}

export interface PolicyDecision {
  allowed: boolean;
  reasons?: string[];
  obligations?: Record<string, any>;
}

export interface OpaQueryOptions {
  useCache?: boolean;
  cacheTtl?: number;
}

class OpaClient {
  private client: AxiosInstance;
  private redis: Redis | null = null;
  private readonly cachePrefix = 'opa:decision:';
  private readonly defaultCacheTtl = 300; // 5 minutes

  constructor() {
    const opaConfig = config.getOpaConfig();

    this.client = axios.create({
      baseURL: opaConfig.url,
      timeout: opaConfig.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.initializeRedis();
  }

  private initializeRedis(): void {
    try {
      const redisConfig = config.getRedisConfig();
      this.redis = new Redis({
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
        db: redisConfig.db,
        keyPrefix: redisConfig.keyPrefix,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      this.redis.on('error', (err) => {
        logger.error('Redis error in OPA client', { error: err.message });
      });
    } catch (error: any) {
      logger.warn('Failed to initialize Redis for OPA caching', {
        error: error.message,
      });
    }
  }

  /**
   * Query OPA policy
   */
  async query(
    policyPath: string,
    input: PolicyInput,
    options: OpaQueryOptions = {}
  ): Promise<PolicyDecision> {
    const useCache = options.useCache ?? true;
    const cacheTtl = options.cacheTtl ?? this.defaultCacheTtl;

    // Check cache first
    if (useCache && this.redis) {
      const cached = await this.getCachedDecision(policyPath, input);
      if (cached) {
        logger.debug('OPA decision retrieved from cache', { policyPath });
        return cached;
      }
    }

    try {
      const response = await this.client.post(`/v1/data/${policyPath}`, { input });

      const decision: PolicyDecision = {
        allowed: response.data.result?.allow ?? false,
        reasons: response.data.result?.reasons,
        obligations: response.data.result?.obligations,
      };

      // Cache the decision
      if (useCache && this.redis) {
        await this.cacheDecision(policyPath, input, decision, cacheTtl);
      }

      logger.debug('OPA policy decision', {
        policyPath,
        allowed: decision.allowed,
      });

      return decision;
    } catch (error: any) {
      logger.error('OPA query failed', {
        policyPath,
        error: error.message,
      });

      // Return fallback policy (deny by default)
      return this.getFallbackPolicy(policyPath, input);
    }
  }

  /**
   * Check if action is allowed
   */
  async isAllowed(
    policyPath: string,
    input: PolicyInput,
    options?: OpaQueryOptions
  ): Promise<boolean> {
    const decision = await this.query(policyPath, input, options);
    return decision.allowed;
  }

  /**
   * Batch policy checks
   */
  async batchQuery(
    policyPath: string,
    inputs: PolicyInput[]
  ): Promise<PolicyDecision[]> {
    const promises = inputs.map((input) =>
      this.query(policyPath, input, { useCache: true })
    );
    return Promise.all(promises);
  }

  /**
   * Get cached decision
   */
  private async getCachedDecision(
    policyPath: string,
    input: PolicyInput
  ): Promise<PolicyDecision | null> {
    if (!this.redis) return null;

    try {
      const cacheKey = this.getCacheKey(policyPath, input);
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error: any) {
      logger.error('Failed to get cached OPA decision', {
        error: error.message,
      });
    }

    return null;
  }

  /**
   * Cache decision
   */
  private async cacheDecision(
    policyPath: string,
    input: PolicyInput,
    decision: PolicyDecision,
    ttl: number
  ): Promise<void> {
    if (!this.redis) return;

    try {
      const cacheKey = this.getCacheKey(policyPath, input);
      await this.redis.setex(cacheKey, ttl, JSON.stringify(decision));
    } catch (error: any) {
      logger.error('Failed to cache OPA decision', {
        error: error.message,
      });
    }
  }

  /**
   * Generate cache key
   */
  private getCacheKey(policyPath: string, input: PolicyInput): string {
    const key = JSON.stringify({ policyPath, input });
    const hash = require('crypto').createHash('sha256').update(key).digest('hex');
    return `${this.cachePrefix}${hash}`;
  }

  /**
   * Invalidate cache for policy
   */
  async invalidateCache(policyPath?: string): Promise<void> {
    if (!this.redis) return;

    try {
      if (policyPath) {
        // Invalidate specific policy (requires scanning)
        const pattern = `${this.cachePrefix}*`;
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } else {
        // Invalidate all OPA cache
        const pattern = `${this.cachePrefix}*`;
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }

      logger.info('OPA cache invalidated', { policyPath });
    } catch (error: any) {
      logger.error('Failed to invalidate OPA cache', {
        error: error.message,
      });
    }
  }

  /**
   * Fallback policy when OPA is unavailable
   */
  private getFallbackPolicy(policyPath: string, input: PolicyInput): PolicyDecision {
    logger.warn('Using fallback policy (deny)', { policyPath });

    // Implement fallback logic here
    // For now, deny by default for security
    return {
      allowed: false,
      reasons: ['OPA service unavailable, using fallback policy'],
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      logger.error('OPA health check failed', { error });
      return false;
    }
  }

  /**
   * Load policy bundle
   */
  async loadPolicy(policyName: string, policy: string): Promise<void> {
    try {
      await this.client.put(`/v1/policies/${policyName}`, policy, {
        headers: { 'Content-Type': 'text/plain' },
      });

      logger.info('Policy loaded successfully', { policyName });

      // Invalidate cache after policy update
      await this.invalidateCache();
    } catch (error: any) {
      logger.error('Failed to load policy', {
        policyName,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
      logger.info('OPA client Redis connection closed');
    }
  }
}

// Export singleton instance
export const opaClient = new OpaClient();

// Export class for testing or custom instances
export { OpaClient };
