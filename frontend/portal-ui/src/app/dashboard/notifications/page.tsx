'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, RefreshCw, Trash2, CheckCheck } from 'lucide-react';
import api, { NotificationRow } from '@/lib/api';
import { isDemoUser, DEMO_NOTIFICATIONS } from '@/lib/demo';
import { useHydratedDemoUser } from '@/hooks/use-hydrated-demo-user';
import { getStoredUser, isAdmin } from '@/lib/auth';
import { cn, formatRelativeTime } from '@/lib/utils';

export default function NotificationsPage() {
  const demoUi = useHydratedDemoUser();
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const user = typeof window !== 'undefined' ? getStoredUser() : null;
  const admin = isAdmin(user);

  const [broadcast, setBroadcast] = useState({ user_id: '', title: '', body: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (isDemoUser()) {
        setRows([...DEMO_NOTIFICATIONS].sort((a, b) => b.created_at.localeCompare(a.created_at)));
      } else {
        const res = await api.getNotifications(1, 100);
        setRows(res.data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function markRead(n: NotificationRow) {
    if (isDemoUser()) {
      setRows((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      return;
    }
    try {
      await api.markNotificationRead(n.id);
      await load();
    } catch {
      /* ignore */
    }
  }

  async function remove(n: NotificationRow) {
    if (isDemoUser()) {
      setRows((prev) => prev.filter((x) => x.id !== n.id));
      return;
    }
    try {
      await api.deleteNotification(n.id);
      await load();
    } catch {
      /* ignore */
    }
  }

  async function readAll() {
    if (isDemoUser()) {
      setRows((prev) => prev.map((x) => ({ ...x, read: true })));
      return;
    }
    try {
      await api.markAllNotificationsRead();
      await load();
    } catch {
      /* ignore */
    }
  }

  async function sendBroadcast(e: React.FormEvent) {
    e.preventDefault();
    const uid = parseInt(broadcast.user_id, 10);
    if (!uid || !broadcast.title.trim()) return;
    try {
      await api.adminCreateNotification({
        user_id: uid,
        title: broadcast.title.trim(),
        body: broadcast.body || undefined,
        type: 'system',
      });
      setBroadcast({ user_id: '', title: '', body: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
    }
  }

  return (
    <div className="space-y-6 pb-8 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />
            Notifications
            {demoUi && (
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                Demo
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Inbox, read state, and admin broadcast.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={readAll}
            className="p-2 rounded-lg border border-border hover:bg-muted/40 text-muted-foreground"
            title="Mark all read"
          >
            <CheckCheck className="w-4 h-4" />
          </button>
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
      </div>

      {error && (
        <div className="rounded-lg px-4 py-3 text-sm bg-red-500/10 border border-red-500/30 text-red-400">{error}</div>
      )}

      {admin && !demoUi && (
        <form
          onSubmit={sendBroadcast}
          className="rounded-xl border border-border p-4 space-y-3"
          style={{ background: 'hsl(var(--card))' }}
        >
          <h2 className="text-sm font-semibold text-foreground">Send notification (admin)</h2>
          <input
            type="number"
            min={1}
            placeholder="Target user ID"
            value={broadcast.user_id}
            onChange={(e) => setBroadcast((b) => ({ ...b, user_id: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
          />
          <input
            placeholder="Title"
            value={broadcast.title}
            onChange={(e) => setBroadcast((b) => ({ ...b, title: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
          />
          <textarea
            placeholder="Body (optional)"
            value={broadcast.body}
            onChange={(e) => setBroadcast((b) => ({ ...b, body: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm min-h-[80px]"
          />
          <button type="submit" className="text-sm font-semibold px-4 py-2 rounded-lg bg-primary text-primary-foreground">
            Deliver to user
          </button>
        </form>
      )}

      <div className="rounded-xl border border-border overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No notifications.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((n) => (
              <li
                key={n.id}
                className={cn('px-4 py-3 flex gap-3 items-start', !n.read && 'bg-primary/5')}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{n.title}</p>
                  {n.body && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{n.body}</p>}
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {n.type} · {formatRelativeTime(n.created_at)}
                  </p>
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  {!n.read && (
                    <button
                      type="button"
                      onClick={() => markRead(n)}
                      className="text-[11px] px-2 py-1 rounded border border-border hover:bg-muted/50"
                    >
                      Mark read
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(n)}
                    className="text-[11px] px-2 py-1 rounded text-red-400 hover:bg-red-500/10 inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
