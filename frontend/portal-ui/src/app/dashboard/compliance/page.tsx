'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shield, RefreshCw, CheckCircle2, XCircle, AlertTriangle, FileText, Users } from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import { cn, formatRelativeTime } from '@/lib/utils';
import api from '@/lib/api';
import { isDemoUser } from '@/lib/demo';
import { useHydratedDemoUser } from '@/hooks/use-hydrated-demo-user';

interface ConsentRecord {
  id: number;
  user_id: number;
  channel: 'email' | 'sms' | 'push' | 'telephone';
  status: 'granted' | 'denied' | 'withdrawn';
  granted_at?: string;
  withdrawn_at?: string;
  source: string;
}

interface SuppressionEntry {
  id: number;
  type: 'unsubscribe' | 'block' | 'compliance';
  reason: string;
  added_at: string;
  count: number;
}

interface PolicyStatus {
  channel: string;
  compliant: boolean;
  last_verified: string;
  issues: number;
}

const CHANNEL_STYLES: Record<string, string> = {
  email: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  sms: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  push: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  telephone: 'bg-green-500/15 text-green-400 border-green-500/30',
};

const DEMO_CONSENT: ConsentRecord[] = [
  { id: 1, user_id: 1, channel: 'email', status: 'granted', granted_at: '2024-01-10T08:00:00Z', source: 'Website form' },
  { id: 2, user_id: 1, channel: 'sms', status: 'granted', granted_at: '2024-01-12T10:00:00Z', source: 'Mobile app' },
  { id: 3, user_id: 1, channel: 'push', status: 'denied', granted_at: '2024-01-12T10:01:00Z', source: 'Mobile app' },
  { id: 4, user_id: 1, channel: 'telephone', status: 'withdrawn', granted_at: '2024-01-08T09:00:00Z', withdrawn_at: '2024-01-20T14:00:00Z', source: 'Phone call' },
];

const DEMO_SUPPRESSION: SuppressionEntry[] = [
  { id: 1, type: 'unsubscribe', reason: 'User requested unsubscribe', added_at: '2024-01-15T10:00:00Z', count: 1542 },
  { id: 2, type: 'block', reason: 'Hard bounce - invalid address', added_at: '2024-01-10T08:00:00Z', count: 423 },
  { id: 3, type: 'compliance', reason: 'GDPR right to erasure', added_at: '2024-01-05T12:00:00Z', count: 89 },
];

const DEMO_POLICY_STATUS: PolicyStatus[] = [
  { channel: 'Email', compliant: true, last_verified: '2024-01-27T10:00:00Z', issues: 0 },
  { channel: 'SMS', compliant: true, last_verified: '2024-01-27T10:00:00Z', issues: 0 },
  { channel: 'Push Notifications', compliant: false, last_verified: '2024-01-26T15:00:00Z', issues: 2 },
  { channel: 'Telephone', compliant: true, last_verified: '2024-01-27T10:00:00Z', issues: 0 },
];

export default function CompliancePage() {
  const demoUi = useHydratedDemoUser();
  const [consent, setConsent] = useState<ConsentRecord[]>([]);
  const [suppression, setSuppression] = useState<SuppressionEntry[]>([]);
  const [policyStatus, setPolicyStatus] = useState<PolicyStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [checkMsg, setCheckMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (isDemoUser()) {
        setConsent(DEMO_CONSENT);
        setSuppression(DEMO_SUPPRESSION);
        setPolicyStatus(DEMO_POLICY_STATUS);
      } else {
        const [consentRes, suppressRes, policyRes] = await Promise.all([
          api.request<{ data: ConsentRecord[] }>('GET', '/compliance/consent'),
          api.request<{ data: SuppressionEntry[] }>('GET', '/compliance/suppression'),
          api.request<{ data: PolicyStatus[] }>('GET', '/compliance/policy/all'),
        ]);
        setConsent(consentRes.data || []);
        setSuppression(suppressRes.data || []);
        setPolicyStatus(policyRes.data || []);
      }
    } catch {
      setError('Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCheckCompliance() {
    setChecking(true);
    setCheckMsg('');
    try {
      if (isDemoUser()) {
        await new Promise((r) => setTimeout(r, 1500));
        setCheckMsg('Compliance check complete. All policies verified.');
        setPolicyStatus(DEMO_POLICY_STATUS.map((p) => ({ ...p, last_verified: new Date().toISOString() })));
      } else {
        await api.request('POST', '/compliance/check');
        setCheckMsg('Compliance check complete.');
        await load();
      }
    } catch (err) {
      setCheckMsg(err instanceof Error ? err.message : 'Check failed');
    } finally {
      setChecking(false);
    }
  }

  const totalSuppressed = suppression.reduce((s, e) => s + e.count, 0);
  const grantedConsent = consent.filter((c) => c.status === 'granted').length;
  const compliantChannels = policyStatus.filter((p) => p.compliant).length;
  const totalIssues = policyStatus.reduce((s, p) => s + p.issues, 0);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />
            Compliance Dashboard
            {demoUi && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">Demo</span>}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Monitor consent, manage suppression lists, and ensure policy compliance.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading} aria-label="Refresh" className="p-2 rounded-lg border border-border hover:bg-muted/40 text-muted-foreground transition-colors disabled:opacity-50">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
          <button
            onClick={handleCheckCompliance}
            disabled={checking}
            className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors bg-primary text-primary-foreground disabled:opacity-50"
          >
            <Shield className="w-4 h-4" />
            {checking ? 'Checking...' : 'Check Compliance'}
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg px-4 py-3 text-sm bg-red-500/10 border border-red-500/30 text-red-400">{error}</div>}
      {checkMsg && <div className="rounded-lg px-4 py-3 text-sm bg-green-500/10 border border-green-500/30 text-green-400">{checkMsg}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Granted Consent" value={grantedConsent} icon={CheckCircle2} accent="success" sublabel="Active permissions" />
        <StatCard title="Total Suppressed" value={totalSuppressed.toLocaleString()} icon={Users} accent="warning" sublabel="Blocked contacts" />
        <StatCard title="Compliant Channels" value={compliantChannels} icon={Shield} accent={compliantChannels === policyStatus.length ? 'success' : 'danger'} sublabel={`${policyStatus.length} total`} />
        <StatCard title="Open Issues" value={totalIssues} icon={AlertTriangle} accent={totalIssues === 0 ? 'success' : 'danger'} sublabel="Policy violations" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Consent Status</span>
            <span className="text-[11px] text-muted-foreground">{consent.length} channels</span>
          </div>
          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground animate-pulse">Loading...</div>
          ) : consent.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No consent records.</div>
          ) : (
            <div className="divide-y divide-border">
              {consent.map((record) => (
                <div key={record.id} className="px-5 py-4 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full border', CHANNEL_STYLES[record.channel])}>
                        {record.channel}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                          {record.status === 'granted' && <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
                          {record.status === 'denied' && <XCircle className="w-3.5 h-3.5 text-red-400" />}
                          {record.status === 'withdrawn' && <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />}
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">Source: {record.source}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {record.granted_at && <p className="text-[11px] text-muted-foreground">Granted {formatRelativeTime(record.granted_at)}</p>}
                      {record.withdrawn_at && <p className="text-[11px] text-yellow-400">Withdrawn {formatRelativeTime(record.withdrawn_at)}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Suppression List</span>
            <span className="text-[11px] text-muted-foreground">{totalSuppressed.toLocaleString()} total</span>
          </div>
          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground animate-pulse">Loading...</div>
          ) : suppression.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No suppression entries.</div>
          ) : (
            <div className="divide-y divide-border">
              {suppression.map((entry) => (
                <div key={entry.id} className="px-5 py-4 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}</p>
                      <p className="text-xs text-muted-foreground">{entry.reason}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{entry.count.toLocaleString()}</p>
                      <p className="text-[11px] text-muted-foreground">Added {formatRelativeTime(entry.added_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Policy Compliance Status</span>
          <span className="text-[11px] text-muted-foreground">{compliantChannels}/{policyStatus.length} compliant</span>
        </div>
        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground animate-pulse">Loading...</div>
        ) : (
          <div className="divide-y divide-border">
            {policyStatus.map((policy) => (
              <div key={policy.channel} className="px-5 py-4 hover:bg-muted/20 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {policy.compliant ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-foreground">{policy.channel}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Last verified: {formatRelativeTime(policy.last_verified)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {policy.issues > 0 && (
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
                        {policy.issues} issue{policy.issues !== 1 ? 's' : ''}
                      </span>
                    )}
                    <span className={cn('text-[10px] font-bold uppercase px-2 py-1 rounded-full border', policy.compliant ? 'bg-green-500/15 text-green-400 border-green-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30')}>
                      {policy.compliant ? 'Compliant' : 'Non-compliant'}
                    </span>
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
