'use client';

import { useState, useEffect, useCallback } from 'react';
import { Coins, Clock, TrendingUp, Users, RefreshCw, CheckCircle2, XCircle, BarChart3 } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { StatCard } from '@/components/dashboard/stat-card';
import { cn, formatRelativeTime } from '@/lib/utils';
import api, { Reward, UBIBalance, PlatformStats, PaginatedResponse } from '@/lib/api';
import {
  isDemoUser,
  DEMO_UBI_BALANCE, DEMO_UBI_HISTORY, DEMO_PLATFORM_STATS,
} from '@/lib/demo';
import { useHydratedDemoUser } from '@/hooks/use-hydrated-demo-user';

// ── Helpers ────────────────────────────────────────────────────
function buildDailyChart(history: Reward[]) {
  const days: Record<string, number> = {};
  history.forEach((r) => {
    const d = r.created_at.slice(0, 10);
    days[d] = (days[d] ?? 0) + r.amount;
  });
  let cumulative = 0;
  return Object.entries(days)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, daily]) => {
      cumulative += daily;
      return { date: date.slice(5), daily, cumulative };
    });
}

export default function UBIPage() {
  const demoUi = useHydratedDemoUser();

  const [balance, setBalance] = useState<UBIBalance | null>(null);
  const [history, setHistory] = useState<Reward[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const demo = isDemoUser();
    try {
      if (demo) {
        setBalance(DEMO_UBI_BALANCE);
        setHistory(DEMO_UBI_HISTORY);
        setStats(DEMO_PLATFORM_STATS);
      } else {
        const [bal, hist, st] = await Promise.allSettled([
          api.getUBIBalance(),
          api.getUBIHistory(1, 30),
          api.getPlatformStats(),
        ]);
        setBalance(bal.status === 'fulfilled' ? bal.value : null);
        setHistory(hist.status === 'fulfilled' ? (hist.value as PaginatedResponse<Reward>).data : []);
        setStats(st.status === 'fulfilled' ? st.value : null);
      }
    } catch {
      setError('Failed to load UBI data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleClaim() {
    if (claiming) return;
    setClaimMsg(null);
    if (isDemoUser()) {
      setClaiming(true);
      await new Promise((r) => setTimeout(r, 800));
      setClaimMsg({ text: 'Successfully claimed 100 UBI (demo)', ok: true });
      setBalance((b) => b ? { ...b, balance: b.balance + 100 } : b);
      setClaiming(false);
      return;
    }
    setClaiming(true);
    try {
      const res = await api.claimUBI();
      setClaimMsg({ text: res.message, ok: true });
      await load();
    } catch (e) {
      setClaimMsg({ text: e instanceof Error ? e.message : 'Claim failed', ok: false });
    } finally {
      setClaiming(false);
    }
  }

  const chartData = buildDailyChart(history);
  const totalEarned = history.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Coins className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />
            UBI Claims
            {demoUi && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">Demo</span>}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Claim your daily Universal Basic Income and track your distribution history.</p>
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

      {error && <div className="rounded-lg px-4 py-3 text-sm bg-red-500/10 border border-red-500/30 text-red-400">{error}</div>}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="UBI Balance"
          value={balance ? `${balance.balance.toLocaleString()} UBI` : '—'}
          icon={Coins} accent="primary" glow
          sublabel="Your current balance"
        />
        <StatCard
          title="Total Earned"
          value={`${totalEarned.toLocaleString()} UBI`}
          icon={TrendingUp} accent="success"
          sublabel={`${history.length} claims in history`}
        />
        <StatCard
          title="Active Users"
          value={stats ? stats.active_users.toLocaleString() : '—'}
          icon={Users} accent="info"
          sublabel="Platform-wide"
        />
        <StatCard
          title="Total Distributed"
          value={stats ? `${(stats.total_ubi_distributed / 1000).toFixed(0)}K UBI` : '—'}
          icon={BarChart3} accent="warning"
          sublabel={stats ? `${stats.total_claims.toLocaleString()} claims` : 'all time'}
        />
      </div>

      {/* Claim card */}
      <div
        className="rounded-xl border p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6"
        style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--primary)/0.3)' }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'hsl(var(--primary)/0.15)', color: 'hsl(var(--primary))' }}
        >
          <Coins className="w-7 h-7" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-bold text-foreground">Daily UBI Claim</h2>
          <p className="text-sm text-muted-foreground mt-0.5">100 UBI is available to claim every 24 hours. Claims are recorded on-chain.</p>
          {claimMsg && (
            <p className={cn('text-sm mt-2 flex items-center gap-1.5', claimMsg.ok ? 'text-green-400' : 'text-red-400')}>
              {claimMsg.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {claimMsg.text}
            </p>
          )}
        </div>
        <button
          onClick={handleClaim}
          disabled={claiming || loading}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 flex-shrink-0"
          style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
        >
          {claiming ? <><RefreshCw className="w-4 h-4 animate-spin" /> Claiming…</> : <><Coins className="w-4 h-4" /> Claim 100 UBI</>}
        </button>
      </div>

      {/* Charts */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border p-5" style={{ background: 'hsl(var(--card))' }}>
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} /> Daily Claims
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="daily" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="UBI" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-xl border border-border p-5" style={{ background: 'hsl(var(--card))' }}>
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} /> Cumulative Balance
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="ubiGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="cumulative" stroke="hsl(var(--primary))" fill="url(#ubiGrad)" strokeWidth={2} name="Total UBI" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* History table */}
      <div className="rounded-xl border border-border overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} /> Claim History
          </h2>
          <span className="text-[11px] text-muted-foreground">{history.length} records</span>
        </div>
        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground animate-pulse">Loading…</div>
        ) : history.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No claims yet. Claim your first 100 UBI above.</div>
        ) : (
          <div className="divide-y divide-border">
            {history.map((r) => (
              <div key={r.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'hsl(var(--primary)/0.15)', color: 'hsl(var(--primary))' }}>
                  <Coins className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground capitalize">{r.type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-muted-foreground">{formatRelativeTime(r.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-400">+{r.amount} UBI</p>
                  <span className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full', r.status === 'completed' ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400')}>
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
