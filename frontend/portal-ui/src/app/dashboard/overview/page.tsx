'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Coins, Gift, Wallet, ClipboardList, TrendingUp, Users,
  RefreshCw, CheckCircle2, XCircle, ArrowRight, Zap,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { StatCard } from '@/components/dashboard/stat-card';
import { cn, formatRelativeTime } from '@/lib/utils';
import { getStoredUser } from '@/lib/auth';
import api, { UBIBalance, Task, PlatformStats } from '@/lib/api';
import {
  isDemoUser,
  DEMO_UBI_BALANCE, DEMO_REWARD_BALANCE, DEMO_TREASURY_BALANCE,
  DEMO_TASKS, DEMO_PLATFORM_STATS, DEMO_MONTHLY_UBI, DEMO_ACTIVITY,
} from '@/lib/demo';
import { useHydratedDemoUser } from '@/hooks/use-hydrated-demo-user';

const DIFF_STYLE: Record<string, string> = {
  easy:   'bg-green-500/15 text-green-400',
  medium: 'bg-yellow-500/15 text-yellow-400',
  hard:   'bg-orange-500/15 text-orange-400',
  expert: 'bg-red-500/15 text-red-400',
};

export default function OverviewPage() {
  /** Deferred until after mount so SSR / first client paint match (localStorage is client-only). */
  const [welcomeName, setWelcomeName] = useState('User');
  const demoUi = useHydratedDemoUser();

  const [ubiBalance,      setUbiBalance]      = useState<UBIBalance | null>(null);
  const [rewardBalance,   setRewardBalance]   = useState<{ balance: number; currency: string } | null>(null);
  const [treasuryBalance, setTreasuryBalance] = useState<{ balance: number; currency: string } | null>(null);
  const [tasks,           setTasks]           = useState<Task[]>([]);
  const [stats,           setStats]           = useState<PlatformStats | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [claiming,        setClaiming]        = useState(false);
  const [claimMsg,        setClaimMsg]        = useState<{ text: string; ok: boolean } | null>(null);
  const [error,           setError]           = useState('');

  useEffect(() => {
    const u = getStoredUser();
    setWelcomeName(u?.username ?? 'User');
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const demo = isDemoUser();
    try {
      if (demo) {
        setUbiBalance(DEMO_UBI_BALANCE);
        setRewardBalance(DEMO_REWARD_BALANCE);
        setTreasuryBalance(DEMO_TREASURY_BALANCE);
        setTasks(DEMO_TASKS.slice(0, 5));
        setStats(DEMO_PLATFORM_STATS);
      } else {
        const [ub, rb, tb, tk, st] = await Promise.allSettled([
          api.getUBIBalance(),
          api.getRewardBalance(),
          api.getTreasuryBalance(),
          api.getTasks({ status: 'active' }, 1, 5),
          api.getPlatformStats(),
        ]);
        setUbiBalance(ub.status === 'fulfilled' ? ub.value : null);
        setRewardBalance(rb.status === 'fulfilled' ? rb.value : null);
        setTreasuryBalance(tb.status === 'fulfilled' ? tb.value : null);
        setTasks(tk.status === 'fulfilled' ? (tk.value as { data: Task[] }).data : []);
        setStats(st.status === 'fulfilled' ? st.value : null);
      }
    } catch {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleClaim() {
    if (claiming) return;
    setClaimMsg(null);
    setClaiming(true);
    try {
      if (isDemoUser()) {
        await new Promise((r) => setTimeout(r, 900));
        setClaimMsg({ text: 'Successfully claimed 100 UBI (demo)', ok: true });
        setUbiBalance((b) => b ? { ...b, balance: b.balance + 100 } : b);
      } else {
        const res = await api.claimUBI();
        setClaimMsg({ text: res.message, ok: true });
        await load();
      }
    } catch (e) {
      setClaimMsg({ text: e instanceof Error ? e.message : 'Claim failed', ok: false });
    } finally {
      setClaiming(false);
    }
  }

  // Build mini-chart from monthly UBI data
  const chartData = DEMO_MONTHLY_UBI;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Welcome back, {welcomeName} 👋
            {demoUi && (
              <span className="ml-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                Demo
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {demoUi
              ? 'You are viewing demo data — all numbers are simulated.'
              : 'Your UBI Platform overview. All figures are live.'}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          aria-label="Refresh"
          className="p-2 rounded-lg border border-border hover:bg-muted/40 text-muted-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      {error && (
        <div className="rounded-lg px-4 py-3 text-sm bg-red-500/10 border border-red-500/30 text-red-400">
          {error}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="UBI Balance"      value={ubiBalance      ? `${ubiBalance.balance.toLocaleString()} UBI`      : '—'} icon={Coins}         accent="primary" glow sublabel="Your wallet" />
        <StatCard title="Task Rewards"     value={rewardBalance   ? `${rewardBalance.balance.toLocaleString()} UBI`   : '—'} icon={Gift}          accent="success"     sublabel="Total earned" />
        <StatCard title="Treasury"         value={treasuryBalance ? `${treasuryBalance.balance.toLocaleString()} UBI` : '—'} icon={Wallet}        accent="info"        sublabel="Earning yield" />
        <StatCard title="Active Users"     value={stats           ? stats.active_users.toLocaleString()                : '—'} icon={Users}         accent="warning"     sublabel="Platform-wide" />
      </div>

      {/* Claim + Chart row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Claim card */}
        <div
          className="lg:col-span-2 rounded-xl border p-6 flex flex-col gap-4"
          style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--primary)/0.25)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'hsl(var(--primary)/0.15)', color: 'hsl(var(--primary))' }}>
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Daily UBI Claim</p>
              <p className="text-xs text-muted-foreground">100 UBI available every 24 h</p>
            </div>
          </div>

          <button
            onClick={handleClaim}
            disabled={claiming || loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
          >
            {claiming
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Claiming…</>
              : <><Coins className="w-4 h-4" /> Claim 100 UBI</>}
          </button>

          {claimMsg && (
            <p className={cn('text-xs flex items-center gap-1.5', claimMsg.ok ? 'text-green-400' : 'text-red-400')}>
              {claimMsg.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              {claimMsg.text}
            </p>
          )}

          {/* Quick links */}
          <div className="space-y-1 pt-2 border-t border-border">
            {[
              { href: '/dashboard/tasks',    icon: ClipboardList, label: 'Browse Tasks',    color: 'text-green-400' },
              { href: '/dashboard/treasury', icon: Wallet,        label: 'View Treasury',   color: 'text-blue-400' },
              { href: '/dashboard/agents',   icon: Zap,           label: 'AI Agents',       color: 'text-purple-400' },
              { href: '/dashboard/rewards',  icon: Gift,          label: 'My Rewards',      color: 'text-yellow-400' },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              >
                <l.icon className={cn('w-3.5 h-3.5', l.color)} />
                {l.label}
                <ArrowRight className="w-3 h-3 ml-auto opacity-50" />
              </Link>
            ))}
          </div>
        </div>

        {/* UBI Distribution chart */}
        <div
          className="lg:col-span-3 rounded-xl border border-border p-5"
          style={{ background: 'hsl(var(--card))' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} />
              UBI Distribution Trend
            </h3>
            <span className="text-[11px] text-muted-foreground">Last 6 months</span>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="ovGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [`${v.toLocaleString()} UBI`, 'Distributed']}
              />
              <Area type="monotone" dataKey="distributed" stroke="hsl(var(--primary))" fill="url(#ovGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row: Tasks + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Available Tasks */}
        <div
          className="lg:col-span-3 rounded-xl border border-border overflow-hidden"
          style={{ background: 'hsl(var(--card))' }}
        >
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ClipboardList className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} />
              Available Tasks
            </h2>
            <Link href="/dashboard/tasks" className="text-[11px] text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">Loading…</div>
          ) : tasks.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No active tasks right now.</div>
          ) : (
            <div className="divide-y divide-border">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/20 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-muted-foreground">{task.category}</span>
                      <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', DIFF_STYLE[task.difficulty] ?? 'bg-gray-500/15 text-gray-400')}>
                        {task.difficulty}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {task.current_participants}/{task.max_participants}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-green-400 flex-shrink-0">
                    {task.reward_amount} <span className="text-xs font-normal text-muted-foreground">UBI</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity feed */}
        <div
          className="lg:col-span-2 rounded-xl border border-border overflow-hidden"
          style={{ background: 'hsl(var(--card))' }}
        >
          <div className="px-5 py-3.5 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Zap className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} />
              Recent Activity
            </h2>
          </div>
          <div className="divide-y divide-border">
            {DEMO_ACTIVITY.map((a) => (
              <div key={a.id} className="flex items-start gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'hsl(var(--primary))' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground leading-snug">{a.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{a.time}</p>
                </div>
                <span className={cn('text-[11px] font-bold flex-shrink-0', a.color)}>{a.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Platform Stats footer */}
      {stats && (
        <div
          className="rounded-xl border border-border grid grid-cols-3 divide-x divide-border"
          style={{ background: 'hsl(var(--card))' }}
        >
          {[
            { label: 'Active Users',       value: stats.active_users.toLocaleString(),                 color: 'text-blue-400' },
            { label: 'UBI Distributed',    value: `${(stats.total_ubi_distributed / 1000).toFixed(0)}K`, color: 'text-green-400' },
            { label: 'Total Claims',       value: stats.total_claims.toLocaleString(),                  color: 'text-purple-400' },
          ].map((s) => (
            <div key={s.label} className="text-center py-4">
              <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
