import { Pool } from 'pg';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { LandingPageModel, PageTemplateModel, PageDisclosureModel, PublishTargetModel } from '../models/landing-page.model';
import { PageGeneratorService } from '../services/pageGenerator';
import { TemplateEngineService } from '../services/templateEngine';
import { VersionManagerService } from '../services/versionManager';
import { DisclosureInjectorService } from '../services/disclosureInjector';
import { PublishPipelineService } from '../services/publishPipeline';
import { eventPublisher } from '../utils/event-publisher';
import { BrandTone, PageStatus } from '../types';

const CreatePageSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  businessId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
  affiliateUrl: z.string().url().optional(),
  affiliateNetwork: z.string().optional(),
  brandTone: z.nativeEnum(BrandTone).optional(),
  locale: z.string().optional(),
});

const UpdatePageSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().optional(),
  blocks: z.array(z.any()).optional(),
  metadata: z.object({
    title: z.string().optional(),
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    ogImage: z.string().optional(),
  }).optional(),
  brandTone: z.nativeEnum(BrandTone).optional(),
  locale: z.string().optional(),
});

const GeneratePageSchema = z.object({
  affiliateUrl: z.string().url(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  businessId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
  brandTone: z.nativeEnum(BrandTone).optional(),
  locale: z.string().optional(),
  includeDisclosures: z.boolean().optional(),
  forceRegenerate: z.boolean().optional(),
});

const PublishPageSchema = z.object({
  targetType: z.enum(['cdn', 'subdomain', 'custom_domain', 'embedded']).optional(),
  subdomain: z.string().optional(),
  customDomain: z.string().optional(),
});

const RollbackSchema = z.object({
  versionId: z.string().uuid().optional(),
  rollbackToken: z.string().optional(),
  reason: z.string().optional(),
});

const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z.enum(['lead_generation', 'sales', 'webinar', 'ecommerce', 'affiliate', 'review', 'comparison', 'template']),
  thumbnail: z.string().optional(),
  blocks: z.array(z.any()),
  defaultMetadata: z.object({
    title: z.string(),
    metaTitle: z.string(),
    metaDescription: z.string(),
    keywords: z.array(z.string()),
  }),
  variables: z.array(z.any()).optional(),
  isPublic: z.boolean().optional(),
  isA/BTestable: z.boolean().optional(),
});

export interface TenantContext {
  tenantId: string;
  userId: string;
}

export class LandingPageController {
  private pageModel: LandingPageModel;
  private templateModel: PageTemplateModel;
  private disclosureModel: PageDisclosureModel;
  private targetModel: PublishTargetModel;
  private pageGenerator: PageGeneratorService;
  private templateEngine: TemplateEngineService;
  private versionManager: VersionManagerService;
  private disclosureInjector: DisclosureInjectorService;
  private publishPipeline: PublishPipelineService;

  constructor(
    db: Pool,
    openaiApiKey: string
  ) {
    this.pageModel = new LandingPageModel(db);
    this.templateModel = new PageTemplateModel(db);
    this.disclosureModel = new PageDisclosureModel(db);
    this.targetModel = new PublishTargetModel(db);
    this.pageGenerator = new PageGeneratorService(openaiApiKey);
    this.templateEngine = new TemplateEngineService();
    this.versionManager = new VersionManagerService(db);
    this.disclosureInjector = new DisclosureInjectorService();
    this.publishPipeline = new PublishPipelineService(db);
  }

  generatePage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.body as TenantContext;
      const validationResult = GeneratePageSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors,
        });
        return;
      }

      const data = validationResult.data;
      const existing = await this.pageModel.findBySlug(tenantId, data.slug);
      if (existing && !data.forceRegenerate) {
        res.status(409).json({
          success: false,
          error: 'Page with this slug already exists',
          pageId: existing.id,
        });
        return;
      }

      const context = {
        affiliateUrl: data.affiliateUrl,
        affiliateNetwork: data.affiliateNetwork,
        brandTone: data.brandTone || BrandTone.PROFESSIONAL,
        locale: data.locale || 'en-US',
      };

      const result = await this.pageGenerator.generatePage(context);

      let blocks = result.blocks;
      let disclosures: any[] = [];

      if (data.includeDisclosures) {
        const disclosureResult = await this.disclosureInjector.injectDisclosures(
          'temp',
          tenantId,
          blocks,
          {
            locale: data.locale || 'en-US',
            affiliateNetwork: data.affiliateNetwork,
            brandTone: data.brandTone,
          }
        );
        blocks = disclosureResult.blocks;
        disclosures = disclosureResult.disclosures;
      }

      let page;
      if (existing) {
        page = await this.pageModel.update(tenantId, existing.id, {
          blocks,
          metadata: result.metadata,
        });
      } else {
        page = await this.pageModel.create(tenantId, userId, {
          name: data.name,
          slug: data.slug,
          description: data.description,
          businessId: data.businessId,
          templateId: data.templateId,
          affiliateUrl: data.affiliateUrl,
          affiliateNetwork: data.affiliateNetwork,
          brandTone: data.brandTone,
          locale: data.locale,
        }, blocks, result.metadata);

        await this.versionManager.createVersion(
          tenantId,
          page.id,
          userId,
          blocks,
          result.metadata,
          'Initial page generation'
        );
      }

      await eventPublisher.publishPageGenerated({
        pageId: page!.id,
        tenantId,
        userId,
        affiliateUrl: data.affiliateUrl,
        templateId: data.templateId,
        blockCount: blocks.length,
      });

      res.status(201).json({
        success: true,
        data: {
          page,
          blocks,
          metadata: result.metadata,
          disclosures,
          version: result.version,
          warnings: result.warnings,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getPages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId } = req.body as TenantContext;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as PageStatus | undefined;
      const businessId = req.query.businessId as string | undefined;
      const search = req.query.search as string | undefined;

      const result = await this.pageModel.findAll(tenantId, { page, limit, status, businessId, search });

      res.json({
        success: true,
        data: {
          pages: result.pages,
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getPage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId } = req.body as TenantContext;
      const { id } = req.params;

      const page = await this.pageModel.findById(tenantId, id);
      if (!page) {
        res.status(404).json({
          success: false,
          error: 'Page not found',
        });
        return;
      }

      const targets = await this.publishPipeline.getPublishTargets(id);
      const disclosures = await this.disclosureModel.findByPageId(id);

      res.json({
        success: true,
        data: {
          ...page,
          publishTargets: targets,
          disclosures,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  updatePage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.body as TenantContext;
      const { id } = req.params;

      const validationResult = UpdatePageSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors,
        });
        return;
      }

      const existingPage = await this.pageModel.findById(tenantId, id);
      if (!existingPage) {
        res.status(404).json({
          success: false,
          error: 'Page not found',
        });
        return;
      }

      const updateData = validationResult.data;

      if (updateData.blocks && existingPage.blocks) {
        await this.versionManager.createVersion(
          tenantId,
          id,
          userId,
          existingPage.blocks,
          existingPage.metadata,
          'Pre-update snapshot'
        );
      }

      const page = await this.pageModel.update(tenantId, id, updateData);

      if (updateData.blocks && page) {
        await this.versionManager.createVersion(
          tenantId,
          id,
          userId,
          page.blocks,
          page.metadata,
          `Updated blocks: ${Object.keys(updateData).join(', ')}`
        );
      }

      res.json({
        success: true,
        data: page,
      });
    } catch (error) {
      next(error);
    }
  };

  publishPage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId } = req.body as TenantContext;
      const { id } = req.params;

      const validationResult = PublishPageSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors,
        });
        return;
      }

      const page = await this.pageModel.findById(tenantId, id);
      if (!page) {
        res.status(404).json({
          success: false,
          error: 'Page not found',
        });
        return;
      }

      const result = await this.publishPipeline.publish(tenantId, id, {
        targetType: validationResult.data.targetType as any,
        subdomain: validationResult.data.subdomain,
        customDomain: validationResult.data.customDomain,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  rollbackPage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.body as TenantContext;
      const { id } = req.params;

      const validationResult = RollbackSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors,
        });
        return;
      }

      const result = await this.versionManager.rollback(tenantId, id, userId, {
        versionId: validationResult.data.versionId,
        rollbackToken: validationResult.data.rollbackToken,
        reason: validationResult.data.reason,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getVersions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await this.versionManager.getVersions(id, { page, limit });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getTemplates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const includePrivate = req.query.includePrivate === 'true';
      const templates = await this.templateEngine.getAllTemplates(includePrivate);

      res.json({
        success: true,
        data: templates,
      });
    } catch (error) {
      next(error);
    }
  };

  createTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validationResult = CreateTemplateSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors,
        });
        return;
      }

      const template = await this.templateEngine.createTemplate(validationResult.data);

      res.status(201).json({
        success: true,
        data: template,
      });
    } catch (error) {
      next(error);
    }
  };

  submitForReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.body as TenantContext;
      const { id } = req.params;

      const page = await this.pageModel.findById(tenantId, id);
      if (!page) {
        res.status(404).json({
          success: false,
          error: 'Page not found',
        });
        return;
      }

      const updated = await this.pageModel.updateStatus(tenantId, id, PageStatus.REVIEW);

      res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  };

  approvePage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.body as TenantContext;
      const { id } = req.params;
      const { notes } = req.body;

      const page = await this.pageModel.findById(tenantId, id);
      if (!page) {
        res.status(404).json({
          success: false,
          error: 'Page not found',
        });
        return;
      }

      const updated = await this.pageModel.updateStatus(tenantId, id, PageStatus.APPROVED, {
        reviewedBy: userId,
        notes,
      });

      await eventPublisher.publishPageReviewed({
        pageId: id,
        tenantId,
        reviewerId: userId,
        status: 'approved',
        notes,
      });

      res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  };

  getPreview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId } = req.body as TenantContext;
      const { id } = req.params;

      const page = await this.pageModel.findById(tenantId, id);
      if (!page) {
        res.status(404).json({
          success: false,
          error: 'Page not found',
        });
        return;
      }

      const previewUrl = await this.publishPipeline.getPreviewUrl(tenantId, id);
      const html = await this.publishPipeline.generateHTML(id, page.blocks);

      res.json({
        success: true,
        data: {
          previewUrl,
          html,
          page,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
