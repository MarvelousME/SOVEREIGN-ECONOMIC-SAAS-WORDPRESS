import { documentParserService } from '../../src/services/document-parser.service';
import { DocumentFormat } from '../../src/types';

describe('DocumentParserService', () => {
  describe('parsePlainText', () => {
    it('should parse plain text', async () => {
      const content = 'This is plain text content.';
      const result = await documentParserService.parse(content, DocumentFormat.TXT);

      expect(result.text).toBe(content);
      expect(result.metadata).toBeDefined();
    });

    it('should trim whitespace', async () => {
      const content = '  \n  Trimmed content  \n  ';
      const result = await documentParserService.parse(content, DocumentFormat.TXT);

      expect(result.text).toBe('Trimmed content');
    });
  });

  describe('parseMarkdown', () => {
    it('should parse markdown to plain text', async () => {
      const content = '# Heading\n\nThis is **bold** text.';
      const result = await documentParserService.parse(content, DocumentFormat.MD);

      expect(result.text).toContain('Heading');
      expect(result.text).toContain('bold');
    });

    it('should extract front matter', async () => {
      const content = `---
title: Test Document
author: John Doe
---

# Content

This is the main content.`;
      const result = await documentParserService.parse(content, DocumentFormat.MD);

      expect(result.metadata.title).toBe('Test Document');
      expect(result.metadata.author).toBe('John Doe');
      expect(result.text).toContain('Content');
    });
  });

  describe('parseHTML', () => {
    it('should extract text from HTML', async () => {
      const html = '<html><body><h1>Title</h1><p>Content</p></body></html>';
      const result = await documentParserService.parse(html, DocumentFormat.HTML);

      expect(result.text).toContain('Title');
      expect(result.text).toContain('Content');
    });

    it('should extract metadata from HTML', async () => {
      const html = `
        <html>
          <head>
            <title>Test Page</title>
            <meta name="description" content="Test description">
            <meta name="author" content="Jane Doe">
          </head>
          <body>Content</body>
        </html>
      `;
      const result = await documentParserService.parse(html, DocumentFormat.HTML);

      expect(result.metadata.title).toContain('Test Page');
      expect(result.metadata.description).toBe('Test description');
      expect(result.metadata.author).toBe('Jane Doe');
    });

    it('should remove script and style tags', async () => {
      const html = `
        <html>
          <head><style>.test { color: red; }</style></head>
          <body>
            <p>Visible content</p>
            <script>alert('test');</script>
          </body>
        </html>
      `;
      const result = await documentParserService.parse(html, DocumentFormat.HTML);

      expect(result.text).toContain('Visible content');
      expect(result.text).not.toContain('alert');
      expect(result.text).not.toContain('color: red');
    });
  });

  describe('parseJSON', () => {
    it('should extract text from JSON', async () => {
      const json = JSON.stringify({
        title: 'Test',
        content: 'This is content',
        tags: ['tag1', 'tag2'],
      });
      const result = await documentParserService.parse(json, DocumentFormat.JSON);

      expect(result.text).toContain('Test');
      expect(result.text).toContain('This is content');
      expect(result.metadata.jsonStructure).toBeDefined();
    });

    it('should handle nested JSON', async () => {
      const json = JSON.stringify({
        level1: {
          level2: {
            content: 'Nested content',
          },
        },
      });
      const result = await documentParserService.parse(json, DocumentFormat.JSON);

      expect(result.text).toContain('Nested content');
    });

    it('should reject invalid JSON', async () => {
      const invalidJson = '{ invalid json }';
      await expect(
        documentParserService.parse(invalidJson, DocumentFormat.JSON)
      ).rejects.toThrow();
    });
  });

  describe('extractKeywords', () => {
    it('should extract keywords from text', () => {
      const text = 'machine learning artificial intelligence deep learning neural networks';
      const keywords = documentParserService.extractKeywords(text, 3);

      expect(keywords.length).toBeLessThanOrEqual(3);
      expect(keywords).toContain('learning');
    });

    it('should filter short words', () => {
      const text = 'a an the it is machine learning';
      const keywords = documentParserService.extractKeywords(text);

      expect(keywords).not.toContain('the');
      expect(keywords).toContain('machine');
    });

    it('should handle empty text', () => {
      const keywords = documentParserService.extractKeywords('');

      expect(keywords).toHaveLength(0);
    });
  });
});
