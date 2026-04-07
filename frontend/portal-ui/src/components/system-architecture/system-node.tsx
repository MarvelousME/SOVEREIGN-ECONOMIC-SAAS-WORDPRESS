'use client';

import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { SystemNodeData } from './architecture-data';
import { cn } from '@/lib/utils';

const categoryRing: Record<SystemNodeData['category'], string> = {
  infra: 'border-violet-500/80 shadow-violet-500/20',
  core: 'border-sky-500/80 shadow-sky-500/20',
  platform: 'border-emerald-500/80 shadow-emerald-500/20',
  edge: 'border-amber-500/80 shadow-amber-500/20',
  data: 'border-fuchsia-500/80 shadow-fuchsia-500/20',
  workflow: 'border-rose-500/85 shadow-rose-500/25',
  trigger: 'border-cyan-500/85 shadow-cyan-500/25',
};

function SystemNodeInner({ data, selected }: NodeProps<Node<SystemNodeData>>) {
  const ring = categoryRing[data.category] ?? 'border-border';

  return (
    <div
      className={cn(
        'relative rounded-xl border-2 bg-card/95 px-3 py-2 shadow-lg backdrop-blur-sm transition-all duration-300 min-w-[158px]',
        ring,
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02]',
        'animate-in fade-in zoom-in-95 duration-500',
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-2 !bg-background !border-primary"
      />
      <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 to-transparent opacity-80" />
      <div className="relative">
        <p className="text-sm font-bold tracking-tight text-foreground">{data.label}</p>
        {data.sub ? (
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{data.sub}</p>
        ) : null}
        {data.port ? (
          <p className="mt-1 font-mono text-[10px] text-muted-foreground/80">:{data.port}</p>
        ) : null}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-2 !bg-background !border-primary"
      />
    </div>
  );
}

export const SystemNode = memo(SystemNodeInner);
