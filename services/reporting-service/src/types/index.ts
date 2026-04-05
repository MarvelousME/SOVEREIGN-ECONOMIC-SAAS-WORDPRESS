export interface DashboardMetrics {
  total_users: number;
  active_users_30d: number;
  total_ubi_distributed: string;
  ubi_distributed_30d: string;
  total_tasks_completed: number;
  tasks_completed_30d: number;
  treasury_balance: string;
  treasury_apy: number;
  avg_user_balance: string;
  total_rewards_issued: string;
  platform_revenue: string;
  agent_executions_30d: number;
}

export interface FinancialSummary {
  period: string;
  total_revenue: string;
  revenue_by_source: RevenueSource[];
  total_expenses: string;
  expense_by_category: ExpenseCategory[];
  treasury_performance: TreasuryPerformance;
  profit_loss: string;
  cash_flow: CashFlow[];
}

export interface RevenueSource {
  source: string;
  amount: string;
  percentage: number;
  transactions: number;
}

export interface ExpenseCategory {
  category: string;
  amount: string;
  percentage: number;
  transactions: number;
}

export interface TreasuryPerformance {
  total_value: string;
  apy: number;
  yield_30d: string;
  allocations: TreasuryAllocation[];
  risk_score: number;
}

export interface TreasuryAllocation {
  protocol: string;
  amount: string;
  percentage: number;
  apy: number;
  risk_level: string;
}

export interface CashFlow {
  date: string;
  inflow: string;
  outflow: string;
  net: string;
}

export interface UBIStats {
  period: string;
  total_distributed: string;
  recipients: number;
  avg_amount_per_user: string;
  distribution_by_day: DailyDistribution[];
  funding_sources: FundingSource[];
  pool_balance: string;
  projected_runway_days: number;
}

export interface DailyDistribution {
  date: string;
  amount: string;
  recipients: number;
}

export interface FundingSource {
  source: string;
  amount: string;
  percentage: number;
}

export interface TaskAnalytics {
  period: string;
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  rejected_tasks: number;
  completion_rate: number;
  avg_completion_time_hours: number;
  total_rewards_paid: string;
  avg_reward_per_task: string;
  top_categories: TaskCategory[];
  top_performers: TaskPerformer[];
}

export interface TaskCategory {
  category: string;
  tasks_count: number;
  completion_rate: number;
  avg_reward: string;
}

export interface TaskPerformer {
  user_id: string;
  user_name: string;
  tasks_completed: number;
  total_earned: string;
  avg_rating: number;
}

export interface UserActivity {
  period: string;
  new_users: number;
  active_users: number;
  churned_users: number;
  retention_rate: number;
  daily_active_users: DAU[];
  user_segments: UserSegment[];
  engagement_metrics: EngagementMetrics;
}

export interface DAU {
  date: string;
  dau: number;
  wau: number;
  mau: number;
}

export interface UserSegment {
  segment: string;
  user_count: number;
  percentage: number;
  avg_balance: string;
  avg_activity_score: number;
}

export interface EngagementMetrics {
  avg_sessions_per_user: number;
  avg_session_duration_minutes: number;
  avg_tasks_per_active_user: number;
  avg_transactions_per_user: number;
}

export interface AgentPerformance {
  period: string;
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  success_rate: number;
  total_cost: string;
  avg_cost_per_execution: string;
  avg_execution_time_seconds: number;
  top_agents: TopAgent[];
  error_analysis: ErrorAnalysis[];
}

export interface TopAgent {
  agent_id: string;
  agent_name: string;
  executions: number;
  success_rate: number;
  total_cost: string;
  avg_execution_time: number;
}

export interface ErrorAnalysis {
  error_type: string;
  count: number;
  percentage: number;
  affected_agents: number;
}

export interface CustomReport {
  report_id: string;
  name: string;
  description?: string;
  metrics: string[];
  filters: Record<string, any>;
  grouping: string[];
  period: string;
  format: 'json' | 'csv' | 'pdf';
  scheduled: boolean;
  schedule_cron?: string;
}

export interface TimeSeriesData {
  timestamp: string;
  value: number | string;
  label?: string;
}

export interface TrendAnalysis {
  current_value: number | string;
  previous_value: number | string;
  change_absolute: number | string;
  change_percentage: number;
  trend: 'up' | 'down' | 'stable';
}
