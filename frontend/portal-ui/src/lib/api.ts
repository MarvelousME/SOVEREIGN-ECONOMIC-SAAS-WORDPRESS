/**
 * UBI Platform API Client
 * Handles all communication with the backend API
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  errors?: Array<{ field: string; message: string }>;
}

export interface User {
  id: number;
  username: string;
  email: string;
  roles: string[];
  status?: string;
  wallet_address?: string | null;
  kyc_verified?: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  reward_amount: number;
  reward_currency: string;
  max_participants: number;
  current_participants: number;
  status: string;
  deadline?: string;
  created_at: string;
  proof_requirements?: string;
}

export interface Reward {
  id: number;
  amount: number;
  currency: string;
  type: string;
  source_type?: string;
  source_id?: number;
  status: string;
  created_at: string;
  processed_at?: string;
}

export interface TreasuryBalance {
  balance: number;
  currency: string;
}

export interface TreasuryStrategy {
  id: number;
  name: string;
  protocol: string;
  apy: number;
  risk_level: string;
  allocation: number;
  status: string;
}

export interface UBIBalance {
  balance: number;
  currency: string;
}

export interface PlatformStats {
  active_users: number;
  total_ubi_distributed: number;
  total_claims: number;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  capability: string;
  version?: string;
  status: string;
  price_per_call: number;
  pricing_model: string;
  total_calls?: number;
  success_rate?: number;
  endpoint?: string;
  created_at: string;
}

export interface AgentExecution {
  id: string;
  agent_id: string;
  agent_name?: string;
  input: unknown;
  output: unknown;
  duration_ms: number;
  cost: number;
  status: 'success' | 'failed';
  created_at: string;
}

export interface YieldInfo {
  balance: number;
  currency: string;
  current_apy: number;
  estimated_annual_yield: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface MarketplaceApp {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  publisher_id: number | null;
  publisher_username?: string | null;
  category: string;
  version: string;
  status: 'draft' | 'published' | 'archived';
  manifest: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface UserAppInstall {
  id: number;
  user_id: number;
  app_id: number;
  status: 'installed' | 'active' | 'disabled';
  installed_at: string;
  activated_at?: string | null;
  slug?: string;
  name?: string;
  description?: string | null;
  category?: string;
  version?: string;
  app_status?: string;
}

export interface NotificationRow {
  id: number;
  user_id: number;
  title: string;
  body: string | null;
  type: string;
  read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface EnvFileManifestEntry {
  id: string;
  exists: boolean;
  mtimeMs: number | null;
  size: number | null;
}

export interface EnvFileManifest {
  root: string;
  enabled: boolean;
  files: EnvFileManifestEntry[];
}

export interface EnvFilePayload {
  id: string;
  content: string;
  mtimeMs: number;
  size: number;
}

export interface Block {
  id: string;
  type: 'hero' | 'features' | 'cta' | 'testimonials' | 'pricing' | 'faq' | 'footer' | 'affiliate_disclosure';
  content: Record<string, unknown>;
  order: number;
}

export interface LandingPage {
  id: number;
  title: string;
  slug: string;
  description: string;
  blocks: Block[];
  status: 'draft' | 'published' | 'archived';
  published_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PageVersion {
  id: number;
  page_id: number;
  version: number;
  blocks: Block[];
  created_at: string;
  created_by?: string;
}

export type AdminEnvStreamMessage =
  | { type: 'connected'; t: number }
  | { type: 'ping'; t: number }
  | { type: 'change'; reason?: string; at?: number };

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('ubi_token');
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    authenticated = true
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (authenticated) {
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ubi_token');
        localStorage.removeItem('ubi_user');
        window.location.href = '/auth/login';
      }
      throw new Error('Unauthorized');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || `HTTP ${response.status}`);
    }

    return data as T;
  }

  // ── Auth ────────────────────────────────────────────────────────
  async login(username: string, password: string): Promise<AuthResponse> {
    const result = await this.request<AuthResponse>('POST', '/auth/login', { username, password }, false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ubi_token', result.token);
      localStorage.setItem('ubi_user', JSON.stringify(result.user));
    }
    return result;
  }

  async register(username: string, email: string, password: string): Promise<AuthResponse> {
    const result = await this.request<AuthResponse>('POST', '/auth/register', { username, email, password }, false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ubi_token', result.token);
      localStorage.setItem('ubi_user', JSON.stringify(result.user));
    }
    return result;
  }

  async logout(): Promise<void> {
    try {
      await this.request('POST', '/auth/logout', undefined, true);
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ubi_token');
        localStorage.removeItem('ubi_user');
      }
    }
  }

  async getMe(): Promise<User> {
    return this.request<User>('GET', '/auth/me');
  }

  async updateProfile(body: {
    email?: string;
    wallet_address?: string | null;
    username?: string;
  }): Promise<User> {
    const u = await this.request<User>('PATCH', '/auth/profile', body, true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ubi_user', JSON.stringify(u));
    }
    return u;
  }

  // ── UBI ─────────────────────────────────────────────────────────
  async getUBIBalance(): Promise<UBIBalance> {
    return this.request<UBIBalance>('GET', '/ubi/balance');
  }

  async claimUBI(): Promise<{ amount: number; currency: string; message: string }> {
    return this.request('POST', '/ubi/claim');
  }

  async getUBIHistory(page = 1, limit = 20): Promise<PaginatedResponse<Reward>> {
    return this.request<PaginatedResponse<Reward>>('GET', `/ubi/history?page=${page}&limit=${limit}`);
  }

  async getPlatformStats(): Promise<PlatformStats> {
    return this.request<PlatformStats>('GET', '/ubi/stats', undefined, false);
  }

  // ── Tasks ────────────────────────────────────────────────────────
  async getTasks(
    filters?: { status?: string; category?: string; difficulty?: string },
    page = 1,
    limit = 20
  ): Promise<PaginatedResponse<Task>> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters?.status) params.set('status', filters.status);
    if (filters?.category) params.set('category', filters.category);
    if (filters?.difficulty) params.set('difficulty', filters.difficulty);
    return this.request<PaginatedResponse<Task>>('GET', `/tasks?${params}`);
  }

  async getTask(id: number): Promise<Task> {
    return this.request<Task>('GET', `/tasks/${id}`);
  }

  async assignTask(id: number): Promise<{ message: string }> {
    return this.request('POST', `/tasks/${id}/assign`);
  }

  async submitTask(id: number, proofData: unknown): Promise<{ message: string }> {
    return this.request('POST', `/tasks/${id}/submit`, { proof_data: proofData });
  }

  async createTask(body: {
    title: string;
    description: string;
    category: string;
    difficulty?: string;
    reward_amount: number;
    reward_currency?: string;
    max_participants?: number;
    deadline?: string;
    proof_requirements?: string | Record<string, unknown>;
  }): Promise<Task> {
    return this.request<Task>('POST', '/tasks', body);
  }

  async updateTask(id: number, body: Partial<Task> & { proof_requirements?: string | Record<string, unknown> }): Promise<Task> {
    return this.request<Task>('PUT', `/tasks/${id}`, body);
  }

  async deleteTask(id: number): Promise<void> {
    await this.request('DELETE', `/tasks/${id}`);
  }

  // ── Rewards ──────────────────────────────────────────────────────
  async getRewardBalance(): Promise<{ balance: number; currency: string }> {
    return this.request<{ balance: number; currency: string }>('GET', '/rewards/balance');
  }

  async getRewardHistory(page = 1, limit = 50): Promise<PaginatedResponse<Reward>> {
    return this.request<PaginatedResponse<Reward>>('GET', `/rewards/history?page=${page}&limit=${limit}`);
  }

  // ── Treasury ─────────────────────────────────────────────────────
  async getTreasuryBalance(): Promise<TreasuryBalance> {
    return this.request<TreasuryBalance>('GET', '/treasury/balance');
  }

  async getTreasuryStrategies(): Promise<{ strategies: TreasuryStrategy[] }> {
    return this.request<{ strategies: TreasuryStrategy[] }>('GET', '/treasury/strategies');
  }

  async deposit(amount: number, currency = 'UBI'): Promise<{ message: string; balance: number }> {
    return this.request('POST', '/treasury/deposit', { amount, currency });
  }

  async withdraw(amount: number, currency = 'UBI'): Promise<{ message: string; balance: number }> {
    return this.request('POST', '/treasury/withdraw', { amount, currency });
  }

  async getYield(): Promise<YieldInfo> {
    return this.request<YieldInfo>('GET', '/treasury/yield');
  }

  // ── Agents ───────────────────────────────────────────────────────
  async getAgents(
    filters?: { status?: string; capability?: string; search?: string },
    page = 1,
    limit = 20
  ): Promise<PaginatedResponse<Agent>> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters?.status) params.set('status', filters.status);
    if (filters?.capability) params.set('capability', filters.capability);
    if (filters?.search) params.set('search', filters.search);
    return this.request<PaginatedResponse<Agent>>('GET', `/agents?${params}`);
  }

  async getAgent(id: string): Promise<Agent> {
    return this.request<Agent>('GET', `/agents/${id}`);
  }

  async executeAgent(
    id: string,
    input: unknown
  ): Promise<{ execution_id: string; output: unknown; duration_ms: number; cost: number }> {
    return this.request('POST', `/agents/${id}/execute`, { input });
  }

  // ── Marketplace ─────────────────────────────────────────────────
  async getMarketplaceApps(page = 1, limit = 50): Promise<PaginatedResponse<MarketplaceApp>> {
    return this.request('GET', `/marketplace/apps?page=${page}&limit=${limit}`);
  }

  async getMarketplaceApp(id: number): Promise<MarketplaceApp> {
    return this.request<MarketplaceApp>('GET', `/marketplace/apps/${id}`);
  }

  async createMarketplaceApp(body: {
    slug: string;
    name: string;
    description?: string;
    category?: string;
    version?: string;
    manifest?: Record<string, unknown>;
    publisher_id?: number;
  }): Promise<MarketplaceApp> {
    return this.request<MarketplaceApp>('POST', '/marketplace/apps', body);
  }

  async updateMarketplaceApp(id: number, body: Partial<MarketplaceApp>): Promise<MarketplaceApp> {
    return this.request<MarketplaceApp>('PUT', `/marketplace/apps/${id}`, body);
  }

  async deleteMarketplaceApp(id: number): Promise<void> {
    await this.request('DELETE', `/marketplace/apps/${id}`);
  }

  async publishMarketplaceApp(id: number): Promise<MarketplaceApp> {
    return this.request<MarketplaceApp>('POST', `/marketplace/apps/${id}/publish`);
  }

  async archiveMarketplaceApp(id: number): Promise<MarketplaceApp> {
    return this.request<MarketplaceApp>('POST', `/marketplace/apps/${id}/archive`);
  }

  async installMarketplaceApp(id: number): Promise<UserAppInstall> {
    return this.request<UserAppInstall>('POST', `/marketplace/apps/${id}/install`);
  }

  async getMyAppInstalls(): Promise<{ data: UserAppInstall[] }> {
    return this.request('GET', '/marketplace/installs');
  }

  async activateAppInstall(installId: number): Promise<UserAppInstall> {
    return this.request<UserAppInstall>('POST', `/marketplace/installs/${installId}/activate`);
  }

  async deactivateAppInstall(installId: number): Promise<UserAppInstall> {
    return this.request<UserAppInstall>('POST', `/marketplace/installs/${installId}/deactivate`);
  }

  async uninstallAppInstall(installId: number): Promise<void> {
    await this.request('DELETE', `/marketplace/installs/${installId}`);
  }

  // ── Notifications ───────────────────────────────────────────────
  async getNotifications(page = 1, limit = 50, unreadOnly = false): Promise<PaginatedResponse<NotificationRow>> {
    const q = unreadOnly ? '&unread_only=1' : '';
    return this.request(`GET`, `/notifications?page=${page}&limit=${limit}${q}`);
  }

  async getUnreadNotificationCount(): Promise<{ count: number }> {
    return this.request('GET', '/notifications/unread-count');
  }

  async markNotificationRead(id: number): Promise<NotificationRow> {
    return this.request<NotificationRow>('PATCH', `/notifications/${id}/read`);
  }

  async markAllNotificationsRead(): Promise<{ ok: boolean }> {
    return this.request('POST', '/notifications/read-all');
  }

  async deleteNotification(id: number): Promise<void> {
    await this.request('DELETE', `/notifications/${id}`);
  }

  async adminCreateNotification(body: {
    user_id: number;
    title: string;
    body?: string;
    type?: string;
    metadata?: Record<string, unknown>;
  }): Promise<NotificationRow> {
    return this.request<NotificationRow>('POST', '/notifications/admin', body);
  }

  // ── Admin: env files (requires ENABLE_ADMIN_ENV_EDITOR on API) ──
  async getAdminEnvManifest(): Promise<EnvFileManifest> {
    return this.request<EnvFileManifest>('GET', '/admin/env/manifest');
  }

  async getAdminEnvFile(id: string): Promise<EnvFilePayload> {
    const q = encodeURIComponent(id);
    return this.request<EnvFilePayload>('GET', `/admin/env/file?id=${q}`);
  }

  async saveAdminEnvFile(id: string, content: string): Promise<{ ok: boolean; id: string; mtimeMs: number; size: number }> {
    return this.request('PUT', '/admin/env/file', { id, content });
  }

  async applyAdminEnvRuntime(id: string): Promise<{
    ok: boolean;
    keysApplied: number;
    warning: string;
  }> {
    return this.request('POST', '/admin/env/apply', { id });
  }

  // ── Pages ────────────────────────────────────────────────────────
  async getPages(): Promise<PaginatedResponse<LandingPage>> {
    return this.request<PaginatedResponse<LandingPage>>('GET', '/pages');
  }

  async getPage(id: number): Promise<LandingPage> {
    return this.request<LandingPage>('GET', `/pages/${id}`);
  }

  async createPage(body: { title: string; slug: string; description?: string }): Promise<LandingPage> {
    return this.request<LandingPage>('POST', '/pages', body);
  }

  async updatePage(id: number, body: { title?: string; description?: string; blocks?: Block[] }): Promise<LandingPage> {
    return this.request<LandingPage>('PUT', `/pages/${id}`, body);
  }

  async deletePage(id: number): Promise<void> {
    await this.request('DELETE', `/pages/${id}`);
  }

  async publishPage(id: number): Promise<LandingPage> {
    return this.request<LandingPage>('POST', `/pages/${id}/publish`);
  }

  async rollbackPage(id: number, version: number): Promise<LandingPage> {
    return this.request<LandingPage>('POST', `/pages/${id}/rollback`, { version });
  }

  async getPageVersions(id: number): Promise<{ data: PageVersion[] }> {
    return this.request('GET', `/pages/${id}/versions`);
  }

  async generatePage(url: string): Promise<LandingPage> {
    return this.request<LandingPage>('POST', '/pages/generate', { url });
  }

  /**
   * SSE over fetch (EventSource cannot send Authorization). Parses `data: {...}` frames.
   * Call from the browser only. Aborts when `signal` is aborted.
   */
  async consumeAdminEnvEvents(
    onMessage: (msg: AdminEnvStreamMessage) => void,
    options?: { signal?: AbortSignal }
  ): Promise<void> {
    const token = this.getToken();
    if (!token) throw new Error('Unauthorized');

    const response = await fetch(`${this.baseUrl}/admin/env/events`, {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
        Authorization: `Bearer ${token}`,
      },
      signal: options?.signal,
    });

    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ubi_token');
        localStorage.removeItem('ubi_user');
        window.location.href = '/auth/login';
      }
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      let message = `HTTP ${response.status}`;
      try {
        const err = (await response.json()) as { error?: string };
        if (err.error) message = err.error;
      } catch {
        /* ignore */
      }
      throw new Error(message);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() ?? '';
      for (const block of chunks) {
        const line = block.split('\n').find((l) => l.startsWith('data: '));
        if (!line) continue;
        try {
          onMessage(JSON.parse(line.slice(6)) as AdminEnvStreamMessage);
        } catch {
          /* malformed frame */
        }
      }
    }
  }

  // ── Health ───────────────────────────────────────────────────────
  async health(): Promise<{ status: string; uptime: number }> {
    const base = this.baseUrl.replace(/\/api\/v1\/?$/, '');
    const response = await fetch(`${base}/health`);
    return response.json() as Promise<{ status: string; uptime: number }>;
  }
}

export const api = new ApiClient(API_BASE);
export default api;
