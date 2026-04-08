import { Router } from 'express';
import { analyticsController } from '../controllers/analyticsController';
import { authMiddleware, optionalAuthMiddleware, requireReportAccess, workspaceMiddleware } from '../middleware/auth';
import { subscribeToEvents } from '../middleware/sse';

const router = Router();

router.post('/events', authMiddleware, workspaceMiddleware, analyticsController.ingestEvent);
router.post('/events/ingest', optionalAuthMiddleware, workspaceMiddleware, analyticsController.ingestEvent);

router.post('/events/batch', authMiddleware, workspaceMiddleware, analyticsController.ingestBatch);

router.get('/events', authMiddleware, workspaceMiddleware, async (req, res) => {
  res.json({ success: true, data: [] });
});

router.get('/metrics', authMiddleware, workspaceMiddleware, requireReportAccess(), analyticsController.getMetrics);

router.get('/dashboard', authMiddleware, workspaceMiddleware, requireReportAccess(), analyticsController.getDashboard);

router.get('/attribution', authMiddleware, workspaceMiddleware, requireReportAccess(), analyticsController.getAttribution);

router.post('/attribution/calculate/:conversionId', authMiddleware, workspaceMiddleware, analyticsController.calculateAttribution);

router.get('/conversions', authMiddleware, workspaceMiddleware, requireReportAccess(), analyticsController.getConversions);

router.post('/conversions/track', authMiddleware, workspaceMiddleware, analyticsController.trackConversion);

router.get('/funnels', authMiddleware, workspaceMiddleware, requireReportAccess(), analyticsController.getConversionFunnel);

router.get('/pages', authMiddleware, workspaceMiddleware, requireReportAccess(), analyticsController.getPageAnalytics);

router.get('/leads', authMiddleware, workspaceMiddleware, requireReportAccess({ requireSso: true }), analyticsController.getLeadAnalytics);

router.get('/revenue', authMiddleware, workspaceMiddleware, requireReportAccess({ requireSso: true }), analyticsController.getRevenueReport);

router.get('/agents', authMiddleware, workspaceMiddleware, requireReportAccess(), analyticsController.getAgentMetrics);

router.get('/cohorts', authMiddleware, workspaceMiddleware, requireReportAccess(), analyticsController.getCohortAnalysis);

router.get('/experiments', authMiddleware, workspaceMiddleware, async (req, res) => {
  res.json({ success: true, data: [] });
});

router.post('/experiments', authMiddleware, workspaceMiddleware, analyticsController.createExperiment);

router.get('/experiments/:id', authMiddleware, workspaceMiddleware, analyticsController.getExperiment);

router.post('/experiments/:id/start', authMiddleware, workspaceMiddleware, analyticsController.startExperiment);

router.post('/experiments/:id/pause', authMiddleware, workspaceMiddleware, analyticsController.pauseExperiment);

router.post('/experiments/:id/complete', authMiddleware, workspaceMiddleware, analyticsController.completeExperiment);

router.get('/anomalies', authMiddleware, workspaceMiddleware, analyticsController.getAnomalies);

router.post('/anomalies/:id/acknowledge', authMiddleware, workspaceMiddleware, analyticsController.acknowledgeAnomaly);

router.post('/anomalies/:id/resolve', authMiddleware, workspaceMiddleware, analyticsController.resolveAnomaly);

router.post('/anomalies/detect', authMiddleware, workspaceMiddleware, analyticsController.detectAnomaly);

router.get('/metrics/:metricName/timeseries', authMiddleware, workspaceMiddleware, analyticsController.getMetricTimeSeries);

router.get('/stream', optionalAuthMiddleware, subscribeToEvents);

router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'analytics-service',
    timestamp: new Date().toISOString(),
  });
});

export default router;
