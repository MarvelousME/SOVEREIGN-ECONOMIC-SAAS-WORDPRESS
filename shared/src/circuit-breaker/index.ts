import CircuitBreaker from 'opossum';
import { logger } from '../logger';
import { CircuitBreakerConfig } from '../types';

export class ServiceCircuitBreaker {
  private breakers: Map<string, CircuitBreaker> = new Map();

  /**
   * Create or get existing circuit breaker
   */
  getBreaker(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (this.breakers.has(name)) {
      return this.breakers.get(name)!;
    }

    const defaultConfig: CircuitBreakerConfig = {
      timeout: 3000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
      rollingCountTimeout: 10000,
      rollingCountBuckets: 10,
      name,
    };

    const breakerConfig = { ...defaultConfig, ...config };
    const breaker = new CircuitBreaker(async () => {}, breakerConfig);

    // Event handlers
    breaker.on('open', () => {
      logger.warn(`Circuit breaker opened for ${name}`);
    });

    breaker.on('halfOpen', () => {
      logger.info(`Circuit breaker half-open for ${name}`);
    });

    breaker.on('close', () => {
      logger.info(`Circuit breaker closed for ${name}`);
    });

    breaker.on('failure', (error) => {
      logger.error(`Circuit breaker failure for ${name}`, { error: error.message });
    });

    this.breakers.set(name, breaker);
    return breaker;
  }

  /**
   * Execute function with circuit breaker
   */
  async execute<T>(
    name: string,
    fn: () => Promise<T>,
    config?: Partial<CircuitBreakerConfig>
  ): Promise<T> {
    const breaker = this.getBreaker(name, config);
    return breaker.fire(fn);
  }

  /**
   * Get circuit breaker stats
   */
  getStats(name: string) {
    const breaker = this.breakers.get(name);
    if (!breaker) return null;

    return {
      state: breaker.opened ? 'open' : breaker.halfOpen ? 'half-open' : 'closed',
      stats: breaker.stats.toJSON(),
    };
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    this.breakers.forEach((breaker) => breaker.close());
  }
}

export const circuitBreaker = new ServiceCircuitBreaker();
