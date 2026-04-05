'use client';

import { useState, useEffect, useCallback } from 'react';
import { Link2, Plus, RefreshCw, ExternalLink, TrendingUp, Building2, CheckCircle2, XCircle } from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import { cn, formatRelativeTime } from '@/lib/utils';
import api from '@/lib/api';
import { isDemoUser } from '@/lib/demo';
import { useHydratedDemoUser } from '@/hooks/use-hydrated-demo-user';

interface AffiliateLink {
  id: number;
  url: string;
  merchant: string;
  merchant_id: number;
  status: 'active' | 'paused' | 'expired';
  freshness_score: number;
  offer_count: number;
  created_at: string;
  last_checked?: string;
}

interface AffiliateIntake {
  url: string;
  merchant?: string;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-500/15 text-green-400 border-green-500/30',
  paused: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  expired: 'bg-red-500/15 text-red-400 border-red-500/30',
};

const DEMO_AFFILIATE_LINKS: AffiliateLink[] = [
  { id: 1, url: 'https://partner.merchant1.com/ref/usr_8821', merchant: 'TechGear Pro', merchant_id: 101, status: 'active', freshness_score: 94, offer_count: 12, created_at: '2024-01-15T10:00:00Z', last_checked: '2024-01-27T08:00:00Z' },
  { id: 2, url: 'https://partner.softwareco.com/ref/demo_user', merchant: 'SoftwareCo', merchant_id: 102, status: 'active', freshness_score: 87, offer_count: 5, created_at: '2024-01-20T14:30:00Z', last_checked: '2024-01-27T06:00:00Z' },
  { id: 3, url: 'https://affiliate.cloudhost.io/ref/user_9912', merchant: 'CloudHost', merchant_id: 103, status: 'paused', freshness_score: 62, offer_count: 3, created_at: '2024-01-10T09:00:00Z', last_checked: '2024-01-25T12:00:00Z' },
  { id: 4, url: 'https://partner.dataserv.com/ref/demo', merchant: 'DataServ Analytics', merchant_id: 104, status: 'active', freshness_score: 91, offer_count: 8, created_at: '2024-01-22T16:00:00Z', last_checked: '2024-01-27T09:30:00Z' },
];

export default function AffiliatePage() {
  const demoUi = useHydratedDemoUser();
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [intakeForm, setIntakeForm] = useState<AffiliateIntake>({ url: '', merchant: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');
  const [refreshing, setRefreshing] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (isDemoUser()) {
        setLinks(DEMO_AFFILIATE_LINKS);
      } else {
        const res = await api.request<{ data: AffiliateLink[] }>('GET', '/affiliate/links');
        setLinks(res.data || []);
      }
    } catch {
      setError('Failed to load affiliate links');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleIntake(e: React.FormEvent) {
    e.preventDefault();
    if (!intakeForm.url.trim()) return;
    setSubmitting(true);
    setSubmitMsg('');
    try {
      if (isDemoUser()) {
        await new Promise((r) => setTimeout(r, 800));
        setSubmitMsg('Affiliate URL added successfully! (demo mode)');
        setIntakeForm({ url: '', merchant: '' });
      } else {
        await api.request('POST', '/affiliate/intake', { url: intakeForm.url, merchant: intakeForm.merchant });
        setSubmitMsg('Affiliate URL added successfully!');
        setIntakeForm({ url: '', merchant: '' });
        await load();
      }
    } catch (err) {
      setSubmitMsg(err instanceof Error ? err.message : 'Failed to add URL');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRefresh(id: number) {
    setRefreshing(id);
    try {
      if (!isDemoUser()) {
        await api.request('POST', `/affiliate/links/${id}/refresh`);
      } else {
        await new Promise((r) => setTimeout(r, 600));
      }
      await load();
    } finally {
      setRefreshing(null);
    }
  }

  const activeLinks = links.filter((l) => l.status === 'active').length;
  const avgFreshness = links.length > 0 ? Math.round(links.reduce((s, l) => s + l.freshness_score, 0) / links.length) : 0;
  const totalOffers = links.reduce((s, l) => s + l.offer_count, 0);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Link2 className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />
            Affiliate Links
            {demoUi && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">Demo</span>}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your affiliate links, track freshness, and monitor offers.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading} aria-label="Refresh" className="p-2 rounded-lg border border-border hover:bg-muted/40 text-muted-foreground transition-colors disabled:opacity-50">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
          <button onClick={() => setShowAdd(!showAdd)} className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors" style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>
            <Plus className="w-4 h-4" /> Add Affiliate URL
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg px-4 py-3 text-sm bg-red-500/10 border border-red-500/30 text-red-400">{error}</div>}

      {showAdd && (
        <div className="rounded-xl border border-border p-4 space-y-3" style={{ background: 'hsl(var(--card))' }}>
          <h2 className="text-sm font-bold text-foreground">Add New Affiliate URL</h2>
          {submitMsg && <p className="text-xs text-primary">{submitMsg}</p>}
          <form onSubmit={handleIntake} className="space-y-3">
            <input
              type="url"
              placeholder="https://partner.example.com/ref/your_id"
              value={intakeForm.url}
              onChange={(e) => setIntakeForm((f) => ({ ...f, url: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            />
            <input
              placeholder="Merchant name (optional)"
              value={intakeForm.merchant}
              onChange={(e) => setIntakeForm((f) => ({ ...f, merchant: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            />
            <div className="flex gap-2">
              <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-50">
                {submitting ? 'Adding...' : 'Add URL'}
              </button>
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg text-sm font-semibold border border-border text-muted-foreground hover:bg-muted/40">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Links" value={activeLinks} icon={Link2} accent="success" sublabel="Currently active" />
        <StatCard title="Total Links" value={links.length} icon={ExternalLink} accent="primary" sublabel="All time" />
        <StatCard title="Avg Freshness" value={`${avgFreshness}%`} icon={TrendingUp} accent={avgFreshness >= 80 ? 'success' : 'warning'} sublabel="Score health" />
        <StatCard title="Total Offers" value={totalOffers} icon={Building2} accent="info" sublabel="Across all merchants" />
      </div>

      <div className="rounded-xl border border-border overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Affiliate Links</span>
          <span className="text-[11px] text-muted-foreground">{links.length} links</span>
        </div>
        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground animate-pulse">Loading links...</div>
        ) : links.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No affiliate links yet. Add one to get started.</div>
        ) : (
          <div className="divide-y divide-border">
            {links.map((link) => (
              <div key={link.id} className="px-5 py-4 hover:bg-muted/20 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{link.merchant}</span>
                      <span className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full border', STATUS_STYLES[link.status])}>
                        {link.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mb-1">{link.url}</p>
                    <div className="flex items-center gap-4">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Freshness: {link.freshness_score}%
                      </span>
                      <span className="text-[11px] text-muted-foreground">{link.offer_count} offers</span>
                      {link.last_checked && <span className="text-[11px] text-muted-foreground">Checked {formatRelativeTime(link.last_checked)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleRefresh(link.id)}
                      disabled={refreshing === link.id || link.status !== 'active'}
                      aria-label="Refresh"
                      className="p-2 rounded-lg border border-border hover:bg-muted/40 text-muted-foreground transition-colors disabled:opacity-40"
                    >
                      <RefreshCw className={cn('w-4 h-4', refreshing === link.id && 'animate-spin')} />
                    </button>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg border border-border hover:bg-muted/40 text-muted-foreground transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
