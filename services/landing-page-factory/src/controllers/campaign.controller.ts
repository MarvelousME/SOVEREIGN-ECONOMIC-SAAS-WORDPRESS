import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CampaignModel } from '../models/campaign.model';
import { CampaignStatus } from '../types';
import { CampaignAgentChainService } from '../services/campaignAgentChain.service';

const campaignStatusSchema = z.enum([
  'draft',
  'ready',
  'scheduled',
  'running',
  'paused',
  'completed',
  'failed',
  'archived',
]);

const listCampaignsQuerySchema = z.object({
  scope: z.enum(['own', 'workspace']).optional().default('workspace'),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
  q: z.string().max(120).optional(),
  sort: z.enum(['updated', 'name', 'progress']).optional().default('updated'),
});

const campaignReportQuerySchema = z.object({
  scope: z.enum(['own', 'workspace']).optional().default('workspace'),
  ownerId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  q: z.string().max(120).optional(),
  sort: z.enum(['updated', 'name', 'throughput', 'success_rate', 'failure_rate']).optional().default('updated'),
  direction: z.enum(['asc', 'desc']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const createCampaignBodySchema = z.object({
  businessId: z.string().uuid().optional(),
  pageId: z.string().uuid().optional(),
  name: z.string().min(1).max(180),
  description: z.string().max(5000).optional(),
  objective: z.string().max(120).optional(),
  budget: z.number().nonnegative().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateCampaignBodySchema = z.object({
  name: z.string().min(1).max(180).optional(),
  description: z.string().max(5000).optional(),
  objective: z.string().max(120).optional(),
  budget: z.number().nonnegative().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const transitionBodySchema = z.object({
  toStatus: campaignStatusSchema,
  reason: z.string().max(1000).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const runAgentChainBodySchema = z.object({
  goal: z.string().min(3).max(400),
  channels: z.array(z.string().min(2).max(60)).min(1).max(10),
  locale: z.string().min(2).max(16).optional(),
});

interface TenantContext {
  tenantId: string;
  userId: string;
}

export class CampaignController {
  constructor(
    private campaignModel: CampaignModel,
    private campaignAgentChainService: CampaignAgentChainService
  ) {}

  createCampaign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.body as TenantContext;
      const body = createCampaignBodySchema.parse(req.body);
      const campaign = await this.campaignModel.create({
        tenantId,
        userId,
        businessId: body.businessId,
        pageId: body.pageId,
        name: body.name,
        description: body.description,
        objective: body.objective,
        budget: body.budget,
        startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
        endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
        metadata: body.metadata,
      });
      res.status(201).json({ success: true, data: campaign });
    } catch (error) {
      next(error);
    }
  };

  listCampaigns = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.body as TenantContext;
      const query = listCampaignsQuerySchema.parse(req.query);
      const result = await this.campaignModel.list(tenantId, {
        scope: query.scope,
        userId,
        limit: query.limit,
        offset: query.offset,
        search: query.q,
        sort: query.sort,
      });
      res.json({
        success: true,
        data: result.data,
        pagination: {
          total: result.total,
          limit: query.limit,
          offset: query.offset,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getCampaign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId } = req.body as TenantContext;
      const campaign = await this.campaignModel.findById(tenantId, req.params.id);
      if (!campaign) {
        res.status(404).json({ success: false, error: 'Campaign not found' });
        return;
      }
      res.json({ success: true, data: campaign });
    } catch (error) {
      next(error);
    }
  };

  updateCampaign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId } = req.body as TenantContext;
      const body = updateCampaignBodySchema.parse(req.body);
      const updated = await this.campaignModel.update(tenantId, req.params.id, {
        name: body.name,
        description: body.description,
        objective: body.objective,
        budget: body.budget,
        startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
        endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
        metadata: body.metadata,
      });
      if (!updated) {
        res.status(404).json({ success: false, error: 'Campaign not found' });
        return;
      }
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  };

  transitionCampaign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.body as TenantContext;
      const body = transitionBodySchema.parse(req.body);

      const transitioned = await this.campaignModel.transitionStatus({
        tenantId,
        campaignId: req.params.id,
        toStatus: body.toStatus as CampaignStatus,
        userId,
        reason: body.reason,
        metadata: body.metadata,
      });
      res.json({ success: true, data: transitioned });
    } catch (error) {
      next(error);
    }
  };

  listCampaignStateEvents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId } = req.body as TenantContext;
      const data = await this.campaignModel.listStateEvents(tenantId, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  getCampaignSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId } = req.body as TenantContext;
      const summary = await this.campaignModel.getExecutionSummary(tenantId, req.params.id);
      if (!summary) {
        res.status(404).json({ success: false, error: 'Campaign not found' });
        return;
      }
      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  };

  getCampaignReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.body as TenantContext;
      const query = campaignReportQuerySchema.parse(req.query);
      const now = new Date();
      const defaultFrom = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30);
      const from = query.from ? new Date(query.from) : defaultFrom;
      const to = query.to ? new Date(query.to) : now;

      if (from > to) {
        res.status(400).json({ success: false, error: 'from must be before or equal to to' });
        return;
      }

      const report = await this.campaignModel.getCampaignReport(tenantId, {
        from,
        to,
        scope: query.scope,
        userId,
        ownerId: query.ownerId,
        search: query.q,
        sort: query.sort,
        direction: query.direction,
        limit: query.limit,
        offset: query.offset,
      });

      res.json({
        success: true,
        data: report.summary,
        rows: report.rows,
        pagination: {
          total: report.total,
          limit: query.limit,
          offset: query.offset,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  runAgentChain = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.body as TenantContext;
      const campaignId = req.params.id;
      const body = runAgentChainBodySchema.parse(req.body);

      const campaign = await this.campaignModel.findById(tenantId, campaignId);
      if (!campaign) {
        res.status(404).json({ success: false, error: 'Campaign not found' });
        return;
      }

      const run = await this.campaignAgentChainService.runChain({
        tenantId,
        campaignId,
        createdBy: userId,
        payload: {
          goal: body.goal,
          channels: body.channels,
          locale: body.locale,
        },
      });

      await this.campaignModel.saveAgentChainRun({
        tenantId,
        campaignId,
        userId,
        run,
      });

      res.status(201).json({ success: true, data: run });
    } catch (error) {
      next(error);
    }
  };

  getLatestAgentChainRun = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId } = req.body as TenantContext;
      const campaignId = req.params.id;

      const campaign = await this.campaignModel.findById(tenantId, campaignId);
      if (!campaign) {
        res.status(404).json({ success: false, error: 'Campaign not found' });
        return;
      }

      const run = await this.campaignModel.getLatestAgentChainRun(tenantId, campaignId);
      if (!run) {
        res.status(404).json({ success: false, error: 'No agent chain run found for campaign' });
        return;
      }

      res.json({ success: true, data: run });
    } catch (error) {
      next(error);
    }
  };
}
