'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MailPlus, RefreshCw, Users, CheckCircle2, Clock3 } from 'lucide-react';
import {
  WorkspaceRole,
  WorkspaceInvitation,
  acceptWorkspaceInvite,
  createWorkspaceInvite,
  listWorkspaceInvites,
} from '@/lib/workspace-social-api';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import { useLatestAbortController } from '@/hooks/use-latest-abort-controller';

const WORKSPACE_ID_KEY = 'portal.workspaceId';
type VisibilityScope = 'own' | 'workspace';

export default function WorkspaceTeamPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [workspaceId, setWorkspaceId] = useState('');
  const [invites, setInvites] = useState<WorkspaceInvitation[]>([]);
  const [scope, setScope] = useState<VisibilityScope>(
    searchParams.get('scope') === 'workspace' ? 'workspace' : 'own'
  );
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get('page') || 1)));
  const pageSize = 10;
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceRole>('member');
  const [ttlHours, setTtlHours] = useState<number>(72);
  const [acceptToken, setAcceptToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { nextSignal } = useLatestAbortController();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(WORKSPACE_ID_KEY);
    if (saved) setWorkspaceId(saved);
  }, []);

  useEffect(() => {
    if (!workspaceId || typeof window === 'undefined') return;
    localStorage.setItem(WORKSPACE_ID_KEY, workspaceId);
  }, [workspaceId]);

  const loadInvites = useCallback(async () => {
    if (!workspaceId) return;
    const signal = nextSignal();
    setLoading(true);
    setError(null);
    try {
      const result = await listWorkspaceInvites(workspaceId, scope, pageSize, (page - 1) * pageSize, { signal });
      setInvites(result.data || []);
      setTotal(Number(result.pagination?.total || 0));
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Failed to load invites');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, scope, page, nextSignal]);

  useEffect(() => {
    void loadInvites();
  }, [loadInvites]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (scope !== 'own') params.set('scope', scope);
    if (page > 1) params.set('page', String(page));
    const query = params.toString();
    router.replace(query ? `?${query}` : '?');
  }, [scope, page, router]);

  const scopedInvites = invites;

  const onCreateInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!workspaceId) {
      setError('Workspace ID is required');
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await createWorkspaceInvite(workspaceId, { email, role, ttlHours });
      setSuccess(
        result.inviteLink
          ? `Invite created. Share this link: ${result.inviteLink}`
          : `Invite created. Token: ${result.token}`
      );
      setEmail('');
      await loadInvites();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invite');
    } finally {
      setSubmitting(false);
    }
  };

  const onAcceptInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!acceptToken.trim()) {
      setError('Invite token is required');
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await acceptWorkspaceInvite(acceptToken.trim());
      setSuccess(`Invite accepted. Joined workspace ${result.workspaceId}.`);
      setAcceptToken('');
      if (result.workspaceId === workspaceId) {
        await loadInvites();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invite');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Workspace Team</h1>
          <p className="text-sm text-muted-foreground">
            Invite members and manage workspace-specific access.
          </p>
        </div>
        <button
          onClick={() => void loadInvites()}
          disabled={loading || !workspaceId}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted/40 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Total invites</p>
          <p className="text-2xl font-bold">{scopedInvites.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Pending invites</p>
          <p className="text-2xl font-bold">
            {scopedInvites.filter((invite) => !invite.acceptedAt && new Date(invite.expiresAt).getTime() > Date.now()).length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Accepted invites</p>
          <p className="text-2xl font-bold">{scopedInvites.filter((invite) => invite.acceptedAt).length}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <label className="text-sm font-medium text-foreground">
          Workspace ID
          <input
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value.trim())}
            placeholder="UUID workspace id"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <p className="text-xs text-muted-foreground">
          This page works against the Business Builder workspace invite APIs.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={onCreateInvite} className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="font-semibold text-foreground inline-flex items-center gap-2">
            <MailPlus className="w-4 h-4" />
            Create Invite
          </h2>

          <label className="block text-sm">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              placeholder="teammate@company.com"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              Role
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as WorkspaceRole)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              >
                <option value="member">member</option>
                <option value="admin">admin</option>
                <option value="owner">owner</option>
              </select>
            </label>
            <label className="block text-sm">
              TTL (hours)
              <input
                type="number"
                min={1}
                max={24 * 30}
                value={ttlHours}
                onChange={(e) => setTtlHours(Number(e.target.value) || 72)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting || !workspaceId}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
          >
            <MailPlus className="w-4 h-4" />
            Send Invite
          </button>
        </form>

        <form onSubmit={onAcceptInvite} className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="font-semibold text-foreground inline-flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Accept Invite Token
          </h2>
          <label className="block text-sm">
            Token
            <input
              value={acceptToken}
              onChange={(e) => setAcceptToken(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              placeholder="paste invite token"
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
          >
            <Users className="w-4 h-4" />
            Accept Invite
          </button>
        </form>
      </div>

      {error && <div className="rounded-lg bg-destructive/10 text-destructive px-4 py-3 text-sm">{error}</div>}
      {success && <div className="rounded-lg bg-green-500/10 text-green-400 px-4 py-3 text-sm break-all">{success}</div>}

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="font-semibold text-foreground">Invitations</h2>
          <div className="inline-flex rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setScope('own');
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs ${scope === 'own' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-muted/40'}`}
            >
              Own
            </button>
            <button
              type="button"
              onClick={() => {
                setScope('workspace');
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs ${scope === 'workspace' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-muted/40'}`}
            >
              Workspace-wide
            </button>
          </div>
        </div>
        {!workspaceId ? (
          <p className="text-sm text-muted-foreground">Set a workspace ID to load invites.</p>
        ) : loading ? (
          <p className="text-sm text-muted-foreground">Loading invites...</p>
        ) : scopedInvites.length === 0 ? (
          <p className="text-sm text-muted-foreground">No invites yet.</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-border">
                  <th className="py-2 pr-2">Email</th>
                  <th className="py-2 pr-2">Role</th>
                  <th className="py-2 pr-2">Status</th>
                  <th className="py-2 pr-2">Created</th>
                  <th className="py-2">Expires</th>
                </tr>
              </thead>
              <tbody>
                {scopedInvites.map((invite) => {
                  const isExpired = new Date(invite.expiresAt).getTime() < Date.now();
                  return (
                    <tr key={invite.id} className="border-b border-border/60">
                      <td className="py-2 pr-2">{invite.invitedEmail}</td>
                      <td className="py-2 pr-2 uppercase">{invite.role}</td>
                      <td className="py-2 pr-2">
                        {invite.acceptedAt ? (
                          <span className="inline-flex items-center gap-1 text-green-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Accepted
                          </span>
                        ) : isExpired ? (
                          <span className="text-destructive">Expired</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-yellow-400">
                            <Clock3 className="w-3.5 h-3.5" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-2">{formatRelativeTime(invite.createdAt)}</td>
                      <td className="py-2">{formatDate(invite.expiresAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {total === 0
            ? 'No results'
            : `Showing ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} of ${total}`}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded border border-border px-2 py-1 disabled:opacity-50"
          >
            Prev
          </button>
          <span>Page {page} / {Math.max(1, Math.ceil(total / pageSize))}</span>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={page * pageSize >= total}
            className="rounded border border-border px-2 py-1 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
