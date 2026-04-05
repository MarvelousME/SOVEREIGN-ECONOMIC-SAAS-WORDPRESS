import { QdrantClient } from '@qdrant/js-client-rest';
import config from '../config';
import { logger } from '../utils/logger';
import { VectorPoint, QdrantSearchResult, Collection } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class QdrantService {
  private client: QdrantClient;

  constructor() {
    this.client = new QdrantClient({
      url: config.qdrant.url,
      apiKey: config.qdrant.apiKey,
      timeout: config.qdrant.timeout,
    });
  }

  /**
   * Create a new collection
   */
  async createCollection(
    collectionName: string,
    vectorDimension: number,
    distance: 'Cosine' | 'Euclid' | 'Dot' = 'Cosine'
  ): Promise<void> {
    try {
      await this.client.createCollection(collectionName, {
        vectors: {
          size: vectorDimension,
          distance,
        },
        optimizers_config: {
          indexing_threshold: 10000,
        },
        replication_factor: 2,
      });

      logger.info('Collection created:', { collectionName, vectorDimension });
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        logger.warn('Collection already exists:', collectionName);
      } else {
        logger.error('Failed to create collection:', error);
        throw error;
      }
    }
  }

  /**
   * Delete a collection
   */
  async deleteCollection(collectionName: string): Promise<void> {
    try {
      await this.client.deleteCollection(collectionName);
      logger.info('Collection deleted:', collectionName);
    } catch (error) {
      logger.error('Failed to delete collection:', error);
      throw error;
    }
  }

  /**
   * Check if collection exists
   */
  async collectionExists(collectionName: string): Promise<boolean> {
    try {
      const collections = await this.client.getCollections();
      return collections.collections.some(c => c.name === collectionName);
    } catch (error) {
      logger.error('Failed to check collection existence:', error);
      return false;
    }
  }

  /**
   * Insert vectors into collection
   */
  async upsertVectors(
    collectionName: string,
    points: VectorPoint[]
  ): Promise<void> {
    try {
      const formattedPoints = points.map(point => ({
        id: point.id,
        vector: point.vector,
        payload: point.payload,
      }));

      await this.client.upsert(collectionName, {
        wait: true,
        points: formattedPoints,
      });

      logger.debug('Vectors upserted:', {
        collectionName,
        count: points.length,
      });
    } catch (error) {
      logger.error('Failed to upsert vectors:', error);
      throw error;
    }
  }

  /**
   * Search for similar vectors
   */
  async searchVectors(
    collectionName: string,
    queryVector: number[],
    limit: number = 10,
    filter?: Record<string, any>,
    scoreThreshold?: number
  ): Promise<QdrantSearchResult[]> {
    try {
      const searchParams: any = {
        vector: queryVector,
        limit,
        with_payload: true,
        with_vector: false,
      };

      if (filter) {
        searchParams.filter = this.buildFilter(filter);
      }

      if (scoreThreshold !== undefined) {
        searchParams.score_threshold = scoreThreshold;
      }

      const results = await this.client.search(collectionName, searchParams);

      return results.map(result => ({
        id: result.id,
        version: result.version,
        score: result.score,
        payload: result.payload,
      }));
    } catch (error) {
      logger.error('Vector search error:', error);
      throw error;
    }
  }

  /**
   * Hybrid search (vector + metadata filters)
   */
  async hybridSearch(
    collectionName: string,
    queryVector: number[],
    filters: Record<string, any>,
    limit: number = 10
  ): Promise<QdrantSearchResult[]> {
    return this.searchVectors(collectionName, queryVector, limit, filters);
  }

  /**
   * Get vectors by IDs
   */
  async getVectorsByIds(
    collectionName: string,
    ids: string[]
  ): Promise<QdrantSearchResult[]> {
    try {
      const results = await this.client.retrieve(collectionName, {
        ids,
        with_payload: true,
        with_vector: true,
      });

      return results.map(result => ({
        id: result.id as string,
        version: result.version || 0,
        score: 1.0,
        payload: result.payload,
        vector: result.vector as number[],
      }));
    } catch (error) {
      logger.error('Failed to retrieve vectors:', error);
      throw error;
    }
  }

  /**
   * Delete vectors by IDs
   */
  async deleteVectors(
    collectionName: string,
    ids: string[]
  ): Promise<void> {
    try {
      await this.client.delete(collectionName, {
        wait: true,
        points: ids,
      });

      logger.debug('Vectors deleted:', { collectionName, count: ids.length });
    } catch (error) {
      logger.error('Failed to delete vectors:', error);
      throw error;
    }
  }

  /**
   * Delete vectors by filter
   */
  async deleteByFilter(
    collectionName: string,
    filter: Record<string, any>
  ): Promise<void> {
    try {
      await this.client.delete(collectionName, {
        wait: true,
        filter: this.buildFilter(filter),
      });

      logger.debug('Vectors deleted by filter:', { collectionName, filter });
    } catch (error) {
      logger.error('Failed to delete vectors by filter:', error);
      throw error;
    }
  }

  /**
   * Get collection info
   */
  async getCollectionInfo(collectionName: string): Promise<any> {
    try {
      return await this.client.getCollection(collectionName);
    } catch (error) {
      logger.error('Failed to get collection info:', error);
      throw error;
    }
  }

  /**
   * Count vectors in collection
   */
  async countVectors(
    collectionName: string,
    filter?: Record<string, any>
  ): Promise<number> {
    try {
      const params: any = { exact: true };
      if (filter) {
        params.filter = this.buildFilter(filter);
      }

      const result = await this.client.count(collectionName, params);
      return result.count;
    } catch (error) {
      logger.error('Failed to count vectors:', error);
      throw error;
    }
  }

  /**
   * Build Qdrant filter from simple key-value pairs
   */
  private buildFilter(filter: Record<string, any>): any {
    const conditions = Object.entries(filter).map(([key, value]) => {
      if (Array.isArray(value)) {
        return {
          key,
          match: { any: value },
        };
      } else if (typeof value === 'object' && value !== null) {
        // Handle range queries
        if ('$gte' in value || '$lte' in value || '$gt' in value || '$lt' in value) {
          return {
            key,
            range: {
              gte: value.$gte,
              lte: value.$lte,
              gt: value.$gt,
              lt: value.$lt,
            },
          };
        }
      }
      return {
        key,
        match: { value },
      };
    });

    return {
      must: conditions,
    };
  }

  /**
   * Scroll through all vectors
   */
  async scrollVectors(
    collectionName: string,
    limit: number = 100,
    offset?: string
  ): Promise<{ points: QdrantSearchResult[]; nextOffset?: string }> {
    try {
      const result = await this.client.scroll(collectionName, {
        limit,
        offset,
        with_payload: true,
        with_vector: false,
      });

      return {
        points: result.points.map(point => ({
          id: point.id as string,
          version: point.version || 0,
          score: 1.0,
          payload: point.payload,
        })),
        nextOffset: result.next_page_offset as string | undefined,
      };
    } catch (error) {
      logger.error('Failed to scroll vectors:', error);
      throw error;
    }
  }

  /**
   * Generate collection name for tenant
   */
  static getCollectionName(tenantId: string, collectionId: string): string {
    return `tenant_${tenantId}_collection_${collectionId}`;
  }
}

export const qdrantService = new QdrantService();
