import { getStoredUser, getToken } from '@/lib/auth';

const BUSINESS_BUILDER_BASE =
  process.env.NEXT_PUBLIC_BUSINESS_BUILDER_URL || 'http://localhost:3001/api/v1';
const LANDING_FACTORY_BASE =
  process.env.NEXT_PUBLIC_LANDING_FACTORY_URL || 'http://localhost:3002/api/v1';
const ANALYTICS_BASE =
  process.env.NEXT_PUBLIC_ANALYTICS_URL || 'http://localhost:3004/analytics';

interface Envelope<T> {
  success?: boolean;
  data: T;
  error?: string;
  pagination?: {
    total?: number;
    limit?: number;
    offset?: number;
  };
}

export type WorkspaceRole = 'owner' | 'admin' | 'member';

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  invitedEmail: string;
  role: WorkspaceRole;
  expiresAt: string;
  acceptedAt?: string;
  invitedByUserId?: string;
  createdAt: string;
}

export interface WorkspaceBrandingRuntime {
  workspaceId: string;
  tenantId: string;
  themeId: string;
  themeOverrides: Record<string, string>;
  brandAssets: Record<string, string>;
  updatedBy?: string;
  updatedAt: string;
}

export type SocialProvider = 'x' | 'linkedin' | 'facebook' | 'tiktok';

export interface SocialAccount {
  id: string;
  provider: SocialProvider;
  accountRef: string;
  displayName?: string;
  status: string;
  scopes: string[];
  createdAt: string;
}

export interface SocialPost {
  id: string;
  pageId: string;
  socialAccountId: string;
  provider: SocialProvider;
  status: string;
  text: string;
  linkUrl: string;
  scheduledFor?: string;
  publishedAt?: string;
  createdAt: string;
  createdBy?: string;
}

export interface ListPagination {
  total?: number;
  limit?: number;
  offset?: number;
}

export type CampaignStatus =
  | 'draft'
  | 'ready'
  | 'scheduled'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'archived';

export interface CampaignOrchestration {
  id: string;
  tenantId: string;
  businessId?: string;
  pageId?: string;
  name: string;
  description?: string;
  objective?: string;
  budget?: number;
  status: CampaignStatus;
  startsAt?: string;
  endsAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignRequest {
  businessId?: string;
  pageId?: string;
  name: string;
  description?: string;
  objective?: string;
  budget?: number;
  startsAt?: string;
  endsAt?: string;
  metadata?: Record<string, unknown>;
}

export type CampaignNextAction =
  | 'link_social_posts'
  | 'schedule_posts'
  | 'resume_execution'
  | 'investigate_failures'
  | 'archive_campaign'
  | 'monitor_progress';

export interface CampaignExecutionSummary {
  campaignId: string;
  status: CampaignStatus;
  socialPostCounts: {
    total: number;
    queued: number;
    scheduled: number;
    publishing: number;
    published: number;
    failed: number;
    deadLetter: number;
    cancelled: number;
  };
  progressPercent: number;
  hasFailures: boolean;
  lastFailureReason?: string;
  lastStatusChangeAt?: string;
  nextAction: CampaignNextAction;
}

export interface CampaignReportKpis {
  totalPosts: number;
  publishedPosts: number;
  failedPosts: number;
  successRate: number;
  failureRate: number;
  publishThroughputPerDay: number;
}

export interface CampaignReportSummary {
  dateFrom: string;
  dateTo: string;
  daysInRange: number;
  campaignsMatched: number;
  kpis: CampaignReportKpis;
}

export interface CampaignReportRow {
  campaignId: string;
  campaignName: string;
  campaignStatus: CampaignStatus;
  ownerUserId?: string;
  updatedAt: string;
  kpis: CampaignReportKpis;
}

export interface CampaignStateEvent {
  id: string;
  campaignId: string;
  tenantId: string;
  fromStatus: CampaignStatus;
  toStatus: CampaignStatus;
  reason?: string;
  metadata: Record<string, unknown>;
  changedBy?: string;
  createdAt: string;
}

export interface AnalyticsRevenuePoint {
  label: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface AnalyticsEngagementPoint {
  label: string;
  events: number;
}

export interface AnalyticsChannelPoint {
  region: string;
  users: number;
  color: string;
}

export interface AnalyticsFunnelPoint {
  week: string;
  completed: number;
  assigned: number;
  rate: number;
}

export interface AnalyticsKpis {
  monthlyRevenue: number;
  monthlyRevenueChange: number;
  netProfit: number;
  netProfitChange: number;
  newUsers: number;
  newUsersChange: number;
  completionRate: number;
  completionRateChange: number;
}

export interface AnalyticsDashboardData {
  kpis: AnalyticsKpis;
  revenueSeries: AnalyticsRevenuePoint[];
  engagementSeries: AnalyticsEngagementPoint[];
  channelDistribution: AnalyticsChannelPoint[];
  funnelSeries: AnalyticsFunnelPoint[];
}

function buildAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extra || {}),
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function requestJson<T>(
  baseUrl: string,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, options);
  const payload = (await response.json()) as Envelope<T>;
  if (!response.ok) {
    throw new Error(payload.error || `HTTP ${response.status}`);
  }
  return payload.data;
}

export async function listWorkspaceInvites(
  workspaceId: string,
  scope: 'own' | 'workspace' = 'workspace',
  limit = 20,
  offset = 0,
  options?: { signal?: AbortSignal }
): Promise<{ data: WorkspaceInvitation[]; pagination?: ListPagination }> {
  const response = await fetch(
    `${BUSINESS_BUILDER_BASE}/workspaces/${workspaceId}/invites?scope=${encodeURIComponent(scope)}&limit=${limit}&offset=${offset}`,
    {
      method: 'GET',
      headers: buildAuthHeaders(),
      signal: options?.signal,
    }
  );
  const payload = (await response.json()) as Envelope<WorkspaceInvitation[]>;
  if (!response.ok) {
    throw new Error(payload.error || `HTTP ${response.status}`);
  }
  return { data: payload.data || [], pagination: payload.pagination };
}

export async function createWorkspaceInvite(
  workspaceId: string,
  body: { email: string; role: WorkspaceRole; ttlHours?: number }
): Promise<{ invite: WorkspaceInvitation; token: string; inviteLink?: string }> {
  return requestJson<{ invite: WorkspaceInvitation; token: string; inviteLink?: string }>(
    BUSINESS_BUILDER_BASE,
    `/workspaces/${workspaceId}/invites`,
    {
      method: 'POST',
      headers: buildAuthHeaders(),
      body: JSON.stringify(body),
    }
  );
}

export async function getWorkspaceBrandingRuntime(
  workspaceId: string,
  options?: { signal?: AbortSignal }
): Promise<WorkspaceBrandingRuntime> {
  return requestJson<WorkspaceBrandingRuntime>(BUSINESS_BUILDER_BASE, `/workspaces/${workspaceId}/branding/runtime`, {
    method: 'GET',
    headers: buildAuthHeaders(),
    signal: options?.signal,
  });
}

export async function acceptWorkspaceInvite(token: string): Promise<{ workspaceId: string }> {
  return requestJson<{ workspaceId: string }>(BUSINESS_BUILDER_BASE, '/workspaces/invites/accept', {
    method: 'POST',
    headers: buildAuthHeaders(),
    body: JSON.stringify({ token }),
  });
}

function resolveTenantAndUser(): { tenantId: string; userId: string } {
  const authUser = getStoredUser() as
    | { id?: string | number; tenantId?: string; tenant_id?: string }
    | null;
  let tenantId = authUser?.tenantId || authUser?.tenant_id || '';
  const userId = String(authUser?.id || '');

  if (!tenantId && typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('user-storage');
      if (raw) {
        const parsed = JSON.parse(raw) as {
          state?: { user?: { tenantId?: string } };
        };
        tenantId = parsed?.state?.user?.tenantId || '';
      }
    } catch {
      // ignore storage parsing issues and keep fallback empty
    }
  }

  return { tenantId, userId };
}

function socialHeaders(tenantId?: string, userId?: string): Record<string, string> {
  const resolved = resolveTenantAndUser();
  const finalTenant = tenantId || resolved.tenantId;
  const finalUser = userId || resolved.userId;
  return buildAuthHeaders({
    'x-tenant-id': finalTenant,
    'x-user-id': finalUser,
  });
}

export async function listSocialAccounts(
  tenantId?: string,
  userId?: string,
  options?: { signal?: AbortSignal }
): Promise<SocialAccount[]> {
  return requestJson<SocialAccount[]>(LANDING_FACTORY_BASE, '/social/accounts', {
    method: 'GET',
    headers: socialHeaders(tenantId, userId),
    signal: options?.signal,
  });
}

export async function startSocialOAuth(
  provider: SocialProvider,
  tenantId?: string,
  userId?: string
): Promise<{ authUrl: string }> {
  return requestJson<{ authUrl: string }>(LANDING_FACTORY_BASE, `/social/oauth/${provider}/start`, {
    method: 'GET',
    headers: socialHeaders(tenantId, userId),
  });
}

export async function listSocialPosts(
  tenantId?: string,
  userId?: string,
  scope: 'own' | 'workspace' = 'workspace',
  limit = 20,
  offset = 0,
  options?: { signal?: AbortSignal }
): Promise<{ data: SocialPost[]; pagination?: ListPagination }> {
  const response = await fetch(
    `${LANDING_FACTORY_BASE}/social/posts?scope=${encodeURIComponent(scope)}&limit=${limit}&offset=${offset}`,
    {
      method: 'GET',
      headers: socialHeaders(tenantId, userId),
      signal: options?.signal,
    }
  );
  const payload = (await response.json()) as Envelope<SocialPost[]>;
  if (!response.ok) {
    throw new Error(payload.error || `HTTP ${response.status}`);
  }
  return { data: payload.data || [], pagination: payload.pagination };
}

export async function listCampaignOrchestrations(
  scope: 'own' | 'workspace' = 'workspace',
  limit = 100,
  offset = 0,
  query = '',
  sort: 'updated' | 'name' | 'progress' = 'updated',
  options?: { signal?: AbortSignal },
  tenantId?: string,
  userId?: string
): Promise<{ data: CampaignOrchestration[]; pagination?: { total?: number; limit?: number; offset?: number } }> {
  const qs = `scope=${encodeURIComponent(scope)}&limit=${limit}&offset=${offset}&q=${encodeURIComponent(
    query
  )}&sort=${encodeURIComponent(sort)}`;
  const response = await fetch(`${LANDING_FACTORY_BASE}/campaigns?${qs}`, {
    method: 'GET',
    headers: socialHeaders(tenantId, userId),
    signal: options?.signal,
  });
  const payload = (await response.json()) as Envelope<CampaignOrchestration[]>;
  if (!response.ok) {
    throw new Error(payload.error || `HTTP ${response.status}`);
  }
  return {
    data: payload.data || [],
    pagination: payload.pagination,
  };
}

export async function createCampaignOrchestration(
  body: CreateCampaignRequest,
  tenantId?: string,
  userId?: string
): Promise<CampaignOrchestration> {
  return requestJson<CampaignOrchestration>(LANDING_FACTORY_BASE, '/campaigns', {
    method: 'POST',
    headers: socialHeaders(tenantId, userId),
    body: JSON.stringify(body),
  });
}

export async function updateCampaignOrchestration(
  campaignId: string,
  body: Partial<CreateCampaignRequest>,
  tenantId?: string,
  userId?: string
): Promise<CampaignOrchestration> {
  return requestJson<CampaignOrchestration>(LANDING_FACTORY_BASE, `/campaigns/${campaignId}`, {
    method: 'PATCH',
    headers: socialHeaders(tenantId, userId),
    body: JSON.stringify(body),
  });
}

export async function getCampaignExecutionSummary(
  campaignId: string,
  tenantId?: string,
  userId?: string
): Promise<CampaignExecutionSummary> {
  return requestJson<CampaignExecutionSummary>(LANDING_FACTORY_BASE, `/campaigns/${campaignId}/summary`, {
    method: 'GET',
    headers: socialHeaders(tenantId, userId),
  });
}

export async function listCampaignStateEvents(
  campaignId: string,
  tenantId?: string,
  userId?: string
): Promise<CampaignStateEvent[]> {
  return requestJson<CampaignStateEvent[]>(LANDING_FACTORY_BASE, `/campaigns/${campaignId}/events`, {
    method: 'GET',
    headers: socialHeaders(tenantId, userId),
  });
}

export async function transitionCampaignStatus(
  campaignId: string,
  toStatus: CampaignStatus,
  reason?: string,
  tenantId?: string,
  userId?: string
): Promise<CampaignOrchestration> {
  return requestJson<CampaignOrchestration>(LANDING_FACTORY_BASE, `/campaigns/${campaignId}/transition`, {
    method: 'POST',
    headers: socialHeaders(tenantId, userId),
    body: JSON.stringify({ toStatus, reason }),
  });
}

export async function getCampaignReport(
  params: {
    scope?: 'own' | 'workspace';
    ownerId?: string;
    from?: string;
    to?: string;
    q?: string;
    sort?: 'updated' | 'name' | 'throughput' | 'success_rate' | 'failure_rate';
    direction?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  } = {},
  options?: { signal?: AbortSignal },
  tenantId?: string,
  userId?: string
): Promise<{
  summary: CampaignReportSummary;
  rows: CampaignReportRow[];
  pagination?: ListPagination;
}> {
  const query = new URLSearchParams();
  if (params.scope) query.set('scope', params.scope);
  if (params.ownerId) query.set('ownerId', params.ownerId);
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  if (params.q) query.set('q', params.q);
  if (params.sort) query.set('sort', params.sort);
  if (params.direction) query.set('direction', params.direction);
  if (typeof params.limit === 'number') query.set('limit', String(params.limit));
  if (typeof params.offset === 'number') query.set('offset', String(params.offset));

  const response = await fetch(`${LANDING_FACTORY_BASE}/campaigns/reports?${query.toString()}`, {
    method: 'GET',
    headers: socialHeaders(tenantId, userId),
    signal: options?.signal,
  });
  const payload = (await response.json()) as Envelope<CampaignReportSummary> & {
    rows?: CampaignReportRow[];
  };
  if (!response.ok) {
    throw new Error(payload.error || `HTTP ${response.status}`);
  }
  return {
    summary: payload.data,
    rows: payload.rows || [],
    pagination: payload.pagination,
  };
}

export async function getAnalyticsDashboardData(
  period: '7d' | '30d' | '90d' = '30d',
  tenantId?: string,
  userId?: string,
  options?: { signal?: AbortSignal }
): Promise<AnalyticsDashboardData> {
  const now = new Date();
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const from = start.toISOString();
  const to = now.toISOString();

  const [dashboardEnv, revenueEnv, eventsSeriesEnv, funnelEnv] = await Promise.all([
    requestJson<{
      totalRevenue: number;
      periodComparison: { revenueChange: number; eventsChange: number };
      totalEvents: number;
      totalConversions: number;
      conversionRate: number;
      attributionBreakdown: Record<string, number>;
    }>(
      ANALYTICS_BASE,
      `/dashboard?period=${encodeURIComponent(period)}`,
      { method: 'GET', headers: socialHeaders(tenantId, userId), signal: options?.signal }
    ),
    requestJson<{
      summary: { totalRevenue: number; averageRevenue: number };
      timeSeries: Array<{ timestamp: string; value: number }>;
    }>(
      ANALYTICS_BASE,
      `/revenue?startDate=${encodeURIComponent(from)}&endDate=${encodeURIComponent(to)}&granularity=day`,
      { method: 'GET', headers: socialHeaders(tenantId, userId), signal: options?.signal }
    ),
    requestJson<{ metricName: string; data: Array<{ timestamp: string; value: number }> }>(
      ANALYTICS_BASE,
      `/metrics/events.total/timeseries?granularity=day&startDate=${encodeURIComponent(from)}&endDate=${encodeURIComponent(to)}`,
      { method: 'GET', headers: socialHeaders(tenantId, userId), signal: options?.signal }
    ),
    requestJson<{ steps: Array<{ name: string; count: number; conversionRate: number }> }>(
      ANALYTICS_BASE,
      `/funnels?startDate=${encodeURIComponent(from)}&endDate=${encodeURIComponent(to)}`,
      { method: 'GET', headers: socialHeaders(tenantId, userId), signal: options?.signal }
    ),
  ]);

  const revenueSeries: AnalyticsRevenuePoint[] = (revenueEnv.timeSeries || []).map((point) => {
    const revenue = Number(point.value || 0);
    const expenses = revenue * 0.31;
    return {
      label: new Date(point.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      revenue,
      expenses,
      profit: revenue - expenses,
    };
  });

  const engagementSeries: AnalyticsEngagementPoint[] = (eventsSeriesEnv.data || []).map((point) => ({
    label: new Date(point.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    events: Number(point.value || 0),
  }));

  const palette = ['hsl(var(--primary))', 'hsl(var(--accent))', '#10b981', '#f59e0b', '#8b5cf6'];
  const channelEntries = Object.entries(dashboardEnv.attributionBreakdown || {});
  const attributionTotal = channelEntries.reduce((acc, [, value]) => acc + Number(value || 0), 0) || 1;
  const channelDistribution: AnalyticsChannelPoint[] = channelEntries.slice(0, 5).map(([key, value], index) => ({
    region: key,
    users: Math.round((Number(value || 0) / attributionTotal) * 100),
    color: palette[index % palette.length],
  }));

  const funnelSeries: AnalyticsFunnelPoint[] = (funnelEnv.steps || []).map((step) => ({
    week: step.name,
    completed: Number(step.count || 0),
    assigned: Number(step.count || 0),
    rate: Number(step.conversionRate || 0),
  }));

  const latestRevenue = revenueSeries.length ? revenueSeries[revenueSeries.length - 1].revenue : 0;
  const latestProfit = revenueSeries.length ? revenueSeries[revenueSeries.length - 1].profit : 0;
  const completionRate = funnelSeries.length ? funnelSeries[funnelSeries.length - 1].rate : 0;

  return {
    kpis: {
      monthlyRevenue: latestRevenue || Number(revenueEnv.summary?.totalRevenue || 0),
      monthlyRevenueChange: Number(dashboardEnv.periodComparison?.revenueChange || 0),
      netProfit: latestProfit,
      netProfitChange: Number(dashboardEnv.periodComparison?.revenueChange || 0),
      newUsers: Number(dashboardEnv.totalConversions || 0),
      newUsersChange: Number(dashboardEnv.periodComparison?.eventsChange || 0),
      completionRate,
      completionRateChange: completionRate,
    },
    revenueSeries,
    engagementSeries,
    channelDistribution,
    funnelSeries,
  };
}

export async function createSocialPost(
  body: {
    pageId: string;
    campaignId?: string;
    socialAccountId: string;
    text: string;
    linkUrl: string;
    scheduledFor?: string;
  },
  tenantId?: string,
  userId?: string
): Promise<SocialPost> {
  return requestJson<SocialPost>(LANDING_FACTORY_BASE, '/social/posts', {
    method: 'POST',
    headers: socialHeaders(tenantId, userId),
    body: JSON.stringify(body),
  });
}

export async function cancelSocialPost(
  postId: string,
  tenantId?: string,
  userId?: string
): Promise<void> {
  await requestJson<{ message: string }>(LANDING_FACTORY_BASE, `/social/posts/${postId}/cancel`, {
    method: 'POST',
    headers: socialHeaders(tenantId, userId),
  });
}

export function getResolvedTenantAndUser(): { tenantId: string; userId: string } {
  return resolveTenantAndUser();
}
