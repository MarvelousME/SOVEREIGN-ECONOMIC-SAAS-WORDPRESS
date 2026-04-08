'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CalendarClock,
  Link as LinkIcon,
  PlusCircle,
  RefreshCw,
  Send,
  ShieldAlert,
  Unplug,
} from 'lucide-react';
import {
  SocialAccount,
  SocialPost,
  SocialProvider,
  cancelSocialPost,
  createSocialPost,
  getResolvedTenantAndUser,
  listSocialAccounts,
  listSocialPosts,
  startSocialOAuth,
} from '@/lib/workspace-social-api';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import { useLatestAbortController } from '@/hooks/use-latest-abort-controller';

const TENANT_ID_KEY = 'portal.tenantId';
const USER_ID_KEY = 'portal.socialUserId';
type VisibilityScope = 'own' | 'workspace';

const PROVIDERS: SocialProvider[] = ['x', 'linkedin', 'facebook', 'tiktok'];

export default function SocialDistributionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolved = useMemo(() => getResolvedTenantAndUser(), []);
  const [tenantId, setTenantId] = useState(resolved.tenantId);
  const [userId, setUserId] = useState(resolved.userId);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [scope, setScope] = useState<VisibilityScope>(
    searchParams.get('scope') === 'workspace' ? 'workspace' : 'own'
  );
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get('page') || 1)));
  const pageSize = 10;
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [pageId, setPageId] = useState('');
  const [socialAccountId, setSocialAccountId] = useState('');
  const [text, setText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const { nextSignal } = useLatestAbortController();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedTenant = localStorage.getItem(TENANT_ID_KEY);
    const savedUser = localStorage.getItem(USER_ID_KEY);
    if (savedTenant) setTenantId(savedTenant);
    if (savedUser) setUserId(savedUser);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (tenantId) localStorage.setItem(TENANT_ID_KEY, tenantId);
    if (userId) localStorage.setItem(USER_ID_KEY, userId);
  }, [tenantId, userId]);

  const loadData = useCallback(async () => {
    if (!tenantId || !userId) return;
    const signal = nextSignal();
    setLoading(true);
    setError(null);
    try {
      const [a, p] = await Promise.all([
        listSocialAccounts(tenantId, userId, { signal }),
        listSocialPosts(tenantId, userId, scope, pageSize, (page - 1) * pageSize, { signal }),
      ]);
      setAccounts(a);
      setPosts(p.data || []);
      setTotal(Number(p.pagination?.total || 0));
      if (!socialAccountId && a.length > 0) {
        setSocialAccountId(a[0].id);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Failed to load social data');
    } finally {
      setLoading(false);
    }
  }, [tenantId, userId, socialAccountId, scope, page, nextSignal]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (scope !== 'own') params.set('scope', scope);
    if (page > 1) params.set('page', String(page));
    const query = params.toString();
    router.replace(query ? `?${query}` : '?');
  }, [scope, page, router]);

  const onStartOAuth = async (provider: SocialProvider) => {
    setError(null);
    setSuccess(null);
    try {
      const response = await startSocialOAuth(provider, tenantId, userId);
      window.open(response.authUrl, '_blank', 'noopener,noreferrer');
      setSuccess(`OAuth opened for ${provider}. Complete provider auth, then refresh.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to start ${provider} OAuth`);
    }
  };

  const onCreatePost = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await createSocialPost(
        {
          pageId,
          socialAccountId,
          text,
          linkUrl,
          scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
        },
        tenantId,
        userId
      );
      setSuccess('Social post queued successfully.');
      setText('');
      setLinkUrl('');
      setScheduledFor('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create social post');
    }
  };

  const onCancelPost = async (postId: string) => {
    setError(null);
    setSuccess(null);
    try {
      await cancelSocialPost(postId, tenantId, userId);
      setSuccess('Post cancelled.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel post');
    }
  };

  const scopedPosts = posts;

  const scheduledCount = scopedPosts.filter((p) => p.status === 'scheduled').length;
  const publishedCount = scopedPosts.filter((p) => p.status === 'published').length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Social Distribution</h1>
          <p className="text-sm text-muted-foreground">
            Connect social accounts and manage queued/scheduled post publishing.
          </p>
        </div>
        <button
          onClick={() => void loadData()}
          disabled={loading || !tenantId || !userId}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted/40 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h2 className="font-semibold text-foreground">Context</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Tenant ID
            <input
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value.trim())}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="text-sm">
            User ID
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value.trim())}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          These are used for `x-tenant-id` and `x-user-id` request headers required by the social service.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Connected accounts</p>
          <p className="text-2xl font-bold">{accounts.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Scheduled posts</p>
          <p className="text-2xl font-bold">{scheduledCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Published posts</p>
          <p className="text-2xl font-bold">{publishedCount}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h2 className="font-semibold text-foreground">Connect Social Account</h2>
        <div className="flex flex-wrap gap-2">
          {PROVIDERS.map((provider) => (
            <button
              key={provider}
              onClick={() => void onStartOAuth(provider)}
              disabled={!tenantId || !userId}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm capitalize hover:bg-muted/40 disabled:opacity-50"
            >
              <LinkIcon className="w-4 h-4" />
              Connect {provider}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground inline-flex items-start gap-2">
          <ShieldAlert className="w-3.5 h-3.5 mt-0.5" />
          If account linking does not complete, check social OAuth redirect + proxy header forwarding.
        </p>
      </div>

      <form onSubmit={onCreatePost} className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h2 className="font-semibold text-foreground inline-flex items-center gap-2">
          <PlusCircle className="w-4 h-4" />
          Queue Social Post
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Page ID
            <input
              required
              value={pageId}
              onChange={(e) => setPageId(e.target.value.trim())}
              placeholder="landing page UUID"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Social Account
            <select
              required
              value={socialAccountId}
              onChange={(e) => setSocialAccountId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
            >
              <option value="">Select account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.provider}: {a.displayName || a.accountRef}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block text-sm">
          Post Text
          <textarea
            required
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
            placeholder="Your campaign message"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Link URL
            <input
              required
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://your-domain.com/landing-page"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Schedule (optional)
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={!tenantId || !userId || !accounts.length}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          Queue Post
        </button>
      </form>

      {error && <div className="rounded-lg bg-destructive/10 text-destructive px-4 py-3 text-sm">{error}</div>}
      {success && <div className="rounded-lg bg-green-500/10 text-green-400 px-4 py-3 text-sm">{success}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-semibold text-foreground mb-3">Connected Accounts</h2>
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No connected accounts yet.</p>
          ) : (
            <ul className="space-y-2">
              {accounts.map((account) => (
                <li key={account.id} className="rounded-lg border border-border p-3">
                  <p className="font-medium capitalize">{account.provider}</p>
                  <p className="text-sm text-muted-foreground">{account.displayName || account.accountRef}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Added {formatRelativeTime(account.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="font-semibold text-foreground">Recent Posts</h2>
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
          {scopedPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No social posts yet.</p>
          ) : (
            <ul className="space-y-2">
              {scopedPosts.map((post) => {
                const cancellable = ['queued', 'scheduled', 'retrying'].includes(post.status);
                return (
                  <li key={post.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium capitalize">{post.provider}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {post.status.toUpperCase()} · {formatRelativeTime(post.createdAt)}
                        </p>
                        {post.scheduledFor && (
                          <p className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-1">
                            <CalendarClock className="w-3.5 h-3.5" />
                            {formatDate(post.scheduledFor)}
                          </p>
                        )}
                      </div>
                      {cancellable && (
                        <button
                          onClick={() => void onCancelPost(post.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border text-xs hover:bg-muted/40"
                        >
                          <Unplug className="w-3.5 h-3.5" />
                          Cancel
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-foreground mt-2 line-clamp-2">{post.text}</p>
                    <a
                      href={post.linkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary hover:underline mt-1 inline-block"
                    >
                      {post.linkUrl}
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
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
