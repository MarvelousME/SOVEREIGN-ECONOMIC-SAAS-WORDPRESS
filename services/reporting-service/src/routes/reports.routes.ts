import { Router, Request, Response } from 'express';
import { reportingService } from '../services/reporting.service';
import { logger } from '../utils/logger';
import { authMiddleware, requireReportAccess } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);
router.use(requireReportAccess());

// GET /api/v1/reports/dashboard - Main dashboard data
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return res.status(400).json({ error: 'Missing tenant_id header' });
    }

    const metrics = await reportingService.getDashboardMetrics(tenantId);
    res.json({ metrics, region: (req.headers['x-region'] as string) || (req.query.region as string) || 'global' });
  } catch (error) {
    logger.error('Failed to get dashboard', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/reports/financial - Financial summary
router.get('/financial', requireReportAccess({ requireSso: true }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const period = (req.query.period as string) || '30d';

    if (!tenantId) {
      return res.status(400).json({ error: 'Missing tenant_id header' });
    }

    const summary = await reportingService.getFinancialSummary(tenantId, period);
    res.json({ summary, region: (req.headers['x-region'] as string) || (req.query.region as string) || 'global' });
  } catch (error) {
    logger.error('Failed to get financial summary', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/reports/ubi-stats - UBI pool statistics
router.get('/ubi-stats', requireReportAccess({ requireSso: true }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const period = (req.query.period as string) || '30d';

    if (!tenantId) {
      return res.status(400).json({ error: 'Missing tenant_id header' });
    }

    const stats = await reportingService.getUBIStatistics(tenantId, period);
    res.json({ stats, region: (req.headers['x-region'] as string) || (req.query.region as string) || 'global' });
  } catch (error) {
    logger.error('Failed to get UBI stats', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/reports/treasury-performance - Treasury metrics
router.get('/treasury-performance', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const period = (req.query.period as string) || '30d';

    if (!tenantId) {
      return res.status(400).json({ error: 'Missing tenant_id header' });
    }

    const summary = await reportingService.getFinancialSummary(tenantId, period);
    res.json({ treasury: summary.treasury_performance });
  } catch (error) {
    logger.error('Failed to get treasury performance', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/reports/task-analytics - Task marketplace stats
router.get('/task-analytics', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const period = (req.query.period as string) || '30d';

    if (!tenantId) {
      return res.status(400).json({ error: 'Missing tenant_id header' });
    }

    const analytics = await reportingService.getTaskAnalytics(tenantId, period);
    res.json({ analytics });
  } catch (error) {
    logger.error('Failed to get task analytics', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/reports/user-activity - User engagement
router.get('/user-activity', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const period = (req.query.period as string) || '30d';

    if (!tenantId) {
      return res.status(400).json({ error: 'Missing tenant_id header' });
    }

    const activity = await reportingService.getUserActivityReport(tenantId, period);
    res.json({ activity });
  } catch (error) {
    logger.error('Failed to get user activity', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/reports/agent-performance - Agent metrics
router.get('/agent-performance', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const period = (req.query.period as string) || '30d';

    if (!tenantId) {
      return res.status(400).json({ error: 'Missing tenant_id header' });
    }

    const performance = await reportingService.getAgentPerformanceReport(tenantId, period);
    res.json({ performance });
  } catch (error) {
    logger.error('Failed to get agent performance', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/reports/custom - Generate custom report
router.post('/custom', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return res.status(400).json({ error: 'Missing tenant_id header' });
    }

    // Custom report generation logic would go here
    res.json({ message: 'Custom report generation not yet implemented' });
  } catch (error) {
    logger.error('Failed to generate custom report', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
