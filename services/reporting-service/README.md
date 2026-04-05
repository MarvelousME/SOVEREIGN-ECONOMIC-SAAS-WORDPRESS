# Reporting Service

Real-time analytics and reporting service for the UBI-CMS platform with comprehensive dashboards and metrics.

## Features

- **Real-Time Dashboards**: Live platform metrics with Redis caching
- **Financial Reporting**: Revenue, expenses, treasury performance, cash flow
- **UBI Analytics**: Distribution stats, funding sources, runway projections
- **Task Marketplace**: Completion rates, top performers, category analytics
- **User Analytics**: Activity tracking, retention, engagement metrics
- **Agent Performance**: Execution stats, success rates, cost analysis
- **Read Replicas**: Separate read database for query performance
- **Export Capabilities**: CSV and PDF export support (planned)

## API Endpoints

### Dashboard & Overview
- `GET /api/v1/reports/dashboard` - Main dashboard metrics

### Financial Reports
- `GET /api/v1/reports/financial?period=30d` - Financial summary
- `GET /api/v1/reports/treasury-performance?period=30d` - Treasury metrics

### Platform Metrics
- `GET /api/v1/reports/ubi-stats?period=30d` - UBI pool statistics
- `GET /api/v1/reports/task-analytics?period=30d` - Task marketplace stats
- `GET /api/v1/reports/user-activity?period=30d` - User engagement
- `GET /api/v1/reports/agent-performance?period=30d` - Agent metrics

### Custom Reports
- `POST /api/v1/reports/custom` - Generate custom report (planned)

## Query Parameters

- `period` - Time period for reports (e.g., `7d`, `30d`, `90d`, `12m`)
- Defaults to `30d` if not specified

## Dashboard Metrics

```json
{
  "total_users": 1250,
  "active_users_30d": 890,
  "total_ubi_distributed": "125000.00",
  "ubi_distributed_30d": "25000.00",
  "total_tasks_completed": 5430,
  "tasks_completed_30d": 892,
  "treasury_balance": "500000.00",
  "treasury_apy": 8.5,
  "avg_user_balance": "245.80",
  "total_rewards_issued": "75000.00",
  "platform_revenue": "15000.00",
  "agent_executions_30d": 1523
}
```

## Environment Variables

See `.env.example` for configuration:
- PostgreSQL primary and read replica connections
- Redis for caching real-time metrics
- NATS for event consumption (future)

## Installation

```bash
npm install
npm run build
npm start
```

## Development

```bash
npm run dev
```

## Database Schema

Required tables and views:
- `users` - User accounts
- `ubi_distributions` - UBI payment records
- `ubi_pool` - UBI pool balance
- `ubi_funding` - Funding sources
- `tasks` - Task marketplace
- `rewards` - Reward issuance
- `treasury_allocations` - Treasury positions
- `treasury_stats` - Treasury snapshots
- `revenue_transactions` - Revenue tracking
- `expense_transactions` - Expense tracking
- `cash_flow_transactions` - Cash flow records
- `agent_executions` - AI agent execution logs

## Performance

- Uses read replicas for heavy analytical queries
- Redis caching with 5-minute TTL for dashboard metrics
- Optimized aggregation queries with proper indexes
- Materialized views recommended for complex analytics

## Caching Strategy

- Dashboard metrics: 5 minutes
- Financial summaries: 10 minutes (recommended)
- User analytics: 15 minutes (recommended)
- Agent performance: 5 minutes

## Future Enhancements

- PDF export generation
- CSV export for all reports
- Scheduled report delivery
- Custom report builder
- Trend analysis and forecasting
- Comparative analytics (period over period)
