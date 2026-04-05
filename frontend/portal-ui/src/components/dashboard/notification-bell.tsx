'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import api, { NotificationRow } from '@/lib/api';
import { isDemoUser, DEMO_NOTIFICATIONS } from '@/lib/demo';
import { getToken } from '@/lib/auth';
import { cn, formatRelativeTime } from '@/lib/utils';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    if (token === 'demo-token' || isDemoUser()) {
      const demo = DEMO_NOTIFICATIONS;
      setCount(demo.filter((n) => !n.read).length);
      setItems([...demo].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 8));
      return;
    }
    setLoading(true);
    try {
      const [c, list] = await Promise.all([
        api.getUnreadNotificationCount(),
        api.getNotifications(1, 8),
      ]);
      setCount(c.count);
      setItems(list.data);
    } catch {
      setCount(0);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  async function onMarkRead(n: NotificationRow) {
    if (isDemoUser() || getToken() === 'demo-token') {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setCount((c) => Math.max(0, c - (n.read ? 0 : 1)));
      return;
    }
    try {
      await api.markNotificationRead(n.id);
      await load();
    } catch {
      /* ignore */
    }
  }

  async function onClearAll() {
    if (isDemoUser() || getToken() === 'demo-token') {
      setItems((prev) => prev.map((x) => ({ ...x, read: true })));
      setCount(0);
      return;
    }
    try {
      await api.markAllNotificationsRead();
      await load();
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg border border-border hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="w-4 h-4" />
        {count > 0 && (
          <span
            className="absolute top-1 right-1 min-w-[14px] h-3.5 px-0.5 rounded-full text-[9px] font-bold flex items-center justify-center"
            style={{ background: 'hsl(var(--destructive))', color: 'hsl(var(--destructive-foreground))' }}
          >
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default" aria-label="Close" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-11 w-80 max-h-[min(70vh,420px)] rounded-xl border border-border shadow-xl z-50 flex flex-col overflow-hidden"
            style={{ background: 'hsl(var(--popover))' }}
          >
            <div className="px-3 py-2.5 border-b border-border flex items-center justify-between gap-2 flex-shrink-0">
              <span className="text-sm font-semibold text-foreground">Notifications</span>
              <button
                type="button"
                onClick={onClearAll}
                className="text-[11px] text-primary hover:underline disabled:opacity-50"
                disabled={loading || count === 0}
              >
                Mark all read
              </button>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-border thin-scrollbar">
              {loading && items.length === 0 ? (
                <p className="p-4 text-xs text-muted-foreground text-center">Loading…</p>
              ) : items.length === 0 ? (
                <p className="p-4 text-xs text-muted-foreground text-center">No notifications</p>
              ) : (
                items.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => onMarkRead(n)}
                    className={cn(
                      'w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors',
                      !n.read && 'bg-primary/5'
                    )}
                  >
                    <p className="text-xs font-semibold text-foreground leading-snug">{n.title}</p>
                    {n.body && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">{formatRelativeTime(n.created_at)}</p>
                  </button>
                ))
              )}
            </div>
            <div className="p-2 border-t border-border flex-shrink-0">
              <Link
                href="/dashboard/notifications"
                onClick={() => setOpen(false)}
                className="block text-center text-xs font-medium py-2 rounded-lg hover:bg-muted/60 text-primary"
              >
                View all
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
