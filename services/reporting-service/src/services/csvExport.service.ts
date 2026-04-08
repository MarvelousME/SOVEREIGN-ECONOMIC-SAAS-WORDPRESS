import { Readable } from 'stream';
import { reportingService } from './reporting.service';
import { logger } from '../utils/logger';
import { CashFlow } from '../types';

export interface CsvExportOptions {
  period?: string;
  startDate?: Date;
  endDate?: Date;
  includeHeaders?: boolean;
}

class CsvExportService {
  /**
   * Generate CSV for dashboard summary data
   */
  async exportDashboardCsv(tenantId: string, _options: CsvExportOptions = {}): Promise<Readable> {
    const metrics = await reportingService.getDashboardMetrics(tenantId);
    
    const rows = [
      ['Metric', 'Value'],
      ['Total Users', String(metrics.total_users)],
      ['Active Users (30d)', String(metrics.active_users_30d)],
      ['Total UBI Distributed', metrics.total_ubi_distributed],
      ['UBI Distributed (30d)', metrics.ubi_distributed_30d],
      ['Total Tasks Completed', String(metrics.total_tasks_completed)],
      ['Tasks Completed (30d)', String(metrics.tasks_completed_30d)],
      ['Treasury Balance', metrics.treasury_balance],
      ['Treasury APY', String(metrics.treasury_apy)],
      ['Average User Balance', metrics.avg_user_balance],
      ['Total Rewards Issued', metrics.total_rewards_issued],
      ['Platform Revenue', metrics.platform_revenue],
      ['Agent Executions (30d)', String(metrics.agent_executions_30d)]
    ];

    return this.arrayToStream(rows);
  }

  /**
   * Generate CSV for revenue breakdown
   */
  async exportRevenueCsv(tenantId: string, options: CsvExportOptions = {}): Promise<Readable> {
    const period = options.period || '30d';
    const summary = await reportingService.getFinancialSummary(tenantId, period);

    const rows: (string | number)[][] = [
      ['Source', 'Amount', 'Percentage', 'Transactions'],
      ...summary.revenue_by_source.map(revenue => [
        revenue.source,
        revenue.amount,
        revenue.percentage.toFixed(2),
        revenue.transactions
      ]),
      [],
      ['Total Revenue', summary.total_revenue, '100.00', 
        summary.revenue_by_source.reduce((sum, r) => sum + r.transactions, 0)]
    ];

    return this.arrayToStream(rows);
  }

  /**
   * Generate CSV for expense categories
   */
  async exportExpensesCsv(tenantId: string, options: CsvExportOptions = {}): Promise<Readable> {
    const period = options.period || '30d';
    const summary = await reportingService.getFinancialSummary(tenantId, period);

    const rows: (string | number)[][] = [
      ['Category', 'Amount', 'Percentage', 'Transactions'],
      ...summary.expense_by_category.map(expense => [
        expense.category,
        expense.amount,
        expense.percentage.toFixed(2),
        expense.transactions
      ]),
      [],
      ['Total Expenses', summary.total_expenses, '100.00',
        summary.expense_by_category.reduce((sum, e) => sum + e.transactions, 0)]
    ];

    return this.arrayToStream(rows);
  }

  /**
   * Generate CSV for cash flow data
   */
  async exportCashFlowCsv(tenantId: string, options: CsvExportOptions = {}): Promise<Readable> {
    const period = options.period || '30d';
    const summary = await reportingService.getFinancialSummary(tenantId, period);

    const totalInflow = summary.cash_flow.reduce((sum: number, f: CashFlow) => sum + parseFloat(f.inflow), 0);
    const totalOutflow = summary.cash_flow.reduce((sum: number, f: CashFlow) => sum + parseFloat(f.outflow), 0);

    const rows: (string | number)[][] = [
      ['Date', 'Inflow', 'Outflow', 'Net'],
      ...summary.cash_flow.map((flow: CashFlow) => [
        flow.date,
        flow.inflow,
        flow.outflow,
        flow.net
      ]),
      [],
      ['Totals', totalInflow.toFixed(2), totalOutflow.toFixed(2), (totalInflow - totalOutflow).toFixed(2)]
    ];

    return this.arrayToStream(rows);
  }

  /**
   * Generate CSV for financial summary (combined revenue, expenses, cash flow)
   */
  async exportFinancialSummaryCsv(tenantId: string, options: CsvExportOptions = {}): Promise<Readable> {
    const period = options.period || '30d';
    const summary = await reportingService.getFinancialSummary(tenantId, period);

    const lines: string[] = [];
    lines.push(`Financial Summary Report - Period: ${period}`);
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');

    // Revenue section
    lines.push('=== REVENUE BREAKDOWN ===');
    lines.push('Source,Amount,Percentage,Transactions');
    for (const revenue of summary.revenue_by_source) {
      lines.push(`${this.escapeCsvField(revenue.source)},${revenue.amount},${revenue.percentage.toFixed(2)},${revenue.transactions}`);
    }
    lines.push(`Total Revenue,${summary.total_revenue},100.00,${summary.revenue_by_source.reduce((sum, r) => sum + r.transactions, 0)}`);
    lines.push('');

    // Expenses section
    lines.push('=== EXPENSE BREAKDOWN ===');
    lines.push('Category,Amount,Percentage,Transactions');
    for (const expense of summary.expense_by_category) {
      lines.push(`${this.escapeCsvField(expense.category)},${expense.amount},${expense.percentage.toFixed(2)},${expense.transactions}`);
    }
    lines.push(`Total Expenses,${summary.total_expenses},100.00,${summary.expense_by_category.reduce((sum, e) => sum + e.transactions, 0)}`);
    lines.push('');

    // Cash flow section
    lines.push('=== CASH FLOW ===');
    lines.push('Date,Inflow,Outflow,Net');
    for (const flow of summary.cash_flow) {
      lines.push(`${flow.date},${flow.inflow},${flow.outflow},${flow.net}`);
    }

    return this.stringArrayToStream(lines);
  }

  /**
   * Generate CSV for UBI statistics
   */
  async exportUbiStatsCsv(tenantId: string, options: CsvExportOptions = {}): Promise<Readable> {
    const period = options.period || '30d';
    const stats = await reportingService.getUBIStatistics(tenantId, period);

    const lines: string[] = [];
    lines.push(`UBI Statistics Report - Period: ${period}`);
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');

    // Summary stats
    lines.push('=== SUMMARY ===');
    lines.push('Metric,Value');
    lines.push(`Total Distributed,${stats.total_distributed}`);
    lines.push(`Recipients,${stats.recipients}`);
    lines.push(`Average Amount Per User,${stats.avg_amount_per_user}`);
    lines.push(`Pool Balance,${stats.pool_balance}`);
    lines.push(`Projected Runway Days,${stats.projected_runway_days}`);
    lines.push('');

    // Daily distributions
    lines.push('=== DAILY DISTRIBUTIONS ===');
    lines.push('Date,Amount,Recipients');
    for (const daily of stats.distribution_by_day) {
      lines.push(`${daily.date},${daily.amount},${daily.recipients}`);
    }

    return this.stringArrayToStream(lines);
  }

  /**
   * Generate CSV for task analytics
   */
  async exportTaskAnalyticsCsv(tenantId: string, options: CsvExportOptions = {}): Promise<Readable> {
    const period = options.period || '30d';
    const analytics = await reportingService.getTaskAnalytics(tenantId, period);

    const lines: string[] = [];
    lines.push(`Task Analytics Report - Period: ${period}`);
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');

    // Summary stats
    lines.push('=== SUMMARY ===');
    lines.push('Metric,Value');
    lines.push(`Total Tasks,${analytics.total_tasks}`);
    lines.push(`Completed Tasks,${analytics.completed_tasks}`);
    lines.push(`Pending Tasks,${analytics.pending_tasks}`);
    lines.push(`Rejected Tasks,${analytics.rejected_tasks}`);
    lines.push(`Completion Rate,${analytics.completion_rate.toFixed(2)}%`);
    lines.push(`Average Completion Time (hours),${analytics.avg_completion_time_hours}`);
    lines.push(`Total Rewards Paid,${analytics.total_rewards_paid}`);
    lines.push(`Average Reward Per Task,${analytics.avg_reward_per_task}`);
    lines.push('');

    // Top categories
    lines.push('=== TOP CATEGORIES ===');
    lines.push('Category,Tasks Count,Completion Rate,Avg Reward');
    for (const category of analytics.top_categories) {
      lines.push(`${this.escapeCsvField(category.category)},${category.tasks_count},${category.completion_rate.toFixed(2)},${category.avg_reward}`);
    }

    return this.stringArrayToStream(lines);
  }

  /**
   * Generate CSV for user activity
   */
  async exportUserActivityCsv(tenantId: string, options: CsvExportOptions = {}): Promise<Readable> {
    const period = options.period || '30d';
    const activity = await reportingService.getUserActivityReport(tenantId, period);

    const lines: string[] = [];
    lines.push(`User Activity Report - Period: ${period}`);
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');

    // Summary stats
    lines.push('=== SUMMARY ===');
    lines.push('Metric,Value');
    lines.push(`New Users,${activity.new_users}`);
    lines.push(`Active Users,${activity.active_users}`);
    lines.push(`Churned Users,${activity.churned_users}`);
    lines.push(`Retention Rate,${activity.retention_rate.toFixed(2)}%`);
    lines.push(`Avg Sessions Per User,${activity.engagement_metrics.avg_sessions_per_user}`);
    lines.push(`Avg Session Duration (minutes),${activity.engagement_metrics.avg_session_duration_minutes}`);
    lines.push(`Avg Tasks Per Active User,${activity.engagement_metrics.avg_tasks_per_active_user}`);
    lines.push(`Avg Transactions Per User,${activity.engagement_metrics.avg_transactions_per_user}`);

    return this.stringArrayToStream(lines);
  }

  /**
   * Generate CSV for agent performance
   */
  async exportAgentPerformanceCsv(tenantId: string, options: CsvExportOptions = {}): Promise<Readable> {
    const period = options.period || '30d';
    const performance = await reportingService.getAgentPerformanceReport(tenantId, period);

    const lines: string[] = [];
    lines.push(`Agent Performance Report - Period: ${period}`);
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');

    // Summary stats
    lines.push('=== SUMMARY ===');
    lines.push('Metric,Value');
    lines.push(`Total Executions,${performance.total_executions}`);
    lines.push(`Successful Executions,${performance.successful_executions}`);
    lines.push(`Failed Executions,${performance.failed_executions}`);
    lines.push(`Success Rate,${performance.success_rate.toFixed(2)}%`);
    lines.push(`Total Cost,${performance.total_cost}`);
    lines.push(`Avg Cost Per Execution,${performance.avg_cost_per_execution}`);
    lines.push(`Avg Execution Time (seconds),${performance.avg_execution_time_seconds}`);
    lines.push('');

    // Top agents
    lines.push('=== TOP AGENTS ===');
    lines.push('Agent ID,Agent Name,Executions,Success Rate,Total Cost,Avg Execution Time');
    for (const agent of performance.top_agents) {
      lines.push(`${agent.agent_id},${this.escapeCsvField(agent.agent_name)},${agent.executions},${agent.success_rate.toFixed(2)},${agent.total_cost},${agent.avg_execution_time.toFixed(2)}`);
    }

    // Error analysis
    if (performance.error_analysis.length > 0) {
      lines.push('');
      lines.push('=== ERROR ANALYSIS ===');
      lines.push('Error Type,Count,Percentage,Affected Agents');
      for (const error of performance.error_analysis) {
        lines.push(`${this.escapeCsvField(error.error_type)},${error.count},${error.percentage.toFixed(2)},${error.affected_agents}`);
      }
    }

    return this.stringArrayToStream(lines);
  }

  /**
   * Generate transaction history CSV
   */
  async exportTransactionHistoryCsv(tenantId: string, _options: CsvExportOptions = {}): Promise<Readable> {
    const lines: string[] = [];
    lines.push('ID,Type,Amount,Category/Source,Date,Status');

    try {
      const { db } = await import('../utils/database');
      const result = await db.query(
        `SELECT 
          id,
          'revenue' as type,
          amount,
          source as category,
          created_at,
          status
        FROM revenue_transactions 
        WHERE tenant_id = $1
        UNION ALL
        SELECT 
          id,
          'expense' as type,
          amount,
          category,
          created_at,
          status
        FROM expense_transactions 
        WHERE tenant_id = $1
        ORDER BY created_at DESC`,
        [tenantId]
      );

      for (const row of result.rows) {
        const line = [
          row.id,
          row.type,
          row.amount,
          row.category || row.source || '',
          row.created_at,
          row.status || ''
        ].map(field => this.escapeCsvField(String(field))).join(',');
        lines.push(line);
      }
    } catch (error) {
      logger.error('Failed to fetch transaction history', { tenantId, error });
    }

    return this.stringArrayToStream(lines);
  }

  /**
   * Convert array of row arrays to a readable stream
   */
  private arrayToStream(rows: (string | number)[][]): Readable {
    const lines = rows.map(row => row.join(','));
    return this.stringArrayToStream(lines);
  }

  /**
   * Convert array of strings to a readable stream
   */
  private stringArrayToStream(lines: string[]): Readable {
    return Readable.from(lines.join('\n') + '\n');
  }

  /**
   * Escape CSV field - handles fields with commas, quotes, newlines
   */
  private escapeCsvField(field: string | number | undefined | null): string {
    if (field === undefined || field === null) {
      return '';
    }
    const str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
}

export const csvExportService = new CsvExportService();
