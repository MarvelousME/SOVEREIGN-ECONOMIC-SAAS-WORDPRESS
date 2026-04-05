import { describe, it, expect, beforeEach } from '@jest/globals';
import { PageGeneratorService } from '../../src/services/pageGenerator';
import { BrandTone, AIContext } from '../../src/types';

describe('PageGeneratorService', () => {
  let service: PageGeneratorService;

  beforeEach(() => {
    service = new PageGeneratorService(process.env.OPENAI_API_KEY || 'test-api-key');
  });

  describe('generatePage', () => {
    it('should generate page blocks for a valid affiliate URL', async () => {
      const context: AIContext = {
        affiliateUrl: 'https://example.com/affiliate-offer',
        brandTone: BrandTone.PROFESSIONAL,
        locale: 'en-US',
      };

      const result = await service.generatePage(context);

      expect(result.blocks).toBeDefined();
      expect(result.blocks.length).toBeGreaterThan(0);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.title).toBeTruthy();
      expect(result.version).toBe(1);
    });

    it('should include hero block as first block', async () => {
      const context: AIContext = {
        affiliateUrl: 'https://example.com/offer',
        brandTone: BrandTone.CASUAL,
        locale: 'en-US',
      };

      const result = await service.generatePage(context);
      const heroBlock = result.blocks.find(b => b.type === 'hero');

      expect(heroBlock).toBeDefined();
      expect(heroBlock?.order).toBe(0);
      expect(heroBlock?.content.title).toBeTruthy();
    });

    it('should include CTA block with brand-appropriate text', async () => {
      const context: AIContext = {
        affiliateUrl: 'https://example.com/offer',
        brandTone: BrandTone.LUXURIOUS,
        locale: 'en-US',
      };

      const result = await service.generatePage(context);
      const ctaBlock = result.blocks.find(b => b.type === 'cta');

      expect(ctaBlock).toBeDefined();
      expect(ctaBlock?.content.ctaText).toBeTruthy();
    });

    it('should include footer block', async () => {
      const context: AIContext = {
        affiliateUrl: 'https://example.com/offer',
        brandTone: BrandTone.PROFESSIONAL,
        locale: 'en-US',
      };

      const result = await service.generatePage(context);
      const footerBlock = result.blocks.find(b => b.type === 'footer');

      expect(footerBlock).toBeDefined();
    });
  });
});
