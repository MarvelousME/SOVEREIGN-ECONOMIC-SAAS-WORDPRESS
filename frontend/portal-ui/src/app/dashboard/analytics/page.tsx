'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BarChart3, TrendingUp, Users, DollarSign, Globe,
  Target, Zap, Calendar, ArrowUpRight, ArrowDownRight,
  ChevronRight, GitBranch, PieChart as PieChartIcon,
} from 'lucide-react';
import { useHydratedDemoUser } from '@/hooks/use-hydrated-demo-user';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, ScatterChart, Scatter,
} from 'recharts';
import { StatCard } from '@/components/dashboard/stat-card';
import { cn } from '@/lib/utils';

// ── Mock datasets ──────────────────────────────────────────────
const monthlyRevenue = [
  { month: 'Jul', revenue: 41200, expenses: 18000, profit: 23200 },
  { month: 'Aug', revenue: 48000, expenses: 19400, profit: 28600 },
  { month: 'Sep', revenue: 62400, expenses: 22100, profit: 40300 },
  { month: 'Oct', revenue: 84200, expenses: 28900, profit: 55300 },
  { month: 'Nov', revenue: 112000, expenses: 38400, profit: 73600 },
  { month: 'Dec', revenue: 132000, expenses: 42000, profit: 90000 },
  { month: 'Jan', revenue: 168432, expenses: 51200, profit: 117232 },
];

const userGrowth = [
  { month: 'Jul', clients: 800, employees: 120, admins: 18 },
  { month: 'Aug', clients: 1100, employees: 180, admins: 22 },
  { month: 'Sep', clients: 1520, employees: 260, admins: 28 },
  { month: 'Oct', clients: 2050, employees: 380, admins: 35 },
  { month: 'Nov', clients: 2710, employees: 490, admins: 42 },
  { month: 'Dec', clients: 3180, employees: 560, admins: 48 },
  { month: 'Jan', clients: 3900, employees: 690, admins: 55 },
];

const taskCompletion = [
  { week: 'W1', completed: 1240, assigned: 1600, rate: 77.5 },
  { week: 'W2', completed: 1580, assigned: 1900, rate: 83.2 },
  { week: 'W3', completed: 1320, assigned: 1700, rate: 77.6 },
  { week: 'W4', completed: 1890, assigned: 2100, rate: 90.0 },
  { week: 'W5', completed: 2100, assigned: 2300, rate: 91.3 },
  { week: 'W6', completed: 1750, assigned: 2050, rate: 85.4 },
  { week: 'W7', completed: 2380, assigned: 2500, rate: 95.2 },
  { week: 'W8', completed: 2290, assigned: 2400, rate: 95.4 },
];

const geoDistribution = [
  { region: 'North America', users: 28, color: 'hsl(var(--primary))' },
  { region: 'Europe', users: 24, color: 'hsl(var(--accent))' },
  { region: 'Asia Pacific', users: 31, color: '#10b981' },
  { region: 'Africa', users: 10, color: '#f59e0b' },
  { region: 'LATAM', users: 7, color: '#8b5cf6' },
];

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
  const demo = useHydratedDemoUser();
  const [period, setPeriod] = useState('12M');

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
        <StatCard title="Monthly Revenue" value="$168,432" change={27.6} changeLabel="vs last month" icon={DollarSign} accent="success" sublabel="Platform-wide" glow />
        <StatCard title="Net Profit" value="$117,232" change={30.2} changeLabel="vs last month" icon={TrendingUp} accent="primary" sublabel="69.6% margin" />
        <StatCard title="New Users" value="1,020" change={15.4} changeLabel="this month" icon={Users} accent="info" sublabel="Across all roles" />
        <StatCard title="Task Completion" value="95.4%" change={3.8} changeLabel="vs last week" icon={Target} accent="warning" sublabel="2,290 / 2,400 tasks" />
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
          <AreaChart data={monthlyRevenue} margin={{ top: 4, right: 4, left: -15, bottom: 0 }}>
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
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<ChartTip />} />
            <Area type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--primary))" fill="url(#revG)" strokeWidth={2} />
            <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" fill="url(#profG)" strokeWidth={2} />
            <Area type="monotone" dataKey="expenses" name="Expenses" stroke="hsl(var(--destructive))" fill="transparent" strokeWidth={1.5} strokeDasharray="4 4" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* User growth + Geo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* User growth stacked */}
        <div className="lg:col-span-2 rounded-xl border border-border p-5" style={{ background: 'hsl(var(--card))' }}>
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} />
            User Growth by Role
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={userGrowth} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="clients" name="Clients" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} opacity={0.85} />
              <Bar dataKey="employees" name="Employees" stackId="a" fill="hsl(var(--accent))" opacity={0.85} />
              <Bar dataKey="admins" name="Admins" stackId="a" fill="#f59e0b" radius={[3, 3, 0, 0]} opacity={0.85} />
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
              <Pie data={geoDistribution} cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={3} dataKey="users">
                {geoDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v) => [`${v}%`, '']} contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-1">
            {geoDistribution.map((g) => (
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
            Task Completion Rate (8 weeks)
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={taskCompletion} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis domain={[70, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v) => [`${v}%`, 'Rate']} content={<ChartTip />} />
              <Line type="monotone" dataKey="rate" name="Completion %" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ fill: 'hsl(var(--primary))', r: 3 }} />
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
