import { RateLimiter, AgentFetch, FetchResult } from '../src/executors/RateLimiter';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('acquire', () => {
    it('should acquire token when available', async () => {
      const result = await rateLimiter.acquire('agent-1');
      expect(result).toBe(true);
    });

    it('should consume tokens on acquire', async () => {
      await rateLimiter.acquire('agent-1');
      await rateLimiter.acquire('agent-1');
      const metrics = rateLimiter.getMetrics('agent-1');
      expect(metrics.totalCalls).toBe(2);
    });

    it('should track metrics correctly', () => {
      rateLimiter.recordCall('agent-1', true, 100);
      rateLimiter.recordCall('agent-1', false, 0, true);

      const metrics = rateLimiter.getMetrics('agent-1');
      expect(metrics.totalCalls).toBe(2);
      expect(metrics.successfulCalls).toBe(1);
      expect(metrics.failedCalls).toBe(1);
      expect(metrics.rateLimitedCalls).toBe(1);
      expect(metrics.totalTokens).toBe(100);
    });
  });

  describe('setAgentLimits', () => {
    it('should set custom limits per agent', () => {
      rateLimiter.setAgentLimits('agent-1', 60, 1000);
      const metrics = rateLimiter.getMetrics('agent-1');
      expect(metrics).toBeDefined();
    });
  });

  describe('waitForSlot', () => {
    it('should wait and acquire slot when available', async () => {
      await expect(rateLimiter.waitForSlot('agent-1')).resolves.not.toThrow();
    });

    it('should queue requests when rate limited', async () => {
      const bucket = rateLimiter['buckets'].get('agent-1');
      if (bucket) {
        bucket.tokens = 0;
      }

      const waitPromise = rateLimiter.waitForSlot('agent-1');
      expect(bucket?.queue.length).toBe(1);

      rateLimiter.processQueue('agent-1');
    });
  });
});

describe('AgentFetch', () => {
  let agentFetch: AgentFetch;
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter();
    agentFetch = new AgentFetch(rateLimiter);
    jest.clearAllMocks();
  });

  describe('fetch', () => {
    it('should return FetchResult on success', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map(Object.entries({ 'content-type': 'application/json' })),
        json: () => Promise.resolve({ result: 'success' }),
      };

      jest.spyOn(global, 'fetch').mockResolvedValueOnce(mockResponse as unknown as Response);

      const result = await agentFetch.fetch('agent-1', 'https://api.example.com/data');

      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
      expect(result.data).toEqual({ result: 'success' });
    });

    it('should handle POST requests with body', async () => {
      const mockResponse = {
        ok: true,
        status: 201,
        statusText: 'Created',
        headers: new Map(),
        json: () => Promise.resolve({ id: '123' }),
      };

      jest.spyOn(global, 'fetch').mockResolvedValueOnce(mockResponse as unknown as Response);

      const result = await agentFetch.fetch('agent-1', 'https://api.example.com/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { name: 'test' },
      });

      expect(result.ok).toBe(true);
      expect(result.status).toBe(201);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          method: 'POST',
          body: '{"name":"test"}',
        })
      );
    });

    it('should handle 429 rate limit with retry', async () => {
      const mock429Response = {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Map([['retry-after', '1']]),
        json: () => Promise.resolve({ error: 'rate limited' }),
      };

      const mockSuccessResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map(),
        json: () => Promise.resolve({ data: 'success' }),
      };

      jest.spyOn(global, 'fetch')
        .mockResolvedValueOnce(mock429Response as unknown as Response)
        .mockResolvedValueOnce(mockSuccessResponse as unknown as Response);

      const result = await agentFetch.fetch('agent-1', 'https://api.example.com/data');

      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should return error after max retries', async () => {
      const mock429Response = {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Map(),
        json: () => Promise.resolve({ error: 'rate limited' }),
      };

      jest.spyOn(global, 'fetch').mockResolvedValue(mock429Response as unknown as Response);

      const result = await agentFetch.fetch('agent-1', 'https://api.example.com/data');

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Max retries exceeded');
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should handle network errors', async () => {
      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

      const result = await agentFetch.fetch('agent-1', 'https://api.example.com/data');

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should track metrics for each agent', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map(),
        json: () => Promise.resolve({ data: 'test' }),
      };

      jest.spyOn(global, 'fetch').mockResolvedValueOnce(mockResponse as unknown as Response);

      await agentFetch.fetch('agent-1', 'https://api.example.com/data');

      const metrics = agentFetch.getMetrics('agent-1');
      expect(metrics.totalCalls).toBe(1);
      expect(metrics.successfulCalls).toBe(1);
    });

    it('should set agent limits', () => {
      agentFetch.setAgentLimits('agent-1', 60, 1000);
      const metrics = agentFetch.getMetrics('agent-1');
      expect(metrics).toBeDefined();
    });
  });

  describe('exponential backoff', () => {
    it('should increase delay with each retry', async () => {
      const mock429Response = {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Map(),
        json: () => Promise.resolve({ error: 'rate limited' }),
      };

      jest.spyOn(global, 'fetch').mockResolvedValue(mock429Response as unknown as Response);

      const startTime = Date.now();
      await agentFetch.fetch('agent-1', 'https://api.example.com/data');
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThan(1000);
    });
  });
});

describe('FetchResult structure', () => {
  it('should have correct FetchResult interface', () => {
    const result: FetchResult = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      data: { message: 'hello' },
    };

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.headers['content-type']).toBe('application/json');
    expect(result.data).toEqual({ message: 'hello' });
  });

  it('should support error results', () => {
    const result: FetchResult = {
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      headers: { 'retry-after': '60' },
      data: null,
      error: 'Rate limit exceeded',
    };

    expect(result.ok).toBe(false);
    expect(result.error).toBe('Rate limit exceeded');
  });
});
