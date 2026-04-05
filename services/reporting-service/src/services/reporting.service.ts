import { db } from '../utils/database';
import { redis } from '../utils/redis';
import { logger } from '../utils/logger';
import {
  DashboardMetrics,
  FinancialSummary,
  UBIStats,
  TaskAnalytics,
  UserActivity,
  AgentPerformance
} from '../types';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

class ReportingService {
  private readonly CACHE_TTL = 300; // 5 minutes

  async getDashboardMetrics(tenantId: string): Promise<DashboardMetrics> {
    const cacheKey = `dashboard:metrics:${tenantId}`;
    
    try {
      // Try cache first
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Query all metrics in parallel
      const [
        userStats,
        ubiStats,
        taskStats,
        treasuryStats,
        rewardStats,
        revenueStats,
        agentStats
      ] = await Promise.all([
        this.getUserStats(tenantId),
        this.getUBIStatsQuick(tenantId),
        this.getTaskStatsQuick(tenantId),
        this.getTreasuryStatsQuick(tenantId),
        this.getRewardStatsQuick(tenantId),
        this.getRevenueStatsQuick(tenantId),
        this.getAgentStatsQuick(tenantId)
      ]);

      const metrics: DashboardMetrics = {
        total_users: userStats.total,
        active_users_30d: userStats.active_30d,
        total_ubi_distributed: ubiStats.total,
        ubi_distributed_30d: ubiStats.last_30d,
        total_tasks_completed: taskStats.total,
        tasks_completed_30d: taskStats.last_30d,
        treasury_balance: treasuryStats.balance,
        treasury_apy: treasuryStats.apy,
        avg_user_balance: userStats.avg_balance,
        total_rewards_issued: rewardStats.total,
        platform_revenue: revenueStats.total,
        agent_executions_30d: agentStats.executions_30d
      };

      // Cache for 5 minutes
      await redis.set(cacheKey, JSON.stringify(metrics), this.CACHE_TTL);

      return metrics;
    } catch (error) {
      logger.error('Failed to get dashboard metrics', { tenantId, error });
      throw error;
    }
  }

  async getFinancialSummary(tenantId: string, period: string = '30d'): Promise<FinancialSummary> {
    try {
      const { startDate, endDate } = this.parsePeriod(period);

      const [revenue, expenses, treasury] = await Promise.all([
        this.getRevenueSummary(tenantId, startDate, endDate),
        this.getExpenseSummary(tenantId, startDate, endDate),
        this.getTreasurySummary(tenantId)
      ]);

      const profitLoss = (parseFloat(revenue.total) - parseFloat(expenses.total)).toFixed(2);

      return {
        period,
        total_revenue: revenue.total,
        revenue_by_source: revenue.by_source,
        total_expenses: expenses.total,
        expense_by_category: expenses.by_category,
        treasury_performance: treasury,
        profit_loss: profitLoss,
        cash_flow: await this.getCashFlow(tenantId, startDate, endDate)
      };
    } catch (error) {
      logger.error('Failed to get financial summary', { tenantId, period, error });
      throw error;
    }
  }

  async getUBIStatistics(tenantId: string, period: string = '30d'): Promise<UBIStats> {
    try {
      const { startDate, endDate } = this.parsePeriod(period);

      const result = await db.query<any>(
        `SELECT 
          COALESCE(SUM(amount), 0) as total_distributed,
          COUNT(DISTINCT user_id) as recipients,
          COALESCE(AVG(amount), 0) as avg_amount
        FROM ubi_distributions
        WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3`,
        [tenantId, startDate, endDate]
      );

      const stats = result.rows[0];

      const [dailyDist, fundingSources, poolBalance] = await Promise.all([
        this.getDailyDistributions(tenantId, startDate, endDate),
        this.getFundingSources(tenantId),
        this.getUBIPoolBalance(tenantId)
      ]);

      const projectedRunwayDays = parseFloat(poolBalance) / (parseFloat(stats.total_distributed) / 30);

      return {
        period,
        total_distributed: stats.total_distributed,
        recipients: stats.recipients,
        avg_amount_per_user: stats.avg_amount,
        distribution_by_day: dailyDist,
        funding_sources: fundingSources,
        pool_balance: poolBalance,
        projected_runway_days: Math.floor(projectedRunwayDays)
      };
    } catch (error) {
      logger.error('Failed to get UBI statistics', { tenantId, period, error });
      throw error;
    }
  }

  async getTaskAnalytics(tenantId: string, period: string = '30d'): Promise<TaskAnalytics> {
    try {
      const { startDate, endDate } = this.parsePeriod(period);

      const result = await db.query<any>(
        `SELECT 
          COUNT(*) as total_tasks,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_tasks,
          COUNT(*) FILTER (WHERE status = 'rejected') as rejected_tasks,
          COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) FILTER (WHERE status = 'completed'), 0) as avg_completion_hours,
          COALESCE(SUM(reward_amount) FILTER (WHERE status = 'completed'), 0) as total_rewards,
          COALESCE(AVG(reward_amount) FILTER (WHERE status = 'completed'), 0) as avg_reward
        FROM tasks
        WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3`,
        [tenantId, startDate, endDate]
      );

      const stats = result.rows[0];
      const completionRate = stats.total_tasks > 0 
        ? (stats.completed_tasks / stats.total_tasks) * 100 
        : 0;

      const [topCategories, topPerformers] = await Promise.all([
        this.getTopTaskCategories(tenantId, startDate, endDate),
        this.getTopTaskPerformers(tenantId, startDate, endDate)
      ]);

      return {
        period,
        total_tasks: parseInt(stats.total_tasks),
        completed_tasks: parseInt(stats.completed_tasks),
        pending_tasks: parseInt(stats.pending_tasks),
        rejected_tasks: parseInt(stats.rejected_tasks),
        completion_rate: completionRate,
        avg_completion_time_hours: parseFloat(stats.avg_completion_hours),
        total_rewards_paid: stats.total_rewards,
        avg_reward_per_task: stats.avg_reward,
        top_categories: topCategories,
        top_performers: topPerformers
      };
    } catch (error) {
      logger.error('Failed to get task analytics', { tenantId, period, error });
      throw error;
    }
  }

  async getUserActivityReport(tenantId: string, period: string = '30d'): Promise<UserActivity> {
    try {
      const { startDate, endDate } = this.parsePeriod(period);

      const result = await db.query<any>(
        `SELECT 
          COUNT(*) FILTER (WHERE created_at BETWEEN $2 AND $3) as new_users,
          COUNT(*) FILTER (WHERE last_active_at BETWEEN $2 AND $3) as active_users,
          COUNT(*) FILTER (WHERE last_active_at < $2 - INTERVAL '30 days') as churned_users
        FROM users
        WHERE tenant_id = $1`,
        [tenantId, startDate, endDate]
      );

      const stats = result.rows[0];
      const retentionRate = stats.new_users > 0
        ? ((stats.active_users - stats.new_users) / stats.new_users) * 100
        : 0;

      const [dau, segments, engagement] = await Promise.all([
        this.getDAUMetrics(tenantId, startDate, endDate),
        this.getUserSegments(tenantId),
        this.getEngagementMetrics(tenantId, startDate, endDate)
      ]);

      return {
        period,
        new_users: parseInt(stats.new_users),
        active_users: parseInt(stats.active_users),
        churned_users: parseInt(stats.churned_users),
        retention_rate: retentionRate,
        daily_active_users: dau,
        user_segments: segments,
        engagement_metrics: engagement
      };
    } catch (error) {
      logger.error('Failed to get user activity report', { tenantId, period, error });
      throw error;
    }
  }

  async getAgentPerformanceReport(tenantId: string, period: string = '30d'): Promise<AgentPerformance> {
    try {
      const { startDate, endDate } = this.parsePeriod(period);

      const result = await db.query<any>(
        `SELECT 
          COUNT(*) as total_executions,
          COUNT(*) FILTER (WHERE status = 'success') as successful,
          COUNT(*) FILTER (WHERE status = 'failed') as failed,
          COALESCE(SUM(cost), 0) as total_cost,
          COALESCE(AVG(cost), 0) as avg_cost,
          COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - started_at))), 0) as avg_duration
        FROM agent_executions
        WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3`,
        [tenantId, startDate, endDate]
      );

      const stats = result.rows[0];
      const successRate = stats.total_executions > 0
        ? (stats.successful / stats.total_executions) * 100
        : 0;

      const [topAgents, errorAnalysis] = await Promise.all([
        this.getTopAgents(tenantId, startDate, endDate),
        this.getErrorAnalysis(tenantId, startDate, endDate)
      ]);

      return {
        period,
        total_executions: parseInt(stats.total_executions),
        successful_executions: parseInt(stats.successful),
        failed_executions: parseInt(stats.failed),
        success_rate: successRate,
        total_cost: stats.total_cost,
        avg_cost_per_execution: stats.avg_cost,
        avg_execution_time_seconds: parseFloat(stats.avg_duration),
        top_agents: topAgents,
        error_analysis: errorAnalysis
      };
    } catch (error) {
      logger.error('Failed to get agent performance report', { tenantId, period, error });
      throw error;
    }
  }

  // Helper methods
  private parsePeriod(period: string): { startDate: Date; endDate: Date } {
    const endDate = endOfDay(new Date());
    let startDate: Date;

    if (period.endsWith('d')) {
      const days = parseInt(period.slice(0, -1));
      startDate = startOfDay(subDays(endDate, days));
    } else if (period.endsWith('m')) {
      const months = parseInt(period.slice(0, -1));
      startDate = startOfDay(subDays(endDate, months * 30));
    } else {
      startDate = startOfDay(subDays(endDate, 30));
    }

    return { startDate, endDate };
  }

  private async getUserStats(tenantId: string) {
    const result = await db.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE last_active_at >= NOW() - INTERVAL '30 days') as active_30d,
        COALESCE(AVG(balance), 0) as avg_balance
      FROM users WHERE tenant_id = $1`,
      [tenantId]
    );
    return result.rows[0];
  }

  private async getUBIStatsQuick(tenantId: string) {
    const result = await db.query(
      `SELECT 
        COALESCE(SUM(amount), 0) as total,
        COALESCE(SUM(amount) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days'), 0) as last_30d
      FROM ubi_distributions WHERE tenant_id = $1`,
      [tenantId]
    );
    return result.rows[0];
  }

  private async getTaskStatsQuick(tenantId: string) {
    const result = await db.query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'completed') as total,
        COUNT(*) FILTER (WHERE status = 'completed' AND completed_at >= NOW() - INTERVAL '30 days') as last_30d
      FROM tasks WHERE tenant_id = $1`,
      [tenantId]
    );
    return result.rows[0];
  }

  private async getTreasuryStatsQuick(tenantId: string) {
    const result = await db.query(
      `SELECT 
        COALESCE(total_value, 0) as balance,
        COALESCE(current_apy, 0) as apy
      FROM treasury_stats WHERE tenant_id = $1
      ORDER BY created_at DESC LIMIT 1`,
      [tenantId]
    );
    return result.rows[0] || { balance: '0', apy: 0 };
  }

  private async getRewardStatsQuick(tenantId: string) {
    const result = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total
      FROM rewards WHERE tenant_id = $1`,
      [tenantId]
    );
    return result.rows[0];
  }

  private async getRevenueStatsQuick(tenantId: string) {
    const result = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total
      FROM revenue_transactions WHERE tenant_id = $1`,
      [tenantId]
    );
    return result.rows[0];
  }

  private async getAgentStatsQuick(tenantId: string) {
    const result = await db.query(
      `SELECT COUNT(*) as executions_30d
      FROM agent_executions 
      WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '30 days'`,
      [tenantId]
    );
    return result.rows[0];
  }

  private async getRevenueSummary(tenantId: string, startDate: Date, endDate: Date) {
    const result = await db.query(
      `SELECT 
        source,
        COALESCE(SUM(amount), 0) as amount,
        COUNT(*) as transactions
      FROM revenue_transactions
      WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3
      GROUP BY source`,
      [tenantId, startDate, endDate]
    );

    const total = result.rows.reduce((sum, row) => sum + parseFloat(row.amount), 0);

    return {
      total: total.toFixed(2),
      by_source: result.rows.map(row => ({
        source: row.source,
        amount: row.amount,
        percentage: (parseFloat(row.amount) / total) * 100,
        transactions: parseInt(row.transactions)
      }))
    };
  }

  private async getExpenseSummary(tenantId: string, startDate: Date, endDate: Date) {
    const result = await db.query(
      `SELECT 
        category,
        COALESCE(SUM(amount), 0) as amount,
        COUNT(*) as transactions
      FROM expense_transactions
      WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3
      GROUP BY category`,
      [tenantId, startDate, endDate]
    );

    const total = result.rows.reduce((sum, row) => sum + parseFloat(row.amount), 0);

    return {
      total: total.toFixed(2),
      by_category: result.rows.map(row => ({
        category: row.category,
        amount: row.amount,
        percentage: (parseFloat(row.amount) / total) * 100,
        transactions: parseInt(row.transactions)
      }))
    };
  }

  private async getTreasurySummary(tenantId: string) {
    const result = await db.query(
      `SELECT 
        protocol,
        amount,
        apy,
        risk_level
      FROM treasury_allocations
      WHERE tenant_id = $1 AND active = true`,
      [tenantId]
    );

    const totalValue = result.rows.reduce((sum, row) => sum + parseFloat(row.amount), 0);
    const weightedAPY = result.rows.reduce((sum, row) => 
      sum + (parseFloat(row.amount) / totalValue) * parseFloat(row.apy), 0
    );

    return {
      total_value: totalValue.toFixed(2),
      apy: weightedAPY,
      yield_30d: ((totalValue * weightedAPY) / 12).toFixed(2),
      allocations: result.rows.map(row => ({
        protocol: row.protocol,
        amount: row.amount,
        percentage: (parseFloat(row.amount) / totalValue) * 100,
        apy: parseFloat(row.apy),
        risk_level: row.risk_level
      })),
      risk_score: 0.5 // Simplified
    };
  }

  private async getCashFlow(tenantId: string, startDate: Date, endDate: Date) {
    const result = await db.query(
      `SELECT 
        DATE(created_at) as date,
        COALESCE(SUM(amount) FILTER (WHERE type = 'inflow'), 0) as inflow,
        COALESCE(SUM(amount) FILTER (WHERE type = 'outflow'), 0) as outflow
      FROM cash_flow_transactions
      WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3
      GROUP BY DATE(created_at)
      ORDER BY date`,
      [tenantId, startDate, endDate]
    );

    return result.rows.map(row => ({
      date: row.date,
      inflow: row.inflow,
      outflow: row.outflow,
      net: (parseFloat(row.inflow) - parseFloat(row.outflow)).toFixed(2)
    }));
  }

  private async getDailyDistributions(tenantId: string, startDate: Date, endDate: Date) {
    const result = await db.query(
      `SELECT 
        DATE(created_at) as date,
        COALESCE(SUM(amount), 0) as amount,
        COUNT(DISTINCT user_id) as recipients
      FROM ubi_distributions
      WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3
      GROUP BY DATE(created_at)
      ORDER BY date`,
      [tenantId, startDate, endDate]
    );

    return result.rows;
  }

  private async getFundingSources(tenantId: string) {
    const result = await db.query(
      `SELECT 
        source,
        COALESCE(SUM(amount), 0) as amount
      FROM ubi_funding
      WHERE tenant_id = $1
      GROUP BY source`,
      [tenantId]
    );

    const total = result.rows.reduce((sum, row) => sum + parseFloat(row.amount), 0);

    return result.rows.map(row => ({
      source: row.source,
      amount: row.amount,
      percentage: (parseFloat(row.amount) / total) * 100
    }));
  }

  private async getUBIPoolBalance(tenantId: string): Promise<string> {
    const result = await db.query(
      `SELECT COALESCE(balance, 0) as balance
      FROM ubi_pool WHERE tenant_id = $1`,
      [tenantId]
    );
    return result.rows[0]?.balance || '0';
  }

  private async getTopTaskCategories(tenantId: string, startDate: Date, endDate: Date) {
    const result = await db.query(
      `SELECT 
        category,
        COUNT(*) as tasks_count,
        COUNT(*) FILTER (WHERE status = 'completed')::float / COUNT(*)::float * 100 as completion_rate,
        COALESCE(AVG(reward_amount) FILTER (WHERE status = 'completed'), 0) as avg_reward
      FROM tasks
      WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3
      GROUP BY category
      ORDER BY tasks_count DESC
      LIMIT 10`,
      [tenantId, startDate, endDate]
    );

    return result.rows.map(row => ({
      category: row.category,
      tasks_count: parseInt(row.tasks_count),
      completion_rate: parseFloat(row.completion_rate),
      avg_reward: row.avg_reward
    }));
  }

  private async getTopTaskPerformers(tenantId: string, startDate: Date, endDate: Date) {
    const result = await db.query(
      `SELECT 
        t.user_id,
        u.name as user_name,
        COUNT(*) as tasks_completed,
        COALESCE(SUM(t.reward_amount), 0) as total_earned,
        COALESCE(AVG(t.rating), 0) as avg_rating
      FROM tasks t
      JOIN users u ON t.user_id = u.id
      WHERE t.tenant_id = $1 AND t.status = 'completed' AND t.created_at BETWEEN $2 AND $3
      GROUP BY t.user_id, u.name
      ORDER BY tasks_completed DESC
      LIMIT 10`,
      [tenantId, startDate, endDate]
    );

    return result.rows.map(row => ({
      user_id: row.user_id,
      user_name: row.user_name,
      tasks_completed: parseInt(row.tasks_completed),
      total_earned: row.total_earned,
      avg_rating: parseFloat(row.avg_rating)
    }));
  }

  private async getDAUMetrics(tenantId: string, startDate: Date, endDate: Date) {
    // Simplified - would need actual session tracking
    return [];
  }

  private async getUserSegments(tenantId: string) {
    // Simplified - would need actual segmentation logic
    return [];
  }

  private async getEngagementMetrics(tenantId: string, startDate: Date, endDate: Date) {
    // Simplified - would need actual engagement tracking
    return {
      avg_sessions_per_user: 0,
      avg_session_duration_minutes: 0,
      avg_tasks_per_active_user: 0,
      avg_transactions_per_user: 0
    };
  }

  private async getTopAgents(tenantId: string, startDate: Date, endDate: Date) {
    const result = await db.query(
      `SELECT 
        agent_id,
        agent_name,
        COUNT(*) as executions,
        COUNT(*) FILTER (WHERE status = 'success')::float / COUNT(*)::float * 100 as success_rate,
        COALESCE(SUM(cost), 0) as total_cost,
        COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - started_at))), 0) as avg_time
      FROM agent_executions
      WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3
      GROUP BY agent_id, agent_name
      ORDER BY executions DESC
      LIMIT 10`,
      [tenantId, startDate, endDate]
    );

    return result.rows.map(row => ({
      agent_id: row.agent_id,
      agent_name: row.agent_name,
      executions: parseInt(row.executions),
      success_rate: parseFloat(row.success_rate),
      total_cost: row.total_cost,
      avg_execution_time: parseFloat(row.avg_time)
    }));
  }

  private async getErrorAnalysis(tenantId: string, startDate: Date, endDate: Date) {
    const result = await db.query(
      `SELECT 
        error_type,
        COUNT(*) as count,
        COUNT(DISTINCT agent_id) as affected_agents
      FROM agent_executions
      WHERE tenant_id = $1 AND status = 'failed' AND created_at BETWEEN $2 AND $3
      GROUP BY error_type
      ORDER BY count DESC
      LIMIT 10`,
      [tenantId, startDate, endDate]
    );

    const total = result.rows.reduce((sum, row) => sum + parseInt(row.count), 0);

    return result.rows.map(row => ({
      error_type: row.error_type,
      count: parseInt(row.count),
      percentage: (parseInt(row.count) / total) * 100,
      affected_agents: parseInt(row.affected_agents)
    }));
  }
}

export const reportingService = new ReportingService();
