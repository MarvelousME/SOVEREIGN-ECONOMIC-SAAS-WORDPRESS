import { Request, Response, NextFunction } from 'express';
import { BusinessService } from '../services/business.service';
import {
  createBusinessSchema,
  updateBusinessSchema,
  brandingConfigSchema,
  deployBusinessSchema,
  analyticsQuerySchema,
} from '../validators/business.validator';
import { getAllTemplates } from '../templates';

function tenantOr400(req: Request, res: Response): string | undefined {
  if (!req.tenantId) {
    res.status(400).json({ success: false, error: 'Tenant context missing' });
    return undefined;
  }
  return req.tenantId;
}

export class BusinessController {
  constructor(private businessService: BusinessService) {}

  getTemplates = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const templates = getAllTemplates();
      res.json({
        success: true,
        data: templates,
      });
    } catch (error) {
      next(error);
    }
  };

  createBusiness = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = tenantOr400(req, res);
      if (!tenantId) return;

      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const validatedData = createBusinessSchema.parse(req.body);
      const business = await this.businessService.createBusiness(tenantId, userId, validatedData);

      res.status(201).json({
        success: true,
        data: business,
      });
    } catch (error) {
      next(error);
    }
  };

  getBusiness = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = tenantOr400(req, res);
      if (!tenantId) return;

      const { id } = req.params;
      const business = await this.businessService.getBusiness(tenantId, id);

      if (!business) {
        res.status(404).json({ success: false, error: 'Business not found' });
        return;
      }

      // Check if user owns the business
      if (business.userId !== req.user?.id) {
        res.status(403).json({ success: false, error: 'Forbidden' });
        return;
      }

      res.json({
        success: true,
        data: business,
      });
    } catch (error) {
      next(error);
    }
  };

  getUserBusinesses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = tenantOr400(req, res);
      if (!tenantId) return;

      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const businesses = await this.businessService.getUserBusinesses(tenantId, userId, limit, offset);

      res.json({
        success: true,
        data: businesses,
        pagination: {
          limit,
          offset,
          total: businesses.length,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  updateBusiness = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = tenantOr400(req, res);
      if (!tenantId) return;

      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const validatedData = updateBusinessSchema.parse(req.body);

      const business = await this.businessService.updateBusiness(tenantId, id, userId, validatedData);

      res.json({
        success: true,
        data: business,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteBusiness = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = tenantOr400(req, res);
      if (!tenantId) return;

      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      await this.businessService.deleteBusiness(tenantId, id, userId);

      res.json({
        success: true,
        message: 'Business deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  deployBusiness = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = tenantOr400(req, res);
      if (!tenantId) return;

      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const validatedData = deployBusinessSchema.parse(req.body);

      const business = await this.businessService.deployBusiness(
        tenantId,
        id,
        userId,
        validatedData.customDomain
      );

      res.json({
        success: true,
        data: business,
        message: 'Business deployed successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  getAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = tenantOr400(req, res);
      if (!tenantId) return;

      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const query = analyticsQuerySchema.parse(req.query);

      const startDate = query.startDate ? new Date(query.startDate) : undefined;
      const endDate = query.endDate ? new Date(query.endDate) : undefined;

      const metrics = await this.businessService.getBusinessMetrics(
        tenantId,
        id,
        userId,
        query.period,
        startDate,
        endDate
      );

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  };

  generateBranding = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = tenantOr400(req, res);
      if (!tenantId) return;

      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const validatedConfig = brandingConfigSchema.parse(req.body);

      const business = await this.businessService.generateBranding(tenantId, id, userId, validatedConfig);

      res.json({
        success: true,
        data: business.branding,
        message: 'Branding generated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  regenerateBrandingElement = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = tenantOr400(req, res);
      if (!tenantId) return;

      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id, element } = req.params;
      const validatedConfig = brandingConfigSchema.parse(req.body);

      if (!['tagline', 'colors', 'fonts', 'logo'].includes(element)) {
        res.status(400).json({ success: false, error: 'Invalid element type' });
        return;
      }

      const business = await this.businessService.regenerateBrandingElement(
        tenantId,
        id,
        userId,
        element as 'tagline' | 'colors' | 'fonts' | 'logo',
        validatedConfig
      );

      res.json({
        success: true,
        data: business.branding,
        message: `${element} regenerated successfully`,
      });
    } catch (error) {
      next(error);
    }
  };
}
