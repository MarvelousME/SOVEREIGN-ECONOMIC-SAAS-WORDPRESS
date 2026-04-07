'use client';

import dynamic from 'next/dynamic';
import { GitBranch } from 'lucide-react';

const ArchitectureCanvas = dynamic(
  () =>
    import('@/components/system-architecture/architecture-canvas').then((m) => ({
      default: m.ArchitectureCanvas,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[480px] items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground">
        Loading workflow map…
      </div>
    ),
  },
);

export default function SystemWorkflowsPage() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <GitBranch className="h-7 w-7 text-primary" aria-hidden />
          Temporal workflows &amp; triggers
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          The diagram is the same interactive system map, focused on the <strong>trigger</strong> row (manual,
          schedule, NATS, API) and <strong>workflow type</strong> nodes wired to the Temporal worker. Drag nodes,
          connect handles, and turn on <strong>Live save</strong> (with your write secret) to push layout changes
          after a short debounce. Use <strong>Fit view</strong> in the canvas controls if nodes sit off-screen.
        </p>
      </div>
      <ArchitectureCanvas />
    </div>
  );
}
