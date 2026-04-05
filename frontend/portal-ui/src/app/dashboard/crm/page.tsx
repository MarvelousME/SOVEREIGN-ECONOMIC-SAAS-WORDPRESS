'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, RefreshCw, UserCheck, TrendingUp, Phone, Mail, Building2 } from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import { cn, formatRelativeTime } from '@/lib/utils';
import api from '@/lib/api';
import { isDemoUser } from '@/lib/demo';
import { useHydratedDemoUser } from '@/hooks/use-hydrated-demo-user';

interface Lead {
  id: number;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'converted' | 'lost';
  source: string;
  created_at: string;
  last_contact?: string;
  value?: number;
}

interface PipelineStage {
  stage: string;
  count: number;
  value: number;
}

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  contacted: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  qualified: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  proposal: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  converted: 'bg-green-500/15 text-green-400 border-green-500/30',
  lost: 'bg-red-500/15 text-red-400 border-red-500/30',
};

const DEMO_LEADS: Lead[] = [
  { id: 1, name: 'Sarah Mitchell', email: 'sarah@techcorp.io', company: 'TechCorp', phone: '+1-555-0101', status: 'qualified', source: 'Website', created_at: '2024-01-15T10:00:00Z', last_contact: '2024-01-26T14:00:00Z', value: 25000 },
  { id: 2, name: 'James Rodriguez', email: 'j.rodriguez@innovate.co', company: 'Innovate Co', phone: '+1-555-0102', status: 'contacted', source: 'LinkedIn', created_at: '2024-01-18T09:30:00Z', last_contact: '2024-01-25T11:00:00Z', value: 15000 },
  { id: 3, name: 'Emily Chen', email: 'emily.chen@globaltech.com', company: 'GlobalTech', status: 'new', source: 'Referral', created_at: '2024-01-27T08:00:00Z', value: 50000 },
  { id: 4, name: 'Michael Brown', email: 'mbrown@startup.io', company: 'StartupIO', phone: '+1-555-0104', status: 'proposal', source: 'Website', created_at: '2024-01-12T15:00:00Z', last_contact: '2024-01-27T09:00:00Z', value: 35000 },
  { id: 5, name: 'Lisa Wang', email: 'lisa@enterprise.com', company: 'Enterprise Solutions', status: 'converted', source: 'Conference', created_at: '2024-01-05T10:00:00Z', last_contact: '2024-01-20T16:00:00Z', value: 75000 },
  { id: 6, name: 'David Kim', email: 'dkim@growth.co', status: 'lost', source: 'Website', created_at: '2024-01-08T11:00:00Z', value: 0 },
];

export default function CRMPage() {
  const demoUi = useHydratedDemoUser();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const [addForm, setAddForm] = useState({ name: '', email: '', company: '', phone: '', source: 'Website' });
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (isDemoUser()) {
        setLeads(DEMO_LEADS);
      } else {
        const res = await api.request<{ data: Lead[] }>('GET', '/crm/leads');
        setLeads(res.data || []);
      }
    } catch {
      setError('Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAddLead(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.email.trim()) return;
    setSubmitting(true);
    setSubmitMsg('');
    try {
      if (isDemoUser()) {
        await new Promise((r) => setTimeout(r, 700));
        const newLead: Lead = {
          id: Date.now(),
          ...addForm,
          status: 'new',
          created_at: new Date().toISOString(),
        };
        setLeads((prev) => [newLead, ...prev]);
        setSubmitMsg('Lead added successfully! (demo mode)');
      } else {
        await api.request('POST', '/crm/leads', addForm);
        setSubmitMsg('Lead added successfully!');
        await load();
      }
      setAddForm({ name: '', email: '', company: '', phone: '', source: 'Website' });
    } catch (err) {
      setSubmitMsg(err instanceof Error ? err.message : 'Failed to add lead');
    } finally {
      setSubmitting(false);
    }
  }

  const pipeline: PipelineStage[] = [
    { stage: 'New', count: leads.filter((l) => l.status === 'new').length, value: 0 },
    { stage: 'Contacted', count: leads.filter((l) => l.status === 'contacted').length, value: 0 },
    { stage: 'Qualified', count: leads.filter((l) => l.status === 'qualified').length, value: 0 },
    { stage: 'Proposal', count: leads.filter((l) => l.status === 'proposal').length, value: 0 },
    { stage: 'Converted', count: leads.filter((l) => l.status === 'converted').length, value: 0 },
  ];

  const totalLeads = leads.length;
  const qualifiedLeads = leads.filter((l) => ['qualified', 'proposal', 'converted'].includes(l.status)).length;
  const convertedLeads = leads.filter((l) => l.status === 'converted').length;
  const totalValue = leads.reduce((s, l) => s + (l.value || 0), 0);
  const maxPipelineCount = Math.max(...pipeline.map((p) => p.count), 1);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />
            CRM Dashboard
            {demoUi && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">Demo</span>}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage leads, track pipeline, and monitor conversion progress.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading} aria-label="Refresh" className="p-2 rounded-lg border border-border hover:bg-muted/40 text-muted-foreground transition-colors disabled:opacity-50">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
          <button onClick={() => setShowAdd(!showAdd)} className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors" style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>
            <Plus className="w-4 h-4" /> Add Lead
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg px-4 py-3 text-sm bg-red-500/10 border border-red-500/30 text-red-400">{error}</div>}

      {showAdd && (
        <div className="rounded-xl border border-border p-4 space-y-3" style={{ background: 'hsl(var(--card))' }}>
          <h2 className="text-sm font-bold text-foreground">Add New Lead</h2>
          {submitMsg && <p className="text-xs text-primary">{submitMsg}</p>}
          <form onSubmit={handleAddLead} className="grid gap-3 sm:grid-cols-2">
            <input placeholder="Full name" value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} className="px-3 py-2 rounded-lg border border-border bg-background text-sm" required />
            <input type="email" placeholder="Email address" value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} className="px-3 py-2 rounded-lg border border-border bg-background text-sm" required />
            <input placeholder="Company" value={addForm.company} onChange={(e) => setAddForm((f) => ({ ...f, company: e.target.value }))} className="px-3 py-2 rounded-lg border border-border bg-background text-sm" />
            <input type="tel" placeholder="Phone" value={addForm.phone} onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))} className="px-3 py-2 rounded-lg border border-border bg-background text-sm" />
            <select value={addForm.source} onChange={(e) => setAddForm((f) => ({ ...f, source: e.target.value }))} className="px-3 py-2 rounded-lg border border-border bg-background text-sm sm:col-span-2">
              <option value="Website">Website</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Referral">Referral</option>
              <option value="Conference">Conference</option>
              <option value="Cold Outreach">Cold Outreach</option>
            </select>
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-50">
                {submitting ? 'Adding...' : 'Add Lead'}
              </button>
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg text-sm font-semibold border border-border text-muted-foreground hover:bg-muted/40">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Leads" value={totalLeads} icon={Users} accent="primary" sublabel="All leads" />
        <StatCard title="Qualified" value={qualifiedLeads} icon={UserCheck} accent="success" sublabel="Hot prospects" />
        <StatCard title="Converted" value={convertedLeads} icon={TrendingUp} accent="info" sublabel="Won deals" />
        <StatCard title="Pipeline Value" value={`$${(totalValue / 1000).toFixed(0)}K`} icon={Building2} accent="warning" sublabel="Total opportunity" />
      </div>

      <div className="rounded-xl border border-border p-5" style={{ background: 'hsl(var(--card))' }}>
        <h3 className="text-sm font-semibold text-foreground mb-4">Sales Pipeline</h3>
        <div className="flex items-end gap-3 h-40">
          {pipeline.map((stage) => {
            const pct = (stage.count / maxPipelineCount) * 100;
            return (
              <div key={stage.stage} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col items-center justify-end h-28">
                  <div
                    className="w-full rounded-t-lg transition-all hover:opacity-80"
                    style={{
                      height: `${Math.max(pct, 8)}%`,
                      background: stage.stage === 'Converted' ? 'hsl(142 70% 45%)' : 'hsl(var(--primary))',
                      opacity: stage.stage === 'Converted' ? 0.9 : 0.6,
                    }}
                  />
                </div>
                <span className="text-[11px] text-muted-foreground">{stage.stage}</span>
                <span className="text-sm font-bold text-foreground">{stage.count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 rounded-xl border border-border overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Leads</span>
            <span className="text-[11px] text-muted-foreground">{leads.length} leads</span>
          </div>
          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground animate-pulse">Loading leads...</div>
          ) : leads.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No leads yet. Add one to get started.</div>
          ) : (
            <div className="divide-y divide-border">
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLead(lead.id === selectedLead?.id ? null : lead)}
                  className={cn('px-5 py-4 cursor-pointer transition-colors', lead.id === selectedLead?.id ? 'bg-primary/5' : 'hover:bg-muted/20')}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">{lead.name}</span>
                        <span className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full border', STATUS_STYLES[lead.status])}>
                          {lead.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {lead.email}</span>
                        {lead.company && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {lead.company}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[11px] text-muted-foreground">Source: {lead.source}</span>
                        {lead.value && <span className="text-[11px] text-green-400">${lead.value.toLocaleString()}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {selectedLead ? (
            <div className="rounded-xl border border-border p-5 space-y-4 sticky top-4" style={{ background: 'hsl(var(--card))' }}>
              <div>
                <h3 className="text-sm font-bold text-foreground mb-1">{selectedLead.name}</h3>
                <span className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full border', STATUS_STYLES[selectedLead.status])}>
                  {selectedLead.status}
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">{selectedLead.email}</span>
                </div>
                {selectedLead.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{selectedLead.phone}</span>
                  </div>
                )}
                {selectedLead.company && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{selectedLead.company}</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg p-3 border border-border" style={{ background: 'hsl(var(--background))' }}>
                  <p className="text-[10px] text-muted-foreground uppercase">Source</p>
                  <p className="text-xs font-semibold text-foreground mt-0.5">{selectedLead.source}</p>
                </div>
                <div className="rounded-lg p-3 border border-border" style={{ background: 'hsl(var(--background))' }}>
                  <p className="text-[10px] text-muted-foreground uppercase">Value</p>
                  <p className="text-xs font-semibold text-green-400 mt-0.5">{selectedLead.value ? `$${selectedLead.value.toLocaleString()}` : '—'}</p>
                </div>
                <div className="rounded-lg p-3 border border-border" style={{ background: 'hsl(var(--background))' }}>
                  <p className="text-[10px] text-muted-foreground uppercase">Created</p>
                  <p className="text-xs font-semibold text-foreground mt-0.5">{formatRelativeTime(selectedLead.created_at)}</p>
                </div>
                <div className="rounded-lg p-3 border border-border" style={{ background: 'hsl(var(--background))' }}>
                  <p className="text-[10px] text-muted-foreground uppercase">Last Contact</p>
                  <p className="text-xs font-semibold text-foreground mt-0.5">{selectedLead.last_contact ? formatRelativeTime(selectedLead.last_contact) : '—'}</p>
                </div>
              </div>
              <button className="w-full py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground">
                View Full Contact
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-border p-10 flex flex-col items-center justify-center text-center" style={{ background: 'hsl(var(--card))' }}>
              <Users className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Select a lead to see details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
