import { Request, Response } from 'express';
import { affiliateLinkService } from '../services/affiliate-link.service';
import { merchantService } from '../services/merchant.service';
import { offerService } from '../services/offer.service';
import { opportunityService } from '../services/opportunity.service';
import { urlProcessingService } from '../services/url-processing.service';
import { OfferType } from '../types';
import logger from '../utils/logger';

export class AffiliateController {
  async intake(req: Request, res: Response): Promise<void> {
    try {
      const { url, userId, metadata } = req.body;
      const { link, analysis } = await urlProcessingService.processIntake(url, userId, metadata);

      res.status(201).json({
        success: true,
        data: {
          link,
          analysis: {
            id: analysis.id,
            parseSuccess: analysis.parseSuccess,
            isAffiliateUrl: analysis.isAffiliateUrl,
            confidenceScore: analysis.confidenceScore,
            recommendations: analysis.recommendations,
          },
        },
      });
    } catch (error) {
      logger.error('Intake failed', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Intake failed',
      });
    }
  }

  async getLinks(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, merchantId, offerId, userId, status, minFreshnessScore } = req.query as any;

      const { links, total } = await affiliateLinkService.findAll({
        limit,
        offset: (page - 1) * limit,
        merchantId,
        offerId,
        userId,
        status,
        minFreshnessScore,
      });

      res.json({
        success: true,
        data: links,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Get links failed', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get links',
      });
    }
  }

  async getLinkById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const link = await affiliateLinkService.findById(id);

      if (!link) {
        res.status(404).json({
          success: false,
          error: 'Link not found',
        });
        return;
      }

      res.json({
        success: true,
        data: link,
      });
    } catch (error) {
      logger.error('Get link failed', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get link',
      });
    }
  }

  async recordClick(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const link = await affiliateLinkService.recordClick(id);

      if (!link) {
        res.status(404).json({
          success: false,
          error: 'Link not found',
        });
        return;
      }

      res.json({
        success: true,
        data: link,
      });
    } catch (error) {
      logger.error('Record click failed', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to record click',
      });
    }
  }

  async getMerchants(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, network, category, isActive } = req.query as any;

      const { merchants, total } = await merchantService.findAll({
        limit,
        offset: (page - 1) * limit,
        network,
        category,
        isActive,
      });

      res.json({
        success: true,
        data: merchants,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Get merchants failed', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get merchants',
      });
    }
  }

  async getMerchantById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const merchant = await merchantService.findById(id);

      if (!merchant) {
        res.status(404).json({
          success: false,
          error: 'Merchant not found',
        });
        return;
      }

      res.json({
        success: true,
        data: merchant,
      });
    } catch (error) {
      logger.error('Get merchant failed', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get merchant',
      });
    }
  }

  async createMerchant(req: Request, res: Response): Promise<void> {
    try {
      const merchant = await merchantService.create(req.body);
      res.status(201).json({
        success: true,
        data: merchant,
      });
    } catch (error) {
      logger.error('Create merchant failed', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create merchant',
      });
    }
  }

  async getOffers(req: Request, res: Response): Promise<void> {
    try {
      const {
        page,
        limit,
        merchantId,
        offerType,
        status,
        isVerified,
        isFeatured,
        categories,
        minDiscount,
        search,
      } = req.query as any;

      const { offers, total } = await offerService.findAll({
        limit,
        offset: (page - 1) * limit,
        merchantId,
        offerType: offerType as OfferType,
        status,
        isVerified,
        isFeatured,
        categories: categories?.split(','),
        minDiscount,
        search,
      });

      res.json({
        success: true,
        data: offers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Get offers failed', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get offers',
      });
    }
  }

  async getOfferById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const offer = await offerService.findById(id);

      if (!offer) {
        res.status(404).json({
          success: false,
          error: 'Offer not found',
        });
        return;
      }

      res.json({
        success: true,
        data: offer,
      });
    } catch (error) {
      logger.error('Get offer failed', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get offer',
      });
    }
  }

  async createOffer(req: Request, res: Response): Promise<void> {
    try {
      const offer = await offerService.create(req.body);
      res.status(201).json({
        success: true,
        data: offer,
      });
    } catch (error) {
      logger.error('Create offer failed', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create offer',
      });
    }
  }

  async getOpportunities(req: Request, res: Response): Promise<void> {
    try {
      const {
        page,
        limit,
        merchantId,
        minCommission,
        minFreshnessScore,
        categories,
      } = req.query as any;

      const { opportunities, total } = await opportunityService.findOpportunities({
        limit,
        offset: (page - 1) * limit,
        merchantId,
        minCommission,
        minFreshnessScore,
        categories: categories?.split(','),
      });

      res.json({
        success: true,
        data: opportunities,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Get opportunities failed', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get opportunities',
      });
    }
  }

  async analyze(req: Request, res: Response): Promise<void> {
    try {
      const { url, deepAnalysis } = req.body;

      let analysis;
      if (deepAnalysis) {
        analysis = await urlProcessingService.analyzeDeep(url);
      } else {
        const { analysis: simpleAnalysis } = await urlProcessingService.processIntake(url);
        analysis = simpleAnalysis;
      }

      res.json({
        success: true,
        data: analysis,
      });
    } catch (error) {
      logger.error('Analyze failed', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed',
      });
    }
  }

  async getStats(_req: Request, res: Response): Promise<void> {
    try {
      const linkStats = await affiliateLinkService.getStats();

      res.json({
        success: true,
        data: {
          links: linkStats,
        },
      });
    } catch (error) {
      logger.error('Get stats failed', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get stats',
      });
    }
  }
}

export default new AffiliateController();
