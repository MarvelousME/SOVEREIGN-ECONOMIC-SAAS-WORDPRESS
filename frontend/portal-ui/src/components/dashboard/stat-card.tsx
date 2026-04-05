'use client';

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number; // % positive = up, negative = down
  changeLabel?: string;
  icon: LucideIcon;
  accent?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  sublabel?: string;
  glow?: boolean;
}

const ACCENT_COLORS = {
  primary: 'hsl(var(--primary))',
  success: 'hsl(142 70% 45%)',
  warning: 'hsl(38 92% 50%)',
  danger: 'hsl(var(--destructive))',
  info: 'hsl(199 89% 48%)',
};

export function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  accent = 'primary',
  sublabel,
  glow = false,
}: StatCardProps) {
  const color = ACCENT_COLORS[accent];
  const positive = typeof change === 'number' && change > 0;
  const negative = typeof change === 'number' && change < 0;
  const neutral = typeof change === 'number' && change === 0;

  return (
    <div
      className={cn(
        'relative rounded-xl p-5 border border-border overflow-hidden transition-all duration-200',
        'hover:border-primary/40 hover:scale-[1.01]',
        glow && 'ring-1 ring-primary/30'
      )}
      style={{
        background: 'hsl(var(--card))',
        boxShadow: glow ? `0 0 20px ${color}33, 0 2px 12px rgba(0,0,0,0.2)` : '0 2px 12px rgba(0,0,0,0.1)',
      }}
    >
      {/* Subtle glow orb */}
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.07] pointer-events-none"
        style={{ background: color, filter: 'blur(20px)' }}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1.5">
            {title}
          </p>
          <p className="text-2xl font-bold text-foreground tabular-nums leading-none">
            {value}
          </p>
          {sublabel && (
            <p className="text-[11px] text-muted-foreground mt-1">{sublabel}</p>
          )}
          {typeof change === 'number' && (
            <div
              className={cn(
                'inline-flex items-center gap-1 mt-2 text-xs font-semibold px-2 py-0.5 rounded-full',
                positive ? 'bg-green-500/15 text-green-400' :
                negative ? 'bg-destructive/15 text-destructive' :
                'bg-muted text-muted-foreground'
              )}
            >
              {positive && <TrendingUp className="w-3 h-3" />}
              {negative && <TrendingDown className="w-3 h-3" />}
              {neutral && <Minus className="w-3 h-3" />}
              {Math.abs(change)}% {changeLabel ?? 'vs last period'}
            </div>
          )}
        </div>

        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}20`, color }}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
