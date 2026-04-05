'use client';

import { useState } from 'react';
import {
  DollarSign, TrendingUp, Download, ChevronDown,
  Building2, Users, Wallet, ArrowUpRight,
} from 'lucide-react';
import { useHydratedDemoUser } from '@/hooks/use-hydrated-demo-user';
import { StatCard } from '@/components/dashboard/stat-card';
import { AreaTrendChart, DistributionPie, TrendLineChart } from '../components/Charts';
import { cn } from '@/lib/utils';

const DATE_RANGES = ['7D', '30D', '90D', '12M', 'ALL'];

const revenueBySource = [
  { name: 'Subscriptions', value: 28, color: 'hsl(var(--primary))' },
  { name: 'Task Marketplace', value: 24, color: 'hsl(199 89% 48%)' },
  { name: 'Agent Services', value: 22, color: 'hsl(142 70% 45%)' },
  { name: 'Premium Features', value: 15, color: 'hsl(38 92% 50%)' },
  { name: 'Referral Commissions', value: 8, color: 'hsl(280 65% 60%)' },
  { name: 'API Access', value: 3, color: 'hsl(25 95% 53%)' },
];

const monthlyTrend = [
  { name: 'Jul', revenue: 41200 as number, subscriptions: 12000, marketplace: 9800, agents: 8400, premium: 6200, other: 4800 },
  { name: 'Aug', revenue: 48000 as number, subscriptions: 14000, marketplace: 11500, agents: 10200, premium: 7200, other: 5100 },
  { name: 'Sep', revenue: 62400 as number, subscriptions: 18500, marketplace: 14800, agents: 13200, premium: 9600, other: 6300 },
  { name: 'Oct', revenue: 84200 as number, subscriptions: 25000, marketplace: 20000, agents: 17800, premium: 12800, other: 8600 },
  { name: 'Nov', revenue: 112000 as number, subscriptions: 33000, marketplace: 26800, agents: 24000, premium: 16800, other: 11400 },
  { name: 'Dec', revenue: 132000 as number, subscriptions: 39000, marketplace: 31600, agents: 28400, premium: 19800, other: 14200 },
  { name: 'Jan', revenue: 168432 as number, subscriptions: 49800, marketplace: 40200, agents: 36200, premium: 25200, other: 17032 },
];

const revenueByWorkspace = [
  { workspace: 'Acme Corp', users: 248, mrr: '$24,800', growth: 18.4, status: 'active' },
  { workspace: 'TechStart Inc', users: 186, mrr: '$18,600', growth: 12.2, status: 'active' },
  { workspace: 'Global Solutions', users: 142, mrr: '$14,200', growth: 24.6, status: 'active' },
  { workspace: 'Innovate Labs', users: 98, mrr: '$9,800', growth: 8.1, status: 'active' },
  { workspace: 'DataDriven Co', users: 76, mrr: '$7,600', growth: -2.4, status: 'at_risk' },
  { workspace: 'CloudFirst Ltd', users: 64, mrr: '$6,400', growth: 31.2, status: 'active' },
  { workspace: 'ScaleUp AI', users: 52, mrr: '$5,200', growth: 15.8, status: 'active' },
  { workspace: 'NextGen Ventures', users: 38, mrr: '$3,800', growth: -5.1, status: 'churned' },
];

const monthlyRecap = [
  { name: 'Aug', revenue: 48000, target: 45000, variance: 6.7 },
  { name: 'Sep', revenue: 62400, target: 58000, variance: 7.6 },
  { name: 'Oct', revenue: 84200, target: 75000, variance: 12.3 },
  { name: 'Nov', revenue: 112000, target: 95000, variance: 17.9 },
  { name: 'Dec', revenue: 132000, target: 120000, variance: 10.0 },
  { name: 'Jan', revenue: 168432, target: 150000, variance: 12.3 },
];

export default function RevenuePage() {
  const demo = useHydratedDemoUser();
  const [dateRange, setDateRange] = useState('12M');

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />
            Revenue Breakdown
            {demo && (
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                Demo
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Revenue streams, workspace analysis, and growth trends.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-1 p-1 rounded-lg border border-border"
            style={{ background: 'hsl(var(--muted))' }}
          >
            {DATE_RANGES.map((p) => (
              <button
                key={p}
                onClick={() => setDateRange(p)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                  dateRange === p ? 'text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
                style={dateRange === p ? { background: 'hsl(var(--primary))' } : undefined}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted/40 transition-colors"
            style={{ background: 'hsl(var(--card))' }}
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value="$168,432"
          change={27.6}
          changeLabel="vs last month"
          icon={DollarSign}
          accent="success"
          sublabel="This month"
          glow
        />
        <StatCard
          title="Recurring Revenue"
          value="$49,800"
          change={30.2}
          changeLabel="vs last month"
          icon={TrendingUp}
          accent="primary"
          sublabel="29.6% of total"
        />
        <StatCard
          title="Avg. Revenue/User"
          value="$186"
          change={12.4}
          changeLabel="vs last month"
          icon={Users}
          accent="info"
          sublabel="$186 ARPU"
        />
        <StatCard
          title="Net Revenue"
          value="$117,232"
          change={30.2}
          changeLabel="vs last month"
          icon={Wallet}
          accent="warning"
          sublabel="69.6% margin"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border p-5" style={{ background: 'hsl(var(--card))' }}>
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} />
            Revenue by Source
          </h2>
          <DistributionPie data={revenueBySource} innerRadius={48} outerRadius={75} height={180} />
          <div className="space-y-1.5 mt-3">
            {revenueBySource.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-muted-foreground">{s.name}</span>
                </div>
                <span className="font-semibold text-foreground">{s.value}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-border p-5" style={{ background: 'hsl(var(--card))' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} />
              Revenue vs Target
            </h2>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-primary" />Actual</div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-destructive/50" />Target</div>
            </div>
          </div>
          <TrendLineChart
            data={monthlyRecap}
            dataKeys={[
              { key: 'revenue', color: 'hsl(var(--primary))', name: 'Actual' },
              { key: 'target', color: 'hsl(var(--destructive))', name: 'Target' },
            ]}
            height={200}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border p-5" style={{ background: 'hsl(var(--card))' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <DollarSign className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} />
            Revenue Trend by Stream
          </h2>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-primary" />Subscriptions</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-cyan-400" />Marketplace</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-green-400" />Agents</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-amber-400" />Premium</div>
          </div>
        </div>
        <AreaTrendChart
          data={monthlyTrend}
          dataKeys={[
            { key: 'subscriptions', color: 'hsl(var(--primary))', name: 'Subscriptions' },
            { key: 'marketplace', color: 'hsl(199 89% 48%)', name: 'Marketplace' },
            { key: 'agents', color: 'hsl(142 70% 45%)', name: 'Agents' },
            { key: 'premium', color: 'hsl(38 92% 50%)', name: 'Premium' },
          ]}
          height={240}
        />
      </div>

      <div className="rounded-xl border border-border overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Building2 className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} />
            Revenue by Workspace
          </h2>
          <button
            className="flex items-center gap-1.5 text-xs font-medium hover:text-foreground transition-colors"
            style={{ color: 'hsl(var(--primary))' }}
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left px-5 py-3 font-medium">Workspace</th>
                <th className="text-right px-4 py-3 font-medium">Users</th>
                <th className="text-right px-4 py-3 font-medium">MRR</th>
                <th className="text-right px-4 py-3 font-medium">Growth</th>
                <th className="text-right px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {revenueByWorkspace.map((ws) => (
                <tr key={ws.workspace} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                        style={{ background: 'hsl(var(--primary)/0.15)', color: 'hsl(var(--primary))' }}
                      >
                        {ws.workspace.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                      </div>
                      <span className="font-medium text-foreground">{ws.workspace}</span>
                    </div>
                  </td>
                  <td className="text-right px-4 py-3.5 text-muted-foreground">{ws.users}</td>
                  <td className="text-right px-4 py-3.5 font-semibold" style={{ color: 'hsl(var(--primary))' }}>
                    {ws.mrr}
                  </td>
                  <td className="text-right px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      {ws.growth > 0 ? (
                        <ArrowUpRight className="w-3.5 h-3.5 text-green-400" />
                      ) : null}
                      <span
                        className={cn(
                          'text-xs font-semibold',
                          ws.growth > 0 ? 'text-green-400' : 'text-destructive'
                        )}
                      >
                        {ws.growth > 0 ? '+' : ''}{ws.growth}%
                      </span>
                    </div>
                  </td>
                  <td className="text-right px-5 py-3.5">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                        ws.status === 'active' && 'bg-green-500/15 text-green-400',
                        ws.status === 'at_risk' && 'bg-amber-500/15 text-amber-400',
                        ws.status === 'churned' && 'bg-destructive/15 text-destructive'
                      )}
                    >
                      {ws.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
