'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layers3, RefreshCw } from 'lucide-react';
import api, { PageTemplateSummary } from '@/lib/api';
import { useLatestAbortController } from '@/hooks/use-latest-abort-controller';

export default function TemplatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [scope, setScope] = useState<'own' | 'workspace'>(
    searchParams.get('scope') === 'own' ? 'own' : 'workspace'
  );
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [templates, setTemplates] = useState<PageTemplateSummary[]>([]);
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get('page') || 1)));
  const pageSize = 9;
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { nextSignal } = useLatestAbortController();

  const loadTemplates = useCallback(async () => {
    const signal = nextSignal();
    setLoading(true);
    setError(null);
    try {
      const result = await api.getPageTemplates(
        scope,
        true,
        pageSize,
        (page - 1) * pageSize,
        category,
        { signal }
      );
      setTemplates(result.data || []);
      setTotal(result.pagination.total);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [scope, page, category, nextSignal]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (scope !== 'workspace') params.set('scope', scope);
    if (category) params.set('category', category);
    if (page > 1) params.set('page', String(page));
    const query = params.toString();
    router.replace(query ? `?${query}` : '?');
  }, [scope, page, category, router]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Page Templates</h1>
          <p className="text-sm text-muted-foreground">
            Browse your own templates or all workspace templates.
          </p>
        </div>
        <button
          onClick={() => void loadTemplates()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted/40 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

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
      <div className="flex items-center gap-2">
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
        >
          <option value="">All categories</option>
          <option value="lead_generation">Lead generation</option>
          <option value="sales">Sales</option>
          <option value="webinar">Webinar</option>
          <option value="ecommerce">Ecommerce</option>
          <option value="affiliate">Affiliate</option>
          <option value="review">Review</option>
          <option value="comparison">Comparison</option>
          <option value="template">Template</option>
        </select>
      </div>

      {error && <div className="rounded-lg bg-destructive/10 text-destructive px-4 py-3 text-sm">{error}</div>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p className="text-sm text-muted-foreground col-span-full">Loading templates...</p>
        ) : templates.length === 0 ? (
          <p className="text-sm text-muted-foreground col-span-full">No templates found for this scope.</p>
        ) : (
          templates.map((template) => (
            <div key={template.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-foreground">{template.name}</h3>
                <span className="text-[10px] uppercase px-2 py-0.5 rounded border border-border text-muted-foreground">
                  {template.category}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2 min-h-[40px]">
                {template.description || 'No description'}
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Layers3 className="w-3.5 h-3.5" />
                {template.isPublic ? 'Public' : 'Private'}
              </div>
            </div>
          ))
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
