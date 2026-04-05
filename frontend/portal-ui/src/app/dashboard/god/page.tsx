'use client';

import { useState, useEffect, useCallback } from 'react';
import { useHydratedDemoUser } from '@/hooks/use-hydrated-demo-user';
import {
  Crown, Users, Briefcase, UserCheck, DollarSign, Activity,
  Shield, Zap, Globe, Database, AlertTriangle, TrendingUp,
  Ban, CheckCircle2, Eye, Trash2, Edit, MoreHorizontal,
  Server, Clock, ArrowUpRight, Flame, Lock, Unlock,
  RefreshCw, Download, Upload, ChevronDown,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { cn } from '@/lib/utils';

// ── Mock data ──────────────────────────────────────────────────
const generateLive = () =>
  Array.from({ length: 20 }, (_, i) => ({
    t: i,
    cpu: 20 + Math.random() * 50,
    mem: 40 + Math.random() * 30,
    req: Math.floor(200 + Math.random() * 400),
  }));

const platformGrowth = [
  { month: 'Aug', users: 1200, revenue: 48000 },
  { month: 'Sep', users: 1580, revenue: 62000 },
  { month: 'Oct', users: 2100, revenue: 84000 },
  { month: 'Nov', users: 2800, revenue: 112000 },
  { month: 'Dec', users: 3300, revenue: 132000 },
  { month: 'Jan', users: 4200, revenue: 168000 },
];

const roleDistribution = [
  { name: 'Clients', value: 68, color: 'hsl(var(--primary))' },
  { name: 'Employees', value: 22, color: 'hsl(var(--accent))' },
  { name: 'Admins', value: 7, color: '#f59e0b' },
  { name: 'Owners', value: 3, color: '#ef4444' },
];

const recentUsers = [
  { id: 'u001', name: 'Sarah Chen', email: 'sarah@example.com', role: 'client', status: 'active', joined: '2h ago', balance: '$340' },
  { id: 'u002', name: 'Marcus Osei', email: 'marcus@nexus.io', role: 'employee', status: 'active', joined: '5h ago', balance: '$1,240' },
  { id: 'u003', name: 'Priya Nair', email: 'priya@corp.com', role: 'client', status: 'suspended', joined: '1d ago', balance: '$0' },
  { id: 'u004', name: 'James Wolff', email: 'jwolff@agency.com', role: 'admin', status: 'active', joined: '2d ago', balance: '$5,600' },
  { id: 'u005', name: 'Aiko Tanaka', email: 'aiko@platform.ai', role: 'client', status: 'pending', joined: '3d ago', balance: '$120' },
];

const systemEvents = [
  { id: 1, level: 'info', msg: 'User sarah@example.com registered via OAuth', time: '0:42' },
  { id: 2, level: 'warn', msg: 'Treasury service latency spike: 184ms (threshold: 100ms)', time: '1:15' },
  { id: 3, level: 'info', msg: 'Scheduled UBI disbursement completed — 4,200 accounts', time: '3:00' },
  { id: 4, level: 'error', msg: 'Keycloak token refresh failed for 3 sessions', time: '5:22' },
  { id: 5, level: 'info', msg: 'Database backup completed: 2.4 GB → MinIO', time: '6:00' },
  { id: 6, level: 'warn', msg: 'Rate limit hit on /api/tasks by 12.34.56.78', time: '8:11' },
  { id: 7, level: 'info', msg: 'NATS message bus: 124K messages/min', time: '10:00' },
];

const ROLE_COLOR: Record<string, string> = {
  owner: 'text-yellow-400 bg-yellow-400/10',
  admin: 'text-red-400 bg-red-400/10',
  employee: 'text-blue-400 bg-blue-400/10',
  client: 'text-green-400 bg-green-400/10',
};

const STATUS_COLOR: Record<string, string> = {
  active: 'text-green-400 bg-green-400/10',
  suspended: 'text-red-400 bg-red-400/10',
  pending: 'text-yellow-400 bg-yellow-400/10',
};

const EVENT_COLOR: Record<string, string> = {
  info: 'text-blue-400',
  warn: 'text-yellow-400',
  error: 'text-red-400',
};

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border px-3 py-2 text-xs shadow-2xl" style={{ background: 'hsl(var(--popover))', color: 'hsl(var(--foreground))' }}>
      <p className="font-bold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: 'hsl(var(--primary))' }}>{p.name}: <span className="font-semibold">{typeof p.value === 'number' && p.name?.includes('revenue') ? `$${p.value.toLocaleString()}` : p.value}</span></p>
      ))}
    </div>
  );
}

export default function GodPage() {
  const demo = useHydratedDemoUser();
  const [liveData, setLiveData] = useState(generateLive());
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [totalRevenue, setTotalRevenue] = useState(168_432);

  const tick = useCallback(() => {
    setLiveData((prev) => {
      const next = [...prev.slice(1), {
        t: (prev[prev.length - 1]?.t ?? 0) + 1,
        cpu: 20 + Math.random() * 50,
        mem: 40 + Math.random() * 30,
        req: Math.floor(200 + Math.random() * 400),
      }];
      return next;
    });
    setTotalRevenue((v) => v + Math.floor(Math.random() * 40));
  }, []);

  useEffect(() => {
    const t = setInterval(tick, 1500);
    return () => clearInterval(t);
  }, [tick]);

  return (
    <div className="space-y-6 pb-8">
      {/* GOD MODE Banner */}
      <div
        className="relative rounded-xl p-6 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--primary)/0.2) 0%, hsl(var(--destructive)/0.1) 100%)',
          border: '1px solid hsl(var(--primary)/0.4)',
          boxShadow: '0 0 40px hsl(var(--primary)/0.15)',
        }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full opacity-5 animate-pulse"
              style={{
                width: `${80 + i * 40}px`,
                height: `${80 + i * 40}px`,
                background: 'hsl(var(--primary))',
                right: `-${20 + i * 20}px`,
                top: `${-20 + i * 10}px`,
                animationDelay: `${i * 0.3}s`,
              }}
            />
          ))}
        </div>
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <Crown className="w-6 h-6" style={{ color: 'hsl(var(--primary))' }} />
              <h1 className="text-2xl font-black text-foreground tracking-tight">GOD MODE</h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary uppercase tracking-widest">Owner</span>
              {demo && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">Demo</span>}
            </div>
            <p className="text-sm text-muted-foreground max-w-lg">
              Supreme command centre — full visibility and control over all users, clients, employees, systems, and revenue flows.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-green-400 bg-green-400/10 px-3 py-1.5 rounded-full border border-green-400/20">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              All Systems Live
            </div>
          </div>
        </div>
      </div>

      {/* Empire KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users" value="4,287" change={12.4} changeLabel="this month" icon={Users} accent="primary" sublabel="Across all roles" glow />
        <StatCard title="Active Clients" value="2,914" change={8.1} changeLabel="this month" icon={Briefcase} accent="info" sublabel="68% of user base" />
        <StatCard title="Total Revenue" value={`$${(totalRevenue).toLocaleString()}`} change={22.6} changeLabel="vs last month" icon={DollarSign} accent="success" sublabel="Platform lifetime" />
        <StatCard title="Platform Score" value="98.4%" change={0.6} changeLabel="vs last week" icon={Shield} accent="warning" sublabel="System reliability" />
      </div>

      {/* Live System Metrics + Platform Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Live System */}
        <div className="rounded-xl border border-border p-5" style={{ background: 'hsl(var(--card))' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Live System Pulse
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
              Real-time
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={liveData} margin={{ top: 4, right: 4, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="t" hide />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="cpu" name="CPU %" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="mem" name="MEM %" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-3 h-0.5 rounded-full" style={{ background: 'hsl(var(--primary))' }} />
              <span className="text-muted-foreground">CPU {liveData[liveData.length - 1]?.cpu.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-3 h-0.5 rounded-full" style={{ background: 'hsl(var(--accent))' }} />
              <span className="text-muted-foreground">MEM {liveData[liveData.length - 1]?.mem.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs ml-auto">
              <Zap className="w-3 h-3 text-yellow-400" />
              <span className="text-muted-foreground">{liveData[liveData.length - 1]?.req} req/s</span>
            </div>
          </div>
        </div>

        {/* Platform Growth */}
        <div className="rounded-xl border border-border p-5" style={{ background: 'hsl(var(--card))' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Platform Growth
            </h2>
            <span className="text-[11px] text-muted-foreground">6 months</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={platformGrowth} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="users" name="users" stroke="hsl(var(--accent))" fill="url(#revGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* User Governance Table + Role Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Users table */}
        <div className="lg:col-span-2 rounded-xl border border-border overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              User Governance
            </h2>
            <div className="flex items-center gap-2">
              <a href="/dashboard/users" className="text-[11px] text-primary hover:underline flex items-center gap-1">
                Full table <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'hsl(var(--muted))' }}>
                  {['User', 'Role', 'Status', 'Balance', 'Joined', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentUsers.map((u) => (
                  <tr
                    key={u.id}
                    className={cn('hover:bg-muted/40 transition-colors cursor-pointer', selectedUser === u.id && 'bg-primary/5')}
                    onClick={() => setSelectedUser(selectedUser === u.id ? null : u.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                          style={{ background: 'hsl(var(--primary)/0.2)', color: 'hsl(var(--primary))' }}
                        >
                          {u.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-xs">{u.name}</p>
                          <p className="text-[10px] text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-[10px] font-bold uppercase px-2 py-0.5 rounded-full', ROLE_COLOR[u.role])}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-[10px] font-bold uppercase px-2 py-0.5 rounded-full', STATUS_COLOR[u.status])}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-foreground">{u.balance}</td>
                    <td className="px-4 py-3 text-[11px] text-muted-foreground">{u.joined}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-primary transition-colors" title="View">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-primary transition-colors" title="Edit">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Suspend">
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Role distribution */}
        <div className="rounded-xl border border-border p-5" style={{ background: 'hsl(var(--card))' }}>
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            Role Distribution
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={roleDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                {roleDistribution.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`${v}%`, '']} contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {roleDistribution.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
                <span className="font-semibold text-foreground">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Event Log + Quick Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Event log */}
        <div className="rounded-xl border border-border overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Flame className="w-4 h-4 text-primary" />
              System Event Stream
            </h2>
            <div className="flex items-center gap-1.5 text-[11px] text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
              Live
            </div>
          </div>
          <div className="divide-y divide-border">
            {systemEvents.map((ev) => (
              <div key={ev.id} className="flex items-start gap-3 px-5 py-2.5 hover:bg-muted/40 transition-colors">
                <span className={cn('text-[10px] font-bold uppercase mt-0.5 w-8 flex-shrink-0', EVENT_COLOR[ev.level])}>
                  {ev.level}
                </span>
                <span className="text-xs text-foreground flex-1 leading-snug">{ev.msg}</span>
                <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">{ev.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* God operations */}
        <div className="rounded-xl border border-border p-5" style={{ background: 'hsl(var(--card))' }}>
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Crown className="w-4 h-4 text-primary" />
            Owner Operations
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: RefreshCw, label: 'Restart Services', desc: 'Rolling restart', color: 'primary' },
              { icon: Download, label: 'Backup Now', desc: 'Snapshot all data', color: 'info' },
              { icon: Lock, label: 'Lock Platform', desc: 'Maintenance mode', color: 'warning' },
              { icon: Unlock, label: 'Unlock All', desc: 'Resume access', color: 'success' },
              { icon: Database, label: 'Flush Cache', desc: 'Clear Redis', color: 'primary' },
              { icon: Upload, label: 'Deploy Build', desc: 'Push latest', color: 'info' },
              { icon: AlertTriangle, label: 'Force Audit', desc: 'Full scan', color: 'warning' },
              { icon: Trash2, label: 'Purge Logs', desc: 'Clear old logs', color: 'danger' },
            ].map((op) => {
              const Icon = op.icon;
              const colorMap: Record<string, string> = {
                primary: 'hsl(var(--primary))',
                info: 'hsl(199 89% 48%)',
                warning: 'hsl(38 92% 50%)',
                success: 'hsl(142 70% 45%)',
                danger: 'hsl(var(--destructive))',
              };
              const c = colorMap[op.color];
              return (
                <button
                  key={op.label}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/60 transition-all group text-left"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${c}18`, color: c }}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground leading-tight">{op.label}</p>
                    <p className="text-[10px] text-muted-foreground">{op.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
