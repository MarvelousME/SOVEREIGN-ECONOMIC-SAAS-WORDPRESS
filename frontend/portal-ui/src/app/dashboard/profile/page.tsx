'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, UserRound } from 'lucide-react';
import api, { type User } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';
import { useHydratedDemoUser } from '@/hooks/use-hydrated-demo-user';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState({ username: '', email: '', wallet_address: '' });
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const demo = useHydratedDemoUser();

  useEffect(() => {
    const u = getStoredUser();
    setUser(u);
    if (u) {
      setForm({
        username: u.username ?? '',
        email: u.email ?? '',
        wallet_address: u.wallet_address ?? '',
      });
    }
    const token = localStorage.getItem('ubi_token');
    if (token && token !== 'demo-token') {
      api
        .getMe()
        .then((fresh) => {
          setUser(fresh);
          setForm({
            username: fresh.username ?? '',
            email: fresh.email ?? '',
            wallet_address: fresh.wallet_address ?? '',
          });
        })
        .catch(() => {});
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (demo) {
      setMsg({ type: 'err', text: 'Demo mode: profile is not saved to the server.' });
      return;
    }
    setLoading(true);
    try {
      const updated = await api.updateProfile({
        username: form.username.trim(),
        email: form.email.trim(),
        wallet_address: form.wallet_address.trim() || null,
      });
      setUser(updated);
      setMsg({ type: 'ok', text: 'Profile updated.' });
    } catch (err) {
      setMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Update failed',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/overview"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted/50"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2">
          <UserRound className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Profile</h1>
        </div>
      </div>

      {demo && (
        <p className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-200/90">
          You are in demo mode. Changes here stay in the browser only until you sign in with a real account.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border p-6" style={{ background: 'hsl(var(--card))' }}>
        {msg && (
          <p
            className={cn(
              'rounded-lg px-3 py-2 text-sm',
              msg.type === 'ok' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/10 text-red-300',
            )}
          >
            {msg.text}
          </p>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Username</label>
          <input
            type="text"
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
            autoComplete="username"
            required
            minLength={3}
            disabled={demo}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
            autoComplete="email"
            required
            disabled={demo}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Wallet address (optional)</label>
          <input
            type="text"
            value={form.wallet_address}
            onChange={(e) => setForm((f) => ({ ...f, wallet_address: e.target.value }))}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="0x…"
            disabled={demo}
          />
        </div>

        {user?.roles && user.roles.length > 0 && (
          <div>
            <span className="text-sm font-medium text-muted-foreground">Roles</span>
            <p className="mt-1 text-sm text-foreground">{user.roles.join(', ')}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || demo}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
