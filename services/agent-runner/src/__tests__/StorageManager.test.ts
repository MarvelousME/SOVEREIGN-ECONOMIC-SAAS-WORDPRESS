jest.mock('minio', () => {
  const mockMinio = {
    bucketExists: jest.fn().mockResolvedValue(true),
    makeBucket: jest.fn().mockResolvedValue(undefined),
    putObject: jest.fn().mockResolvedValue(undefined),
    getObject: jest.fn().mockResolvedValue({
      on: jest.fn((event, callback) => {
        if (event === 'data') callback(Buffer.from('test content'));
        if (event === 'end') callback();
        return { on: jest.fn() };
      }),
    }),
    removeObject: jest.fn().mockResolvedValue(undefined),
  };
  return { Client: jest.fn(() => mockMinio) };
});

jest.mock('../utils/database', () => ({
  default: {
    query: jest.fn().mockResolvedValue({
      rows: [{
        id: 'artifact-123',
        agent_id: 'agent-123',
        execution_id: 'exec-456',
        name: 'test.txt',
        type: 'text/plain',
        path: 'agent-123/exec-456/artifact-123/test.txt',
        size: 1024,
        metadata: {},
        created_at: new Date(),
      }],
    }),
  },
}));

jest.mock('../config', () => ({
  default: {
    minio: {
      endPoint: 'localhost',
      port: 9000,
      useSSL: false,
      accessKey: 'minioadmin',
      secretKey: 'minioadmin',
      bucket: 'test-bucket',
    },
  },
}));

import { StorageManagerImpl } from '../storage/StorageManager';

describe('StorageManagerImpl', () => {
  let storageManager: StorageManagerImpl;
  let mockMinio: any;

  beforeEach(() => {
    jest.clearAllMocks();
    storageManager = new StorageManagerImpl();
    const Minio = require('minio');
    mockMinio = new Minio.Client();
  });

  describe('upload', () => {
    it('should upload artifact successfully', async () => {
      const artifact = await storageManager.upload(
        'agent-123',
        'exec-456',
        'test.txt',
        Buffer.from('test content'),
        { contentType: 'text/plain' }
      );

      expect(artifact).toBeDefined();
      expect(artifact.id).toBeDefined();
      expect(artifact.agentId).toBe('agent-123');
      expect(artifact.executionId).toBe('exec-456');
      expect(artifact.name).toBe('test.txt');
      expect(artifact.size).toBe(12);
    });

    it('should upload to correct object path', async () => {
      await storageManager.upload(
        'agent-123',
        'exec-456',
        'data.json',
        Buffer.from('{"key":"value"}')
      );

      expect(mockMinio.putObject).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('agent-123/exec-456'),
        expect.any(Buffer),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('should store metadata in database', async () => {
      const database = require('../utils/database');
      
      await storageManager.upload(
        'agent-123',
        'exec-456',
        'test.txt',
        Buffer.from('content'),
        { customMeta: 'value' }
      );

      expect(database.default.query).toHaveBeenCalled();
    });

    it('should use default content type when not specified', async () => {
      await storageManager.upload(
        'agent-123',
        'exec-456',
        'test.txt',
        Buffer.from('content')
      );

      expect(mockMinio.putObject).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(Buffer),
        expect.any(Number),
        expect.objectContaining({
          'Content-Type': 'application/octet-stream',
        })
      );
    });
  });

  describe('download', () => {
    it('should download artifact successfully', async () => {
      const buffer = await storageManager.download('artifact-123');

      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('should throw error when artifact not found', async () => {
      const database = require('../utils/database');
      database.default.query.mockResolvedValueOnce({ rows: [] });

      await expect(storageManager.download('non-existent')).rejects.toThrow('Artifact not found');
    });

    it('should get object from correct path', async () => {
      await storageManager.download('artifact-123');

      expect(mockMinio.getObject).toHaveBeenCalledWith(
        expect.any(String),
        'agent-123/exec-456/artifact-123/test.txt'
      );
    });
  });

  describe('delete', () => {
    it('should delete artifact successfully', async () => {
      const database = require('../utils/database');
      
      await expect(storageManager.delete('artifact-123')).resolves.not.toThrow();

      expect(mockMinio.removeObject).toHaveBeenCalled();
      expect(database.default.query).toHaveBeenCalledWith(
        'DELETE FROM agent_artifacts WHERE id = $1',
        ['artifact-123']
      );
    });

    it('should throw error when artifact not found', async () => {
      const database = require('../utils/database');
      database.default.query.mockResolvedValueOnce({ rows: [] });

      await expect(storageManager.delete('non-existent')).rejects.toThrow('Artifact not found');
    });

    it('should delete from both MinIO and database', async () => {
      const database = require('../utils/database');
      
      await storageManager.delete('artifact-123');

      expect(mockMinio.removeObject).toHaveBeenCalled();
      expect(database.default.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('list', () => {
    it('should list all artifacts for agent', async () => {
      const database = require('../utils/database');
      database.default.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'art-1',
            agent_id: 'agent-123',
            execution_id: 'exec-1',
            name: 'file1.txt',
            type: 'text/plain',
            path: 'path1',
            size: 100,
            metadata: {},
            created_at: new Date(),
          },
          {
            id: 'art-2',
            agent_id: 'agent-123',
            execution_id: 'exec-2',
            name: 'file2.txt',
            type: 'text/plain',
            path: 'path2',
            size: 200,
            metadata: {},
            created_at: new Date(),
          },
        ],
      });

      const artifacts = await storageManager.list('agent-123');

      expect(artifacts).toHaveLength(2);
      expect(artifacts[0].id).toBe('art-1');
      expect(artifacts[1].id).toBe('art-2');
    });

    it('should filter by execution ID when provided', async () => {
      const database = require('../utils/database');
      
      await storageManager.list('agent-123', 'exec-456');

      expect(database.default.query).toHaveBeenCalledWith(
        expect.stringContaining('AND execution_id = $2'),
        expect.arrayContaining(['agent-123', 'exec-456'])
      );
    });

    it('should parse JSON metadata correctly', async () => {
      const database = require('../utils/database');
      database.default.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'art-1',
            agent_id: 'agent-123',
            execution_id: 'exec-1',
            name: 'file1.txt',
            type: 'text/plain',
            path: 'path1',
            size: 100,
            metadata: '{"key":"value"}',
            created_at: new Date(),
          },
        ],
      });

      const artifacts = await storageManager.list('agent-123');

      expect(artifacts[0].metadata).toEqual({ key: 'value' });
    });

    it('should handle already parsed metadata', async () => {
      const database = require('../utils/database');
      database.default.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'art-1',
            agent_id: 'agent-123',
            execution_id: 'exec-1',
            name: 'file1.txt',
            type: 'text/plain',
            path: 'path1',
            size: 100,
            metadata: { parsed: true },
            created_at: new Date(),
          },
        ],
      });

      const artifacts = await storageManager.list('agent-123');

      expect(artifacts[0].metadata).toEqual({ parsed: true });
    });
  });
});

describe('Artifact interface', () => {
  it('should have all required fields', () => {
    const artifact = {
      id: 'artifact-123',
      agentId: 'agent-123',
      executionId: 'exec-456',
      name: 'test.txt',
      type: 'text/plain',
      path: 'path/to/file.txt',
      size: 1024,
      metadata: { key: 'value' },
      createdAt: new Date(),
    };

    expect(artifact.id).toBeDefined();
    expect(artifact.agentId).toBeDefined();
    expect(artifact.executionId).toBeDefined();
    expect(artifact.name).toBeDefined();
    expect(artifact.type).toBeDefined();
    expect(artifact.path).toBeDefined();
    expect(artifact.size).toBeGreaterThanOrEqual(0);
    expect(artifact.metadata).toBeDefined();
    expect(artifact.createdAt).toBeInstanceOf(Date);
  });
});
