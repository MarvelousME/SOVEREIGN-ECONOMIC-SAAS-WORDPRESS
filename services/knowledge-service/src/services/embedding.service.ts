import OpenAI from 'openai';
import config from '../config';
import { logger } from '../utils/logger';
import Redis from 'ioredis';
import crypto from 'crypto';

export class EmbeddingService {
  private openai: OpenAI;
  private redis: Redis;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });

    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
    });
  }

  /**
   * Generate embeddings for text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(text);
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        logger.debug('Embedding cache hit');
        return JSON.parse(cached);
      }

      // Generate embedding
      const response = await this.openai.embeddings.create({
        model: config.openai.embeddingModel,
        input: text,
      });

      const embedding = response.data[0].embedding;

      // Cache the result
      await this.redis.setex(
        cacheKey,
        config.cache.embeddingTTL,
        JSON.stringify(embedding)
      );

      return embedding;
    } catch (error) {
      logger.error('Embedding generation error:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings in batch
   */
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const embeddings: number[][] = [];
      const uncachedTexts: string[] = [];
      const uncachedIndices: number[] = [];

      // Check cache for each text
      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        const cacheKey = this.getCacheKey(text);
        const cached = await this.redis.get(cacheKey);

        if (cached) {
          embeddings[i] = JSON.parse(cached);
        } else {
          uncachedTexts.push(text);
          uncachedIndices.push(i);
        }
      }

      // Generate embeddings for uncached texts in batches
      if (uncachedTexts.length > 0) {
        const batchSize = 100; // OpenAI limit
        for (let i = 0; i < uncachedTexts.length; i += batchSize) {
          const batch = uncachedTexts.slice(i, i + batchSize);
          const response = await this.openai.embeddings.create({
            model: config.openai.embeddingModel,
            input: batch,
          });

          // Cache and store results
          for (let j = 0; j < batch.length; j++) {
            const embedding = response.data[j].embedding;
            const originalIndex = uncachedIndices[i + j];
            embeddings[originalIndex] = embedding;

            // Cache the result
            const cacheKey = this.getCacheKey(batch[j]);
            await this.redis.setex(
              cacheKey,
              config.cache.embeddingTTL,
              JSON.stringify(embedding)
            );
          }

          // Rate limiting delay
          if (i + batchSize < uncachedTexts.length) {
            await this.delay(100);
          }
        }
      }

      return embeddings;
    } catch (error) {
      logger.error('Batch embedding generation error:', error);
      throw error;
    }
  }

  /**
   * Generate embedding for query
   */
  async generateQueryEmbedding(query: string): Promise<number[]> {
    return this.generateEmbedding(query);
  }

  /**
   * Get cache key for text
   */
  private getCacheKey(text: string): string {
    const hash = crypto.createHash('sha256').update(text).digest('hex');
    return `embedding:${config.openai.embeddingModel}:${hash}`;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get embedding dimension
   */
  getEmbeddingDimension(): number {
    return config.openai.embeddingDimension;
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}

export const embeddingService = new EmbeddingService();
