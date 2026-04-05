'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Activity, Server, Database, Shield, Globe, HardDrive,
  Cpu, MemoryStick, Network, Clock, AlertTriangle, CheckCircle2,
  AlertCircle, Zap, RefreshCw, TrendingUp, TrendingDown,
} from 'lucide-react';
import { useHydratedDemoUser } from '@/hooks/use-hydrated-demo-user';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────
type ServiceStatus = 'operational' | 'degraded' | 'down' | 'maintenance';

interface Service {
  id: string;
  name: string;
  icon: React.ElementType;
  status: ServiceStatus;
  latency: number; // ms
  uptime: number; // %
  version?: string;
  endpoint?: string;
}

interface MetricPoint {
  t: number;
  cpu: number;
  mem: number;
  disk: number;
  net: number;
  rps: number;
  errors: number;
  p99: number;
}

// ── Mock services state ────────────────────────────────────────
const INITIAL_SERVICES: Service[] = [
  { id: 'postgres', name: 'PostgreSQL', icon: Database, status: 'operational', latency: 4, uptime: 99.98, version: '16.2' },
  { id: 'redis', name: 'Redis Cache', icon: Zap, status: 'operational', latency: 1, uptime: 99.99, version: '7.2' },
  { id: 'keycloak', name: 'Keycloak Auth', icon: Shield, status: 'operational', latency: 22, uptime: 99.95, version: '24.0' },
  { id: 'traefik', name: 'Traefik Proxy', icon: Globe, status: 'operational', latency: 3, uptime: 100, version: '3.0' },
  { id: 'nats', name: 'NATS Messaging', icon: Activity, status: 'operational', latency: 2, uptime: 99.97, version: '2.10' },
  { id: 'minio', name: 'MinIO Storage', icon: HardDrive, status: 'operational', latency: 18, uptime: 99.9, version: 'RELEASE.2024' },
  { id: 'temporal', name: 'Temporal Engine', icon: Clock, status: 'degraded', latency: 148, uptime: 98.4, version: '1.22' },
  { id: 'api', name: 'API Gateway', icon: Server, status: 'operational', latency: 12, uptime: 99.96, endpoint: ':8000' },
];

const STATUS_CONFIG: Record<ServiceStatus, { label: string; dot: string; badge: string; iconColor: string }> = {
  operational: {
    label: 'Operational',
    dot: 'bg-green-500',
    badge: 'bg-green-500/15 text-green-400 border-green-500/20',
    iconColor: 'text-green-400',
  },
  degraded: {
    label: 'Degraded',
    dot: 'bg-yellow-500 animate-pulse',
    badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
    iconColor: 'text-yellow-400',
  },
  down: {
    label: 'Down',
    dot: 'bg-red-500 animate-ping',
    badge: 'bg-red-500/15 text-red-400 border-red-500/20',
    iconColor: 'text-red-400',
  },
  maintenance: {
    label: 'Maintenance',
    dot: 'bg-blue-500 animate-pulse',
    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    iconColor: 'text-blue-400',
  },
};

function generateMetric(prev?: MetricPoint): MetricPoint {
  const base = prev ?? { t: 0, cpu: 35, mem: 52, disk: 41, net: 200, rps: 320, errors: 1, p99: 45 };
  return {
    t: base.t + 1,
    cpu: Math.max(5, Math.min(95, base.cpu + (Math.random() - 0.5) * 8)),
    mem: Math.max(20, Math.min(90, base.mem + (Math.random() - 0.48) * 3)),
    disk: Math.max(30, Math.min(80, base.disk + (Math.random() - 0.49) * 0.5)),
    net: Math.max(50, Math.min(900, base.net + (Math.random() - 0.5) * 80)),
    rps: Math.max(100, Math.min(800, base.rps + (Math.random() - 0.5) * 60)),
    errors: Math.max(0, Math.min(20, base.errors + (Math.random() - 0.7) * 2)),
    p99: Math.max(10, Math.min(300, base.p99 + (Math.random() - 0.5) * 15)),
  };
}

function ChartTip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border px-3 py-2 text-xs shadow-2xl" style={{ background: 'hsl(var(--popover))' }}>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color ?? 'hsl(var(--primary))' }}>
          {p.name}: <span className="font-bold">{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span>
        </p>
      ))}
    </div>
  );
}

function MetricLine({ data, dataKey, name, color, unit = '', height = 80 }: {
  data: MetricPoint[];
  dataKey: keyof MetricPoint;
  name: string;
  color?: string;
  unit?: string;
  height?: number;
}) {
  const c = color ?? 'hsl(var(--primary))';
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -30, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={c} stopOpacity={0.25} />
            <stop offset="95%" stopColor={c} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="t" hide />
        <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTip />} />
        <Area
          type="monotone"
          dataKey={dataKey}
          name={`${name}${unit}`}
          stroke={c}
          fill={`url(#grad-${dataKey})`}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Log stream ─────────────────────────────────────────────────
const LOG_TEMPLATES = [
  ['info', 'GET /api/tasks 200 12ms'],
  ['info', 'POST /api/auth/token 200 8ms'],
  ['warn', 'High latency detected on Temporal: 148ms'],
  ['info', 'NATS: 124K msg/min — nominal'],
  ['info', 'GET /api/treasury/balance 200 5ms'],
  ['error', 'Redis connection timeout — retrying (1/3)'],
  ['info', 'Keycloak: session refresh OK'],
  ['info', 'MinIO: object uploaded successfully'],
  ['warn', 'Rate limit: 45% utilised on /api/tasks'],
  ['info', 'Traefik: TLS cert renewed'],
];

interface LogLine { id: number; level: string; msg: string; ts: string }

const LEVEL_COLOR: Record<string, string> = {
  info: 'text-blue-400',
  warn: 'text-yellow-400',
  error: 'text-red-400',
};

export default function MonitoringPage() {
  const demo = useHydratedDemoUser();
  const [metrics, setMetrics] = useState<MetricPoint[]>(() =>
    Array.from({ length: 30 }, (_, i) => generateMetric({ t: i, cpu: 35, mem: 52, disk: 41, net: 200, rps: 320, errors: 1, p99: 45 }))
  );
  const [services, setServices] = useState<Service[]>(INITIAL_SERVICES);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [logId, setLogId] = useState(0);

  const tick = useCallback(() => {
    setMetrics((prev) => {
      const next = [...prev.slice(1), generateMetric(prev[prev.length - 1])];
      return next;
    });

    // Occasionally degrade / recover a service
    setServices((prev) =>
      prev.map((svc) => {
        if (Math.random() > 0.98) {
          return { ...svc, status: svc.status === 'operational' ? 'degraded' : 'operational', latency: svc.status === 'operational' ? 150 + Math.floor(Math.random() * 100) : Math.floor(Math.random() * 30) };
        }
        return { ...svc, latency: Math.max(1, svc.latency + Math.floor((Math.random() - 0.5) * 6)) };
      })
    );

    // Add log line
    const tpl = LOG_TEMPLATES[Math.floor(Math.random() * LOG_TEMPLATES.length)];
    const now = new Date();
    const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    setLogId((v) => {
      const id = v + 1;
      setLogs((prev) => [{ id, level: tpl[0], msg: tpl[1], ts }, ...prev].slice(0, 50));
      return id;
    });
  }, []);

  useEffect(() => {
    const t = setInterval(tick, 1200);
    return () => clearInterval(t);
  }, [tick]);

  const latest = metrics[metrics.length - 1] ?? { cpu: 0, mem: 0, disk: 0, net: 0, rps: 0, errors: 0, p99: 0, t: 0 };
  const operational = services.filter((s) => s.status === 'operational').length;
  const degraded = services.filter((s) => s.status === 'degraded').length;
  const down = services.filter((s) => s.status === 'down').length;

  return (
    <div className="space-y-5 pb-8">
      {/* Header banner */}
      <div
        className="relative rounded-xl p-5 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--primary)/0.15), hsl(var(--card)))',
          border: '1px solid hsl(var(--primary)/0.3)',
          boxShadow: '0 0 30px hsl(var(--primary)/0.1)',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2 mb-1">
              <Activity className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />
              Live System Monitoring
              {demo && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">Demo</span>}
            </h1>
            <p className="text-sm text-muted-foreground">Real-time infrastructure health, metrics, and event stream.</p>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-green-400 font-semibold">{operational} Up</span>
            </div>
            {degraded > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                <span className="text-yellow-400 font-semibold">{degraded} Degraded</span>
              </div>
            )}
            {down > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span className="text-red-400 font-semibold">{down} Down</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Service grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {services.map((svc) => {
          const Icon = svc.icon;
          const cfg = STATUS_CONFIG[svc.status];
          return (
            <div
              key={svc.id}
              className="rounded-xl border p-4 transition-all hover:scale-[1.02] cursor-pointer"
              style={{
                background: 'hsl(var(--card))',
                borderColor: svc.status !== 'operational' ? 'hsl(38 92% 50% / 0.4)' : 'hsl(var(--border))',
                boxShadow: svc.status !== 'operational' ? '0 0 12px hsl(38 92% 50% / 0.15)' : undefined,
              }}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <Icon className={cn('w-5 h-5', cfg.iconColor)} />
                <div className="relative w-2 h-2 mt-0.5">
                  <span className={cn('absolute w-2 h-2 rounded-full', cfg.dot)} />
                </div>
              </div>
              <p className="text-xs font-semibold text-foreground mb-0.5">{svc.name}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] font-mono text-muted-foreground">{svc.latency}ms</span>
                <span className={cn('text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border', cfg.badge)}>
                  {svc.status === 'operational' ? 'UP' : svc.status}
                </span>
              </div>
              <div className="mt-1.5 h-0.5 rounded-full" style={{ background: 'hsl(var(--border))' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${svc.uptime}%`,
                    background: svc.status === 'operational' ? '#10b981' : '#f59e0b',
                  }}
                />
              </div>
              <p className="text-[9px] text-muted-foreground mt-1">{svc.uptime}% uptime</p>
            </div>
          );
        })}
      </div>

      {/* Core metric charts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { key: 'cpu' as const, label: 'CPU Usage', value: `${latest.cpu.toFixed(1)}%`, color: 'hsl(var(--primary))', warn: latest.cpu > 75 },
          { key: 'mem' as const, label: 'Memory', value: `${latest.mem.toFixed(1)}%`, color: 'hsl(199 89% 48%)', warn: latest.mem > 80 },
          { key: 'rps' as const, label: 'Req / sec', value: latest.rps.toFixed(0), color: '#10b981', warn: false },
          { key: 'p99' as const, label: 'P99 Latency', value: `${latest.p99.toFixed(0)}ms`, color: '#f59e0b', warn: latest.p99 > 150 },
        ].map((m) => (
          <div
            key={m.key}
            className="rounded-xl border border-border p-4"
            style={{
              background: 'hsl(var(--card))',
              boxShadow: m.warn ? '0 0 14px rgba(239,68,68,0.15)' : undefined,
              borderColor: m.warn ? 'hsl(var(--destructive)/0.4)' : undefined,
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{m.label}</p>
              {m.warn && <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
            </div>
            <p className="text-xl font-bold text-foreground mb-2" style={{ color: m.warn ? 'hsl(var(--destructive))' : undefined }}>
              {m.value}
            </p>
            <MetricLine data={metrics} dataKey={m.key} name={m.label} color={m.color} height={60} />
          </div>
        ))}
      </div>

      {/* Detailed charts + log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Request rate + errors */}
        <div className="rounded-xl border border-border p-5" style={{ background: 'hsl(var(--card))' }}>
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} />
            Request Rate &amp; Errors
          </h2>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={metrics} margin={{ top: 4, right: 4, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="rpsG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="errG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="t" hide />
              <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip />} />
              <Area type="monotone" dataKey="rps" name="req/s" stroke="#10b981" fill="url(#rpsG)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              <Area type="monotone" dataKey="errors" name="errors" stroke="hsl(var(--destructive))" fill="url(#errG)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Live log stream */}
        <div className="rounded-xl border border-border overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Server className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} />
              Live Log Stream
            </h2>
            <div className="flex items-center gap-1.5 text-[11px] text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
              Streaming
            </div>
          </div>
          <div
            className="h-[175px] overflow-y-auto thin-scrollbar font-mono text-[11px] divide-y divide-border"
            style={{ background: 'hsl(var(--background))' }}
          >
            {logs.map((line) => (
              <div key={line.id} className="flex items-start gap-3 px-4 py-1.5">
                <span className="text-muted-foreground flex-shrink-0">{line.ts}</span>
                <span className={cn('flex-shrink-0 uppercase font-bold w-8', LEVEL_COLOR[line.level])}>
                  {line.level}
                </span>
                <span className="text-foreground">{line.msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
