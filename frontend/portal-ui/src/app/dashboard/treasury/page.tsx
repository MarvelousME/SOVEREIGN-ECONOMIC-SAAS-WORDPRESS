'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Wallet, TrendingUp, ArrowDownCircle, ArrowUpCircle,
  RefreshCw, CheckCircle2, XCircle, BarChart3, Shield,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { StatCard } from '@/components/dashboard/stat-card';
import { cn, formatRelativeTime, formatCurrency } from '@/lib/utils';
import api, { TreasuryBalance, TreasuryStrategy, YieldInfo, Reward } from '@/lib/api';
import {
  isDemoUser,
  DEMO_TREASURY_BALANCE, DEMO_TREASURY_STRATEGIES,
  DEMO_TREASURY_YIELD, DEMO_TREASURY_TRANSACTIONS,
} from '@/lib/demo';
import { useHydratedDemoUser } from '@/hooks/use-hydrated-demo-user';

const RISK_STYLES: Record<string, string> = {
  low: 'bg-green-500/15 text-green-400',
  medium: 'bg-yellow-500/15 text-yellow-400',
  high: 'bg-red-500/15 text-red-400',
};

const PIE_COLORS = ['hsl(var(--primary))', '#22c55e', '#f59e0b', '#06b6d4', '#a855f7'];

function buildBalanceChart(transactions: Reward[]) {
  let bal = 0;
  return [...transactions]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((t) => {
      bal += t.amount;
      return { date: t.created_at.slice(5, 10), balance: Math.max(bal, 0) };
    });
}

export default function TreasuryPage() {
  const demoUi = useHydratedDemoUser();

  const [balance, setBalance] = useState<TreasuryBalance | null>(null);
  const [strategies, setStrategies] = useState<TreasuryStrategy[]>([]);
  const [yieldInfo, setYieldInfo] = useState<YieldInfo | null>(null);
  const [transactions, setTransactions] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [txMode, setTxMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [txLoading, setTxLoading] = useState(false);
  const [txMsg, setTxMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const demo = isDemoUser();
    try {
      if (demo) {
        setBalance(DEMO_TREASURY_BALANCE);
        setStrategies(DEMO_TREASURY_STRATEGIES);
        setYieldInfo(DEMO_TREASURY_YIELD);
        setTransactions(DEMO_TREASURY_TRANSACTIONS);
      } else {
        const [bal, strat, yld, hist] = await Promise.allSettled([
          api.getTreasuryBalance(),
          api.getTreasuryStrategies(),
          api.getYield(),
          api.getRewardHistory(1, 30),
        ]);
        setBalance(bal.status === 'fulfilled' ? bal.value : null);
        setStrategies(strat.status === 'fulfilled' ? (strat.value.strategies as TreasuryStrategy[]) : []);
        setYieldInfo(yld.status === 'fulfilled' ? yld.value : null);
        setTransactions(hist.status === 'fulfilled' ? hist.value.data : []);
      }
    } catch {
      setError('Failed to load treasury data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleTx() {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) return;
    setTxMsg(null);
    setTxLoading(true);
    if (isDemoUser()) {
      await new Promise((r) => setTimeout(r, 700));
      setTxMsg({ text: `${txMode === 'deposit' ? 'Deposited' : 'Withdrew'} ${parsed} UBI (demo mode)`, ok: true });
      setBalance((b) => b ? { ...b, balance: txMode === 'deposit' ? b.balance + parsed : Math.max(b.balance - parsed, 0) } : b);
      setAmount('');
      setTxLoading(false);
      return;
    }
    try {
      const res = txMode === 'deposit' ? await api.deposit(parsed) : await api.withdraw(parsed);
      setTxMsg({ text: res.message, ok: true });
      setAmount('');
      await load();
    } catch (e) {
      setTxMsg({ text: e instanceof Error ? e.message : 'Transaction failed', ok: false });
    } finally {
      setTxLoading(false);
    }
  }

  const chartData = buildBalanceChart(transactions);
  const pieData = strategies.map((s) => ({ name: s.name, value: s.allocation }));

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Wallet className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />
            Treasury
            {demoUi && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">Demo</span>}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your treasury balance, deposits, and yield-generating strategies.</p>
        </div>
        <button onClick={load} disabled={loading} aria-label="Refresh" className="p-2 rounded-lg border border-border hover:bg-muted/40 text-muted-foreground transition-colors disabled:opacity-50">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      {error && <div className="rounded-lg px-4 py-3 text-sm bg-red-500/10 border border-red-500/30 text-red-400">{error}</div>}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Treasury Balance" value={balance ? `${balance.balance.toLocaleString()} UBI` : '—'} icon={Wallet} accent="primary" glow sublabel={`in ${balance?.currency ?? 'UBI'}`} />
        <StatCard title="Current APY" value={yieldInfo ? `${yieldInfo.current_apy.toFixed(1)}%` : '—'} icon={TrendingUp} accent="success" sublabel="Blended across strategies" />
        <StatCard title="Est. Annual Yield" value={yieldInfo ? `${yieldInfo.estimated_annual_yield.toFixed(0)} UBI` : '—'} icon={BarChart3} accent="info" sublabel="Based on current balance" />
        <StatCard title="Active Strategies" value={strategies.filter((s) => s.status === 'active').length} icon={Shield} accent="warning" sublabel="Yield protocols" />
      </div>

      {/* Deposit / Withdraw + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Transaction panel */}
        <div className="lg:col-span-3 rounded-xl border border-border p-5 space-y-4" style={{ background: 'hsl(var(--card))' }}>
          <h2 className="text-sm font-semibold text-foreground">Deposit / Withdraw</h2>
          <div className="flex rounded-lg overflow-hidden border border-border">
            {(['deposit', 'withdraw'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setTxMode(m); setTxMsg(null); }}
                className={cn('flex-1 py-2 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors capitalize',
                  txMode === m ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
                style={txMode === m ? { background: 'hsl(var(--primary))' } : { background: 'hsl(var(--muted)/0.4)' }}
              >
                {m === 'deposit' ? <ArrowDownCircle className="w-4 h-4" /> : <ArrowUpCircle className="w-4 h-4" />}
                {m}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount (UBI)"
                className="w-full px-3 py-2.5 rounded-lg border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60 transition-colors"
                style={{ background: 'hsl(var(--background))' }}
              />
            </div>
            <button
              onClick={handleTx}
              disabled={!amount || parseFloat(amount) <= 0 || txLoading}
              className="px-5 py-2.5 rounded-lg text-sm font-bold transition-all hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-1.5"
              style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
            >
              {txLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : txMode === 'deposit' ? <ArrowDownCircle className="w-4 h-4" /> : <ArrowUpCircle className="w-4 h-4" />}
              {txLoading ? 'Processing…' : txMode === 'deposit' ? 'Deposit' : 'Withdraw'}
            </button>
          </div>
          {txMsg && (
            <p className={cn('text-sm flex items-center gap-1.5', txMsg.ok ? 'text-green-400' : 'text-red-400')}>
              {txMsg.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {txMsg.text}
            </p>
          )}
        </div>

        {/* Allocation pie */}
        {pieData.length > 0 && (
          <div className="lg:col-span-2 rounded-xl border border-border p-5" style={{ background: 'hsl(var(--card))' }}>
            <h2 className="text-sm font-semibold text-foreground mb-3">Strategy Allocation</h2>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" paddingAngle={3}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1 mt-1">
              {strategies.map((s, i) => (
                <div key={s.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-muted-foreground">{s.name}</span>
                  </div>
                  <span className="text-foreground font-medium">{s.allocation}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Strategies table */}
      {strategies.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
          <div className="px-5 py-3.5 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Shield className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} /> Active Strategies
            </h2>
          </div>
          <div className="divide-y divide-border">
            {strategies.map((s) => (
              <div key={s.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.protocol}</p>
                </div>
                <span className={cn('text-[11px] font-bold uppercase px-2 py-0.5 rounded-full', RISK_STYLES[s.risk_level] ?? 'bg-muted text-muted-foreground')}>
                  {s.risk_level} risk
                </span>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-400">{parseFloat(String(s.apy)).toFixed(1)}% APY</p>
                  <p className="text-xs text-muted-foreground">{s.allocation}% allocated</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Balance chart */}
      {chartData.length > 1 && (
        <div className="rounded-xl border border-border p-5" style={{ background: 'hsl(var(--card))' }}>
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} /> Balance History
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="tGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="balance" stroke="hsl(var(--primary))" fill="url(#tGrad)" strokeWidth={2} name="Balance (UBI)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Transactions */}
      <div className="rounded-xl border border-border overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Transaction History</h2>
          <span className="text-[11px] text-muted-foreground">{transactions.length} records</span>
        </div>
        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground animate-pulse">Loading…</div>
        ) : transactions.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No transactions yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {transactions.map((tx) => {
              const isPositive = tx.amount >= 0;
              return (
                <div key={tx.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                  <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0', isPositive ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400')}>
                    {isPositive ? <ArrowDownCircle className="w-4 h-4" /> : <ArrowUpCircle className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground capitalize">{tx.type.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground">{formatRelativeTime(tx.created_at)}</p>
                  </div>
                  <p className={cn('text-sm font-bold', isPositive ? 'text-green-400' : 'text-red-400')}>
                    {isPositive ? '+' : ''}{tx.amount} UBI
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
