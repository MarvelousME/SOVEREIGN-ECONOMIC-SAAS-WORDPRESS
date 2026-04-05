import { database } from '../models/database';
import { documentParserService } from './document-parser.service';
import { chunkingService } from './chunking.service';
import { embeddingService } from './embedding.service';
import { qdrantService, QdrantService } from './qdrant.service';
import {
  IngestRequest,
  IngestResponse,
  SearchQuery,
  SearchResult,
  RAGQuery,
  RAGResponse,
  Collection,
  Document,
  DocumentChunk,
  ChunkingStrategy,
} from '../types';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import config from '../config';

export class KnowledgeService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  /**
   * Create a new knowledge collection
   */
  async createCollection(
    tenantId: string,
    name: string,
    description?: string,
    metadata?: Record<string, any>
  ): Promise<Collection> {
    try {
      const collectionId = uuidv4();
      const vectorDimension = embeddingService.getEmbeddingDimension();

      // Create collection in database
      const result = await database.query(
        `INSERT INTO collections (id, tenant_id, name, description, vector_dimension, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [collectionId, tenantId, name, description || '', vectorDimension, JSON.stringify(metadata || {})]
      );

      // Create Qdrant collection
      const qdrantCollectionName = QdrantService.getCollectionName(tenantId, collectionId);
      await qdrantService.createCollection(qdrantCollectionName, vectorDimension, 'Cosine');

      logger.info('Collection created:', { tenantId, collectionId, name });

      return this.mapCollectionFromDb(result.rows[0]);
    } catch (error) {
      logger.error('Failed to create collection:', error);
      throw error;
    }
  }

  /**
   * Get collections for tenant
   */
  async getCollections(tenantId: string): Promise<Collection[]> {
    try {
      const result = await database.query(
        'SELECT * FROM collections WHERE tenant_id = $1 ORDER BY created_at DESC',
        [tenantId]
      );

      return result.rows.map(this.mapCollectionFromDb);
    } catch (error) {
      logger.error('Failed to get collections:', error);
      throw error;
    }
  }

  /**
   * Delete collection
   */
  async deleteCollection(tenantId: string, collectionId: string): Promise<void> {
    try {
      // Delete from Qdrant
      const qdrantCollectionName = QdrantService.getCollectionName(tenantId, collectionId);
      await qdrantService.deleteCollection(qdrantCollectionName);

      // Delete from database (cascade will handle documents and chunks)
      await database.query(
        'DELETE FROM collections WHERE id = $1 AND tenant_id = $2',
        [collectionId, tenantId]
      );

      logger.info('Collection deleted:', { tenantId, collectionId });
    } catch (error) {
      logger.error('Failed to delete collection:', error);
      throw error;
    }
  }

  /**
   * Ingest document into collection
   */
  async ingestDocument(request: IngestRequest): Promise<IngestResponse> {
    const startTime = Date.now();

    try {
      const { tenantId, collectionId, document, chunkingStrategy } = request;

      // Verify collection exists
      const collectionResult = await database.query(
        'SELECT * FROM collections WHERE id = $1 AND tenant_id = $2',
        [collectionId, tenantId]
      );

      if (collectionResult.rows.length === 0) {
        throw new Error('Collection not found');
      }

      // Parse document
      let content: string;
      let metadata = document.metadata || {};

      if (document.file) {
        const parsed = await documentParserService.parse(document.file, document.format);
        content = parsed.text;
        metadata = { ...metadata, ...parsed.metadata };
      } else if (document.content) {
        content = document.content;
      } else {
        throw new Error('Either file or content must be provided');
      }

      // Create document record
      const documentId = uuidv4();
      await database.query(
        `INSERT INTO documents (id, tenant_id, collection_id, title, content, format, metadata, source, url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          documentId,
          tenantId,
          collectionId,
          document.title,
          content,
          document.format,
          JSON.stringify(metadata),
          document.source || null,
          document.url || null,
        ]
      );

      // Chunk document
      const strategy = chunkingStrategy || chunkingService.getDefaultStrategy();
      chunkingService.validateStrategy(strategy);
      const chunks = await chunkingService.chunkDocument(documentId, content, strategy);

      // Generate embeddings
      const chunkTexts = chunks.map(c => c.content);
      const embeddings = await embeddingService.generateBatchEmbeddings(chunkTexts);

      // Store chunks in database and Qdrant
      const qdrantCollectionName = QdrantService.getCollectionName(tenantId, collectionId);
      const vectorPoints = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = embeddings[i];
        const vectorId = uuidv4();

        // Store in database
        await database.query(
          `INSERT INTO document_chunks (id, document_id, content, metadata, chunk_index, start_char, end_char, vector_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            chunk.id,
            documentId,
            chunk.content,
            JSON.stringify(chunk.metadata),
            chunk.chunkIndex,
            chunk.startChar,
            chunk.endChar,
            vectorId,
          ]
        );

        // Prepare for Qdrant
        vectorPoints.push({
          id: vectorId,
          vector: embedding,
          payload: {
            documentId,
            chunkId: chunk.id,
            chunkIndex: chunk.chunkIndex,
            content: chunk.content,
            tenantId,
            collectionId,
            title: document.title,
            ...metadata,
          },
        });
      }

      // Batch upsert to Qdrant
      if (vectorPoints.length > 0) {
        await qdrantService.upsertVectors(qdrantCollectionName, vectorPoints);
      }

      // Log analytics
      await this.logAnalytics({
        tenantId,
        eventType: 'ingest',
        metadata: {
          collectionId,
          documentId,
          chunksCreated: chunks.length,
          processingTime: Date.now() - startTime,
        },
      });

      logger.info('Document ingested:', {
        tenantId,
        collectionId,
        documentId,
        chunks: chunks.length,
      });

      return {
        documentId,
        chunksCreated: chunks.length,
        status: 'success',
      };
    } catch (error) {
      logger.error('Document ingestion failed:', error);
      return {
        documentId: '',
        chunksCreated: 0,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Semantic search
   */
  async search(query: SearchQuery): Promise<SearchResult[]> {
    const startTime = Date.now();

    try {
      const { query: queryText, collectionId, tenantId, limit = 10, filter, scoreThreshold } = query;

      // Generate query embedding
      const queryEmbedding = await embeddingService.generateQueryEmbedding(queryText);

      // Search in Qdrant
      const qdrantCollectionName = QdrantService.getCollectionName(tenantId, collectionId);
      const qdrantFilter = filter ? { ...filter, tenantId, collectionId } : { tenantId, collectionId };
      
      const results = await qdrantService.searchVectors(
        qdrantCollectionName,
        queryEmbedding,
        limit,
        qdrantFilter,
        scoreThreshold
      );

      // Map to SearchResult
      const searchResults: SearchResult[] = results.map(result => ({
        id: result.id as string,
        documentId: result.payload?.documentId as string,
        content: result.payload?.content as string,
        score: result.score,
        metadata: result.payload || {},
      }));

      // Log analytics
      await this.logAnalytics({
        tenantId,
        eventType: 'search',
        metadata: {
          collectionId,
          query: queryText,
          resultsCount: searchResults.length,
          processingTime: Date.now() - startTime,
        },
      });

      return searchResults;
    } catch (error) {
      logger.error('Search failed:', error);
      throw error;
    }
  }

  /**
   * RAG query - Retrieval-Augmented Generation
   */
  async ragQuery(query: RAGQuery): Promise<RAGResponse> {
    const startTime = Date.now();

    try {
      const {
        query: queryText,
        collectionId,
        tenantId,
        topK = config.rag.defaultTopK,
        filter,
        maxContextLength = config.rag.maxContextLength,
        temperature = config.rag.defaultTemperature,
        model = config.openai.model,
      } = query;

      // Perform semantic search
      const searchResults = await this.search({
        query: queryText,
        collectionId,
        tenantId,
        limit: topK,
        filter,
      });

      if (searchResults.length === 0) {
        return {
          answer: 'I could not find any relevant information to answer your question.',
          sources: [],
          context: '',
          metadata: {
            model,
            tokensUsed: 0,
            processingTime: Date.now() - startTime,
          },
        };
      }

      // Assemble context from search results
      const context = this.assembleContext(searchResults, maxContextLength);

      // Generate prompt
      const systemPrompt = `You are a helpful assistant that answers questions based on the provided context. 
If the context doesn't contain enough information to answer the question, say so.
Always cite your sources by referencing the relevant parts of the context.`;

      const userPrompt = `Context:
${context}

Question: ${queryText}

Please provide a comprehensive answer based on the context above.`;

      // Generate response using OpenAI
      const completion = await this.openai.chat.completions.create({
        model,
        temperature,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });

      const answer = completion.choices[0].message.content || '';
      const tokensUsed = completion.usage?.total_tokens || 0;

      // Log analytics
      await this.logAnalytics({
        tenantId,
        eventType: 'query',
        metadata: {
          collectionId,
          query: queryText,
          sourcesUsed: searchResults.length,
          tokensUsed,
          processingTime: Date.now() - startTime,
        },
      });

      return {
        answer,
        sources: searchResults,
        context,
        metadata: {
          model,
          tokensUsed,
          processingTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      logger.error('RAG query failed:', error);
      throw error;
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(tenantId: string, documentId: string): Promise<void> {
    try {
      // Get document info
      const docResult = await database.query(
        'SELECT collection_id FROM documents WHERE id = $1 AND tenant_id = $2',
        [documentId, tenantId]
      );

      if (docResult.rows.length === 0) {
        throw new Error('Document not found');
      }

      const collectionId = docResult.rows[0].collection_id;

      // Get vector IDs
      const chunksResult = await database.query(
        'SELECT vector_id FROM document_chunks WHERE document_id = $1',
        [documentId]
      );

      const vectorIds = chunksResult.rows.map(row => row.vector_id);

      // Delete from Qdrant
      if (vectorIds.length > 0) {
        const qdrantCollectionName = QdrantService.getCollectionName(tenantId, collectionId);
        await qdrantService.deleteVectors(qdrantCollectionName, vectorIds);
      }

      // Delete from database (cascade will handle chunks)
      await database.query(
        'DELETE FROM documents WHERE id = $1 AND tenant_id = $2',
        [documentId, tenantId]
      );

      logger.info('Document deleted:', { tenantId, documentId });
    } catch (error) {
      logger.error('Failed to delete document:', error);
      throw error;
    }
  }

  /**
   * Assemble context from search results
   */
  private assembleContext(results: SearchResult[], maxLength: number): string {
    let context = '';
    let currentLength = 0;

    for (const result of results) {
      const snippet = `[Source: ${result.metadata.title || 'Untitled'}]\n${result.content}\n\n`;
      const snippetLength = snippet.length;

      if (currentLength + snippetLength > maxLength) {
        const remaining = maxLength - currentLength;
        if (remaining > 100) {
          context += snippet.slice(0, remaining) + '...\n\n';
        }
        break;
      }

      context += snippet;
      currentLength += snippetLength;
    }

    return context.trim();
  }

  /**
   * Log analytics event
   */
  private async logAnalytics(event: {
    tenantId: string;
    eventType: string;
    metadata: Record<string, any>;
  }): Promise<void> {
    try {
      await database.query(
        `INSERT INTO search_analytics (tenant_id, event_type, query, collection_id, results_count, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          event.tenantId,
          event.eventType,
          event.metadata.query || null,
          event.metadata.collectionId || null,
          event.metadata.resultsCount || null,
          JSON.stringify(event.metadata),
        ]
      );
    } catch (error) {
      logger.warn('Failed to log analytics:', error);
    }
  }

  /**
   * Map database row to Collection
   */
  private mapCollectionFromDb(row: any): Collection {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      description: row.description,
      vectorDimension: row.vector_dimension,
      distance: row.distance,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const knowledgeService = new KnowledgeService();
