'use client';

import { useState } from 'react';
import {
  BarChart3, DollarSign, TrendingUp, TrendingDown,
  Users, Target, Calendar, ArrowUpRight, Download,
  ChevronDown,
} from 'lucide-react';
import { useHydratedDemoUser } from '@/hooks/use-hydrated-demo-user';
import { StatCard } from '@/components/dashboard/stat-card';
import {
  FunnelChart,
  TrendLineChart,
  DistributionPie,
  ComparisonBarChart,
} from '../components/Charts';
import { cn } from '@/lib/utils';

const ATTRIBUTION_MODELS = ['First Touch', 'Last Touch', 'Linear', 'Time Decay', 'Position Based', 'Data-Driven'];

const funnelData = [
  { stage: 'Impressions', value: 142500, color: 'hsl(var(--primary))' },
  { stage: 'Clicks', value: 42800, color: 'hsl(199 89% 48%)' },
  { stage: 'Visits', value: 18600, color: 'hsl(142 70% 45%)' },
  { stage: 'Sign-ups', value: 4200, color: 'hsl(38 92% 50%)' },
  { stage: 'Conversions', value: 1248, color: 'hsl(280 65% 60%)' },
];

const touchpointTimeline = [
  { name: 'W1', organic: 820, paid: 340, social: 180, email: 90, referral: 60 },
  { name: 'W2', organic: 920, paid: 380, social: 210, email: 105, referral: 75 },
  { name: 'W3', organic: 1050, paid: 420, social: 240, email: 120, referral: 85 },
  { name: 'W4', organic: 1120, paid: 460, social: 265, email: 135, referral: 92 },
  { name: 'W5', organic: 1280, paid: 510, social: 295, email: 150, referral: 105 },
  { name: 'W6', organic: 1380, paid: 560, social: 320, email: 168, referral: 118 },
];

const creditDistribution = [
  { name: 'Organic Search', value: 34, color: 'hsl(var(--primary))' },
  { name: 'Paid Ads', value: 24, color: 'hsl(199 89% 48%)' },
  { name: 'Social Media', value: 18, color: 'hsl(142 70% 45%)' },
  { name: 'Email', value: 14, color: 'hsl(38 92% 50%)' },
  { name: 'Referral', value: 10, color: 'hsl(280 65% 60%)' },
];

const topChannels = [
  { channel: 'Google Ads - Search', conversions: 428, revenue: '$42,840', cro: 4.2, trend: 12.4 },
  { channel: 'Organic Search', conversions: 386, revenue: '$38,620', cro: 3.8, trend: 8.1 },
  { channel: 'Facebook Ads', conversions: 215, revenue: '$21,500', cro: 2.9, trend: -3.2 },
  { channel: 'LinkedIn Ads', conversions: 124, revenue: '$18,600', cro: 5.1, trend: 22.6 },
  { channel: 'Email Campaign', conversions: 95, revenue: '$9,500', cro: 6.8, trend: 15.3 },
];

const channelTrendData = [
  { name: 'Jul', google: 280, organic: 320, facebook: 140, linkedin: 80, email: 60 },
  { name: 'Aug', google: 320, organic: 380, facebook: 160, linkedin: 95, email: 72 },
  { name: 'Sep', google: 360, organic: 420, facebook: 175, linkedin: 110, email: 85 },
  { name: 'Oct', google: 400, organic: 480, facebook: 190, linkedin: 130, email: 98 },
  { name: 'Nov', google: 460, organic: 540, facebook: 210, linkedin: 155, email: 115 },
  { name: 'Dec', google: 520, organic: 620, facebook: 240, linkedin: 180, email: 132 },
  { name: 'Jan', google: 580, organic: 680, facebook: 260, linkedin: 210, email: 148 },
];

export default function AttributionPage() {
  const demo = useHydratedDemoUser();
  const [model, setModel] = useState('Data-Driven');
  const [modelOpen, setModelOpen] = useState(false);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />
            Attribution Report
            {demo && (
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                Demo
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Multi-touch attribution modeling and conversion credit analysis.
          </p>
        </div>
        <div className="relative">
          <button
            onClick={() => setModelOpen(!modelOpen)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted/40 transition-colors"
            style={{ background: 'hsl(var(--card))' }}
          >
            {model}
            <ChevronDown className={cn('w-4 h-4 transition-transform', modelOpen && 'rotate-180')} />
          </button>
          {modelOpen && (
            <div
              className="absolute right-0 mt-1 w-48 rounded-lg border border-border shadow-xl z-10 py-1"
              style={{ background: 'hsl(var(--popover))' }}
            >
              {ATTRIBUTION_MODELS.map((m) => (
                <button
                  key={m}
                  onClick={() => { setModel(m); setModelOpen(false); }}
                  className={cn(
                    'w-full text-left px-4 py-2 text-sm hover:bg-muted/40 transition-colors',
                    m === model ? 'text-primary font-semibold' : 'text-foreground'
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Conversions"
          value="1,248"
          change={18.4}
          changeLabel="vs last month"
          icon={Target}
          accent="success"
          sublabel="Across all channels"
          glow
        />
        <StatCard
          title="Conversion Value"
          value="$130,560"
          change={24.6}
          changeLabel="vs last month"
          icon={DollarSign}
          accent="primary"
          sublabel="Attributed revenue"
        />
        <StatCard
          title="Avg. Touchpoints"
          value="4.2"
          change={-8.2}
          changeLabel="vs last month"
          icon={Users}
          accent="info"
          sublabel="Before conversion"
        />
        <StatCard
          title="Top Channel"
          value="Google Ads"
          change={12.4}
          changeLabel="vs last month"
          icon={TrendingUp}
          accent="warning"
          sublabel="34% credit share"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border p-5" style={{ background: 'hsl(var(--card))' }}>
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Target className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} />
            Conversion Funnel
          </h2>
          <FunnelChart data={funnelData} />
        </div>

        <div className="rounded-xl border border-border p-5" style={{ background: 'hsl(var(--card))' }}>
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} />
            Credit Distribution
          </h2>
          <DistributionPie data={creditDistribution} />
          <div className="space-y-1.5 mt-3">
            {creditDistribution.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                  <span className="text-muted-foreground">{d.name}</span>
                </div>
                <span className="font-semibold text-foreground">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border p-5" style={{ background: 'hsl(var(--card))' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} />
            Touchpoint Timeline by Channel
          </h2>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-primary" />Google</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-cyan-400" />Organic</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-green-400" />Facebook</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-violet-400" />LinkedIn</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-amber-400" />Email</div>
          </div>
        </div>
        <TrendLineChart
          data={touchpointTimeline}
          dataKeys={[
            { key: 'organic', color: 'hsl(var(--primary))', name: 'Organic' },
            { key: 'paid', color: 'hsl(199 89% 48%)', name: 'Paid' },
            { key: 'social', color: 'hsl(142 70% 45%)', name: 'Social' },
            { key: 'email', color: 'hsl(38 92% 50%)', name: 'Email' },
            { key: 'referral', color: 'hsl(280 65% 60%)', name: 'Referral' },
          ]}
        />
      </div>

      <div className="rounded-xl border border-border overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} />
            Top Converting Channels
          </h2>
          <button
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
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
                <th className="text-left px-5 py-3 font-medium">Channel</th>
                <th className="text-right px-4 py-3 font-medium">Conversions</th>
                <th className="text-right px-4 py-3 font-medium">Revenue</th>
                <th className="text-right px-4 py-3 font-medium">CRO</th>
                <th className="text-right px-5 py-3 font-medium">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {topChannels.map((ch) => (
                <tr key={ch.channel} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-foreground">{ch.channel}</td>
                  <td className="text-right px-4 py-3.5 font-semibold">{ch.conversions}</td>
                  <td className="text-right px-4 py-3.5 font-semibold" style={{ color: 'hsl(var(--primary))' }}>
                    {ch.revenue}
                  </td>
                  <td className="text-right px-4 py-3.5 text-muted-foreground">{ch.cro}%</td>
                  <td className="text-right px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      {ch.trend > 0 ? (
                        <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                      )}
                      <span
                        className={cn(
                          'text-xs font-semibold',
                          ch.trend > 0 ? 'text-green-400' : 'text-destructive'
                        )}
                      >
                        {ch.trend > 0 ? '+' : ''}{ch.trend}%
                      </span>
                    </div>
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
