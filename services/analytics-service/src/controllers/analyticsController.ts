import { Request, Response } from 'express';
import { eventIngestionService } from '../services/eventIngestion';
import { attributionEngine } from '../services/attributionEngine';
import { conversionTracker } from '../services/conversionTracker';
import { dashboardService } from '../services/dashboardService';
import { anomalyDetector } from '../services/anomalyDetector';
import { experimentService } from '../services/experimentService';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler';
import { AttributionModelType, CloudEvent } from '../types';
import logger from '../utils/logger';

export class AnalyticsController {
  ingestEvent = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await eventIngestionService.ingestEvent(req.body);
    
    if (result.success) {
      res.status(201).json({
        success: true,
        eventId: result.eventId,
        message: 'Event ingested successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  });

  ingestBatch = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const events = req.body.events || req.body;
    
    if (!Array.isArray(events)) {
      throw new ValidationError('Events must be an array', [
        { field: 'events', message: 'Expected array of events' },
      ]);
    }

    const result = await eventIngestionService.ingestBatch(events);
    
    res.status(200).json({
      success: true,
      ...result,
    });
  });

  getMetrics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.tenantContext!.tenantId;
    const workspaceId = req.query.workspaceId as string | undefined;
    const period = (req.query.period as 'today' | '7d' | '30d' | '90d') || '7d';

    const metrics = await dashboardService.getDashboardMetrics(tenantId, workspaceId, period);
    
    res.json({ success: true, data: metrics });
  });

  getDashboard = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.tenantContext!.tenantId;
    const workspaceId = req.query.workspaceId as string | undefined;
    const period = (req.query.period as 'today' | '7d' | '30d' | '90d') || '7d';

    const metrics = await dashboardService.getDashboardMetrics(tenantId, workspaceId, period);
    const metricTimeSeries = await dashboardService.getMetricTimeSeries(tenantId, 'events.total', {
      workspaceId,
      granularity: 'hour',
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });

    res.json({
      success: true,
      data: {
        metrics,
        timeSeries: metricTimeSeries,
        generatedAt: new Date().toISOString(),
      },
    });
  });

  getAttribution = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.tenantContext!.tenantId;
    const workspaceId = req.query.workspaceId as string | undefined;
    const modelType = (req.query.model as AttributionModelType) || 'linear';
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const groupBy = (req.query.groupBy as 'channel' | 'source' | 'medium' | 'campaign' | 'touchpoint_type') || 'channel';

    const report = await attributionEngine.getAttributionReport(tenantId, {
      workspaceId,
      modelType,
      startDate,
      endDate,
      groupBy,
    });

    res.json({ success: true, data: report });
  });

  calculateAttribution = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { conversionId } = req.params;
    const { modelType } = req.body as { modelType: AttributionModelType };

    if (!conversionId) {
      throw new ValidationError('Conversion ID is required', [
        { field: 'conversionId', message: 'Conversion ID is required' },
      ]);
    }

    const result = await attributionEngine.calculateAttribution(conversionId, modelType || 'linear');
    
    res.json({ success: true, data: result });
  });

  getConversions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.tenantContext!.tenantId;
    const workspaceId = req.query.workspaceId as string | undefined;
    const conversionType = req.query.conversionType as string | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const limit = parseInt(req.query.limit as string, 10) || 100;
    const offset = parseInt(req.query.offset as string, 10) || 0;

    const result = await attributionEngine.getConversions(tenantId, {
      workspaceId,
      conversionType,
      startDate,
      endDate,
      limit,
      offset,
    });

    res.json({
      success: true,
      data: result.conversions,
      pagination: {
        limit,
        offset,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  });

  trackConversion = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.tenantContext!.tenantId;
    const workspaceId = req.tenantContext!.workspaceId || req.body.workspaceId;
    
    const {
      visitorId,
      sessionId,
      conversionType,
      conversionValue,
      revenue,
      cost,
      currency,
      attributionModel,
    } = req.body;

    if (!visitorId || !conversionType) {
      throw new ValidationError('Missing required fields', [
        { field: 'visitorId', message: 'Visitor ID is required' },
        { field: 'conversionType', message: 'Conversion type is required' },
      ]);
    }

    const conversion = await conversionTracker.trackConversion(tenantId, workspaceId!, visitorId, sessionId, conversionType, conversionValue || 0, {
      revenue,
      cost,
      currency,
      attributionModel,
    });

    res.status(201).json({ success: true, data: conversion });
  });

  getConversionFunnel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.tenantContext!.tenantId;
    const workspaceId = req.query.workspaceId as string | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const funnel = await conversionTracker.getConversionFunnel(tenantId, {
      workspaceId,
      startDate,
      endDate,
    });

    res.json({ success: true, data: funnel });
  });

  getPageAnalytics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.tenantContext!.tenantId;
    const workspaceId = req.query.workspaceId as string | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const limit = parseInt(req.query.limit as string, 10) || 50;

    const pages = await dashboardService.getPageAnalytics(tenantId, {
      workspaceId,
      startDate,
      endDate,
      limit,
    });

    res.json({ success: true, data: pages });
  });

  getLeadAnalytics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.tenantContext!.tenantId;
    const workspaceId = req.query.workspaceId as string | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const leads = await dashboardService.getLeadAnalytics(tenantId, {
      workspaceId,
      startDate,
      endDate,
    });

    res.json({ success: true, data: leads });
  });

  getRevenueReport = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.tenantContext!.tenantId;
    const workspaceId = req.query.workspaceId as string | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const granularity = (req.query.granularity as 'day' | 'week' | 'month') || 'day';

    const report = await dashboardService.getRevenueReport(tenantId, {
      workspaceId,
      startDate,
      endDate,
      granularity,
    });

    res.json({ success: true, data: report });
  });

  getAgentMetrics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.tenantContext!.tenantId;
    const workspaceId = req.query.workspaceId as string | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const metrics = await dashboardService.getAgentMetrics(tenantId, {
      workspaceId,
      startDate,
      endDate,
    });

    res.json({ success: true, data: metrics });
  });

  getCohortAnalysis = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.tenantContext!.tenantId;
    const workspaceId = req.query.workspaceId as string | undefined;
    const cohortType = (req.query.cohortType as string) || 'weekly';
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const report = await attributionEngine.getAttributionReport(tenantId, {
      workspaceId,
      startDate,
      endDate,
      groupBy: 'channel',
    });

    res.json({
      success: true,
      data: {
        cohortType,
        cohorts: [],
        summary: report.summary,
      },
    });
  });

  getFunnelAnalysis = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.tenantContext!.tenantId;
    const workspaceId = req.query.workspaceId as string | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const funnel = await conversionTracker.getConversionFunnel(tenantId, {
      workspaceId,
      startDate,
      endDate,
    });

    res.json({ success: true, data: funnel });
  });

  createExperiment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.tenantContext!.tenantId;
    const workspaceId = req.tenantContext!.workspaceId || req.body.workspaceId;

    const {
      experimentName,
      variantConfig,
      experimentDescription,
      hypothesis,
      trafficAllocation,
      attributionModelId,
    } = req.body;

    if (!experimentName || !variantConfig) {
      throw new ValidationError('Missing required fields', [
        { field: 'experimentName', message: 'Experiment name is required' },
        { field: 'variantConfig', message: 'Variant config is required' },
      ]);
    }

    const experiment = await experimentService.createExperiment(tenantId, workspaceId, experimentName, variantConfig, {
      experimentDescription,
      hypothesis,
      trafficAllocation,
      attributionModelId,
    });

    res.status(201).json({ success: true, data: experiment });
  });

  getExperiment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const experiment = await experimentService.getExperiment(id);
    if (!experiment) {
      throw new NotFoundError('Experiment');
    }

    const results = await experimentService.getExperimentResults(id);

    res.json({ success: true, data: results });
  });

  startExperiment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const experiment = await experimentService.startExperiment(id);
    
    res.json({ success: true, data: experiment });
  });

  pauseExperiment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const experiment = await experimentService.pauseExperiment(id);
    
    res.json({ success: true, data: experiment });
  });

  completeExperiment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const experiment = await experimentService.completeExperiment(id);
    
    res.json({ success: true, data: experiment });
  });

  getAnomalies = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.tenantContext!.tenantId;
    const workspaceId = req.query.workspaceId as string | undefined;
    const status = req.query.status as 'active' | 'acknowledged' | 'resolved' | undefined;
    const severity = req.query.severity as 'low' | 'medium' | 'high' | 'critical' | undefined;
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const offset = parseInt(req.query.offset as string, 10) || 0;

    const result = await anomalyDetector.getAlerts(tenantId, {
      workspaceId,
      status,
      severity,
      limit,
      offset,
    });

    res.json({
      success: true,
      data: result.alerts,
      pagination: {
        limit,
        offset,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  });

  acknowledgeAnomaly = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    await anomalyDetector.acknowledgeAlert(id);
    
    res.json({ success: true, message: 'Alert acknowledged' });
  });

  resolveAnomaly = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    await anomalyDetector.resolveAlert(id);
    
    res.json({ success: true, message: 'Alert resolved' });
  });

  detectAnomaly = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.tenantContext!.tenantId;
    const workspaceId = req.tenantContext!.workspaceId || req.query.workspaceId as string | undefined;
    const { metricName, zThreshold } = req.body;

    if (!metricName) {
      throw new ValidationError('Metric name is required', [
        { field: 'metricName', message: 'Metric name is required' },
      ]);
    }

    const result = await anomalyDetector.detectAnomaly(tenantId, metricName, workspaceId, {
      zThreshold,
    });

    res.json({ success: true, data: result });
  });

  getMetricTimeSeries = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.tenantContext!.tenantId;
    const workspaceId = req.query.workspaceId as string | undefined;
    const { metricName } = req.params;
    const granularity = (req.query.granularity as 'minute' | 'hour' | 'day' | 'week') || 'hour';
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const series = await dashboardService.getMetricTimeSeries(tenantId, metricName, {
      workspaceId,
      granularity,
      startDate,
      endDate,
    });

    res.json({ success: true, data: series });
  });
}

export const analyticsController = new AnalyticsController();
