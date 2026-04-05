import { Request, Response } from 'express';
import { consentService } from '../services/consentService';
import { suppressionService } from '../services/suppressionService';
import { disclosureService } from '../services/disclosureService';
import { policyEngine } from '../services/policyEngine';
import { geoRestrictionService } from '../services/geoRestrictionService';
import { reviewQueueService } from '../services/reviewQueueService';
import { abuseScoringService } from '../services/abuseScoringService';
import {
  RecordConsentSchema,
  AddSuppressionSchema,
  ContentCheckSchema,
  SubmitReviewSchema,
  ProcessReviewSchema,
  DisclosureType
} from '../types';

export class ComplianceController {

  async recordConsent(req: Request, res: Response): Promise<void> {
    const validated = RecordConsentSchema.parse(req.body);
    const consent = await consentService.recordConsent(validated);
    res.status(201).json(consent);
  }

  async getConsentStatus(req: Request, res: Response): Promise<void> {
    const { contactId } = req.params;
    const status = await consentService.getConsentStatus(contactId);
    res.json(status);
  }

  async revokeConsent(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { reason } = req.body;
    const consent = await consentService.revokeConsent(id, reason);
    res.json(consent);
  }

  async addToSuppression(req: Request, res: Response): Promise<void> {
    const validated = AddSuppressionSchema.parse(req.body);
    const entry = await suppressionService.addToSuppressionList(validated);
    res.status(201).json(entry);
  }

  async removeFromSuppression(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const removed = await suppressionService.removeFromSuppressionList(id);
    res.status(removed ? 200 : 404).json({ success: removed });
  }

  async listSuppressionEntries(req: Request, res: Response): Promise<void> {
    const filters = {
      type: req.query.type as any,
      channel: req.query.channel as any,
      contactId: req.query.contactId as string,
      email: req.query.email as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    };
    const result = await suppressionService.listSuppressionEntries(filters);
    res.json(result);
  }

  async generateDisclosure(req: Request, res: Response): Promise<void> {
    const { type, channel, context } = req.body;
    const disclosure = await disclosureService.generateDisclosure({
      type: type as DisclosureType,
      channel,
      context
    });
    res.json(disclosure);
  }

  async getChannelPolicy(req: Request, res: Response): Promise<void> {
    const { channel } = req.params;
    const policy = await policyEngine.getChannelPolicy(channel);
    res.json(policy);
  }

  async checkContent(req: Request, res: Response): Promise<void> {
    const { type } = req.params;
    const validated = ContentCheckSchema.parse(req.body);

    if (type === 'content') {
      const result = await policyEngine.checkContent(validated);
      res.json(result);
    } else if (type === 'abuse') {
      const result = await abuseScoringService.calculateAbuseScore({
        contactId: validated.contactId,
        content: validated.content,
        metadata: validated.geoLocation
      });
      res.json(result);
    } else {
      res.status(400).json({ error: 'Invalid check type' });
    }
  }

  async getGeoRestrictions(req: Request, res: Response): Promise<void> {
    const { geo } = req.params;
    const [country, state] = geo.split('/');
    const result = await geoRestrictionService.checkGeoRestriction({
      country,
      state
    });
    res.json(result);
  }

  async submitForReview(req: Request, res: Response): Promise<void> {
    const validated = SubmitReviewSchema.parse(req.body);
    const review = await reviewQueueService.submitForReview(validated);
    res.status(201).json(review);
  }

  async listPendingReviews(req: Request, res: Response): Promise<void> {
    const filters = {
      priority: req.query.priority as any,
      contentType: req.query.contentType as string,
      assignedTo: req.query.assignedTo as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    };
    const result = await reviewQueueService.listPendingReviews(filters);
    res.json(result);
  }

  async listReviews(req: Request, res: Response): Promise<void> {
    const filters = {
      status: req.query.status as any,
      contentType: req.query.contentType as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    };
    const result = await reviewQueueService.listReviews(filters);
    res.json(result);
  }

  async processReview(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const validated = ProcessReviewSchema.parse(req.body);
    const processedBy = req.headers['x-user-id'] as string || 'system';
    const review = await reviewQueueService.processReview(id, validated, processedBy);
    res.json(review);
  }

  async getReview(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const review = await reviewQueueService.getReview(id);
    if (!review) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }
    res.json(review);
  }

  async createGeoRestriction(req: Request, res: Response): Promise<void> {
    const restriction = await geoRestrictionService.createRestriction(req.body);
    res.status(201).json(restriction);
  }

  async listGeoRestrictions(req: Request, res: Response): Promise<void> {
    const filters = {
      type: req.query.type as any,
      country: req.query.country as string,
      isBlocked: req.query.isBlocked === 'true'
    };
    const restrictions = await geoRestrictionService.listRestrictions(filters);
    res.json(restrictions);
  }

  async calculateAbuseScore(req: Request, res: Response): Promise<void> {
    const { contactId, email, phone, content, metadata } = req.body;
    const score = await abuseScoringService.calculateAbuseScore({
      contactId,
      email,
      phone,
      content,
      metadata
    });
    res.json(score);
  }

  async getAbuseSignals(req: Request, res: Response): Promise<void> {
    const { contactId } = req.params;
    const signals = await abuseScoringService.getSignalsByContact(contactId);
    res.json(signals);
  }

  async createDisclosureTemplate(req: Request, res: Response): Promise<void> {
    const template = await disclosureService.createTemplate(req.body);
    res.status(201).json(template);
  }

  async listDisclosureTemplates(req: Request, res: Response): Promise<void> {
    const filters = {
      type: req.query.type as any,
      channel: req.query.channel as string,
      regulation: req.query.regulation as any,
      isActive: req.query.isActive !== 'false'
    };
    const templates = await disclosureService.listTemplates(filters);
    res.json(templates);
  }

  async createChannelPolicy(req: Request, res: Response): Promise<void> {
    const policy = await policyEngine.createChannelPolicy(req.body);
    res.status(201).json(policy);
  }

  async listChannelPolicies(req: Request, res: Response): Promise<void> {
    const filters = {
      channel: req.query.channel as string,
      regulation: req.query.regulation as any,
      isActive: req.query.isActive !== 'false'
    };
    const policies = await policyEngine.listChannelPolicies(filters);
    res.json(policies);
  }

  async getConsentByContactId(req: Request, res: Response): Promise<void> {
    const { contactId } = req.params;
    const consents = await consentService.getConsentByContactId(contactId);
    res.json(consents);
  }
}

export const complianceController = new ComplianceController();
