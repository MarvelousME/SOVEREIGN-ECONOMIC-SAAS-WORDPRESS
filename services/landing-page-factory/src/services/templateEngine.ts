import { v4 as uuidv4 } from 'uuid';
import {
  PageBlock,
  PageTemplate,
  PageMetadata,
  TemplateVariable,
  CreateTemplateRequest,
  TemplateCategory,
} from '../types';
import { logger } from '../config/logger';

export class TemplateEngineService {
  private templates: Map<string, PageTemplate> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates(): void {
    const defaultTemplates: PageTemplate[] = [
      this.createLeadGenTemplate(),
      this.createSalesTemplate(),
      this.createWebinarTemplate(),
      this.createAffiliateTemplate(),
      this.createReviewTemplate(),
      this.createComparisonTemplate(),
    ];

    defaultTemplates.forEach((template) => {
      this.templates.set(template.id, template);
    });

    logger.info(`Initialized ${this.templates.size} default templates`);
  }

  private createLeadGenTemplate(): PageTemplate {
    return {
      id: 'tmpl-lead-gen-default',
      name: 'Lead Generation',
      description: 'High-converting lead generation landing page with form capture',
      category: TemplateCategory.LEAD_GEN,
      blocks: [],
      defaultMetadata: {
        title: 'Exclusive Offer',
        metaTitle: 'Exclusive Offer - Sign Up Now',
        metaDescription: 'Get access to exclusive content and special offers.',
        keywords: ['lead generation', 'exclusive offer', 'sign up'],
      },
      variables: [
        { name: 'headline', type: 'string', required: true },
        { name: 'subheadline', type: 'string' },
        { name: 'ctaText', type: 'string', defaultValue: 'Get Started' },
        { name: 'primaryColor', type: 'color', defaultValue: '#4F46E5' },
        { name: 'backgroundColor', type: 'color', defaultValue: '#ffffff' },
      ],
      isPublic: true,
      isA/BTestable: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private createSalesTemplate(): PageTemplate {
    return {
      id: 'tmpl-sales-default',
      name: 'Sales Page',
      description: 'Full-featured sales page with testimonials and pricing',
      category: TemplateCategory.SALES,
      blocks: [],
      defaultMetadata: {
        title: 'Amazing Product',
        metaTitle: 'Amazing Product - Limited Time Offer',
        metaDescription: 'Discover the product that will change your life.',
        keywords: ['sales', 'product', 'offer'],
      },
      variables: [
        { name: 'productName', type: 'string', required: true },
        { name: 'price', type: 'string' },
        { name: 'headline', type: 'string', required: true },
        { name: 'primaryColor', type: 'color', defaultValue: '#10B981' },
      ],
      isPublic: true,
      isA/BTestable: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private createWebinarTemplate(): PageTemplate {
    return {
      id: 'tmpl-webinar-default',
      name: 'Webinar Registration',
      description: 'Webinar registration page with date/time and registration form',
      category: TemplateCategory.WEBINAR,
      blocks: [],
      defaultMetadata: {
        title: 'Join Our Webinar',
        metaTitle: 'Webinar Registration - Reserve Your Spot',
        metaDescription: 'Register now for our exclusive webinar.',
        keywords: ['webinar', 'registration', 'online event'],
      },
      variables: [
        { name: 'webinarTitle', type: 'string', required: true },
        { name: 'webinarDate', type: 'string' },
        { name: 'webinarTime', type: 'string' },
        { name: 'primaryColor', type: 'color', defaultValue: '#8B5CF6' },
      ],
      isPublic: true,
      isA/BTestable: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private createAffiliateTemplate(): PageTemplate {
    return {
      id: 'tmpl-affiliate-default',
      name: 'Affiliate Offer',
      description: 'Standard affiliate offer page with CTA and disclosures',
      category: TemplateCategory.AFFILIATE,
      blocks: [],
      defaultMetadata: {
        title: 'Featured Product',
        metaTitle: 'Featured Product Review',
        metaDescription: 'Read our in-depth review of this product.',
        keywords: ['affiliate', 'review', 'product'],
      },
      variables: [
        { name: 'productName', type: 'string', required: true },
        { name: 'headline', type: 'string', required: true },
        { name: 'ctaText', type: 'string', defaultValue: 'Check It Out' },
        { name: 'primaryColor', type: 'color', defaultValue: '#EF4444' },
      ],
      isPublic: true,
      isA/BTestable: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private createReviewTemplate(): PageTemplate {
    return {
      id: 'tmpl-review-default',
      name: 'Product Review',
      description: 'Comprehensive product review page with pros/cons',
      category: TemplateCategory.REVIEW,
      blocks: [],
      defaultMetadata: {
        title: 'Product Review',
        metaTitle: 'In-Depth Product Review',
        metaDescription: 'Our honest and detailed review.',
        keywords: ['review', 'product', 'honest review'],
      },
      variables: [
        { name: 'productName', type: 'string', required: true },
        { name: 'rating', type: 'number', defaultValue: '4.5' },
        { name: 'primaryColor', type: 'color', defaultValue: '#F59E0B' },
      ],
      isPublic: true,
      isA/BTestable: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private createComparisonTemplate(): PageTemplate {
    return {
      id: 'tmpl-comparison-default',
      name: 'Comparison',
      description: 'Side-by-side product comparison table',
      category: TemplateCategory.COMPARISON,
      blocks: [],
      defaultMetadata: {
        title: 'Compare Products',
        metaTitle: 'Product Comparison',
        metaDescription: 'Compare the best products side by side.',
        keywords: ['comparison', 'versus', 'vs'],
      },
      variables: [
        { name: 'productAName', type: 'string', required: true },
        { name: 'productBName', type: 'string', required: true },
        { name: 'primaryColor', type: 'color', defaultValue: '#06B6D4' },
      ],
      isPublic: true,
      isA/BTestable: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async createTemplate(data: CreateTemplateRequest): Promise<PageTemplate> {
    const template: PageTemplate = {
      id: uuidv4(),
      name: data.name,
      description: data.description,
      category: data.category,
      thumbnail: data.thumbnail,
      blocks: data.blocks,
      defaultMetadata: data.defaultMetadata,
      variables: data.variables || [],
      isPublic: data.isPublic || false,
      isA/BTestable: data.isA/BTestable !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(template.id, template);
    return template;
  }

  async getTemplate(id: string): Promise<PageTemplate | null> {
    return this.templates.get(id) || null;
  }

  async getTemplatesByCategory(category: TemplateCategory): Promise<PageTemplate[]> {
    return Array.from(this.templates.values()).filter(
      (t) => t.category === category && t.isPublic
    );
  }

  async getAllTemplates(includePrivate = false): Promise<PageTemplate[]> {
    const templates = Array.from(this.templates.values());
    if (includePrivate) {
      return templates;
    }
    return templates.filter((t) => t.isPublic);
  }

  async applyTemplate(
    templateId: string,
    variables: Record<string, unknown>
  ): Promise<{ blocks: PageBlock[]; metadata: PageMetadata }> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const resolvedBlocks = this.resolveBlockVariables(template.blocks, variables);
    const resolvedMetadata = this.resolveMetadataVariables(template.defaultMetadata, variables);

    return {
      blocks: resolvedBlocks,
      metadata: resolvedMetadata,
    };
  }

  private resolveBlockVariables(
    blocks: PageBlock[],
    variables: Record<string, unknown>
  ): PageBlock[] {
    return blocks.map((block) => ({
      ...block,
      id: uuidv4(),
      content: this.resolveContentVariables(block.content, variables),
    }));
  }

  private resolveContentVariables(
    content: PageBlock['content'],
    variables: Record<string, unknown>
  ): PageBlock['content'] {
    const resolved = { ...content };

    for (const key of Object.keys(resolved) as (keyof typeof resolved)[]) {
      const value = resolved[key];
      if (typeof value === 'string') {
        resolved[key] = this.interpolateVariables(value, variables) as typeof value;
      } else if (Array.isArray(value)) {
        resolved[key] = value.map((item) => {
          if (typeof item === 'object' && item !== null) {
            return this.resolveContentVariables(item as PageBlock['content'], variables);
          }
          if (typeof item === 'string') {
            return this.interpolateVariables(item, variables);
          }
          return item;
        }) as typeof value;
      } else if (typeof value === 'object' && value !== null) {
        resolved[key] = this.resolveContentVariables(value as PageBlock['content'], variables);
      }
    }

    return resolved;
  }

  private resolveMetadataVariables(
    metadata: PageMetadata,
    variables: Record<string, unknown>
  ): PageMetadata {
    return {
      ...metadata,
      title: this.interpolateVariables(metadata.title, variables),
      metaTitle: this.interpolateVariables(metadata.metaTitle, variables),
      metaDescription: this.interpolateVariables(metadata.metaDescription, variables),
      keywords: metadata.keywords.map((k) =>
        this.interpolateVariables(k, variables)
      ),
    };
  }

  private interpolateVariables(text: string, variables: Record<string, unknown>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return variables[varName] !== undefined
        ? String(variables[varName])
        : match;
    });
  }

  async createVariant(
    templateId: string,
    variantName: string,
    modifications: Partial<PageTemplate>
  ): Promise<PageTemplate> {
    const baseTemplate = await this.getTemplate(templateId);
    if (!baseTemplate) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const variant: PageTemplate = {
      ...baseTemplate,
      id: uuidv4(),
      name: `${baseTemplate.name} - ${variantName}`,
      description: `${baseTemplate.description} (Variant: ${variantName})`,
      blocks: modifications.blocks || [...baseTemplate.blocks],
      variables: modifications.variables || [...baseTemplate.variables],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(variant.id, variant);
    return variant;
  }

  validateVariables(
    templateId: string,
    providedVariables: Record<string, unknown>
  ): { valid: boolean; missing: string[]; errors: string[] } {
    const template = this.templates.get(templateId);
    if (!template) {
      return { valid: false, missing: [], errors: [`Template not found: ${templateId}`] };
    }

    const missing: string[] = [];
    const errors: string[] = [];

    for (const variable of template.variables) {
      if (variable.required && !(variable.name in providedVariables)) {
        missing.push(variable.name);
      }

      if (variable.name in providedVariables) {
        const value = providedVariables[variable.name];
        if (variable.type === 'number' && isNaN(Number(value))) {
          errors.push(`Variable ${variable.name} must be a number`);
        }
        if (variable.type === 'color' && !/^#[0-9A-Fa-f]{6}$/.test(String(value))) {
          errors.push(`Variable ${variable.name} must be a valid hex color`);
        }
      }
    }

    return {
      valid: missing.length === 0 && errors.length === 0,
      missing,
      errors,
    };
  }
}
