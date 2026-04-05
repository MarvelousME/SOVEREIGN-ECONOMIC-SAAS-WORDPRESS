import { describe, it, expect, beforeEach } from '@jest/globals';
import { DisclosureInjectorService } from '../../src/services/disclosureInjector';
import { BrandTone, DisclosureType } from '../../src/types';

describe('DisclosureInjectorService', () => {
  let service: DisclosureInjectorService;

  beforeEach(() => {
    service = new DisclosureInjectorService();
  });

  describe('injectDisclosures', () => {
    it('should inject FTC affiliate disclosure', async () => {
      const result = await service.injectDisclosures(
        'page-123',
        'tenant-123',
        [],
        { locale: 'en-US' }
      );

      const ftcDisclosure = result.disclosures.find(d => d.type === DisclosureType.FTC_AFFILIATE);
      expect(ftcDisclosure).toBeDefined();
      expect(ftcDisclosure?.content).toContain('affiliate');
    });

    it('should add disclosure blocks to existing blocks', async () => {
      const existingBlocks = [{ id: 'block-1', type: 'hero' as const, order: 0, content: {}, config: {} }];
      
      const result = await service.injectDisclosures(
        'page-123',
        'tenant-123',
        existingBlocks,
        { locale: 'en-US' }
      );

      expect(result.blocks.length).toBeGreaterThan(existingBlocks.length);
    });

    it('should include cookie consent block', async () => {
      const result = await service.injectDisclosures(
        'page-123',
        'tenant-123',
        [],
        { locale: 'en-US' }
      );

      const cookieBlock = result.blocks.find(b => b.type === 'cookie_consent');
      expect(cookieBlock).toBeDefined();
    });

    it('should include affiliate disclosure block', async () => {
      const result = await service.injectDisclosures(
        'page-123',
        'tenant-123',
        [],
        { locale: 'en-US' }
      );

      const affiliateBlock = result.blocks.find(b => b.type === 'affiliate_disclosure');
      expect(affiliateBlock).toBeDefined();
    });
  });

  describe('getApplicableDisclosures', () => {
    it('should return FTC disclosure for en-US locale', async () => {
      const disclosures = await service.getApplicableDisclosures(
        'page-123',
        'tenant-123',
        'en-US',
        'Example Network'
      );

      expect(disclosures.some(d => d.type === DisclosureType.FTC_AFFILIATE)).toBe(true);
    });

    it('should include network name in disclosure when provided', async () => {
      const disclosures = await service.getApplicableDisclosures(
        'page-123',
        'tenant-123',
        'en-US',
        'ShareASale'
      );

      const ftcDisclosure = disclosures.find(d => d.type === DisclosureType.FTC_AFFILIATE);
      expect(ftcDisclosure?.content).toContain('ShareASale');
    });
  });

  describe('validateDisclosures', () => {
    it('should return valid for disclosures with FTC type', async () => {
      const disclosures = [
        {
          id: 'disc-1',
          pageId: 'page-123',
          type: DisclosureType.FTC_AFFILIATE,
          content: 'This page contains affiliate links.',
          position: 'bottom' as const,
          isRequired: true,
          jurisdictions: ['US'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const validation = service.validateDisclosures(disclosures);

      expect(validation.valid).toBe(true);
      expect(validation.missing).toHaveLength(0);
    });

    it('should return invalid for missing required disclosures', async () => {
      const disclosures: any[] = [];

      const validation = service.validateDisclosures(disclosures);

      expect(validation.valid).toBe(false);
      expect(validation.missing).toContain(DisclosureType.FTC_AFFILIATE);
    });
  });
});
