import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import * as cheerio from 'cheerio';
import MarkdownIt from 'markdown-it';
import { DocumentFormat, DocumentMetadata } from '../types';
import { logger } from '../utils/logger';

export class DocumentParserService {
  private mdParser: MarkdownIt;

  constructor() {
    this.mdParser = new MarkdownIt();
  }

  async parse(
    content: Buffer | string,
    format: DocumentFormat
  ): Promise<{ text: string; metadata: DocumentMetadata }> {
    try {
      switch (format) {
        case DocumentFormat.PDF:
          return await this.parsePDF(content as Buffer);
        case DocumentFormat.DOCX:
          return await this.parseDOCX(content as Buffer);
        case DocumentFormat.HTML:
          return this.parseHTML(content.toString());
        case DocumentFormat.MD:
          return this.parseMarkdown(content.toString());
        case DocumentFormat.TXT:
          return this.parsePlainText(content.toString());
        case DocumentFormat.JSON:
          return this.parseJSON(content.toString());
        default:
          throw new Error(`Unsupported document format: ${format}`);
      }
    } catch (error) {
      logger.error('Document parsing error:', { format, error });
      throw error;
    }
  }

  private async parsePDF(buffer: Buffer): Promise<{ text: string; metadata: DocumentMetadata }> {
    const data = await pdf(buffer);
    return {
      text: data.text,
      metadata: {
        pages: data.numpages,
        info: data.info,
        version: data.version,
      },
    };
  }

  private async parseDOCX(buffer: Buffer): Promise<{ text: string; metadata: DocumentMetadata }> {
    const result = await mammoth.extractRawText({ buffer });
    return {
      text: result.value,
      metadata: {
        messages: result.messages,
      },
    };
  }

  private parseHTML(html: string): { text: string; metadata: DocumentMetadata } {
    const $ = cheerio.load(html);
    
    // Extract metadata
    const title = $('title').text() || $('h1').first().text();
    const description = $('meta[name="description"]').attr('content');
    const author = $('meta[name="author"]').attr('content');
    const keywords = $('meta[name="keywords"]').attr('content');

    // Remove script and style elements
    $('script, style, nav, footer, header').remove();

    // Extract text
    const text = $('body').text().replace(/\s+/g, ' ').trim();

    return {
      text,
      metadata: {
        title,
        description,
        author,
        keywords: keywords?.split(',').map(k => k.trim()),
      },
    };
  }

  private parseMarkdown(markdown: string): { text: string; metadata: DocumentMetadata } {
    // Extract front matter if present
    const frontMatterRegex = /^---\n([\s\S]*?)\n---\n/;
    const match = markdown.match(frontMatterRegex);
    let metadata: DocumentMetadata = {};
    let content = markdown;

    if (match) {
      try {
        // Simple YAML parsing for common fields
        const frontMatter = match[1];
        const lines = frontMatter.split('\n');
        lines.forEach(line => {
          const [key, ...valueParts] = line.split(':');
          if (key && valueParts.length > 0) {
            const value = valueParts.join(':').trim();
            metadata[key.trim()] = value;
          }
        });
        content = markdown.replace(frontMatterRegex, '');
      } catch (error) {
        logger.warn('Failed to parse front matter:', error);
      }
    }

    // Convert markdown to plain text
    const html = this.mdParser.render(content);
    const $ = cheerio.load(html);
    const text = $.text().replace(/\s+/g, ' ').trim();

    return { text, metadata };
  }

  private parsePlainText(text: string): { text: string; metadata: DocumentMetadata } {
    return {
      text: text.trim(),
      metadata: {},
    };
  }

  private parseJSON(jsonString: string): { text: string; metadata: DocumentMetadata } {
    try {
      const data = JSON.parse(jsonString);
      
      // Extract text content from JSON
      const extractText = (obj: any): string => {
        if (typeof obj === 'string') return obj;
        if (Array.isArray(obj)) return obj.map(extractText).join(' ');
        if (typeof obj === 'object' && obj !== null) {
          return Object.values(obj).map(extractText).join(' ');
        }
        return String(obj);
      };

      const text = extractText(data).replace(/\s+/g, ' ').trim();

      return {
        text,
        metadata: {
          jsonStructure: Object.keys(data),
        },
      };
    } catch (error) {
      throw new Error('Invalid JSON format');
    }
  }

  extractKeywords(text: string, maxKeywords: number = 10): string[] {
    // Simple keyword extraction (in production, use NLP library)
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);

    const wordFreq: Record<string, number> = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    return Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxKeywords)
      .map(([word]) => word);
  }
}

export const documentParserService = new DocumentParserService();
