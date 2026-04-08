'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, LandingPage } from '@/lib/api';
import { useLatestAbortController } from '@/hooks/use-latest-abort-controller';
import { cn, formatDate, formatRelativeTime } from '@/lib/utils';
import { 
  Plus, 
  FileText, 
  Eye, 
  Edit3, 
  RotateCcw, 
  Trash2,
  Globe,
  Clock,
  CheckCircle,
  Archive,
  FileEdit,
  RefreshCw,
} from 'lucide-react';

const statusConfig = {
  draft: { label: 'Draft', class: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: FileEdit },
  published: { label: 'Published', class: 'bg-green-500/10 text-green-500 border-green-500/20', icon: CheckCircle },
  archived: { label: 'Archived', class: 'bg-gray-500/10 text-gray-500 border-gray-500/20', icon: Archive },
};

function StatusBadge({ status }: { status: keyof typeof statusConfig }) {
  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border', config.class)}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

export default function PagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [scope, setScope] = useState<'own' | 'workspace'>(
    searchParams.get('scope') === 'own' ? 'own' : 'workspace'
  );
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('q') || '');
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get('page') || 1)));
  const pageSize = 10;
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { nextSignal } = useLatestAbortController();

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  const loadPages = useCallback(async () => {
    const signal = nextSignal();
    setLoading(true);
    setError(null);
    try {
      const res = await api.getPages(scope, page, pageSize, debouncedSearch, { signal });
      setPages(res.data);
      setTotal(res.pagination.total);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Failed to load pages');
    } finally {
      setLoading(false);
    }
  }, [scope, page, debouncedSearch, nextSignal]);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (scope !== 'workspace') params.set('scope', scope);
    if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
    if (page > 1) params.set('page', String(page));
    const query = params.toString();
    router.replace(query ? `?${query}` : '?');
  }, [scope, page, debouncedSearch, router]);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this page? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await api.deletePage(id);
      setPages(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRollback = async (id: number) => {
    if (!confirm('Rollback to previous version?')) return;
    try {
      const res = await api.rollbackPage(id, 1);
      setPages(prev => prev.map(p => p.id === id ? res : p));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to rollback');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Landing Pages</h1>
          <p className="text-sm text-muted-foreground">Manage your landing pages</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="inline-flex rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setScope('own');
                setPage(1);
              }}
              className={`px-3 py-2 text-xs ${scope === 'own' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/40'}`}
            >
              Own
            </button>
            <button
              type="button"
              onClick={() => {
                setScope('workspace');
                setPage(1);
              }}
              className={`px-3 py-2 text-xs ${scope === 'workspace' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/40'}`}
            >
              Workspace-wide
            </button>
          </div>
          <Link
            href="/dashboard/pages/generator"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            <FileText className="w-4 h-4" />
            AI Generate
          </Link>
          <Link
            href="/dashboard/pages/editor/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Create Page
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
          {error}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search pages..."
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        {search !== debouncedSearch && (
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Searching...
          </span>
        )}
      </div>

      {pages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-card rounded-lg border">
          <FileText className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No pages yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Create your first landing page</p>
          <Link
            href="/dashboard/pages/editor/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            Create Page
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {pages.map((page) => (
            <div
              key={page.id}
              className="p-4 bg-card rounded-lg border hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold truncate">{page.title}</h3>
                    <StatusBadge status={page.status} />
                  </div>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {page.description || 'No description'}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Updated {formatRelativeTime(page.updated_at)}
                    </span>
                    {page.published_at && (
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        Published {formatDate(page.published_at)}
                      </span>
                    )}
                    <span>/{page.slug}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {page.status === 'published' && (
                    <a
                      href={`/${page.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-accent rounded-lg transition-colors"
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </a>
                  )}
                  <Link
                    href={`/dashboard/pages/editor/${page.id}`}
                    className="p-2 hover:bg-accent rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => handleRollback(page.id)}
                    className="p-2 hover:bg-accent rounded-lg transition-colors"
                    title="Rollback"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(page.id)}
                    disabled={deletingId === page.id}
                    className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
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
