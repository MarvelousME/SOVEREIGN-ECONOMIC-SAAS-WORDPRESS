import { Request, Response } from 'express';
import { knowledgeService } from '../services/knowledge.service';
import { logger } from '../utils/logger';
import { z } from 'zod';
import { DocumentFormat } from '../types';

// Validation schemas
const createCollectionSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const ingestDocumentSchema = z.object({
  collectionId: z.string().uuid(),
  document: z.object({
    title: z.string().min(1),
    content: z.string().optional(),
    format: z.nativeEnum(DocumentFormat),
    metadata: z.record(z.any()).optional(),
    source: z.string().optional(),
    url: z.string().url().optional(),
  }),
  chunkingStrategy: z
    .object({
      type: z.enum(['fixed', 'semantic', 'recursive']),
      chunkSize: z.number().positive(),
      chunkOverlap: z.number().nonnegative(),
      separators: z.array(z.string()).optional(),
    })
    .optional(),
});

const searchSchema = z.object({
  query: z.string().min(1),
  collectionId: z.string().uuid(),
  limit: z.number().positive().max(100).optional(),
  filter: z.record(z.any()).optional(),
  scoreThreshold: z.number().min(0).max(1).optional(),
});

const ragQuerySchema = z.object({
  query: z.string().min(1),
  collectionId: z.string().uuid(),
  topK: z.number().positive().max(20).optional(),
  filter: z.record(z.any()).optional(),
  includeContext: z.boolean().optional(),
  maxContextLength: z.number().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  model: z.string().optional(),
});

export class KnowledgeController {
  /**
   * POST /api/v1/knowledge/collections
   */
  async createCollection(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const validated = createCollectionSchema.parse(req.body);
      const collection = await knowledgeService.createCollection(
        tenantId,
        validated.name,
        validated.description,
        validated.metadata
      );

      res.status(201).json(collection);
    } catch (error) {
      logger.error('Create collection error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to create collection' });
      }
    }
  }

  /**
   * GET /api/v1/knowledge/collections
   */
  async getCollections(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const collections = await knowledgeService.getCollections(tenantId);
      res.json(collections);
    } catch (error) {
      logger.error('Get collections error:', error);
      res.status(500).json({ error: 'Failed to get collections' });
    }
  }

  /**
   * DELETE /api/v1/knowledge/collections/:id
   */
  async deleteCollection(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const { id } = req.params;
      await knowledgeService.deleteCollection(tenantId, id);

      res.status(204).send();
    } catch (error) {
      logger.error('Delete collection error:', error);
      res.status(500).json({ error: 'Failed to delete collection' });
    }
  }

  /**
   * POST /api/v1/knowledge/ingest
   */
  async ingestDocument(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const validated = ingestDocumentSchema.parse(req.body);
      
      // Handle file upload if present
      let documentFile: Buffer | undefined;
      if (req.file) {
        documentFile = req.file.buffer;
      }

      const result = await knowledgeService.ingestDocument({
        tenantId,
        collectionId: validated.collectionId,
        document: {
          ...validated.document,
          file: documentFile,
        },
        chunkingStrategy: validated.chunkingStrategy,
      });

      if (result.status === 'success') {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      logger.error('Ingest document error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to ingest document' });
      }
    }
  }

  /**
   * POST /api/v1/knowledge/search
   */
  async search(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const validated = searchSchema.parse(req.body);
      const results = await knowledgeService.search({
        ...validated,
        tenantId,
      });

      res.json({
        results,
        count: results.length,
      });
    } catch (error) {
      logger.error('Search error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
      } else {
        res.status(500).json({ error: 'Search failed' });
      }
    }
  }

  /**
   * POST /api/v1/knowledge/query
   */
  async ragQuery(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const validated = ragQuerySchema.parse(req.body);
      const response = await knowledgeService.ragQuery({
        ...validated,
        tenantId,
      });

      res.json(response);
    } catch (error) {
      logger.error('RAG query error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
      } else {
        res.status(500).json({ error: 'Query failed' });
      }
    }
  }

  /**
   * DELETE /api/v1/knowledge/documents/:id
   */
  async deleteDocument(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const { id } = req.params;
      await knowledgeService.deleteDocument(tenantId, id);

      res.status(204).send();
    } catch (error) {
      logger.error('Delete document error:', error);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  }

  /**
   * GET /health
   */
  async health(req: Request, res: Response): Promise<void> {
    res.json({
      status: 'healthy',
      service: 'knowledge-service',
      timestamp: new Date().toISOString(),
    });
  }
}

export const knowledgeController = new KnowledgeController();
