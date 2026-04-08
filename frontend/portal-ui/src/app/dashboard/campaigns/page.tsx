'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Briefcase, RefreshCw, AlertTriangle, ChevronsDown, ChevronsUp, Plus } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import api, { CampaignBusiness, LandingPage } from '@/lib/api';
import { useLatestAbortController } from '@/hooks/use-latest-abort-controller';
import {
  createSocialPost,
  createCampaignOrchestration,
  CreateCampaignRequest,
  CampaignExecutionSummary,
  CampaignStateEvent,
  CampaignOrchestration,
  CampaignNextAction,
  listSocialAccounts,
  SocialAccount,
  getCampaignExecutionSummary,
  listCampaignStateEvents,
  listCampaignOrchestrations,
  transitionCampaignStatus,
  updateCampaignOrchestration,
} from '@/lib/workspace-social-api';

const nextActionLabel: Record<CampaignNextAction, string> = {
  link_social_posts: 'Link social posts',
  schedule_posts: 'Schedule posts',
  resume_execution: 'Resume execution',
  investigate_failures: 'Investigate failures',
  archive_campaign: 'Archive campaign',
  monitor_progress: 'Monitor progress',
};

export default function CampaignsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [scope, setScope] = useState<'own' | 'workspace'>(
    searchParams.get('scope') === 'own' ? 'own' : 'workspace'
  );
  const [campaigns, setCampaigns] = useState<CampaignOrchestration[]>([]);
  const [summaries, setSummaries] = useState<Record<string, CampaignExecutionSummary>>({});
  const [events, setEvents] = useState<Record<string, CampaignStateEvent[]>>({});
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(searchParams.get('open'));
  const [transitioningCampaignId, setTransitioningCampaignId] = useState<string | null>(null);
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [businessOptions, setBusinessOptions] = useState<CampaignBusiness[]>([]);
  const [pageOptions, setPageOptions] = useState<LandingPage[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [createForm, setCreateForm] = useState<CreateCampaignRequest>({
    name: '',
    description: '',
    objective: '',
    budget: undefined,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('q') || '');
  const [sortBy, setSortBy] = useState<'updated' | 'name' | 'progress'>(
    searchParams.get('sort') === 'name' || searchParams.get('sort') === 'progress'
      ? (searchParams.get('sort') as 'name' | 'progress')
      : 'updated'
  );
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get('page') || 1)));
  const pageSize = 10;
  const [hasNextPage, setHasNextPage] = useState(false);
  const [total, setTotal] = useState(0);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [editDraftByCampaign, setEditDraftByCampaign] = useState<
    Record<string, { name: string; description: string; objective: string; budget: string; saving?: boolean }>
  >({});
  const [composerByCampaign, setComposerByCampaign] = useState<
    Record<string, { socialAccountId: string; text: string; linkUrl: string; scheduledFor: string; sending?: boolean }>
  >({});
  const { nextSignal } = useLatestAbortController();

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  const businessById = useMemo(
    () => Object.fromEntries(businessOptions.map((business) => [business.id, business])),
    [businessOptions]
  );
  const pageById = useMemo(
    () => Object.fromEntries(pageOptions.map((page) => [String(page.id), page])),
    [pageOptions]
  );
  const loadCampaigns = useCallback(async () => {
    const signal = nextSignal();
    setLoading(true);
    setError(null);
    try {
      const campaignResult = await listCampaignOrchestrations(
        scope,
        pageSize,
        (page - 1) * pageSize,
        debouncedSearch,
        sortBy,
        { signal }
      );
      const campaignList = campaignResult.data || [];
      setCampaigns(campaignList || []);
      const serverTotal = Number(campaignResult.pagination?.total || 0);
      setTotal(serverTotal);
      setHasNextPage((page - 1) * pageSize + campaignList.length < serverTotal);

      const summaryEntries = await Promise.all(
        (campaignList || []).map(async (campaign) => {
          try {
            const summary = await getCampaignExecutionSummary(campaign.id);
            return [campaign.id, summary] as const;
          } catch {
            return [campaign.id, null] as const;
          }
        })
      );
      const nextSummaryMap: Record<string, CampaignExecutionSummary> = {};
      summaryEntries.forEach(([id, summary]) => {
        if (summary) nextSummaryMap[id] = summary;
      });
      setSummaries(nextSummaryMap);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, [scope, page, debouncedSearch, sortBy, nextSignal]);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    const loadLinkOptions = async () => {
      const [businessResult, pageResult, socialAccountsResult] = await Promise.allSettled([
        api.getCampaigns('workspace', 100, 0),
        api.getPages('workspace'),
        listSocialAccounts(),
      ]);

      if (businessResult.status === 'fulfilled') {
        setBusinessOptions(businessResult.value.data || []);
      } else {
        setBusinessOptions([]);
      }

      if (pageResult.status === 'fulfilled') {
        setPageOptions(pageResult.value.data || []);
      } else {
        setPageOptions([]);
      }
      if (socialAccountsResult.status === 'fulfilled') {
        setSocialAccounts(socialAccountsResult.value || []);
      } else {
        setSocialAccounts([]);
      }
    };

    void loadLinkOptions();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (scope !== 'workspace') params.set('scope', scope);
    if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
    if (sortBy !== 'updated') params.set('sort', sortBy);
    if (page > 1) params.set('page', String(page));
    if (expandedCampaignId) params.set('open', expandedCampaignId);
    const query = params.toString();
    router.replace(query ? `?${query}` : '?');
  }, [scope, debouncedSearch, sortBy, page, expandedCampaignId, router]);

  useEffect(() => {
    if ((createForm.objective || '').trim()) return;

    const linkedBusiness = createForm.businessId ? businessById[createForm.businessId] : undefined;
    const linkedPage = createForm.pageId ? pageById[createForm.pageId] : undefined;
    if (!linkedBusiness && !linkedPage) return;

    const objectiveParts: string[] = [];
    if (linkedBusiness?.name) {
      objectiveParts.push(`Drive growth for ${linkedBusiness.name}`);
    }
    if (linkedPage?.title) {
      objectiveParts.push(`promote page "${linkedPage.title}"`);
    }
    const inferred = objectiveParts.join(' and ');
    if (!inferred) return;

    setCreateForm((prev) => {
      if ((prev.objective || '').trim()) return prev;
      return { ...prev, objective: inferred };
    });
  }, [businessById, pageById, createForm.businessId, createForm.pageId, createForm.objective]);

  const loadCampaignEvents = useCallback(async (campaignId: string) => {
    try {
      const stateEvents = await listCampaignStateEvents(campaignId);
      setEvents((prev) => ({ ...prev, [campaignId]: stateEvents }));
    } catch {
      setEvents((prev) => ({ ...prev, [campaignId]: [] }));
    }
  }, []);

  useEffect(() => {
    if (!expandedCampaignId) return;
    if (events[expandedCampaignId]) return;
    void loadCampaignEvents(expandedCampaignId);
  }, [expandedCampaignId, events, loadCampaignEvents]);

  const toggleExpand = useCallback(
    async (campaignId: string) => {
      if (expandedCampaignId === campaignId) {
        setExpandedCampaignId(null);
        return;
      }
      setExpandedCampaignId(campaignId);
      if (!events[campaignId]) {
        await loadCampaignEvents(campaignId);
      }
    },
    [expandedCampaignId, events, loadCampaignEvents]
  );

  const getAllowedTransitions = useCallback((status: string): Array<{ to: string; label: string }> => {
    if (status === 'draft') return [{ to: 'ready', label: 'Mark Ready' }, { to: 'archived', label: 'Archive' }];
    if (status === 'ready') return [{ to: 'scheduled', label: 'Schedule' }, { to: 'running', label: 'Run Now' }];
    if (status === 'scheduled') return [{ to: 'running', label: 'Start' }, { to: 'paused', label: 'Pause' }];
    if (status === 'running') return [{ to: 'paused', label: 'Pause' }, { to: 'completed', label: 'Complete' }];
    if (status === 'paused') return [{ to: 'running', label: 'Resume' }, { to: 'failed', label: 'Mark Failed' }];
    if (status === 'failed') return [{ to: 'draft', label: 'Reset to Draft' }];
    if (status === 'completed') return [{ to: 'archived', label: 'Archive' }];
    return [];
  }, []);

  const handleTransition = useCallback(
    async (campaign: CampaignOrchestration, toStatus: string) => {
      setTransitioningCampaignId(campaign.id);
      setError(null);
      const previousStatus = campaign.status;
      setCampaigns((prev) =>
        prev.map((c) => (c.id === campaign.id ? { ...c, status: toStatus as CampaignOrchestration['status'] } : c))
      );
      try {
        const requiresReason = toStatus === 'failed' || toStatus === 'archived' || toStatus === 'completed';
        const reason = requiresReason
          ? window.prompt(`Optional reason for transition to "${toStatus}"`, '') || undefined
          : undefined;
        await transitionCampaignStatus(campaign.id, toStatus as CampaignOrchestration['status'], reason);
        const [updatedSummary, updatedEvents] = await Promise.all([
          getCampaignExecutionSummary(campaign.id),
          listCampaignStateEvents(campaign.id),
        ]);
        setSummaries((prev) => ({ ...prev, [campaign.id]: updatedSummary }));
        setEvents((prev) => ({ ...prev, [campaign.id]: updatedEvents }));
      } catch (err) {
        setCampaigns((prev) =>
          prev.map((c) => (c.id === campaign.id ? { ...c, status: previousStatus } : c))
        );
        setError(err instanceof Error ? err.message : 'Failed to transition campaign');
      } finally {
        setTransitioningCampaignId(null);
      }
    },
    []
  );

  const handleCreateCampaign = useCallback(async () => {
    if (!createForm.name?.trim()) {
      setError('Campaign name is required');
      return;
    }
    setCreatingCampaign(true);
    setError(null);
    try {
      const created = await createCampaignOrchestration({
        ...createForm,
        name: createForm.name.trim(),
        description: createForm.description?.trim() || undefined,
        objective: createForm.objective?.trim() || undefined,
      });
      setCampaigns((prev) => [created, ...prev]);
      try {
        const summary = await getCampaignExecutionSummary(created.id);
        setSummaries((prev) => ({ ...prev, [created.id]: summary }));
      } catch {
        // no summary yet
      }
      setCreateForm({ name: '', description: '', objective: '', budget: undefined });
      setCreateOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
    } finally {
      setCreatingCampaign(false);
    }
  }, [createForm]);

  const handleCreateSocialPost = useCallback(
    async (campaign: CampaignOrchestration) => {
      const composer = composerByCampaign[campaign.id];
      if (!composer?.socialAccountId || !composer?.text.trim() || !composer?.linkUrl.trim()) {
        setError('Social account, text, and link URL are required to create a post');
        return;
      }
      if (!campaign.pageId) {
        setError('Campaign must be linked to a page before creating a social post');
        return;
      }

      setComposerByCampaign((prev) => ({
        ...prev,
        [campaign.id]: { ...composer, sending: true },
      }));
      setError(null);
      try {
        await createSocialPost({
          pageId: campaign.pageId,
          campaignId: campaign.id,
          socialAccountId: composer.socialAccountId,
          text: composer.text.trim(),
          linkUrl: composer.linkUrl.trim(),
          scheduledFor: composer.scheduledFor || undefined,
        });
        const summary = await getCampaignExecutionSummary(campaign.id);
        setSummaries((prev) => ({ ...prev, [campaign.id]: summary }));
        setComposerByCampaign((prev) => ({
          ...prev,
          [campaign.id]: {
            socialAccountId: '',
            text: '',
            linkUrl: composer.linkUrl,
            scheduledFor: '',
            sending: false,
          },
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create social post');
        setComposerByCampaign((prev) => ({
          ...prev,
          [campaign.id]: { ...composer, sending: false },
        }));
      }
    },
    [composerByCampaign]
  );

  const startEditingCampaign = useCallback((campaign: CampaignOrchestration) => {
    setEditingCampaignId(campaign.id);
    setEditDraftByCampaign((prev) => ({
      ...prev,
      [campaign.id]: {
        name: campaign.name || '',
        description: campaign.description || '',
        objective: campaign.objective || '',
        budget: campaign.budget !== undefined ? String(campaign.budget) : '',
      },
    }));
  }, []);

  const handleSaveCampaign = useCallback(async (campaign: CampaignOrchestration) => {
    const draft = editDraftByCampaign[campaign.id];
    if (!draft) return;
    setEditDraftByCampaign((prev) => ({
      ...prev,
      [campaign.id]: { ...draft, saving: true },
    }));
    setError(null);
    try {
      const updated = await updateCampaignOrchestration(campaign.id, {
        name: draft.name.trim() || campaign.name,
        description: draft.description.trim() || undefined,
        objective: draft.objective.trim() || undefined,
        budget: draft.budget.trim() === '' ? undefined : Number(draft.budget),
      });
      setCampaigns((prev) => prev.map((c) => (c.id === campaign.id ? { ...c, ...updated } : c)));
      setEditingCampaignId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save campaign');
    } finally {
      setEditDraftByCampaign((prev) => ({
        ...prev,
        [campaign.id]: { ...prev[campaign.id], saving: false },
      }));
    }
  }, [editDraftByCampaign]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campaigns</h1>
          <p className="text-sm text-muted-foreground">
            Workspace business/campaign list with ownership scope controls.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCreateOpen((v) => !v)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted/40"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </button>
          <button
            onClick={() => void loadCampaigns()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted/40 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {createOpen && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Create Campaign</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={createForm.name || ''}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Campaign name"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              value={createForm.objective || ''}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, objective: e.target.value }))}
              placeholder="Objective (optional)"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              value={createForm.description || ''}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Description (optional)"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm sm:col-span-2"
            />
            <select
              value={createForm.businessId || ''}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  businessId: e.target.value || undefined,
                }))
              }
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Link business (optional)</option>
              {businessOptions.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>
            <select
              value={createForm.pageId || ''}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  pageId: e.target.value || undefined,
                }))
              }
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Link page (optional)</option>
              {pageOptions.map((page) => (
                <option key={page.id} value={String(page.id)}>
                  {page.title}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              value={createForm.budget ?? ''}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  budget: e.target.value === '' ? undefined : Number(e.target.value),
                }))
              }
              placeholder="Budget (optional)"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleCreateCampaign()}
              disabled={creatingCampaign}
              className="rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm disabled:opacity-50"
            >
              {creatingCampaign ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/40"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="inline-flex rounded-lg border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => setScope('own')}
          className={`px-3 py-1.5 text-xs ${scope === 'own' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-muted/40'}`}
        >
          Own
        </button>
        <button
          type="button"
          onClick={() => setScope('workspace')}
          className={`px-3 py-1.5 text-xs ${scope === 'workspace' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-muted/40'}`}
        >
          Workspace-wide
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search campaigns..."
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
        />
        <select
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value as typeof sortBy);
            setPage(1);
          }}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
        >
          <option value="updated">Sort: Recently updated</option>
          <option value="name">Sort: Name</option>
          <option value="progress">Sort: Progress</option>
        </select>
        {search !== debouncedSearch && (
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Searching...
          </span>
        )}
      </div>

      {error && <div className="rounded-lg bg-destructive/10 text-destructive px-4 py-3 text-sm">{error}</div>}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border text-sm font-semibold">Campaign Listing</div>
        {loading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading campaigns...</p>
        ) : campaigns.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No campaigns found for this scope.</p>
        ) : (
          <ul className="divide-y divide-border">
            {campaigns.map((campaign) => (
              <li key={campaign.id} className="px-4 py-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">{campaign.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {campaign.description || 'No description'}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {campaign.businessId && (
                        <span className="inline-flex rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          Business: {businessById[campaign.businessId]?.name || campaign.businessId}
                        </span>
                      )}
                      {campaign.pageId && (
                        <span className="inline-flex rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          Page: {pageById[campaign.pageId]?.title || campaign.pageId}
                        </span>
                      )}
                    </div>
                    {summaries[campaign.id] && (
                      <div className="mt-2 space-y-1">
                        <div className="w-full h-1.5 rounded-full bg-muted/60 overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${Math.min(100, Math.max(0, summaries[campaign.id].progressPercent))}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span>{summaries[campaign.id].progressPercent}% published</span>
                          <span>•</span>
                          <span>{summaries[campaign.id].socialPostCounts.published}/{summaries[campaign.id].socialPostCounts.total} posts</span>
                          <span>•</span>
                          <span>Next: {nextActionLabel[summaries[campaign.id].nextAction]}</span>
                        </div>
                        {summaries[campaign.id].hasFailures && (
                          <div className="inline-flex items-center gap-1 text-[11px] text-amber-500">
                            <AlertTriangle className="w-3 h-3" />
                            {summaries[campaign.id].lastFailureReason || 'Failures detected in execution'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Briefcase className="w-3.5 h-3.5" />
                      {campaign.status}
                    </span>
                    <span className="text-muted-foreground">{formatRelativeTime(campaign.updatedAt || campaign.createdAt)}</span>
                    <button
                      type="button"
                      onClick={() => void toggleExpand(campaign.id)}
                      className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-muted-foreground hover:bg-muted/40"
                    >
                      {expandedCampaignId === campaign.id ? <ChevronsUp className="w-3.5 h-3.5" /> : <ChevronsDown className="w-3.5 h-3.5" />}
                      Details
                    </button>
                  </div>
                </div>

                {expandedCampaignId === campaign.id && (
                  <div className="rounded-lg border border-border bg-background/50 p-3 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {getAllowedTransitions(campaign.status).map((action) => (
                        <button
                          key={action.to}
                          type="button"
                          onClick={() => void handleTransition(campaign, action.to)}
                          disabled={transitioningCampaignId === campaign.id}
                          className="rounded border border-border px-2 py-1 text-xs hover:bg-muted/40 disabled:opacity-50"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-foreground mb-2">Timeline</p>
                      {(events[campaign.id] || []).length === 0 ? (
                        <p className="text-xs text-muted-foreground">No state events recorded yet.</p>
                      ) : (
                        <ul className="space-y-1">
                          {(events[campaign.id] || []).slice(0, 6).map((event) => (
                            <li key={event.id} className="text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">{event.fromStatus}</span>
                              {' -> '}
                              <span className="font-medium text-foreground">{event.toStatus}</span>
                              {' • '}
                              {formatRelativeTime(event.createdAt)}
                              {event.reason ? ` • ${event.reason}` : ''}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-foreground">Campaign Metadata</p>
                        {editingCampaignId !== campaign.id ? (
                          <button
                            type="button"
                            onClick={() => startEditingCampaign(campaign)}
                            className="rounded border border-border px-2 py-1 text-xs hover:bg-muted/40"
                          >
                            Edit
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void handleSaveCampaign(campaign)}
                              disabled={Boolean(editDraftByCampaign[campaign.id]?.saving)}
                              className="rounded border border-border px-2 py-1 text-xs hover:bg-muted/40 disabled:opacity-50"
                            >
                              {editDraftByCampaign[campaign.id]?.saving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCampaignId(null)}
                              className="rounded border border-border px-2 py-1 text-xs hover:bg-muted/40"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                      {editingCampaignId === campaign.id ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input
                            value={editDraftByCampaign[campaign.id]?.name || ''}
                            onChange={(e) =>
                              setEditDraftByCampaign((prev) => ({
                                ...prev,
                                [campaign.id]: { ...prev[campaign.id], name: e.target.value },
                              }))
                            }
                            className="rounded border border-border bg-background px-2 py-1 text-xs"
                            placeholder="Campaign name"
                          />
                          <input
                            value={editDraftByCampaign[campaign.id]?.objective || ''}
                            onChange={(e) =>
                              setEditDraftByCampaign((prev) => ({
                                ...prev,
                                [campaign.id]: { ...prev[campaign.id], objective: e.target.value },
                              }))
                            }
                            className="rounded border border-border bg-background px-2 py-1 text-xs"
                            placeholder="Objective"
                          />
                          <input
                            value={editDraftByCampaign[campaign.id]?.description || ''}
                            onChange={(e) =>
                              setEditDraftByCampaign((prev) => ({
                                ...prev,
                                [campaign.id]: { ...prev[campaign.id], description: e.target.value },
                              }))
                            }
                            className="rounded border border-border bg-background px-2 py-1 text-xs sm:col-span-2"
                            placeholder="Description"
                          />
                          <input
                            type="number"
                            value={editDraftByCampaign[campaign.id]?.budget || ''}
                            onChange={(e) =>
                              setEditDraftByCampaign((prev) => ({
                                ...prev,
                                [campaign.id]: { ...prev[campaign.id], budget: e.target.value },
                              }))
                            }
                            className="rounded border border-border bg-background px-2 py-1 text-xs"
                            placeholder="Budget"
                          />
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Objective: {campaign.objective || 'None'} • Budget:{' '}
                          {campaign.budget !== undefined ? campaign.budget : 'None'}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-foreground">Create Social Post</p>
                      {!campaign.pageId && (
                        <p className="text-xs text-amber-500">
                          Link a page to this campaign to enable quick social posting.
                        </p>
                      )}
                      <div className="grid gap-2 sm:grid-cols-2">
                        <select
                          value={composerByCampaign[campaign.id]?.socialAccountId || ''}
                          onChange={(e) =>
                            setComposerByCampaign((prev) => ({
                              ...prev,
                              [campaign.id]: {
                                socialAccountId: e.target.value,
                                text: prev[campaign.id]?.text || '',
                                linkUrl: prev[campaign.id]?.linkUrl || '',
                                scheduledFor: prev[campaign.id]?.scheduledFor || '',
                                sending: prev[campaign.id]?.sending || false,
                              },
                            }))
                          }
                          className="rounded border border-border bg-background px-2 py-1 text-xs"
                          disabled={!campaign.pageId}
                        >
                          <option value="">Select social account</option>
                          {socialAccounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.provider}{account.displayName ? ` - ${account.displayName}` : ''}
                            </option>
                          ))}
                        </select>
                        <input
                          value={composerByCampaign[campaign.id]?.linkUrl || ''}
                          onChange={(e) =>
                            setComposerByCampaign((prev) => ({
                              ...prev,
                              [campaign.id]: {
                                socialAccountId: prev[campaign.id]?.socialAccountId || '',
                                text: prev[campaign.id]?.text || '',
                                linkUrl: e.target.value,
                                scheduledFor: prev[campaign.id]?.scheduledFor || '',
                                sending: prev[campaign.id]?.sending || false,
                              },
                            }))
                          }
                          placeholder="https://example.com"
                          className="rounded border border-border bg-background px-2 py-1 text-xs"
                          disabled={!campaign.pageId}
                        />
                        <input
                          value={composerByCampaign[campaign.id]?.text || ''}
                          onChange={(e) =>
                            setComposerByCampaign((prev) => ({
                              ...prev,
                              [campaign.id]: {
                                socialAccountId: prev[campaign.id]?.socialAccountId || '',
                                text: e.target.value,
                                linkUrl: prev[campaign.id]?.linkUrl || '',
                                scheduledFor: prev[campaign.id]?.scheduledFor || '',
                                sending: prev[campaign.id]?.sending || false,
                              },
                            }))
                          }
                          placeholder="Post text"
                          className="rounded border border-border bg-background px-2 py-1 text-xs sm:col-span-2"
                          disabled={!campaign.pageId}
                        />
                        <input
                          type="datetime-local"
                          value={composerByCampaign[campaign.id]?.scheduledFor || ''}
                          onChange={(e) =>
                            setComposerByCampaign((prev) => ({
                              ...prev,
                              [campaign.id]: {
                                socialAccountId: prev[campaign.id]?.socialAccountId || '',
                                text: prev[campaign.id]?.text || '',
                                linkUrl: prev[campaign.id]?.linkUrl || '',
                                scheduledFor: e.target.value,
                                sending: prev[campaign.id]?.sending || false,
                              },
                            }))
                          }
                          className="rounded border border-border bg-background px-2 py-1 text-xs"
                          disabled={!campaign.pageId}
                        />
                        <button
                          type="button"
                          onClick={() => void handleCreateSocialPost(campaign)}
                          disabled={!campaign.pageId || composerByCampaign[campaign.id]?.sending}
                          className="rounded border border-border px-2 py-1 text-xs hover:bg-muted/40 disabled:opacity-50"
                        >
                          {composerByCampaign[campaign.id]?.sending ? 'Creating...' : 'Create post'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
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
          <span>
            Page {page} / {Math.max(1, Math.ceil(total / pageSize))}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasNextPage}
            className="rounded border border-border px-2 py-1 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
