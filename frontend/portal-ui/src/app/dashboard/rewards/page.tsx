'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Gift, TrendingUp, Coins, ClipboardList, RefreshCw, Star } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import { StatCard } from '@/components/dashboard/stat-card';
import { cn, formatRelativeTime } from '@/lib/utils';
import api, { Reward } from '@/lib/api';
import { isDemoUser, DEMO_REWARD_BALANCE, DEMO_REWARD_HISTORY } from '@/lib/demo';
import { useHydratedDemoUser } from '@/hooks/use-hydrated-demo-user';

// ── Helpers ────────────────────────────────────────────────────
const TYPE_LABEL: Record<string, string> = {
  ubi_distribution: 'UBI Distribution',
  task_reward: 'Task Reward',
  treasury_deposit: 'Treasury Deposit',
  yield_earned: 'Yield Earned',
  referral_bonus: 'Referral Bonus',
};

const TYPE_COLOR: Record<string, string> = {
  ubi_distribution: 'bg-blue-500/15 text-blue-400',
  task_reward: 'bg-green-500/15 text-green-400',
  treasury_deposit: 'bg-purple-500/15 text-purple-400',
  yield_earned: 'bg-yellow-500/15 text-yellow-400',
  referral_bonus: 'bg-cyan-500/15 text-cyan-400',
};

function buildWeeklyChart(history: Reward[]) {
  const weeks: Record<string, { ubi: number; task: number; other: number }> = {};
  history.forEach((r) => {
    const d = new Date(r.created_at);
    const start = new Date(d);
    start.setDate(d.getDate() - d.getDay());
    const key = start.toISOString().slice(5, 10);
    if (!weeks[key]) weeks[key] = { ubi: 0, task: 0, other: 0 };
    if (r.type === 'ubi_distribution') weeks[key].ubi += r.amount;
    else if (r.type === 'task_reward') weeks[key].task += r.amount;
    else weeks[key].other += r.amount;
  });
  return Object.entries(weeks)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([date, v]) => ({ date, ...v }));
}

function buildCumulative(history: Reward[]) {
  let cum = 0;
  return [...history]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((r) => { cum += r.amount; return { date: r.created_at.slice(5, 10), total: cum }; });
}

export default function RewardsPage() {
  const demoUi = useHydratedDemoUser();

  const [balance, setBalance] = useState<{ balance: number; currency: string } | null>(null);
  const [history, setHistory] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const demo = isDemoUser();
    try {
      if (demo) {
        setBalance(DEMO_REWARD_BALANCE);
        setHistory(DEMO_REWARD_HISTORY);
      } else {
        const [bal, hist] = await Promise.allSettled([
          api.getRewardBalance(),
          api.getRewardHistory(1, 100),
        ]);
        setBalance(bal.status === 'fulfilled' ? bal.value : null);
        setHistory(hist.status === 'fulfilled' ? hist.value.data : []);
      }
    } catch {
      setError('Failed to load rewards');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(
    () => typeFilter === 'all' ? history : history.filter((r) => r.type === typeFilter),
    [history, typeFilter]
  );

  const ubiTotal = history.filter((r) => r.type === 'ubi_distribution').reduce((s, r) => s + r.amount, 0);
  const taskTotal = history.filter((r) => r.type === 'task_reward').reduce((s, r) => s + r.amount, 0);
  const streak = (() => {
    const days = new Set(history.filter((r) => r.type === 'ubi_distribution').map((r) => r.created_at.slice(0, 10)));
    let s = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      if (days.has(d.toISOString().slice(0, 10))) s++;
      else break;
    }
    return s;
  })();

  const types = [...new Set(history.map((r) => r.type))];
  const weeklyData = buildWeeklyChart(history);
  const cumulativeData = buildCumulative(history);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Gift className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />
            Rewards & Earnings
            {demoUi && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">Demo</span>}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track your UBI income, task rewards, and streak bonuses.</p>
        </div>
        <button onClick={load} disabled={loading} aria-label="Refresh" className="p-2 rounded-lg border border-border hover:bg-muted/40 text-muted-foreground transition-colors disabled:opacity-50">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      {error && <div className="rounded-lg px-4 py-3 text-sm bg-red-500/10 border border-red-500/30 text-red-400">{error}</div>}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Balance" value={balance ? `${balance.balance.toLocaleString()} UBI` : '—'} icon={Gift} accent="primary" glow sublabel="Lifetime earnings" />
        <StatCard title="UBI Income" value={`${ubiTotal.toLocaleString()} UBI`} icon={Coins} accent="info" sublabel={`${history.filter((r) => r.type === 'ubi_distribution').length} claims`} />
        <StatCard title="Task Earnings" value={`${taskTotal.toLocaleString()} UBI`} icon={ClipboardList} accent="success" sublabel={`${history.filter((r) => r.type === 'task_reward').length} tasks`} />
        <StatCard title="Daily Streak" value={`${streak} day${streak !== 1 ? 's' : ''}`} icon={Star} accent="warning" sublabel="Consecutive claims" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border p-5" style={{ background: 'hsl(var(--card))' }}>
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} /> Weekly Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="ubi" stackId="a" fill="hsl(var(--primary))" name="UBI" radius={[0, 0, 0, 0]} />
              <Bar dataKey="task" stackId="a" fill="#22c55e" name="Tasks" radius={[0, 0, 0, 0]} />
              <Bar dataKey="other" stackId="a" fill="#f59e0b" name="Other" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border border-border p-5" style={{ background: 'hsl(var(--card))' }}>
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} /> Cumulative Earnings
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={cumulativeData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="rGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="total" stroke="#22c55e" fill="url(#rGrad)" strokeWidth={2} name="Total (UBI)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Reward history */}
      <div className="rounded-xl border border-border overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border flex-wrap gap-3">
          <h2 className="text-sm font-semibold text-foreground">History</h2>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={() => setTypeFilter('all')} className={cn('px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors', typeFilter === 'all' ? 'text-primary-foreground' : 'text-muted-foreground border border-border hover:text-foreground')} style={typeFilter === 'all' ? { background: 'hsl(var(--primary))' } : undefined}>All</button>
            {types.map((t) => (
              <button key={t} onClick={() => setTypeFilter(t)} className={cn('px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors', typeFilter === t ? 'text-primary-foreground' : 'text-muted-foreground border border-border hover:text-foreground')} style={typeFilter === t ? { background: 'hsl(var(--primary))' } : undefined}>
                {TYPE_LABEL[t] ?? t}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground animate-pulse">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No rewards found.</div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((r) => (
              <div key={r.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0', TYPE_COLOR[r.type] ?? 'bg-muted text-muted-foreground')}>
                  {r.type === 'ubi_distribution' ? <Coins className="w-4 h-4" /> : r.type === 'task_reward' ? <ClipboardList className="w-4 h-4" /> : <Gift className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{TYPE_LABEL[r.type] ?? r.type}</p>
                  <p className="text-xs text-muted-foreground">{formatRelativeTime(r.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-400">+{r.amount} {r.currency}</p>
                  <span className={cn('text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full', r.status === 'completed' ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400')}>
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
