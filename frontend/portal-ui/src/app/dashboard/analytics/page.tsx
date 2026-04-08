'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart3, TrendingUp, Users, DollarSign, Globe,
  Target, Zap, Calendar, ArrowUpRight, ArrowDownRight,
  ChevronRight, GitBranch, PieChart as PieChartIcon, RefreshCw,
} from 'lucide-react';
import { useHydratedDemoUser } from '@/hooks/use-hydrated-demo-user';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, ScatterChart, Scatter,
} from 'recharts';
import { StatCard } from '@/components/dashboard/stat-card';
import { cn } from '@/lib/utils';
import {
  AnalyticsDashboardData,
  CampaignReportRow,
  CampaignReportSummary,
  getAnalyticsDashboardData,
  getCampaignReport,
} from '@/lib/workspace-social-api';
import { useLatestAbortController } from '@/hooks/use-latest-abort-controller';

const retentionData = [
  { cohort: 'Aug', m1: 100, m2: 76, m3: 62, m4: 54, m5: 49 },
  { cohort: 'Sep', m1: 100, m2: 79, m3: 67, m4: 59, m5: null },
  { cohort: 'Oct', m1: 100, m2: 83, m3: 71, m4: null, m5: null },
  { cohort: 'Nov', m1: 100, m2: 85, m3: null, m4: null, m5: null },
  { cohort: 'Dec', m1: 100, m2: null, m3: null, m4: null, m5: null },
];

const topPerformers = [
  { name: 'Mei-Xia Li', tasks: 520, reputation: 4.85, earnings: '$3,400' },
  { name: 'Finn Larsson', tasks: 302, reputation: 4.95, earnings: '$2,100' },
  { name: 'Carlos Rivera', tasks: 178, reputation: 4.5, earnings: '$920' },
  { name: 'Marcus Osei', tasks: 215, reputation: 4.7, earnings: '$1,240' },
  { name: 'Amara Diallo', tasks: 134, reputation: 4.8, earnings: '$780' },
];

function ChartTip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border px-3 py-2 text-xs shadow-2xl" style={{ background: 'hsl(var(--popover))', color: 'hsl(var(--foreground))' }}>
      <p className="font-bold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color ?? 'hsl(var(--primary))' }}>
          {p.name}: <span className="font-semibold">{typeof p.value === 'number' && (p.name?.toLowerCase().includes('revenue') || p.name?.toLowerCase().includes('profit') || p.name?.toLowerCase().includes('expense')) ? `$${p.value.toLocaleString()}` : p.value}</span>
        </p>
      ))}
    </div>
  );
}

const PERIODS = ['7D', '30D', '90D', '12M', 'ALL'];

export default function AnalyticsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const demo = useHydratedDemoUser();
  const [period, setPeriod] = useState('12M');
  const [scope, setScope] = useState<'own' | 'workspace'>(
    searchParams.get('scope') === 'own' ? 'own' : 'workspace'
  );
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [debouncedQuery, setDebouncedQuery] = useState(searchParams.get('q') || '');
  const [sort, setSort] = useState<'updated' | 'name' | 'throughput' | 'success_rate' | 'failure_rate'>(
    searchParams.get('sort') === 'name' ||
      searchParams.get('sort') === 'throughput' ||
      searchParams.get('sort') === 'success_rate' ||
      searchParams.get('sort') === 'failure_rate'
      ? (searchParams.get('sort') as 'name' | 'throughput' | 'success_rate' | 'failure_rate')
      : 'updated'
  );
  const [direction, setDirection] = useState<'asc' | 'desc'>(
    searchParams.get('direction') === 'asc' ? 'asc' : 'desc'
  );
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get('page') || 1)));
  const pageSize = 10;
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [summary, setSummary] = useState<CampaignReportSummary | null>(null);
  const [rows, setRows] = useState<CampaignReportRow[]>([]);
  const [total, setTotal] = useState(0);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsDashboardData | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const latestReportRequestRef = useRef(0);
  const latestAnalyticsRequestRef = useRef(0);
  const { nextSignal } = useLatestAbortController();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  const loadCampaignReport = useCallback(async () => {
    const requestId = latestReportRequestRef.current + 1;
    latestReportRequestRef.current = requestId;
    const signal = nextSignal();
    setLoadingReport(true);
    setReportError(null);
    try {
      const now = new Date();
      const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const result = await getCampaignReport(
        {
          scope,
          q: debouncedQuery.trim() || undefined,
          sort,
          direction,
          from: from.toISOString(),
          to: now.toISOString(),
          limit: pageSize,
          offset: (page - 1) * pageSize,
        },
        { signal }
      );
      if (requestId !== latestReportRequestRef.current) return;
      setSummary(result.summary);
      setRows(result.rows || []);
      setTotal(Number(result.pagination?.total || 0));
    } catch (err) {
      if (requestId !== latestReportRequestRef.current) return;
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setReportError(err instanceof Error ? err.message : 'Failed to load campaign report');
    } finally {
      if (requestId !== latestReportRequestRef.current) return;
      setLoadingReport(false);
    }
  }, [scope, debouncedQuery, sort, direction, page, nextSignal]);

  useEffect(() => {
    void loadCampaignReport();
  }, [loadCampaignReport]);

  useEffect(() => {
    const requestId = latestAnalyticsRequestRef.current + 1;
    latestAnalyticsRequestRef.current = requestId;
    const signal = nextSignal();
    setLoadingAnalytics(true);
    setAnalyticsError(null);

    const normalizedPeriod = period === '7D' ? '7d' : period === '90D' ? '90d' : '30d';
    getAnalyticsDashboardData(normalizedPeriod, undefined, undefined, { signal })
      .then((data) => {
        if (requestId !== latestAnalyticsRequestRef.current) return;
        setAnalyticsData(data);
      })
      .catch((err: unknown) => {
        if (requestId !== latestAnalyticsRequestRef.current) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setAnalyticsError(err instanceof Error ? err.message : 'Failed to load analytics charts');
      })
      .finally(() => {
        if (requestId !== latestAnalyticsRequestRef.current) return;
        setLoadingAnalytics(false);
      });
  }, [period, nextSignal]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (scope !== 'workspace') params.set('scope', scope);
    if (query.trim()) params.set('q', query.trim());
    if (sort !== 'updated') params.set('sort', sort);
    if (direction !== 'desc') params.set('direction', direction);
    if (page > 1) params.set('page', String(page));
    const q = params.toString();
    router.replace(q ? `?${q}` : '?');
  }, [scope, query, sort, direction, page, router]);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />
            Platform Analytics
            {demo && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">Demo</span>}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Growth, revenue, retention, and performance insights.</p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg border border-border" style={{ background: 'hsl(var(--muted))' }}>
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                period === p ? 'text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
              style={period === p ? { background: 'hsl(var(--primary))' } : undefined}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Monthly Revenue" value={`$${Math.round(analyticsData?.kpis.monthlyRevenue || 0).toLocaleString()}`} change={analyticsData?.kpis.monthlyRevenueChange || 0} changeLabel="vs last period" icon={DollarSign} accent="success" sublabel="Platform-wide" glow />
        <StatCard title="Net Profit" value={`$${Math.round(analyticsData?.kpis.netProfit || 0).toLocaleString()}`} change={analyticsData?.kpis.netProfitChange || 0} changeLabel="vs last period" icon={TrendingUp} accent="primary" sublabel="Derived from revenue series" />
        <StatCard title="New Users" value={String(Math.round(analyticsData?.kpis.newUsers || 0))} change={analyticsData?.kpis.newUsersChange || 0} changeLabel="from conversions" icon={Users} accent="info" sublabel="Backend analytics" />
        <StatCard title="Task Completion" value={`${(analyticsData?.kpis.completionRate || 0).toFixed(1)}%`} change={analyticsData?.kpis.completionRateChange || 0} changeLabel="latest funnel rate" icon={Target} accent="warning" sublabel="From funnel endpoint" />
      </div>
      {analyticsError && <div className="rounded-lg bg-destructive/10 text-destructive px-3 py-2 text-xs">{analyticsError}</div>}

      <div className="rounded-xl border border-border p-5 space-y-4" style={{ background: 'hsl(var(--card))' }}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">Campaign Runtime Report (last 30 days)</h2>
          <button
            onClick={() => void loadCampaignReport()}
            className="text-xs px-2 py-1 rounded border border-border hover:bg-muted/40"
          >
            Refresh
          </button>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="inline-flex rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setScope('own');
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs ${scope === 'own' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-muted/40'}`}
            >
              Own
            </button>
            <button
              type="button"
              onClick={() => {
                setScope('workspace');
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs ${scope === 'workspace' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-muted/40'}`}
            >
              Workspace-wide
            </button>
          </div>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search campaigns..."
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
          />
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as typeof sort);
              setPage(1);
            }}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
          >
            <option value="updated">Sort: Updated</option>
            <option value="name">Sort: Name</option>
            <option value="throughput">Sort: Throughput</option>
            <option value="success_rate">Sort: Success rate</option>
            <option value="failure_rate">Sort: Failure rate</option>
          </select>
          <select
            value={direction}
            onChange={(e) => {
              setDirection(e.target.value as typeof direction);
              setPage(1);
            }}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
          {query !== debouncedQuery && (
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Searching...
            </span>
          )}
        </div>

        {reportError && <div className="rounded-lg bg-destructive/10 text-destructive px-3 py-2 text-xs">{reportError}</div>}

        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <StatCard title="Posts" value={String(summary.kpis.totalPosts)} icon={BarChart3} />
            <StatCard title="Published" value={String(summary.kpis.publishedPosts)} icon={TrendingUp} />
            <StatCard title="Failed" value={String(summary.kpis.failedPosts)} icon={ArrowDownRight} />
            <StatCard title="Success Rate" value={`${summary.kpis.successRate.toFixed(1)}%`} icon={ArrowUpRight} />
            <StatCard title="Throughput/Day" value={summary.kpis.publishThroughputPerDay.toFixed(2)} icon={Zap} />
          </div>
        )}

        <div className="rounded-lg border border-border overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-3 py-2">Campaign</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Posts</th>
                <th className="px-3 py-2">Success</th>
                <th className="px-3 py-2">Failures</th>
                <th className="px-3 py-2">Throughput/Day</th>
              </tr>
            </thead>
            <tbody>
              {loadingReport ? (
                <tr><td className="px-3 py-3 text-muted-foreground" colSpan={6}>Loading report...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="px-3 py-3 text-muted-foreground" colSpan={6}>No campaigns found.</td></tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.campaignId} className="border-b border-border/50">
                    <td className="px-3 py-2">{row.campaignName}</td>
                    <td className="px-3 py-2">{row.campaignStatus}</td>
                    <td className="px-3 py-2">{row.kpis.totalPosts}</td>
                    <td className="px-3 py-2">{row.kpis.successRate.toFixed(1)}%</td>
                    <td className="px-3 py-2">{row.kpis.failedPosts}</td>
                    <td className="px-3 py-2">{row.kpis.publishThroughputPerDay.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {total === 0
              ? 'No results'
              : `Showing ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} of ${total}`}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded border border-border px-2 py-1 disabled:opacity-50"
            >
              Prev
            </button>
            <span>Page {page} / {Math.max(1, Math.ceil(total / pageSize))}</span>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page * pageSize >= total}
              className="rounded border border-border px-2 py-1 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Quick nav to detailed analytics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/dashboard/analytics/revenue"
          className="group rounded-xl border border-border p-5 flex items-center justify-between hover:border-primary/40 hover:bg-muted/20 transition-all"
          style={{ background: 'hsl(var(--card))' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'hsl(var(--primary)/0.15)', color: 'hsl(var(--primary))' }}>
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Revenue Breakdown</p>
              <p className="text-xs text-muted-foreground">Detailed revenue streams</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/dashboard/analytics/attribution"
          className="group rounded-xl border border-border p-5 flex items-center justify-between hover:border-primary/40 hover:bg-muted/20 transition-all"
          style={{ background: 'hsl(var(--card))' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'hsl(199 89% 48% / 0.15)', color: 'hsl(199 89% 48%)' }}>
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Attribution Report</p>
              <p className="text-xs text-muted-foreground">Multi-touch attribution</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </Link>

        <div className="rounded-xl border border-border p-5 flex items-center justify-between cursor-not-allowed opacity-60" style={{ background: 'hsl(var(--card))' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'hsl(142 70% 45% / 0.15)', color: 'hsl(142 70% 45%)' }}>
              <PieChartIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Page Analytics</p>
              <p className="text-xs text-muted-foreground">Coming soon</p>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Soon</span>
        </div>
      </div>

      {/* Revenue chart */}
      <div className="rounded-xl border border-border p-5" style={{ background: 'hsl(var(--card))' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <DollarSign className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} />
            Revenue vs Profit
          </h2>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-primary" />Revenue</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-green-400" />Profit</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-destructive" />Expenses</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={analyticsData?.revenueSeries || []} margin={{ top: 4, right: 4, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="profG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<ChartTip />} />
            <Area type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--primary))" fill="url(#revG)" strokeWidth={2} isAnimationActive={!loadingAnalytics} />
            <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" fill="url(#profG)" strokeWidth={2} isAnimationActive={!loadingAnalytics} />
            <Area type="monotone" dataKey="expenses" name="Expenses" stroke="hsl(var(--destructive))" fill="transparent" strokeWidth={1.5} strokeDasharray="4 4" isAnimationActive={!loadingAnalytics} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* User growth + Geo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* User growth stacked */}
        <div className="lg:col-span-2 rounded-xl border border-border p-5" style={{ background: 'hsl(var(--card))' }}>
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} />
            Event Volume by Day
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={analyticsData?.engagementSeries || []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="events" name="Events" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} opacity={0.85} isAnimationActive={!loadingAnalytics} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Geo distribution */}
        <div className="rounded-xl border border-border p-5" style={{ background: 'hsl(var(--card))' }}>
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} />
            Geographic Split
          </h2>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={analyticsData?.channelDistribution || []} cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={3} dataKey="users">
                {(analyticsData?.channelDistribution || []).map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v) => [`${v}%`, '']} contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-1">
            {(analyticsData?.channelDistribution || []).map((g) => (
              <div key={g.region} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: g.color }} />
                  <span className="text-muted-foreground">{g.region}</span>
                </div>
                <span className="font-semibold text-foreground">{g.users}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Task completion + Top performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekly task completion rate */}
        <div className="rounded-xl border border-border p-5" style={{ background: 'hsl(var(--card))' }}>
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Target className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} />
            Funnel Completion Rate
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={analyticsData?.funnelSeries || []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis domain={[70, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v) => [`${v}%`, 'Rate']} content={<ChartTip />} />
              <Line type="monotone" dataKey="rate" name="Completion %" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ fill: 'hsl(var(--primary))', r: 3 }} isAnimationActive={!loadingAnalytics} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top performers table */}
        <div className="rounded-xl border border-border overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
          <div className="px-5 py-3.5 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Zap className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} />
              Top Performers
            </h2>
          </div>
          <div className="divide-y divide-border">
            {topPerformers.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
                  style={{
                    background: i === 0 ? '#f59e0b22' : i === 1 ? 'hsl(var(--primary)/0.15)' : 'hsl(var(--muted))',
                    color: i === 0 ? '#f59e0b' : i === 1 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                  }}
                >
                  #{i + 1}
                </span>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                  style={{ background: 'hsl(var(--primary)/0.15)', color: 'hsl(var(--primary))' }}
                >
                  {p.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground">{p.tasks} tasks · ★ {p.reputation}</p>
                </div>
                <span className="text-sm font-bold" style={{ color: 'hsl(var(--primary))' }}>{p.earnings}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Retention cohort heatmap */}
      <div className="rounded-xl border border-border p-5" style={{ background: 'hsl(var(--card))' }}>
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} />
          User Retention Cohort (%)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              <tr>
                <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Cohort</th>
                {['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5'].map((m) => (
                  <th key={m} className="py-2 px-3 text-muted-foreground font-medium">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {retentionData.map((row) => (
                <tr key={row.cohort}>
                  <td className="text-left py-1.5 pr-4 font-medium text-foreground">{row.cohort}</td>
                  {[row.m1, row.m2, row.m3, row.m4, row.m5].map((v, ci) => (
                    <td key={ci} className="py-1.5 px-3">
                      {v !== null ? (
                        <div
                          className="rounded-md py-1 px-2 font-semibold text-xs"
                          style={{
                            background: `hsl(var(--primary)/${Math.round((v / 100) * 80 + 10)}%)`,
                            color: v > 60 ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
                          }}
                        >
                          {v}%
                        </div>
                      ) : (
                        <div className="text-muted-foreground/30 text-[10px]">—</div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
