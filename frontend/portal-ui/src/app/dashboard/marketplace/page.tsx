'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Store, RefreshCw, Download, Power, PowerOff, Trash2, Rocket, Archive, PlusCircle,
} from 'lucide-react';
import api, { MarketplaceApp, UserAppInstall } from '@/lib/api';
import { isDemoUser, DEMO_MARKETPLACE_APPS } from '@/lib/demo';
import { useHydratedDemoUser } from '@/hooks/use-hydrated-demo-user';
import { getStoredUser, isAdmin, isDeveloper } from '@/lib/auth';
import { cn } from '@/lib/utils';

export default function MarketplacePage() {
  const demoUi = useHydratedDemoUser();
  const [apps, setApps] = useState<MarketplaceApp[]>([]);
  const [installs, setInstalls] = useState<UserAppInstall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'browse' | 'installs' | 'publish'>('browse');
  const [busy, setBusy] = useState<string | number | null>(null);

  const user = typeof window !== 'undefined' ? getStoredUser() : null;
  const canPublish = isAdmin(user) || isDeveloper(user);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (isDemoUser()) {
        setApps(DEMO_MARKETPLACE_APPS);
        setInstalls([]);
      } else {
        const [a, i] = await Promise.all([api.getMarketplaceApps(1, 100), api.getMyAppInstalls()]);
        setApps(a.data);
        setInstalls(i.data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load marketplace');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const installByAppId = useMemo(() => {
    const m = new Map<number, UserAppInstall>();
    installs.forEach((x) => m.set(x.app_id, x));
    return m;
  }, [installs]);

  async function doInstall(app: MarketplaceApp) {
    if (isDemoUser()) {
      setInstalls((prev) => [
        ...prev,
        {
          id: Date.now(),
          user_id: 0,
          app_id: app.id,
          status: 'installed',
          installed_at: new Date().toISOString(),
          slug: app.slug,
          name: app.name,
          description: app.description,
          category: app.category,
          version: app.version,
          app_status: app.status,
        },
      ]);
      return;
    }
    setBusy(`in-${app.id}`);
    try {
      await api.installMarketplaceApp(app.id);
      const i = await api.getMyAppInstalls();
      setInstalls(i.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Install failed');
    } finally {
      setBusy(null);
    }
  }

  async function doActivate(ins: UserAppInstall) {
    if (isDemoUser()) {
      setInstalls((prev) => prev.map((x) => (x.id === ins.id ? { ...x, status: 'active' as const } : x)));
      return;
    }
    setBusy(`ac-${ins.id}`);
    try {
      await api.activateAppInstall(ins.id);
      const i = await api.getMyAppInstalls();
      setInstalls(i.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Activate failed');
    } finally {
      setBusy(null);
    }
  }

  async function doDeactivate(ins: UserAppInstall) {
    if (isDemoUser()) {
      setInstalls((prev) => prev.map((x) => (x.id === ins.id ? { ...x, status: 'disabled' as const } : x)));
      return;
    }
    setBusy(`de-${ins.id}`);
    try {
      await api.deactivateAppInstall(ins.id);
      const i = await api.getMyAppInstalls();
      setInstalls(i.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Deactivate failed');
    } finally {
      setBusy(null);
    }
  }

  async function doUninstall(ins: UserAppInstall) {
    if (isDemoUser()) {
      setInstalls((prev) => prev.filter((x) => x.id !== ins.id));
      return;
    }
    setBusy(`un-${ins.id}`);
    try {
      await api.uninstallAppInstall(ins.id);
      const i = await api.getMyAppInstalls();
      setInstalls(i.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Uninstall failed');
    } finally {
      setBusy(null);
    }
  }

  async function doPublish(app: MarketplaceApp) {
    if (isDemoUser()) {
      setApps((prev) => prev.map((a) => (a.id === app.id ? { ...a, status: 'published' as const } : a)));
      return;
    }
    setBusy(`pub-${app.id}`);
    try {
      await api.publishMarketplaceApp(app.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setBusy(null);
    }
  }

  async function doArchive(app: MarketplaceApp) {
    if (isDemoUser()) {
      setApps((prev) => prev.map((a) => (a.id === app.id ? { ...a, status: 'archived' as const } : a)));
      return;
    }
    setBusy(`arc-${app.id}`);
    try {
      await api.archiveMarketplaceApp(app.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Archive failed');
    } finally {
      setBusy(null);
    }
  }

  const [newApp, setNewApp] = useState({ slug: '', name: '', description: '', category: 'general' });

  async function createDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!newApp.slug.trim() || !newApp.name.trim()) return;
    if (isDemoUser()) {
      setApps((prev) => [
        {
          id: Date.now(),
          slug: newApp.slug,
          name: newApp.name,
          description: newApp.description || null,
          publisher_id: user?.id ?? 0,
          publisher_username: user?.username,
          category: newApp.category,
          version: '0.1.0',
          status: 'draft',
          manifest: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setNewApp({ slug: '', name: '', description: '', category: 'general' });
      return;
    }
    setBusy('create');
    try {
      await api.createMarketplaceApp({
        slug: newApp.slug.trim(),
        name: newApp.name.trim(),
        description: newApp.description || undefined,
        category: newApp.category,
      });
      setNewApp({ slug: '', name: '', description: '', category: 'general' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6 pb-8 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Store className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />
            App Marketplace
            {demoUi && (
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                Demo
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Install and activate extensions. Developers can publish drafts when ready.
          </p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="p-2 rounded-lg border border-border hover:bg-muted/40"
          aria-label="Refresh"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      {error && (
        <div className="rounded-lg px-4 py-3 text-sm bg-red-500/10 border border-red-500/30 text-red-400">{error}</div>
      )}

      <div className="flex flex-wrap gap-2">
        {(['browse', 'installs', 'publish'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
              tab === t
                ? 'border-primary text-primary bg-primary/10'
                : 'border-border text-muted-foreground hover:text-foreground'
            )}
          >
            {t === 'browse' ? 'Browse' : t === 'installs' ? 'My installs' : 'Publisher'}
          </button>
        ))}
      </div>

      {tab === 'browse' && (
        <div className="grid gap-4 sm:grid-cols-2">
          {loading ? (
            <p className="text-sm text-muted-foreground col-span-full">Loading apps…</p>
          ) : (
            apps
              .filter((a) => a.status === 'published' || (canPublish && a.status !== 'archived'))
              .map((app) => {
                const ins = installByAppId.get(app.id);
                const canInstallHere = app.status === 'published';
                return (
                  <div
                    key={app.id}
                    className="rounded-xl border border-border p-4 space-y-3"
                    style={{ background: 'hsl(var(--card))' }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">{app.name}</h3>
                        <p className="text-[11px] text-muted-foreground">
                          v{app.version} · {app.category}
                          {app.publisher_username && ` · @${app.publisher_username}`}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border',
                          app.status === 'published' && 'border-green-500/40 text-green-400',
                          app.status === 'draft' && 'border-amber-500/40 text-amber-400'
                        )}
                      >
                        {app.status}
                      </span>
                    </div>
                    {app.description && <p className="text-xs text-muted-foreground line-clamp-3">{app.description}</p>}
                    <div className="flex flex-wrap gap-2">
                      {canInstallHere && !ins && (
                        <button
                          type="button"
                          disabled={busy === `in-${app.id}`}
                          onClick={() => doInstall(app)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground"
                        >
                          <Download className="w-3.5 h-3.5" /> Install
                        </button>
                      )}
                      {ins && (
                        <>
                          <span className="text-xs text-muted-foreground self-center">Installed · {ins.status}</span>
                          {ins.status !== 'active' && (
                            <button
                              type="button"
                              disabled={busy === `ac-${ins.id}`}
                              onClick={() => doActivate(ins)}
                              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-green-500/40 text-green-400"
                            >
                              <Power className="w-3 h-3" /> Activate
                            </button>
                          )}
                          {ins.status === 'active' && (
                            <button
                              type="button"
                              disabled={busy === `de-${ins.id}`}
                              onClick={() => doDeactivate(ins)}
                              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-border"
                            >
                              <PowerOff className="w-3 h-3" /> Deactivate
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busy === `un-${ins.id}`}
                            onClick={() => doUninstall(ins)}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg text-red-400"
                          >
                            <Trash2 className="w-3 h-3" /> Remove
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
          )}
        </div>
      )}

      {tab === 'installs' && (
        <div className="rounded-xl border border-border overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
          <div className="px-4 py-3 border-b border-border text-sm font-semibold">Your installations</div>
          {installs.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No apps installed yet. Browse the catalog to add some.</p>
          ) : (
            <ul className="divide-y divide-border">
              {installs.map((ins) => (
                <li key={ins.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{ins.name ?? ins.slug}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {ins.status} · {ins.version}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {ins.status !== 'active' && (
                      <button
                        type="button"
                        disabled={busy === `ac-${ins.id}`}
                        onClick={() => doActivate(ins)}
                        className="text-xs px-2 py-1 rounded-lg border border-green-500/40 text-green-400"
                      >
                        Activate
                      </button>
                    )}
                    {ins.status === 'active' && (
                      <button
                        type="button"
                        disabled={busy === `de-${ins.id}`}
                        onClick={() => doDeactivate(ins)}
                        className="text-xs px-2 py-1 rounded-lg border border-border"
                      >
                        Deactivate
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy === `un-${ins.id}`}
                      onClick={() => doUninstall(ins)}
                      className="text-xs px-2 py-1 rounded-lg text-red-400"
                    >
                      Uninstall
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'publish' && (
        <div className="space-y-6">
          {!canPublish && !demoUi ? (
            <p className="text-sm text-muted-foreground">Publisher tools are available to developers and admins.</p>
          ) : (
            <>
              <form onSubmit={createDraft} className="rounded-xl border border-border p-4 space-y-3" style={{ background: 'hsl(var(--card))' }}>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <PlusCircle className="w-4 h-4" /> New app (draft)
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    required
                    placeholder="slug (unique)"
                    value={newApp.slug}
                    onChange={(e) => setNewApp((n) => ({ ...n, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                    className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  />
                  <input
                    required
                    placeholder="Display name"
                    value={newApp.name}
                    onChange={(e) => setNewApp((n) => ({ ...n, name: e.target.value }))}
                    className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  />
                </div>
                <input
                  placeholder="Description"
                  value={newApp.description}
                  onChange={(e) => setNewApp((n) => ({ ...n, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                />
                <button
                  type="submit"
                  disabled={busy === 'create'}
                  className="text-sm font-semibold px-4 py-2 rounded-lg bg-primary text-primary-foreground"
                >
                  {busy === 'create' ? 'Saving…' : 'Create draft'}
                </button>
              </form>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Your drafts & lifecycle</h3>
                {apps
                  .filter((a) => {
                    if (isAdmin(user)) return true;
                    return isDeveloper(user) && a.publisher_id === user?.id;
                  })
                  .map((app) => (
                    <div
                      key={app.id}
                      className="rounded-lg border border-border p-3 flex flex-wrap items-center justify-between gap-2"
                      style={{ background: 'hsl(var(--card))' }}
                    >
                      <div>
                        <p className="text-sm font-medium">{app.name}</p>
                        <p className="text-[11px] text-muted-foreground">{app.slug} · {app.status}</p>
                      </div>
                      <div className="flex gap-2">
                        {(app.status === 'draft' || app.status === 'archived') && (
                          <button
                            type="button"
                            disabled={busy === `pub-${app.id}`}
                            onClick={() => doPublish(app)}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-green-600/20 text-green-400"
                          >
                            <Rocket className="w-3 h-3" /> Publish
                          </button>
                        )}
                        {app.status === 'published' && (
                          <button
                            type="button"
                            disabled={busy === `arc-${app.id}`}
                            onClick={() => doArchive(app)}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-border"
                          >
                            <Archive className="w-3 h-3" /> Archive
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
