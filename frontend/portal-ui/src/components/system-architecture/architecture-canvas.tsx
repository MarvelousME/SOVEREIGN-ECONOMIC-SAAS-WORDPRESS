'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Panel,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { SystemNode } from './system-node';
import type { SystemNodeData } from './architecture-data';
import {
  canvasBaselineNodes,
  initialEdges,
  BASELINE_EDGE_IDS,
  BASELINE_NODE_IDS,
} from './architecture-data';
import {
  type PaletteItem,
  PALETTE_ITEMS,
  WORKFLOW_PALETTE_ITEMS,
  paletteDragPayload,
  parsePaletteDragPayload,
  paletteItemToNode,
} from '@/lib/architecture/palette';
import { buildWiringSuggestionsMarkdown } from '@/lib/architecture/wiring-suggestions';
import { toast } from 'sonner';
import { Download, RotateCcw, Save, Play, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const toolbarBtn =
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-8 px-3';

const nodeTypes = { system: SystemNode };

function decorateEdges(edges: Edge[]): Edge[] {
  return edges.map((e) => {
    const documented = BASELINE_EDGE_IDS.has(e.id);
    return {
      ...e,
      deletable: !documented,
      animated: true,
      style: documented
        ? { stroke: 'hsl(var(--primary))', strokeWidth: 2 }
        : { stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '6 4' },
      labelStyle: documented ? { fill: 'hsl(var(--muted-foreground))', fontSize: 10 } : { fill: '#b45309', fontSize: 10 },
      labelBgStyle: { fill: 'hsl(var(--card))', fillOpacity: 0.9 },
    };
  });
}

function ArchitectureCanvasInner() {
  const { screenToFlowPosition } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState(canvasBaselineNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(decorateEdges(initialEdges));
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);
  const [instantSave, setInstantSave] = useState(false);
  const lastSavedJsonRef = useRef<string>('');
  const liveSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;
      const id = `proposed-${params.source}-${params.target}-${Date.now()}`;
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            id,
            deletable: true,
            animated: true,
            label: 'Proposed',
            style: { stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '6 4' },
            labelStyle: { fill: '#b45309', fontSize: 10 },
            labelBgStyle: { fill: 'hsl(var(--card))', fillOpacity: 0.9 },
          },
          eds,
        ),
      );
      toast.message('Connection added', {
        description: 'Save to disk to record proposed wiring in generated outputs.',
      });
    },
    [setEdges],
  );

  const resetBaseline = useCallback(() => {
    setNodes(canvasBaselineNodes);
    setEdges(decorateEdges(initialEdges));
    toast.success('Reset to documented baseline');
  }, [setNodes, setEdges]);

  const onNodesDelete = useCallback((deleted: Node<SystemNodeData>[]) => {
    const paletteRemoved = deleted.filter((d) => d.id && !BASELINE_NODE_IDS.has(d.id)).length;
    if (paletteRemoved > 0) {
      toast.message('Palette node removed', {
        description:
          paletteRemoved === 1
            ? 'Select a proposed edge and press Delete to remove it too, if needed.'
            : `${paletteRemoved} palette nodes removed.`,
      });
    }
  }, []);

  const exportLocal = useCallback(() => {
    const payload = {
      generatedAt: new Date().toISOString(),
      nodes,
      edges,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `architecture-layout-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success('Downloaded layout JSON');
  }, [nodes, edges]);

  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);

  const persistWiring = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      const silent = opts.silent ?? false;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const sessionSecret =
        typeof window !== 'undefined' ? sessionStorage.getItem('architecture_write_secret') : null;
      if (sessionSecret) headers['x-architecture-secret'] = sessionSecret;

      if (silent && !sessionSecret) {
        return;
      }

      const body = JSON.stringify({ nodes, edges });
      if (silent && body === lastSavedJsonRef.current) {
        return;
      }

      if (!silent) setSaving(true);
      try {
        const res = await fetch('/api/architecture/wiring', {
          method: 'POST',
          headers,
          body,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || res.statusText);
        if (silent) {
          lastSavedJsonRef.current = body;
        } else {
          lastSavedJsonRef.current = body;
          toast.success('Wiring written', { description: data.written?.join(', ') });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        if (silent) {
          toast.error('Live save failed', { description: msg, duration: 4000 });
        } else {
          toast.error('Save failed', { description: msg });
        }
      } finally {
        if (!silent) setSaving(false);
      }
    },
    [nodes, edges],
  );

  const saveToRepo = useCallback(() => persistWiring({ silent: false }), [persistWiring]);

  useEffect(() => {
    if (!instantSave) return;
    if (liveSaveTimerRef.current) clearTimeout(liveSaveTimerRef.current);
    liveSaveTimerRef.current = setTimeout(() => {
      liveSaveTimerRef.current = null;
      void persistWiring({ silent: true });
    }, 420);
    return () => {
      if (liveSaveTimerRef.current) clearTimeout(liveSaveTimerRef.current);
    };
  }, [nodes, edges, instantSave, persistWiring]);

  const applyScripts = useCallback(async () => {
    setApplying(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const sessionSecret =
        typeof window !== 'undefined' ? sessionStorage.getItem('architecture_write_secret') : null;
      if (sessionSecret) headers['x-architecture-secret'] = sessionSecret;

      const res = await fetch('/api/architecture/apply', {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText);
      toast.success('Apply finished', { description: data.message || 'OK' });
    } catch (e) {
      toast.error('Apply failed', { description: e instanceof Error ? e.message : 'Unknown error' });
    } finally {
      setApplying(false);
    }
  }, []);

  const proposedCount = useMemo(() => edges.filter((e) => !BASELINE_EDGE_IDS.has(e.id)).length, [edges]);
  const extraNodeCount = useMemo(
    () => nodes.filter((n) => n.id && !BASELINE_NODE_IDS.has(n.id)).length,
    [nodes],
  );

  const suggestionsMd = useMemo(
    () =>
      buildWiringSuggestionsMarkdown(
        nodes as { id?: string; data?: { label?: string; sub?: string; category?: string } }[],
        edges as { id?: string; source?: string; target?: string; label?: string }[],
        BASELINE_EDGE_IDS,
        BASELINE_NODE_IDS,
        new Date().toISOString(),
      ),
    [nodes, edges],
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDropCanvas = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData('application/reactflow');
      const item = parsePaletteDragPayload(raw);
      if (!item) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const newNode = paletteItemToNode(item, position);
      setNodes((nds) => nds.concat(newNode));
      toast.success('Component added', { description: `${item.label} — connect handles to propose wiring.` });
    },
    [screenToFlowPosition, setNodes],
  );

  const addPaletteItem = useCallback(
    (item: PaletteItem) => {
      const position = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
      const newNode = paletteItemToNode(item, position);
      setNodes((nds) => nds.concat(newNode));
      toast.success('Component added', { description: item.label });
    },
    [screenToFlowPosition, setNodes],
  );

  return (
    <div className="h-[calc(100vh-12rem)] min-h-[520px] w-full rounded-xl border border-border bg-muted/20">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onNodesDelete={onNodesDelete}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDropCanvas}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        deleteKeyCode={['Backspace', 'Delete']}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.35}
        maxZoom={1.4}
        defaultEdgeOptions={{ animated: true }}
        proOptions={{ hideAttribution: true }}
        className="rounded-xl"
      >
        <Background gap={20} size={1} className="opacity-40" />
        <Controls className="!bg-card !border-border !shadow-md" />
        <MiniMap
          className="!bg-card/90 !border-border rounded-lg"
          nodeStrokeWidth={2}
          zoomable
          pannable
        />
        <Panel position="top-left" className="flex max-w-[min(100%,420px)] flex-col gap-2 rounded-lg border border-border bg-card/95 p-3 shadow-md backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            System map
          </p>
          <p className="text-sm text-foreground">
            Drag nodes to rearrange. Triggers and Temporal workflow types are pre-populated above the core
            services row. Draw new links between handles to propose wiring. Orange dashed = proposed; solid
            primary = documented baseline. Palette nodes and proposed edges can be removed with Backspace or
            Delete when selected; baseline nodes and edges cannot.
          </p>
          {proposedCount > 0 ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {proposedCount} proposed connection{proposedCount === 1 ? '' : 's'} not in baseline docs.
            </p>
          ) : null}
          {extraNodeCount > 0 ? (
            <p className="text-xs text-sky-600 dark:text-sky-400">
              {extraNodeCount} palette component{extraNodeCount === 1 ? '' : 's'} on the map.
            </p>
          ) : null}
          <label className="flex cursor-pointer items-center gap-2 text-xs text-foreground">
            <input
              type="checkbox"
              className="rounded border-input"
              checked={instantSave}
              onChange={(e) => setInstantSave(e.target.checked)}
            />
            <span>
              <strong>Live save</strong> — debounced write to repo while you drag or connect (needs write secret
              below)
            </span>
          </label>
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" className={cn(toolbarBtn, 'bg-secondary text-secondary-foreground hover:bg-secondary/80')} onClick={resetBaseline}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              Reset
            </button>
            <button type="button" className={cn(toolbarBtn, 'bg-secondary text-secondary-foreground hover:bg-secondary/80')} onClick={exportLocal}>
              <Download className="mr-1 h-3.5 w-3.5" />
              Export JSON
            </button>
            <button type="button" className={cn(toolbarBtn, 'bg-primary text-primary-foreground hover:bg-primary/90')} onClick={saveToRepo} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />}
              Save to repo
            </button>
            <button type="button" className={cn(toolbarBtn, 'bg-destructive text-destructive-foreground hover:bg-destructive/90')} onClick={applyScripts} disabled={applying}>
              {applying ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Play className="mr-1 h-3.5 w-3.5" />}
              Apply & rebuild
            </button>
          </div>
        </Panel>
        <Panel position="top-right" className="max-h-[min(70vh,520px)] w-[min(100%,280px)] overflow-hidden rounded-lg border border-border bg-card/95 shadow-md backdrop-blur">
          <div className="border-b border-border px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Palette</p>
            <p className="text-[11px] text-muted-foreground">Drag onto the map or use Add.</p>
          </div>
          <p className="px-2 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Workflows &amp; triggers
          </p>
          <ul className="max-h-[120px] space-y-1 overflow-y-auto px-2 pb-1">
            {WORKFLOW_PALETTE_ITEMS.map((item) => (
              <li
                key={item.slug}
                className="flex items-center gap-1 rounded-md border border-transparent bg-muted/40 px-2 py-1.5 text-xs hover:border-border"
              >
                <span
                  draggable
                  onDragStart={(ev) => {
                    ev.dataTransfer.setData('application/reactflow', paletteDragPayload(item));
                    ev.dataTransfer.effectAllowed = 'move';
                  }}
                  className="min-w-0 flex-1 cursor-grab truncate font-medium active:cursor-grabbing"
                  title={item.sub}
                >
                  {item.label}
                </span>
                <button
                  type="button"
                  className="shrink-0 rounded bg-secondary px-2 py-0.5 text-[10px] font-medium hover:bg-secondary/80"
                  onClick={() => addPaletteItem(item)}
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
          <p className="px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Services</p>
          <ul className="max-h-[180px] space-y-1 overflow-y-auto p-2">
            {PALETTE_ITEMS.map((item) => (
              <li
                key={item.slug}
                className="flex items-center gap-1 rounded-md border border-transparent bg-muted/40 px-2 py-1.5 text-xs hover:border-border"
              >
                <span
                  draggable
                  onDragStart={(ev) => {
                    ev.dataTransfer.setData('application/reactflow', paletteDragPayload(item));
                    ev.dataTransfer.effectAllowed = 'move';
                  }}
                  className="min-w-0 flex-1 cursor-grab truncate font-medium active:cursor-grabbing"
                  title={item.sub}
                >
                  {item.label}
                </span>
                <button
                  type="button"
                  className="shrink-0 rounded bg-secondary px-2 py-0.5 text-[10px] font-medium hover:bg-secondary/80"
                  onClick={() => addPaletteItem(item)}
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-border">
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold text-foreground hover:bg-muted/50"
              onClick={() => setSuggestionsOpen((o) => !o)}
            >
              Suggestions preview
              <span className="text-muted-foreground">{suggestionsOpen ? '−' : '+'}</span>
            </button>
            {suggestionsOpen ? (
              <div className="max-h-[200px] overflow-auto border-t border-border bg-muted/20 px-2 py-2">
                <pre className="whitespace-pre-wrap break-words font-mono text-[10px] leading-snug text-muted-foreground">
                  {suggestionsMd}
                </pre>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Full markdown is written on <strong>Save to repo</strong> as{' '}
                  <code className="rounded bg-muted px-0.5">wiring-suggestions.md</code>.
                </p>
              </div>
            ) : null}
          </div>
        </Panel>
        <Panel position="bottom-center" className="m-2 flex items-center gap-2 rounded-lg border border-border bg-card/95 px-3 py-2 text-xs shadow-md">
          <label className="text-muted-foreground" htmlFor="arch-secret">
            Optional write secret
          </label>
          <input
            id="arch-secret"
            type="password"
            autoComplete="off"
            placeholder="Matches ARCHITECTURE_WRITE_SECRET"
            className="h-8 w-48 rounded-md border border-input bg-background px-2 font-mono text-xs"
            onChange={(e) => {
              const v = e.target.value.trim();
              if (v) sessionStorage.setItem('architecture_write_secret', v);
              else sessionStorage.removeItem('architecture_write_secret');
            }}
          />
        </Panel>
      </ReactFlow>
    </div>
  );
}

export function ArchitectureCanvas() {
  return (
    <ReactFlowProvider>
      <ArchitectureCanvasInner />
    </ReactFlowProvider>
  );
}
