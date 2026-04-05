import config from '../config';
import logger from '../utils/logger';

export interface FetchResult {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
  error?: string;
}

export interface FetchMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  totalTokens: number;
  totalRetries: number;
  rateLimitedCalls: number;
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  queue: Array<{
    resolve: (value: boolean) => void;
    reject: (error: Error) => void;
    tokensNeeded: number;
  }>;
}

export class RateLimiter {
  private buckets: Map<string, TokenBucket> = new Map();
  private metrics: Map<string, FetchMetrics> = new Map();
  private maxTokens: number;
  private refillRate: number;
  private agentLimits: Map<string, { requestsPerMinute: number; tokensPerMinute: number }> = new Map();

  constructor() {
    this.maxTokens = config.rateLimit.windowMs / 1000 * 10;
    this.refillRate = this.maxTokens / (config.rateLimit.windowMs / 1000);
  }

  setAgentLimits(agentId: string, requestsPerMinute: number, tokensPerMinute: number): void {
    this.agentLimits.set(agentId, { requestsPerMinute, tokensPerMinute });
  }

  private getBucket(agentId: string): TokenBucket {
    if (!this.buckets.has(agentId)) {
      this.buckets.set(agentId, {
        tokens: this.getMaxTokensForAgent(agentId),
        lastRefill: Date.now(),
        queue: [],
      });
    }
    return this.buckets.get(agentId)!;
  }

  private getMaxTokensForAgent(agentId: string): number {
    const limits = this.agentLimits.get(agentId);
    return limits?.requestsPerMinute || this.maxTokens;
  }

  private refillBucket(bucket: TokenBucket, agentId: string): void {
    const now = Date.now();
    const timePassed = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = timePassed * this.refillRate;
    bucket.tokens = Math.min(this.getMaxTokensForAgent(agentId), bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  async acquire(agentId: string, tokensNeeded: number = 1): Promise<boolean> {
    const bucket = this.getBucket(agentId);
    this.refillBucket(bucket, agentId);

    if (bucket.tokens >= tokensNeeded) {
      bucket.tokens -= tokensNeeded;
      return true;
    }

    return new Promise((resolve) => {
      const waitTime = ((tokensNeeded - bucket.tokens) / this.refillRate) * 1000;
      setTimeout(() => {
        this.refillBucket(bucket, agentId);
        if (bucket.tokens >= tokensNeeded) {
          bucket.tokens -= tokensNeeded;
          resolve(true);
        } else {
          this.acquire(agentId, tokensNeeded).then(resolve);
        }
      }, Math.min(waitTime, 1000));
    });
  }

  async waitForSlot(agentId: string, tokensNeeded: number = 1): Promise<void> {
    const bucket = this.getBucket(agentId);
    this.refillBucket(bucket, agentId);

    if (bucket.tokens >= tokensNeeded) {
      bucket.tokens -= tokensNeeded;
      return;
    }

    return new Promise((resolve, reject) => {
      bucket.queue.push({
        resolve: () => {
          this.refillBucket(bucket, agentId);
          if (bucket.tokens >= tokensNeeded) {
            bucket.tokens -= tokensNeeded;
            resolve();
          } else {
            this.waitForSlot(agentId, tokensNeeded).then(resolve).catch(reject);
          }
        },
        reject,
        tokensNeeded,
      });
    });
  }

  processQueue(agentId: string): void {
    const bucket = this.getBucket(agentId);
    this.refillBucket(bucket, agentId);

    while (bucket.queue.length > 0 && bucket.tokens >= bucket.queue[0].tokensNeeded) {
      const item = bucket.queue.shift()!;
      bucket.tokens -= item.tokensNeeded;
      item.resolve(true);
    }
  }

  getMetrics(agentId: string): FetchMetrics {
    if (!this.metrics.has(agentId)) {
      this.metrics.set(agentId, {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        totalTokens: 0,
        totalRetries: 0,
        rateLimitedCalls: 0,
      });
    }
    return this.metrics.get(agentId)!;
  }

  recordCall(agentId: string, success: boolean, tokensUsed: number = 0, wasRateLimited: boolean = false): void {
    const metrics = this.getMetrics(agentId);
    metrics.totalCalls++;
    if (success) {
      metrics.successfulCalls++;
    } else {
      metrics.failedCalls++;
    }
    if (tokensUsed > 0) {
      metrics.totalTokens += tokensUsed;
    }
    if (wasRateLimited) {
      metrics.rateLimitedCalls++;
    }
  }

  recordRetry(agentId: string): void {
    const metrics = this.getMetrics(agentId);
    metrics.totalRetries++;
  }

  resetMetrics(agentId: string): void {
    this.metrics.delete(agentId);
  }
}

export class AgentFetch {
  private rateLimiter: RateLimiter;
  private maxRetries: number = 3;
  private baseDelayMs: number = 1000;
  private maxDelayMs: number = 30000;

  constructor(rateLimiter: RateLimiter) {
    this.rateLimiter = rateLimiter;
  }

  async fetch(
    agentId: string,
    url: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: any;
      timeout?: number;
      signal?: AbortSignal;
    } = {}
  ): Promise<FetchResult> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = 30000,
      signal,
    } = options;

    await this.rateLimiter.waitForSlot(agentId);

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt < this.maxRetries) {
      try {
        const result = await this.executeFetch(agentId, url, {
          method,
          headers,
          body,
          timeout,
          signal,
        });

        if (result.status === 429) {
          const retryAfter = this.getRetryAfterHeader(result.headers);
          const delay = retryAfter || this.calculateBackoff(attempt);

          this.rateLimiter.recordCall(agentId, false, 0, true);
          this.rateLimiter.recordRetry(agentId);

          logger.debug('Rate limited, retrying', {
            agentId,
            url,
            attempt: attempt + 1,
            delay,
          });

          await this.sleep(delay);
          attempt++;
          continue;
        }

        const tokensUsed = this.estimateTokens(result.data);
        this.rateLimiter.recordCall(agentId, result.ok, tokensUsed);

        return result;
      } catch (error: any) {
        lastError = error;
        attempt++;

        if (attempt < this.maxRetries) {
          const delay = this.calculateBackoff(attempt);
          logger.debug('Fetch error, retrying', {
            agentId,
            url,
            error: error.message,
            attempt,
            delay,
          });

          await this.sleep(delay);
        }
      }
    }

    this.rateLimiter.recordCall(agentId, false, 0);

    return {
      ok: false,
      status: 0,
      statusText: 'Max retries exceeded',
      headers: {},
      data: null,
      error: lastError?.message || 'Max retries exceeded',
    };
  }

  private async executeFetch(
    agentId: string,
    url: string,
    options: {
      method: string;
      headers: Record<string, string>;
      body?: any;
      timeout: number;
      signal?: AbortSignal;
    }
  ): Promise<FetchResult> {
    return new Promise((resolve, reject) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.timeout);

      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          controller.abort();
        });
      }

      const fetchOptions: RequestInit = {
        method: options.method,
        headers: options.headers,
        body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined,
        signal: controller.signal,
      };

      fetch(url, fetchOptions)
        .then(async (response) => {
          clearTimeout(timeoutId);

          const responseHeaders: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            responseHeaders[key] = value;
          });

          let data: any;
          const contentType = response.headers.get('content-type') || '';

          if (contentType.includes('application/json')) {
            data = await response.json();
          } else {
            data = await response.text();
          }

          resolve({
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
            data,
          });
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  private calculateBackoff(attempt: number): number {
    const delay = Math.min(this.baseDelayMs * Math.pow(2, attempt), this.maxDelayMs);
    const jitter = Math.random() * 1000;
    return delay + jitter;
  }

  private getRetryAfterHeader(headers: Record<string, string>): number {
    const retryAfter = headers['retry-after'] || headers['Retry-After'];
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) {
        return seconds * 1000;
      }
    }
    return 0;
  }

  private estimateTokens(data: any): number {
    if (!data) return 0;
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    return Math.ceil(str.length / 4);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getMetrics(agentId: string): FetchMetrics {
    return this.rateLimiter.getMetrics(agentId);
  }

  setAgentLimits(agentId: string, requestsPerMinute: number, tokensPerMinute: number): void {
    this.rateLimiter.setAgentLimits(agentId, requestsPerMinute, tokensPerMinute);
  }
}

export const rateLimiter = new RateLimiter();
export const agentFetch = new AgentFetch(rateLimiter);
