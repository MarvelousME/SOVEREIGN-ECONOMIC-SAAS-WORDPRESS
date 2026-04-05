'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FileCode2, Save, Play, RefreshCw, Radio, AlertTriangle } from 'lucide-react';
import api, { type EnvFileManifest, type EnvFileManifestEntry } from '@/lib/api';
import { getStoredUser, getToken, isAdmin } from '@/lib/auth';
import { isDemoUser } from '@/lib/demo';
import { cn } from '@/lib/utils';

function formatTime(ms: number | null): string {
  if (ms == null) return '—';
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return '—';
  }
}

export default function EnvFilesPage() {
  const user = getStoredUser();
  const token = typeof window !== 'undefined' ? getToken() : null;
  const demoUser = isDemoUser();
  const demoToken = token === 'demo-token';
  const blocked = demoUser || demoToken;
  const canUse = isAdmin(user) && !blocked;

  const [manifest, setManifest] = useState<EnvFileManifest | null>(null);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [loadingManifest, setLoadingManifest] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [fileMeta, setFileMeta] = useState<{ mtimeMs: number; size: number } | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [applyBusy, setApplyBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const [streamReason, setStreamReason] = useState<string | null>(null);
  const [streamAt, setStreamAt] = useState<number | null>(null);
  const [streamLive, setStreamLive] = useState(false);
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;

  const loadManifest = useCallback(async () => {
    if (!canUse) return;
    setLoadingManifest(true);
    setManifestError(null);
    try {
      const m = await api.getAdminEnvManifest();
      setManifest(m);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load manifest';
      setManifest(null);
      setManifestError(msg);
    } finally {
      setLoadingManifest(false);
    }
  }, [canUse]);

  useEffect(() => {
    void loadManifest();
  }, [loadManifest]);

  const loadFile = useCallback(
    async (id: string) => {
      if (!canUse) return;
      setLoadingFile(true);
      setToast(null);
      try {
        const f = await api.getAdminEnvFile(id);
        setContent(f.content);
        setFileMeta({ mtimeMs: f.mtimeMs, size: f.size });
        setDirty(false);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Load failed';
        setToast(msg);
        setContent('');
        setFileMeta(null);
      } finally {
        setLoadingFile(false);
      }
    },
    [canUse]
  );

  useEffect(() => {
    if (selectedId && canUse) void loadFile(selectedId);
  }, [selectedId, canUse, loadFile]);

  useEffect(() => {
    if (!canUse) return;

    const ac = new AbortController();
    let cancelled = false;

    (async () => {
      try {
        await api.consumeAdminEnvEvents(
          (msg) => {
            if (msg.type === 'connected') {
              setStreamLive(true);
              return;
            }
            if (msg.type === 'change') {
              setStreamReason(msg.reason ?? 'change');
              setStreamAt(msg.at ?? Date.now());
              void loadManifest();
              const id = selectedIdRef.current;
              if (id) void loadFile(id);
            }
          },
          { signal: ac.signal }
        );
      } catch (e) {
        if (cancelled || (e instanceof Error && e.name === 'AbortError')) return;
        setStreamLive(false);
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
      setStreamLive(false);
    };
  }, [canUse, loadManifest, loadFile]);

  const handleSelect = (entry: EnvFileManifestEntry) => {
    setSelectedId(entry.id);
  };

  const handleSave = async () => {
    if (!selectedId || !canUse) return;
    setSaveBusy(true);
    setToast(null);
    try {
      const r = await api.saveAdminEnvFile(selectedId, content);
      setFileMeta({ mtimeMs: r.mtimeMs, size: r.size });
      setDirty(false);
      setToast('Saved to disk.');
      void loadManifest();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaveBusy(false);
    }
  };

  const handleApply = async () => {
    if (!selectedId || !canUse) return;
    setApplyBusy(true);
    setToast(null);
    try {
      const r = await api.applyAdminEnvRuntime(selectedId);
      setToast(`Applied ${r.keysApplied} keys. ${r.warning}`);
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Apply failed');
    } finally {
      setApplyBusy(false);
    }
  };

  if (!isAdmin(user)) {
    return (
      <div className="max-w-lg rounded-xl border border-border p-6" style={{ background: 'hsl(var(--card))' }}>
        <h1 className="text-lg font-bold flex items-center gap-2">
          <FileCode2 className="w-5 h-5" />
          Environment files
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">You need the admin role to use this tool.</p>
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="max-w-xl space-y-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <FileCode2 className="w-6 h-6" />
          Environment files
        </h1>
        <div
          className="rounded-xl border border-yellow-500/30 p-4 text-sm flex gap-3"
          style={{ background: 'hsl(44 100% 50% / 0.06)' }}
        >
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p>
            Demo mode and demo tokens cannot call the admin env API. Sign in as a real admin (e.g.{' '}
            <code className="text-xs bg-muted px-1 rounded">admin</code> in dev) with a live JWT to edit env files.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FileCode2 className="w-6 h-6" />
            Environment files
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Edit whitelisted <code className="text-xs">.env</code> files on the server. Apply merges variables into the API
            process only; restart for DB pools and Next.js <code className="text-xs">NEXT_PUBLIC_*</code>.
          </p>
          {manifest?.root && (
            <p className="text-xs text-muted-foreground mt-2 font-mono truncate max-w-full" title={manifest.root}>
              Root: {manifest.root}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Radio className={cn('w-4 h-4', streamLive ? 'text-green-400' : 'text-muted-foreground')} />
          <span>{streamLive ? 'Live updates' : 'Stream offline'}</span>
          {streamReason && streamAt && (
            <span className="text-foreground/80">
              · Last event: {streamReason} @ {formatTime(streamAt)}
            </span>
          )}
        </div>
      </div>

      {manifestError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          <p className="font-medium text-destructive">Could not load env manifest</p>
          <p className="text-muted-foreground mt-1">{manifestError}</p>
          <p className="text-xs text-muted-foreground mt-2">
            If the API returned 404, set <code className="bg-muted px-1 rounded">ENABLE_ADMIN_ENV_EDITOR=1</code> on the API
            and restart it.
          </p>
          <button
            type="button"
            onClick={() => void loadManifest()}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {toast && (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-2 text-sm" role="status">
          {toast}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-4 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Files</h2>
            <button
              type="button"
              onClick={() => void loadManifest()}
              disabled={loadingManifest}
              className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground"
              title="Refresh list"
            >
              <RefreshCw className={cn('w-4 h-4', loadingManifest && 'animate-spin')} />
            </button>
          </div>
          <ul className="rounded-xl border border-border overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
            {(manifest?.files ?? []).map((f) => {
              const active = selectedId === f.id;
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(f)}
                    className={cn(
                      'w-full text-left px-3 py-2.5 text-sm border-b border-border last:border-0 transition-colors',
                      active ? 'bg-primary/15 text-foreground' : 'hover:bg-muted/40 text-muted-foreground'
                    )}
                  >
                    <span className="font-mono text-xs break-all">{f.id}</span>
                    <span className="block text-[10px] mt-0.5">
                      {f.exists ? (
                        <>
                          {formatTime(f.mtimeMs)} · {(f.size ?? 0).toLocaleString()} B
                        </>
                      ) : (
                        <span className="text-amber-500/90">Missing — will be created on save</span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="lg:col-span-8 space-y-3">
          {!selectedId ? (
            <p className="text-sm text-muted-foreground">Select a file to edit.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <h2 className="text-sm font-semibold font-mono truncate">{selectedId}</h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saveBusy || loadingFile || !dirty}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                    style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleApply()}
                    disabled={applyBusy || loadingFile}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted/40"
                  >
                    <Play className="w-4 h-4" />
                    Apply to API process
                  </button>
                </div>
              </div>
              {fileMeta && (
                <p className="text-xs text-muted-foreground">
                  On disk: {formatTime(fileMeta.mtimeMs)} · {fileMeta.size.toLocaleString()} B
                </p>
              )}
              <textarea
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  setDirty(true);
                }}
                disabled={loadingFile}
                spellCheck={false}
                className="w-full min-h-[320px] rounded-xl border border-border bg-background/50 p-3 font-mono text-xs leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder={loadingFile ? 'Loading…' : 'File content'}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
