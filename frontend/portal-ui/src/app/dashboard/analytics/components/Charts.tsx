'use client';

import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

interface ChartTipProps {
  active?: boolean;
  payload?: { value: number; name: string; color?: string }[];
  label?: string;
}

export function ChartTip({ active, payload, label }: ChartTipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg border border-border px-3 py-2 text-xs shadow-2xl"
      style={{ background: 'hsl(var(--popover))', color: 'hsl(var(--foreground))' }}
    >
      <p className="font-bold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color ?? 'hsl(var(--primary))' }}>
          {p.name}:{' '}
          <span className="font-semibold">
            {typeof p.value === 'number' &&
            (p.name?.toLowerCase().includes('revenue') ||
              p.name?.toLowerCase().includes('profit') ||
              p.name?.toLowerCase().includes('cost') ||
              p.name?.toLowerCase().includes('credit'))
              ? `$${p.value.toLocaleString()}`
              : p.value}
          </span>
        </p>
      ))}
    </div>
  );
}

interface FunnelData {
  stage: string;
  value: number;
  color: string;
}

export function FunnelChart({ data }: { data: FunnelData[] }) {
  const maxValue = Math.max(...data.map((d) => d.value));
  return (
    <div className="flex flex-col items-center gap-1 py-4">
      {data.map((item, i) => {
        const widthPercent = (item.value / maxValue) * 100;
        return (
          <div key={item.stage} className="flex items-center gap-3 w-full">
            <span className="text-xs text-muted-foreground w-28 text-right">{item.stage}</span>
            <div className="flex-1 h-8 bg-muted/30 rounded relative overflow-hidden">
              <div
                className="h-full rounded transition-all duration-500 flex items-center justify-end pr-3"
                style={{
                  width: `${widthPercent}%`,
                  background: item.color,
                  opacity: 0.85 - i * 0.1,
                }}
              >
                <span className="text-xs font-bold text-white">{item.value.toLocaleString()}</span>
              </div>
            </div>
            <span className="text-xs font-semibold w-12 text-right" style={{ color: item.color }}>
              {((item.value / maxValue) * 100).toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface LineChartData {
  name: string;
  [key: string]: string | number;
}

interface AreaChartData {
  name: string;
  [key: string]: string | number;
}

interface TrendLineProps {
  data: LineChartData[];
  dataKeys: { key: string; color: string; name: string }[];
  xKey?: string;
  height?: number;
}

export function TrendLineChart({ data, dataKeys, xKey = 'name', height = 220 }: TrendLineProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -15, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<ChartTip />} />
        {dataKeys.map((dk) => (
          <Line
            key={dk.key}
            type="monotone"
            dataKey={dk.key}
            name={dk.name}
            stroke={dk.color}
            strokeWidth={2.5}
            dot={{ fill: dk.color, r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

interface BarChartData {
  name: string;
  [key: string]: string | number;
}

interface ComparisonBarProps {
  data: BarChartData[];
  dataKeys: { key: string; color: string; name: string }[];
  xKey?: string;
  height?: number;
  stacked?: boolean;
}

export function ComparisonBarChart({
  data,
  dataKeys,
  xKey = 'name',
  height = 220,
  stacked = false,
}: ComparisonBarProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -15, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<ChartTip />} />
        {dataKeys.map((dk) => (
          <Bar
            key={dk.key}
            dataKey={dk.key}
            name={dk.name}
            fill={dk.color}
            stackId={stacked ? 'a' : undefined}
            radius={stacked ? (dk.key === dataKeys[dataKeys.length - 1].key ? [3, 3, 0, 0] : [0, 0, 0, 0]) : [3, 3, 0, 0]}
            opacity={0.85}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

interface PieChartData {
  name: string;
  value: number;
  color: string;
}

interface DistributionPieProps {
  data: PieChartData[];
  innerRadius?: number;
  outerRadius?: number;
  height?: number;
}

export function DistributionPie({
  data,
  innerRadius = 42,
  outerRadius = 68,
  height = 160,
}: DistributionPieProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v) => [`${v}`, '']}
          contentStyle={{
            background: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '11px',
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

interface AreaTrendProps {
  data: AreaChartData[];
  dataKeys: { key: string; color: string; name: string }[];
  xKey?: string;
  height?: number;
  gradients?: boolean;
}

export function AreaTrendChart({
  data,
  dataKeys,
  xKey = 'name',
  height = 220,
  gradients = true,
}: AreaTrendProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -15, bottom: 0 }}>
        {gradients &&
          dataKeys.map((dk) => (
            <defs key={dk.key}>
              <linearGradient id={`grad-${dk.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={dk.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={dk.color} stopOpacity={0} />
              </linearGradient>
            </defs>
          ))}
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<ChartTip />} />
        {dataKeys.map((dk) => (
          <Area
            key={dk.key}
            type="monotone"
            dataKey={dk.key}
            name={dk.name}
            stroke={dk.color}
            fill={`url(#grad-${dk.key})`}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
