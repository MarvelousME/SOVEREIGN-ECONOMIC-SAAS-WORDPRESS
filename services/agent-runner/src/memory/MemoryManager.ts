import Redis from 'ioredis';
import { QdrantClient } from '@qdrant/js-client-rest';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import config from '../config';
import database from '../utils/database';
import logger from '../utils/logger';
import { MemoryManager, MemoryEntry, MemoryType } from '../types';

export class MemoryManagerImpl implements MemoryManager {
  private redis: Redis;
  private qdrant: QdrantClient;
  private openai: OpenAI;

  constructor() {
    this.redis = new Redis(config.redis);
    this.qdrant = new QdrantClient({
      url: `http://${config.qdrant.host}:${config.qdrant.port}`,
      apiKey: config.qdrant.apiKey,
    });
    this.openai = new OpenAI({ apiKey: config.openai.apiKey });
  }

  async store(
    agentId: string,
    type: MemoryType,
    content: string,
    metadata: Record<string, any> = {}
  ): Promise<string> {
    const memoryId = uuidv4();
    const now = new Date();

    logger.debug('Storing memory', { agentId, type, memoryId });

    switch (type) {
      case MemoryType.SHORT_TERM:
        await this.storeShortTerm(agentId, memoryId, content, metadata);
        break;

      case MemoryType.LONG_TERM:
        await this.storeLongTerm(agentId, memoryId, content, metadata);
        break;

      case MemoryType.EPISODIC:
        await this.storeEpisodic(agentId, memoryId, content, metadata);
        break;

      case MemoryType.SHARED:
        await this.storeShared(agentId, memoryId, content, metadata);
        break;

      default:
        throw new Error(`Unsupported memory type: ${type}`);
    }

    logger.info('Memory stored successfully', { agentId, type, memoryId });
    return memoryId;
  }

  async retrieve(
    agentId: string,
    type: MemoryType,
    query: string,
    limit: number = 10
  ): Promise<MemoryEntry[]> {
    logger.debug('Retrieving memory', { agentId, type, query, limit });

    switch (type) {
      case MemoryType.SHORT_TERM:
        return await this.retrieveShortTerm(agentId, query, limit);

      case MemoryType.LONG_TERM:
        return await this.retrieveLongTerm(agentId, query, limit);

      case MemoryType.EPISODIC:
        return await this.retrieveEpisodic(agentId, query, limit);

      case MemoryType.SHARED:
        return await this.retrieveShared(agentId, query, limit);

      default:
        throw new Error(`Unsupported memory type: ${type}`);
    }
  }

  async delete(agentId: string, memoryId: string): Promise<void> {
    logger.info('Deleting memory', { agentId, memoryId });

    // Delete from Redis (short-term)
    await this.redis.hdel(`agent:${agentId}:short_term`, memoryId);

    // Delete from Qdrant (long-term)
    const collectionName = `${config.qdrant.collectionPrefix}_${agentId}`;
    try {
      await this.qdrant.delete(collectionName, {
        wait: true,
        points: [memoryId],
      });
    } catch (error) {
      logger.warn('Failed to delete from Qdrant', { error, memoryId });
    }

    // Delete from PostgreSQL (episodic)
    await database.query(
      'DELETE FROM agent_episodic_memory WHERE agent_id = $1 AND id = $2',
      [agentId, memoryId]
    );
  }

  async clear(agentId: string, type?: MemoryType): Promise<void> {
    logger.info('Clearing memory', { agentId, type });

    if (!type || type === MemoryType.SHORT_TERM) {
      await this.redis.del(`agent:${agentId}:short_term`);
    }

    if (!type || type === MemoryType.LONG_TERM) {
      const collectionName = `${config.qdrant.collectionPrefix}_${agentId}`;
      try {
        await this.qdrant.deleteCollection(collectionName);
      } catch (error) {
        logger.warn('Failed to delete Qdrant collection', { error, collectionName });
      }
    }

    if (!type || type === MemoryType.EPISODIC) {
      await database.query('DELETE FROM agent_episodic_memory WHERE agent_id = $1', [agentId]);
    }

    if (!type || type === MemoryType.SHARED) {
      await this.redis.del(`agent:${agentId}:shared`);
    }
  }

  private async storeShortTerm(
    agentId: string,
    memoryId: string,
    content: string,
    metadata: Record<string, any>
  ): Promise<void> {
    const entry: MemoryEntry = {
      id: memoryId,
      agentId,
      type: MemoryType.SHORT_TERM,
      content,
      metadata,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + config.memory.shortTermTTL * 1000),
    };

    await this.redis.hset(
      `agent:${agentId}:short_term`,
      memoryId,
      JSON.stringify(entry)
    );
    await this.redis.expire(`agent:${agentId}:short_term`, config.memory.shortTermTTL);
  }

  private async storeLongTerm(
    agentId: string,
    memoryId: string,
    content: string,
    metadata: Record<string, any>
  ): Promise<void> {
    // Generate embedding
    const embedding = await this.generateEmbedding(content);

    // Ensure collection exists
    const collectionName = `${config.qdrant.collectionPrefix}_${agentId}`;
    await this.ensureCollection(collectionName);

    // Store in Qdrant
    await this.qdrant.upsert(collectionName, {
      wait: true,
      points: [
        {
          id: memoryId,
          vector: embedding,
          payload: {
            content,
            metadata,
            createdAt: new Date().toISOString(),
          },
        },
      ],
    });
  }

  private async storeEpisodic(
    agentId: string,
    memoryId: string,
    content: string,
    metadata: Record<string, any>
  ): Promise<void> {
    const query = `
      INSERT INTO agent_episodic_memory (id, agent_id, content, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5)
    `;

    await database.query(query, [
      memoryId,
      agentId,
      content,
      JSON.stringify(metadata),
      new Date(),
    ]);
  }

  private async storeShared(
    agentId: string,
    memoryId: string,
    content: string,
    metadata: Record<string, any>
  ): Promise<void> {
    const entry: MemoryEntry = {
      id: memoryId,
      agentId,
      type: MemoryType.SHARED,
      content,
      metadata,
      createdAt: new Date(),
    };

    await this.redis.hset(
      `agent:${agentId}:shared`,
      memoryId,
      JSON.stringify(entry)
    );
  }

  private async retrieveShortTerm(
    agentId: string,
    query: string,
    limit: number
  ): Promise<MemoryEntry[]> {
    const entries = await this.redis.hgetall(`agent:${agentId}:short_term`);
    const memories: MemoryEntry[] = Object.values(entries)
      .map(e => JSON.parse(e))
      .filter(m => m.content.toLowerCase().includes(query.toLowerCase()))
      .slice(0, limit);

    return memories;
  }

  private async retrieveLongTerm(
    agentId: string,
    query: string,
    limit: number
  ): Promise<MemoryEntry[]> {
    const collectionName = `${config.qdrant.collectionPrefix}_${agentId}`;
    
    // Check if collection exists
    try {
      await this.qdrant.getCollection(collectionName);
    } catch (error) {
      logger.debug('Collection does not exist', { collectionName });
      return [];
    }

    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);

    // Search in Qdrant
    const searchResult = await this.qdrant.search(collectionName, {
      vector: queryEmbedding,
      limit: Math.min(limit, config.memory.longTermMaxResults),
      with_payload: true,
    });

    return searchResult.map(result => ({
      id: result.id as string,
      agentId,
      type: MemoryType.LONG_TERM,
      content: result.payload?.content as string,
      metadata: (result.payload?.metadata as Record<string, any>) || {},
      embedding: result.vector as number[],
      createdAt: new Date(result.payload?.createdAt as string),
    }));
  }

  private async retrieveEpisodic(
    agentId: string,
    query: string,
    limit: number
  ): Promise<MemoryEntry[]> {
    const dbQuery = `
      SELECT * FROM agent_episodic_memory
      WHERE agent_id = $1 AND content ILIKE $2
      ORDER BY created_at DESC
      LIMIT $3
    `;

    const result = await database.query(dbQuery, [agentId, `%${query}%`, limit]);

    return result.rows.map(row => ({
      id: row.id,
      agentId: row.agent_id,
      type: MemoryType.EPISODIC,
      content: row.content,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      createdAt: row.created_at,
    }));
  }

  private async retrieveShared(
    agentId: string,
    query: string,
    limit: number
  ): Promise<MemoryEntry[]> {
    const entries = await this.redis.hgetall(`agent:${agentId}:shared`);
    const memories: MemoryEntry[] = Object.values(entries)
      .map(e => JSON.parse(e))
      .filter(m => m.content.toLowerCase().includes(query.toLowerCase()))
      .slice(0, limit);

    return memories;
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: config.openai.embeddingModel,
      input: text,
    });

    return response.data[0].embedding;
  }

  private async ensureCollection(collectionName: string): Promise<void> {
    try {
      await this.qdrant.getCollection(collectionName);
    } catch (error) {
      // Collection doesn't exist, create it
      await this.qdrant.createCollection(collectionName, {
        vectors: {
          size: 1536, // text-embedding-3-small dimension
          distance: 'Cosine',
        },
      });
      logger.info('Created Qdrant collection', { collectionName });
    }
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}

export default new MemoryManagerImpl();
