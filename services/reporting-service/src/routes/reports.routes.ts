import { Router, Request, Response } from 'express';
import { reportingService } from '../services/reporting.service';
import { csvExportService } from '../services/csvExport.service';
import { pdfExportService } from '../services/pdfExport.service';
import { logger } from '../utils/logger';
import { authMiddleware, requireReportAccess } from '../middleware/auth.middleware';

const router = Router();

/**
 * Helper to set CSV response headers
 */
function setCsvHeaders(res: Response, filename: string): void {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
}

/**
 * Helper to stream CSV response with error handling
 */
async function streamCsv(
  res: Response,
  tenantId: string,
  exportFn: (tenantId: string, options: any) => Promise<NodeJS.ReadableStream>,
  options: any = {}
): Promise<void> {
  try {
    const stream = await exportFn(tenantId, options);
    stream.pipe(res);
    
    stream.on('error', (error) => {
      logger.error('CSV stream error', { error });
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to generate CSV' });
      }
    });
  } catch (error) {
    logger.error('CSV export failed', { error });
    res.status(500).json({ error: 'Failed to generate CSV' });
  }
}

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

// GET /api/v1/reports/dashboard/pdf - Dashboard PDF export
router.get('/dashboard/pdf', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return res.status(400).json({ error: 'Missing tenant_id header' });
    }

    const period = (req.query.period as string) || '30d';

    // Set PDF response headers
    const filename = `dashboard-report-${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Generate and stream PDF
    const pdfBuffer = await pdfExportService.generateDashboardPDF({
      tenantId,
      period
    });

    res.send(pdfBuffer);
  } catch (error) {
    logger.error('Failed to generate dashboard PDF', { error });
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
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

// ==================== CSV EXPORT ROUTES ====================

// GET /api/v1/reports/dashboard/csv - Dashboard CSV export
router.get('/dashboard/csv', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return res.status(400).json({ error: 'Missing tenant_id header' });
    }

    setCsvHeaders(res, `dashboard-${new Date().toISOString().split('T')[0]}.csv`);
    await streamCsv(res, tenantId, csvExportService.exportDashboardCsv.bind(csvExportService));
  } catch (error) {
    logger.error('Failed to export dashboard CSV', { error });
    res.status(500).json({ error: 'Failed to generate CSV' });
  }
});

// GET /api/v1/reports/revenue/csv - Revenue breakdown CSV
router.get('/revenue/csv', requireReportAccess({ requireSso: true }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const period = (req.query.period as string) || '30d';

    if (!tenantId) {
      return res.status(400).json({ error: 'Missing tenant_id header' });
    }

    setCsvHeaders(res, `revenue-${period}-${new Date().toISOString().split('T')[0]}.csv`);
    await streamCsv(res, tenantId, csvExportService.exportRevenueCsv.bind(csvExportService), { period });
  } catch (error) {
    logger.error('Failed to export revenue CSV', { error });
    res.status(500).json({ error: 'Failed to generate CSV' });
  }
});

// GET /api/v1/reports/expenses/csv - Expense categories CSV
router.get('/expenses/csv', requireReportAccess({ requireSso: true }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const period = (req.query.period as string) || '30d';

    if (!tenantId) {
      return res.status(400).json({ error: 'Missing tenant_id header' });
    }

    setCsvHeaders(res, `expenses-${period}-${new Date().toISOString().split('T')[0]}.csv`);
    await streamCsv(res, tenantId, csvExportService.exportExpensesCsv.bind(csvExportService), { period });
  } catch (error) {
    logger.error('Failed to export expenses CSV', { error });
    res.status(500).json({ error: 'Failed to generate CSV' });
  }
});

// GET /api/v1/reports/cash-flow/csv - Cash flow CSV
router.get('/cash-flow/csv', requireReportAccess({ requireSso: true }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const period = (req.query.period as string) || '30d';

    if (!tenantId) {
      return res.status(400).json({ error: 'Missing tenant_id header' });
    }

    setCsvHeaders(res, `cash-flow-${period}-${new Date().toISOString().split('T')[0]}.csv`);
    await streamCsv(res, tenantId, csvExportService.exportCashFlowCsv.bind(csvExportService), { period });
  } catch (error) {
    logger.error('Failed to export cash flow CSV', { error });
    res.status(500).json({ error: 'Failed to generate CSV' });
  }
});

// GET /api/v1/reports/financial/csv - Full financial summary CSV
router.get('/financial/csv', requireReportAccess({ requireSso: true }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const period = (req.query.period as string) || '30d';

    if (!tenantId) {
      return res.status(400).json({ error: 'Missing tenant_id header' });
    }

    setCsvHeaders(res, `financial-summary-${period}-${new Date().toISOString().split('T')[0]}.csv`);
    await streamCsv(res, tenantId, csvExportService.exportFinancialSummaryCsv.bind(csvExportService), { period });
  } catch (error) {
    logger.error('Failed to export financial summary CSV', { error });
    res.status(500).json({ error: 'Failed to generate CSV' });
  }
});

// GET /api/v1/reports/ubi-stats/csv - UBI statistics CSV
router.get('/ubi-stats/csv', requireReportAccess({ requireSso: true }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const period = (req.query.period as string) || '30d';

    if (!tenantId) {
      return res.status(400).json({ error: 'Missing tenant_id header' });
    }

    setCsvHeaders(res, `ubi-stats-${period}-${new Date().toISOString().split('T')[0]}.csv`);
    await streamCsv(res, tenantId, csvExportService.exportUbiStatsCsv.bind(csvExportService), { period });
  } catch (error) {
    logger.error('Failed to export UBI stats CSV', { error });
    res.status(500).json({ error: 'Failed to generate CSV' });
  }
});

// GET /api/v1/reports/task-analytics/csv - Task analytics CSV
router.get('/task-analytics/csv', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const period = (req.query.period as string) || '30d';

    if (!tenantId) {
      return res.status(400).json({ error: 'Missing tenant_id header' });
    }

    setCsvHeaders(res, `task-analytics-${period}-${new Date().toISOString().split('T')[0]}.csv`);
    await streamCsv(res, tenantId, csvExportService.exportTaskAnalyticsCsv.bind(csvExportService), { period });
  } catch (error) {
    logger.error('Failed to export task analytics CSV', { error });
    res.status(500).json({ error: 'Failed to generate CSV' });
  }
});

// GET /api/v1/reports/user-activity/csv - User activity CSV
router.get('/user-activity/csv', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const period = (req.query.period as string) || '30d';

    if (!tenantId) {
      return res.status(400).json({ error: 'Missing tenant_id header' });
    }

    setCsvHeaders(res, `user-activity-${period}-${new Date().toISOString().split('T')[0]}.csv`);
    await streamCsv(res, tenantId, csvExportService.exportUserActivityCsv.bind(csvExportService), { period });
  } catch (error) {
    logger.error('Failed to export user activity CSV', { error });
    res.status(500).json({ error: 'Failed to generate CSV' });
  }
});

// GET /api/v1/reports/agent-performance/csv - Agent performance CSV
router.get('/agent-performance/csv', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const period = (req.query.period as string) || '30d';

    if (!tenantId) {
      return res.status(400).json({ error: 'Missing tenant_id header' });
    }

    setCsvHeaders(res, `agent-performance-${period}-${new Date().toISOString().split('T')[0]}.csv`);
    await streamCsv(res, tenantId, csvExportService.exportAgentPerformanceCsv.bind(csvExportService), { period });
  } catch (error) {
    logger.error('Failed to export agent performance CSV', { error });
    res.status(500).json({ error: 'Failed to generate CSV' });
  }
});

// GET /api/v1/reports/transactions/csv - Transaction history CSV
router.get('/transactions/csv', requireReportAccess({ requireSso: true }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const period = (req.query.period as string) || '30d';

    if (!tenantId) {
      return res.status(400).json({ error: 'Missing tenant_id header' });
    }

    setCsvHeaders(res, `transactions-${period}-${new Date().toISOString().split('T')[0]}.csv`);
    await streamCsv(res, tenantId, csvExportService.exportTransactionHistoryCsv.bind(csvExportService), { period });
  } catch (error) {
    logger.error('Failed to export transactions CSV', { error });
    res.status(500).json({ error: 'Failed to generate CSV' });
  }
});

export default router;
