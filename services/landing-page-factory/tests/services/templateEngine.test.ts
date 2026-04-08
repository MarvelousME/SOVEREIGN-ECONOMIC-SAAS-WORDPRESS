import { describe, it, expect, beforeEach } from '@jest/globals';
import { TemplateEngineService } from '../../src/services/templateEngine';
import { TemplateCategory } from '../../src/types';

describe('TemplateEngineService', () => {
  let service: TemplateEngineService;

  beforeEach(() => {
    service = new TemplateEngineService();
  });

  describe('getAllTemplates', () => {
    it('should return all public templates', async () => {
      const templates = await service.getAllTemplates(false);

      expect(templates).toBeDefined();
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.every(t => t.isPublic)).toBe(true);
    });

    it('should include default templates', async () => {
      const templates = await service.getAllTemplates(false);
      const categories = templates.map(t => t.category);

      expect(categories).toContain(TemplateCategory.LEAD_GEN);
      expect(categories).toContain(TemplateCategory.SALES);
      expect(categories).toContain(TemplateCategory.AFFILIATE);
    });
  });

  describe('getTemplatesByCategory', () => {
    it('should return templates for specific category', async () => {
      const templates = await service.getTemplatesByCategory(TemplateCategory.AFFILIATE);

      expect(templates).toBeDefined();
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.every(t => t.category === TemplateCategory.AFFILIATE)).toBe(true);
    });
  });

  describe('createTemplate', () => {
    it('should create a new custom template', async () => {
      const templateData = {
        name: 'Custom Test Template',
        description: 'A custom template for testing',
        category: TemplateCategory.SALES,
        blocks: [],
        defaultMetadata: {
          title: 'Test Template',
          metaTitle: 'Test Template',
          metaDescription: 'Testing template creation',
          keywords: ['test'],
        },
        variables: [
          { name: 'headline', type: 'string' as const, required: true },
        ],
        isPublic: false,
        isAbTestable: true,
      };

      const template = await service.createTemplate(templateData);

      expect(template).toBeDefined();
      expect(template.id).toBeTruthy();
      expect(template.name).toBe('Custom Test Template');
      expect(template.category).toBe(TemplateCategory.SALES);
    });
  });

  describe('applyTemplate', () => {
    it('should apply template with variables', async () => {
      const template = await service.getAllTemplates(false).then(t => t[0]);
      if (!template) return;

      const variables = {
        headline: 'Custom Headline',
        ctaText: 'Get Started Now',
      };

      const result = await service.applyTemplate(template.id, variables);

      expect(result.blocks).toBeDefined();
      expect(result.metadata).toBeDefined();
    });
  });

  describe('validateVariables', () => {
    it('should return error for missing required variables', async () => {
      const template = await service.getAllTemplates(false).then(t => t[0]);
      if (!template) return;

      const validation = service.validateVariables(template.id, {});

      expect(validation.valid).toBe(false);
    });

    it('should validate correctly typed variables', async () => {
      const template = await service.getAllTemplates(false).then(t => t[0]);
      if (!template) return;

      const validation = service.validateVariables(template.id, {
        headline: 'Test Headline',
      });

      expect(validation.errors).toHaveLength(0);
    });
  });
});
