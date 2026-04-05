import { chunkingService } from '../../src/services/chunking.service';
import { ChunkingStrategy } from '../../src/types';

describe('ChunkingService', () => {
  describe('fixedSizeChunking', () => {
    it('should chunk text with fixed size', async () => {
      const documentId = 'test-doc-1';
      const content = 'This is a test document. It has multiple sentences. We will chunk it into smaller pieces.';
      const strategy: ChunkingStrategy = {
        type: 'fixed',
        chunkSize: 30,
        chunkOverlap: 10,
      };

      const chunks = await chunkingService.chunkDocument(documentId, content, strategy);

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0].documentId).toBe(documentId);
      expect(chunks[0].chunkIndex).toBe(0);
    });

    it('should create overlapping chunks', async () => {
      const documentId = 'test-doc-2';
      const content = 'A'.repeat(100);
      const strategy: ChunkingStrategy = {
        type: 'fixed',
        chunkSize: 40,
        chunkOverlap: 10,
      };

      const chunks = await chunkingService.chunkDocument(documentId, content, strategy);

      expect(chunks.length).toBeGreaterThan(1);
      // Check overlap exists
      const overlap = chunks[0].content.slice(-10);
      const nextStart = chunks[1].content.slice(0, 10);
      expect(overlap).toBe(nextStart);
    });
  });

  describe('semanticChunking', () => {
    it('should chunk at paragraph boundaries', async () => {
      const documentId = 'test-doc-3';
      const content = `Paragraph one with some content.

Paragraph two with more content.

Paragraph three with even more content.`;
      const strategy: ChunkingStrategy = {
        type: 'semantic',
        chunkSize: 50,
        chunkOverlap: 0,
      };

      const chunks = await chunkingService.chunkDocument(documentId, content, strategy);

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].content).toContain('Paragraph');
    });
  });

  describe('recursiveChunking', () => {
    it('should use multiple separators hierarchically', async () => {
      const documentId = 'test-doc-4';
      const content = `Section 1

Content for section 1. More details here.

Section 2

Content for section 2. Additional information.`;
      const strategy: ChunkingStrategy = {
        type: 'recursive',
        chunkSize: 50,
        chunkOverlap: 5,
        separators: ['\n\n', '\n', '. '],
      };

      const chunks = await chunkingService.chunkDocument(documentId, content, strategy);

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.every(c => c.documentId === documentId)).toBe(true);
    });
  });

  describe('validateStrategy', () => {
    it('should reject chunk size exceeding maximum', () => {
      const strategy: ChunkingStrategy = {
        type: 'fixed',
        chunkSize: 10000,
        chunkOverlap: 100,
      };

      expect(() => chunkingService.validateStrategy(strategy)).toThrow();
    });

    it('should reject overlap >= chunk size', () => {
      const strategy: ChunkingStrategy = {
        type: 'fixed',
        chunkSize: 100,
        chunkOverlap: 100,
      };

      expect(() => chunkingService.validateStrategy(strategy)).toThrow();
    });

    it('should accept valid strategy', () => {
      const strategy: ChunkingStrategy = {
        type: 'fixed',
        chunkSize: 1000,
        chunkOverlap: 200,
      };

      expect(() => chunkingService.validateStrategy(strategy)).not.toThrow();
    });
  });

  describe('getDefaultStrategy', () => {
    it('should return default recursive strategy', () => {
      const strategy = chunkingService.getDefaultStrategy();

      expect(strategy.type).toBe('recursive');
      expect(strategy.chunkSize).toBeGreaterThan(0);
      expect(strategy.chunkOverlap).toBeGreaterThanOrEqual(0);
      expect(strategy.separators).toBeDefined();
    });
  });
});
