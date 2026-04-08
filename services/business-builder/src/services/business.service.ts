import { Pool } from 'pg';
import { BusinessModel } from '../models/business.model';
import { BrandingService } from './branding.service';
import {
  Business,
  CreateBusinessRequest,
  UpdateBusinessRequest,
  BusinessMetrics,
  BrandingConfig,
  BusinessStatus,
} from '../types';
import { getTemplate } from '../templates';

export class BusinessService {
  private businessModel: BusinessModel;
  private brandingService: BrandingService;

  constructor(db: Pool, openaiApiKey: string) {
    this.businessModel = new BusinessModel(db);
    this.brandingService = new BrandingService(openaiApiKey);
  }

  async createBusiness(tenantId: string, userId: string, data: CreateBusinessRequest): Promise<Business> {
    const template = getTemplate(data.template);
    if (!template) {
      throw new Error(`Invalid template: ${data.template}`);
    }

    const existingBusiness = await this.businessModel.findBySubdomain(tenantId, data.domain.subdomain);
    if (existingBusiness) {
      throw new Error(`Subdomain ${data.domain.subdomain} is already taken in this workspace`);
    }

    const business = await this.businessModel.create(tenantId, userId, data);

    if (data.brandingConfig) {
      try {
        const branding = await this.brandingService.generateBranding(data.brandingConfig);
        await this.businessModel.update(tenantId, business.id, { branding });
      } catch (error) {
        console.error('Branding generation failed:', error);
      }
    }

    await this.initializeFromTemplate(business.id, template);

    const updatedBusiness = await this.businessModel.findById(tenantId, business.id);
    if (!updatedBusiness) {
      throw new Error('Failed to reload business after creation');
    }

    return updatedBusiness;
  }

  async getBusiness(tenantId: string, id: string): Promise<Business | null> {
    return this.businessModel.findById(tenantId, id);
  }

  async getBusinesses(
    tenantId: string,
    userId: string,
    options?: { limit?: number; offset?: number; scope?: 'own' | 'workspace' }
  ): Promise<Business[]> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    const scope = options?.scope ?? 'own';

    if (scope === 'workspace') {
      return this.businessModel.findByTenant(tenantId, limit, offset);
    }
    return this.businessModel.findByUserId(tenantId, userId, limit, offset);
  }

  async updateBusiness(tenantId: string, id: string, userId: string, data: UpdateBusinessRequest): Promise<Business> {
    const business = await this.businessModel.findById(tenantId, id);
    if (!business) {
      throw new Error('Business not found');
    }

    if (business.userId !== userId) {
      throw new Error('Unauthorized');
    }

    const updated = await this.businessModel.update(tenantId, id, data);
    if (!updated) {
      throw new Error('Failed to update business');
    }

    return updated;
  }

  async deleteBusiness(tenantId: string, id: string, userId: string): Promise<void> {
    const business = await this.businessModel.findById(tenantId, id);
    if (!business) {
      throw new Error('Business not found');
    }

    if (business.userId !== userId) {
      throw new Error('Unauthorized');
    }

    await this.businessModel.delete(tenantId, id);
  }

  async deployBusiness(tenantId: string, id: string, userId: string, customDomain?: string): Promise<Business> {
    const business = await this.businessModel.findById(tenantId, id);
    if (!business) {
      throw new Error('Business not found');
    }

    if (business.userId !== userId) {
      throw new Error('Unauthorized');
    }

    if (business.status === BusinessStatus.ACTIVE) {
      throw new Error('Business is already deployed');
    }

    if (!business.pages || business.pages.length === 0) {
      throw new Error('Business must have at least one page before deployment');
    }

    await this.businessModel.update(tenantId, id, { status: BusinessStatus.DEPLOYING });

    try {
      await this.performDeployment(business, customDomain);
      await this.businessModel.markAsDeployed(tenantId, id);

      const deployed = await this.businessModel.findById(tenantId, id);
      if (!deployed) {
        throw new Error('Failed to reload business after deployment');
      }

      return deployed;
    } catch (error) {
      await this.businessModel.update(tenantId, id, { status: BusinessStatus.DRAFT });
      throw error;
    }
  }

  async generateBranding(tenantId: string, id: string, userId: string, config: BrandingConfig): Promise<Business> {
    const business = await this.businessModel.findById(tenantId, id);
    if (!business) {
      throw new Error('Business not found');
    }

    if (business.userId !== userId) {
      throw new Error('Unauthorized');
    }

    const branding = await this.brandingService.generateBranding(config);
    const updated = await this.businessModel.update(tenantId, id, { branding });

    if (!updated) {
      throw new Error('Failed to update business with branding');
    }

    return updated;
  }

  async regenerateBrandingElement(
    tenantId: string,
    id: string,
    userId: string,
    element: 'tagline' | 'colors' | 'fonts' | 'logo',
    config: BrandingConfig
  ): Promise<Business> {
    const business = await this.businessModel.findById(tenantId, id);
    if (!business) {
      throw new Error('Business not found');
    }

    if (business.userId !== userId) {
      throw new Error('Unauthorized');
    }

    const partialBranding = await this.brandingService.regenerateElement(
      element,
      config,
      business.branding
    );

    const updatedBranding = { ...business.branding, ...partialBranding };
    const updated = await this.businessModel.update(tenantId, id, { branding: updatedBranding });

    if (!updated) {
      throw new Error('Failed to update business with new branding element');
    }

    return updated;
  }

  async getBusinessMetrics(
    tenantId: string,
    id: string,
    userId: string,
    period: 'day' | 'week' | 'month' | 'year',
    startDate?: Date,
    endDate?: Date
  ): Promise<BusinessMetrics> {
    const business = await this.businessModel.findById(tenantId, id);
    if (!business) {
      throw new Error('Business not found');
    }

    if (business.userId !== userId) {
      throw new Error('Unauthorized');
    }

    const metrics = await this.businessModel.getMetrics(tenantId, id, period, startDate, endDate);
    if (!metrics) {
      throw new Error('Failed to retrieve metrics');
    }

    return metrics;
  }

  async recordRevenue(tenantId: string, id: string, amount: number): Promise<void> {
    await this.businessModel.updateRevenue(tenantId, id, amount);
  }

  private async initializeFromTemplate(businessId: string, template: { id: string }): Promise<void> {
    console.log(`Initializing business ${businessId} with template ${template.id}`);
  }

  private async performDeployment(business: Business, customDomain?: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log(`Deployed business ${business.id} to ${business.domain.subdomain}`);
    if (customDomain) {
      console.log(`Custom domain configured: ${customDomain}`);
    }
  }
}
