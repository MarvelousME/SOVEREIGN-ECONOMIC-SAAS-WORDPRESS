'use client';

import dynamic from 'next/dynamic';
import { Network } from 'lucide-react';

const ArchitectureCanvas = dynamic(
  () => import('@/components/system-architecture/architecture-canvas'),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[480px] items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground">
        Loading interactive system map…
      </div>
    ),
  },
);

export default function SystemArchitecturePage() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Network className="h-7 w-7 text-primary" aria-hidden />
          System architecture
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Live diagram of major services and infrastructure. Drag nodes, connect handles to propose new wiring,
          then save to write manifests and scripts under{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">generated/architecture/outputs/</code>.
          Apply runs Docker Compose on the repo root (gated by server env — see README in that folder).
        </p>
      </div>
      <ArchitectureCanvas />
    </div>
  );
}
