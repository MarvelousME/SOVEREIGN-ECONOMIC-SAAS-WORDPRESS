import { ChunkingStrategy, DocumentChunk } from '../types';
import config from '../config';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class ChunkingService {
  /**
   * Split document into chunks based on strategy
   */
  async chunkDocument(
    documentId: string,
    content: string,
    strategy: ChunkingStrategy
  ): Promise<DocumentChunk[]> {
    try {
      switch (strategy.type) {
        case 'fixed':
          return this.fixedSizeChunking(documentId, content, strategy);
        case 'semantic':
          return this.semanticChunking(documentId, content, strategy);
        case 'recursive':
          return this.recursiveChunking(documentId, content, strategy);
        default:
          throw new Error(`Unknown chunking strategy: ${strategy.type}`);
      }
    } catch (error) {
      logger.error('Chunking error:', { documentId, strategy, error });
      throw error;
    }
  }

  /**
   * Fixed-size chunking with overlap
   */
  private fixedSizeChunking(
    documentId: string,
    content: string,
    strategy: ChunkingStrategy
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const { chunkSize, chunkOverlap } = strategy;
    let startChar = 0;
    let chunkIndex = 0;

    while (startChar < content.length) {
      const endChar = Math.min(startChar + chunkSize, content.length);
      const chunkContent = content.slice(startChar, endChar);

      // Try to break at sentence boundary
      const adjustedEnd = this.findSentenceBoundary(
        content,
        endChar,
        startChar + chunkSize
      );

      chunks.push({
        id: uuidv4(),
        documentId,
        content: content.slice(startChar, adjustedEnd).trim(),
        metadata: {},
        chunkIndex,
        startChar,
        endChar: adjustedEnd,
      });

      startChar = adjustedEnd - chunkOverlap;
      chunkIndex++;
    }

    return chunks;
  }

  /**
   * Semantic chunking - splits at paragraph boundaries
   */
  private semanticChunking(
    documentId: string,
    content: string,
    strategy: ChunkingStrategy
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const paragraphs = content.split(/\n\s*\n/);
    let currentChunk = '';
    let startChar = 0;
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      const testChunk = currentChunk + (currentChunk ? '\n\n' : '') + paragraph;

      if (testChunk.length > strategy.chunkSize && currentChunk) {
        // Save current chunk
        chunks.push({
          id: uuidv4(),
          documentId,
          content: currentChunk.trim(),
          metadata: {},
          chunkIndex,
          startChar,
          endChar: startChar + currentChunk.length,
        });

        chunkIndex++;
        startChar += currentChunk.length;
        currentChunk = paragraph;
      } else {
        currentChunk = testChunk;
      }
    }

    // Add last chunk
    if (currentChunk) {
      chunks.push({
        id: uuidv4(),
        documentId,
        content: currentChunk.trim(),
        metadata: {},
        chunkIndex,
        startChar,
        endChar: startChar + currentChunk.length,
      });
    }

    return chunks;
  }

  /**
   * Recursive chunking - uses multiple separators hierarchically
   */
  private recursiveChunking(
    documentId: string,
    content: string,
    strategy: ChunkingStrategy
  ): DocumentChunk[] {
    const separators = strategy.separators || ['\n\n', '\n', '. ', ' '];
    return this.recursiveChunkHelper(
      documentId,
      content,
      separators,
      strategy.chunkSize,
      strategy.chunkOverlap,
      0
    );
  }

  private recursiveChunkHelper(
    documentId: string,
    content: string,
    separators: string[],
    chunkSize: number,
    overlap: number,
    startIndex: number
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];

    if (content.length <= chunkSize) {
      return [
        {
          id: uuidv4(),
          documentId,
          content: content.trim(),
          metadata: {},
          chunkIndex: 0,
          startChar: startIndex,
          endChar: startIndex + content.length,
        },
      ];
    }

    if (separators.length === 0) {
      // Fallback to character-level splitting
      return this.fixedSizeChunking(documentId, content, {
        type: 'fixed',
        chunkSize,
        chunkOverlap: overlap,
      });
    }

    const separator = separators[0];
    const splits = content.split(separator);
    let currentChunk = '';
    let currentStart = startIndex;
    let chunkIndex = 0;

    for (let i = 0; i < splits.length; i++) {
      const piece = splits[i] + (i < splits.length - 1 ? separator : '');
      const testChunk = currentChunk + piece;

      if (testChunk.length > chunkSize && currentChunk) {
        // Recursively split current chunk with next separator
        const subChunks = this.recursiveChunkHelper(
          documentId,
          currentChunk,
          separators.slice(1),
          chunkSize,
          overlap,
          currentStart
        );

        chunks.push(...subChunks);
        currentStart += currentChunk.length;
        currentChunk = piece;
      } else {
        currentChunk = testChunk;
      }
    }

    if (currentChunk) {
      const subChunks = this.recursiveChunkHelper(
        documentId,
        currentChunk,
        separators.slice(1),
        chunkSize,
        overlap,
        currentStart
      );
      chunks.push(...subChunks);
    }

    // Re-index chunks
    return chunks.map((chunk, idx) => ({ ...chunk, chunkIndex: idx }));
  }

  /**
   * Find the nearest sentence boundary
   */
  private findSentenceBoundary(
    content: string,
    position: number,
    maxPosition: number
  ): number {
    const sentenceEnders = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];
    let bestPosition = position;
    let minDistance = Infinity;

    for (let i = position; i < Math.min(maxPosition, content.length); i++) {
      for (const ender of sentenceEnders) {
        if (content.slice(i, i + ender.length) === ender) {
          const distance = i - position;
          if (distance < minDistance) {
            minDistance = distance;
            bestPosition = i + ender.length;
          }
        }
      }
      if (minDistance < 50) break; // Found nearby boundary
    }

    return bestPosition;
  }

  /**
   * Get default chunking strategy
   */
  getDefaultStrategy(): ChunkingStrategy {
    return {
      type: 'recursive',
      chunkSize: config.chunking.defaultSize,
      chunkOverlap: config.chunking.defaultOverlap,
      separators: ['\n\n', '\n', '. ', ' '],
    };
  }

  /**
   * Validate chunking strategy
   */
  validateStrategy(strategy: ChunkingStrategy): void {
    if (strategy.chunkSize > config.chunking.maxChunkSize) {
      throw new Error(
        `Chunk size ${strategy.chunkSize} exceeds maximum ${config.chunking.maxChunkSize}`
      );
    }

    if (strategy.chunkOverlap >= strategy.chunkSize) {
      throw new Error('Chunk overlap must be less than chunk size');
    }

    if (strategy.chunkOverlap < 0 || strategy.chunkSize <= 0) {
      throw new Error('Chunk size and overlap must be positive');
    }
  }
}

export const chunkingService = new ChunkingService();
