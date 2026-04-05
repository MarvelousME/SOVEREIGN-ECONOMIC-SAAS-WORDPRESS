jest.mock('ioredis', () => {
  const mockRedis = {
    hset: jest.fn().mockResolvedValue(1),
    hget: jest.fn().mockResolvedValue(null),
    hgetall: jest.fn().mockResolvedValue({}),
    hdel: jest.fn().mockResolvedValue(1),
    del: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    quit: jest.fn().mockResolvedValue('OK'),
  };
  return jest.fn(() => mockRedis);
});

jest.mock('@qdrant/js-client-rest', () => ({
  QdrantClient: jest.fn().mockImplementation(() => ({
    getCollection: jest.fn().mockResolvedValue({}),
    createCollection: jest.fn().mockResolvedValue({}),
    upsert: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    deleteCollection: jest.fn().mockResolvedValue({}),
    search: jest.fn().mockResolvedValue([]),
  })),
}));

jest.mock('openai', () => ({
  default: jest.fn().mockImplementation(() => ({
    embeddings: {
      create: jest.fn().mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0.1) }],
      }),
    },
  })),
}));

jest.mock('../utils/database', () => ({
  default: {
    query: jest.fn().mockResolvedValue({ rows: [] }),
  },
}));

jest.mock('../config', () => ({
  default: {
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
  },
}));

import { MemoryManagerImpl } from '../memory/MemoryManager';
import { MemoryType } from '../types';

describe('MemoryManagerImpl', () => {
  let memoryManager: MemoryManagerImpl;

  beforeEach(() => {
    jest.clearAllMocks();
    memoryManager = new MemoryManagerImpl();
  });

  describe('store', () => {
    it('should store short-term memory', async () => {
      const memoryId = await memoryManager.store(
        'agent-123',
        MemoryType.SHORT_TERM,
        'test content',
        { key: 'value' }
      );

      expect(memoryId).toBeDefined();
      expect(typeof memoryId).toBe('string');
    });

    it('should store long-term memory', async () => {
      const memoryId = await memoryManager.store(
        'agent-123',
        MemoryType.LONG_TERM,
        'persistent content',
        { important: true }
      );

      expect(memoryId).toBeDefined();
    });

    it('should store episodic memory', async () => {
      const memoryId = await memoryManager.store(
        'agent-123',
        MemoryType.EPISODIC,
        'event memory',
        { event: 'test' }
      );

      expect(memoryId).toBeDefined();
    });

    it('should store shared memory', async () => {
      const memoryId = await memoryManager.store(
        'agent-123',
        MemoryType.SHARED,
        'shared content',
        { shared: true }
      );

      expect(memoryId).toBeDefined();
    });

    it('should throw for unsupported memory type', async () => {
      await expect(
        memoryManager.store('agent-123', 'invalid' as MemoryType, 'content')
      ).rejects.toThrow('Unsupported memory type');
    });
  });

  describe('retrieve', () => {
    it('should retrieve short-term memory', async () => {
      const Redis = require('ioredis');
      const mockRedisInstance = new Redis();
      mockRedisInstance.hgetall.mockResolvedValueOnce({
        'mem-1': JSON.stringify({
          id: 'mem-1',
          content: 'test query result',
          metadata: {},
          createdAt: new Date(),
        }),
      });

      const results = await memoryManager.retrieve('agent-123', MemoryType.SHORT_TERM, 'query');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should retrieve long-term memory', async () => {
      const { QdrantClient } = require('@qdrant/js-client-rest');
      const mockQdrant = new QdrantClient();
      mockQdrant.getCollection.mockResolvedValueOnce({});
      mockQdrant.search.mockResolvedValueOnce([
        {
          id: 'mem-1',
          vector: new Array(1536).fill(0.1),
          payload: {
            content: 'stored content',
            metadata: {},
            createdAt: new Date().toISOString(),
          },
        },
      ]);

      const results = await memoryManager.retrieve('agent-123', MemoryType.LONG_TERM, 'query', 5);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should retrieve episodic memory', async () => {
      const database = require('../utils/database');
      database.default.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'mem-1',
            agent_id: 'Agent-123',
            content: 'episode content',
            metadata: {},
            created_at: new Date(),
          },
        ],
      });

      const results = await memoryManager.retrieve('agent-123', MemoryType.EPISODIC, 'episode');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should use default limit of 10', async () => {
      const results = await memoryManager.retrieve('agent-123', MemoryType.SHORT_TERM, 'query');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should throw for unsupported memory type', async () => {
      await expect(
        memoryManager.retrieve('agent-123', 'invalid' as MemoryType, 'query')
      ).rejects.toThrow('Unsupported memory type');
    });
  });

  describe('delete', () => {
    it('should delete memory from all stores', async () => {
      const Redis = require('ioredis');
      const mockRedisInstance = new Redis();

      await expect(
        memoryManager.delete('agent-123', 'memory-456')
      ).resolves.not.toThrow();

      expect(mockRedisInstance.hdel).toHaveBeenCalled();
    });

    it('should handle Qdrant deletion errors gracefully', async () => {
      const { QdrantClient } = require('@qdrant/js-client-rest');
      const mockQdrant = new QdrantClient();
      mockQdrant.delete.mockRejectedValueOnce(new Error('Qdrant error'));

      await expect(
        memoryManager.delete('agent-123', 'memory-456')
      ).resolves.not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all memory types when no type specified', async () => {
      const Redis = require('ioredis');
      const mockRedisInstance = new Redis();
      const { QdrantClient } = require('@qdrant/js-client-rest');
      const mockQdrant = new QdrantClient();
      const database = require('../utils/database');

      await memoryManager.clear('agent-123');

      expect(mockRedisInstance.del).toHaveBeenCalledTimes(2);
      expect(mockQdrant.deleteCollection).toHaveBeenCalled();
      expect(database.default.query).toHaveBeenCalled();
    });

    it('should clear only short-term memory when specified', async () => {
      const Redis = require('ioredis');
      const mockRedisInstance = new Redis();

      await memoryManager.clear('agent-123', MemoryType.SHORT_TERM);

      expect(mockRedisInstance.del).toHaveBeenCalledTimes(1);
    });

    it('should clear only long-term memory when specified', async () => {
      const { QdrantClient } = require('@qdrant/js-client-rest');
      const mockQdrant = new QdrantClient();

      await memoryManager.clear('agent-123', MemoryType.LONG_TERM);

      expect(mockQdrant.deleteCollection).toHaveBeenCalled();
    });

    it('should clear only episodic memory when specified', async () => {
      const database = require('../utils/database');

      await memoryManager.clear('agent-123', MemoryType.EPISODIC);

      expect(database.default.query).toHaveBeenCalled();
    });

    it('should handle Qdrant clear errors gracefully', async () => {
      const { QdrantClient } = require('@qdrant/js-client-rest');
      const mockQdrant = new QdrantClient();
      mockQdrant.deleteCollection.mockRejectedValueOnce(new Error('Qdrant error'));

      await expect(
        memoryManager.clear('agent-123', MemoryType.LONG_TERM)
      ).resolves.not.toThrow();
    });
  });

  describe('close', () => {
    it('should close redis connection', async () => {
      const Redis = require('ioredis');
      const mockRedisInstance = new Redis();

      await memoryManager.close();

      expect(mockRedisInstance.quit).toHaveBeenCalled();
    });
  });
});

describe('MemoryType enum', () => {
  it('should have correct values', () => {
    expect(MemoryType.SHORT_TERM).toBe('short_term');
    expect(MemoryType.LONG_TERM).toBe('long_term');
    expect(MemoryType.EPISODIC).toBe('episodic');
    expect(MemoryType.SHARED).toBe('shared');
  });
});
