'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bot, Plus, RefreshCw, Play, Pause, CheckCircle2, Clock, Zap, AlertCircle } from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import { cn, formatRelativeTime } from '@/lib/utils';
import api from '@/lib/api';
import { isDemoUser } from '@/lib/demo';
import { useHydratedDemoUser } from '@/hooks/use-hydrated-demo-user';
import { getStoredUser } from '@/lib/auth';

interface AgentMission {
  id: string;
  name: string;
  description: string;
  agent_id: string;
  agent_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  started_at?: string;
  completed_at?: string;
  result?: string;
  approved: boolean;
  priority: 'low' | 'medium' | 'high';
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  running: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  completed: 'bg-green-500/15 text-green-400 border-green-500/30',
  failed: 'bg-red-500/15 text-red-400 border-red-500/30',
  cancelled: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
};

const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
  medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  high: 'bg-red-500/15 text-red-400 border-red-500/30',
};

const DEMO_MISSIONS: AgentMission[] = [
  { id: 'msn-001', name: 'Analyze Treasury Performance', description: 'Run comprehensive analysis of treasury yield strategies and generate risk report.', agent_id: 'agt-003', agent_name: 'TreasuryAnalyzer', status: 'completed', created_at: '2024-01-27T08:00:00Z', started_at: '2024-01-27T08:01:00Z', completed_at: '2024-01-27T08:03:00Z', result: 'Risk: LOW — yield 6.4%', approved: true, priority: 'high' },
  { id: 'msn-002', name: 'Review Auth Middleware', description: 'Security audit of authentication middleware for potential vulnerabilities.', agent_id: 'agt-004', agent_name: 'CodeReviewer', status: 'running', created_at: '2024-01-27T09:00:00Z', started_at: '2024-01-27T09:01:00Z', approved: true, priority: 'high' },
  { id: 'msn-003', name: 'Translate Policy Document', description: 'Translate the updated Terms of Service from English to Spanish.', agent_id: 'agt-002', agent_name: 'TranslateAgent', status: 'pending', created_at: '2024-01-27T10:00:00Z', approved: false, priority: 'medium' },
  { id: 'msn-004', name: 'Fraud Detection Scan', description: 'Scan recent user activity for suspicious patterns and flag anomalies.', agent_id: 'agt-005', agent_name: 'FraudDetector', status: 'pending', created_at: '2024-01-27T10:30:00Z', approved: false, priority: 'low' },
  { id: 'msn-005', name: 'Sentiment Analysis', description: 'Analyze recent user feedback and social media mentions for sentiment.', agent_id: 'agt-001', agent_name: 'SentimentBot', status: 'completed', created_at: '2024-01-26T14:00:00Z', started_at: '2024-01-26T14:01:00Z', completed_at: '2024-01-26T14:02:00Z', result: 'Positive: 73%, Neutral: 22%, Negative: 5%', approved: true, priority: 'low' },
];

const DEMO_AGENTS = [
  { id: 'agt-001', name: 'SentimentBot', capability: 'Data Analysis' },
  { id: 'agt-002', name: 'TranslateAgent', capability: 'Content' },
  { id: 'agt-003', name: 'TreasuryAnalyzer', capability: 'Finance' },
  { id: 'agt-004', name: 'CodeReviewer', capability: 'Code' },
  { id: 'agt-005', name: 'FraudDetector', capability: 'Security' },
];

export default function AgentsPage() {
  const demoUi = useHydratedDemoUser();
  const [missions, setMissions] = useState<AgentMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedMission, setSelectedMission] = useState<AgentMission | null>(null);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({ name: '', description: '', agent_id: '', priority: 'medium' });
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState('');

  const user = typeof window !== 'undefined' ? getStoredUser() : null;
  const canApprove = user?.roles?.includes('admin') || user?.roles?.includes('moderator');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (isDemoUser()) {
        setMissions(DEMO_MISSIONS);
      } else {
        const res = await api.request<{ data: AgentMission[] }>('GET', '/agent/missions');
        setMissions(res.data || []);
      }
    } catch {
      setError('Failed to load missions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreateMission(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.agent_id) return;
    setCreating(true);
    setCreateMsg('');
    try {
      if (isDemoUser()) {
        await new Promise((r) => setTimeout(r, 800));
        const newMission: AgentMission = {
          id: `msn-${Date.now()}`,
          name: createForm.name,
          description: createForm.description,
          agent_id: createForm.agent_id,
          agent_name: DEMO_AGENTS.find((a) => a.id === createForm.agent_id)?.name || createForm.agent_id,
          status: 'pending',
          created_at: new Date().toISOString(),
          approved: canApprove || false,
          priority: createForm.priority as 'low' | 'medium' | 'high',
        };
        setMissions((prev) => [newMission, ...prev]);
        setCreateMsg('Mission created successfully! (demo mode)');
      } else {
        await api.request('POST', '/agent/missions', createForm);
        setCreateMsg('Mission created successfully!');
        await load();
      }
      setCreateForm({ name: '', description: '', agent_id: '', priority: 'medium' });
    } catch (err) {
      setCreateMsg(err instanceof Error ? err.message : 'Failed to create mission');
    } finally {
      setCreating(false);
    }
  }

  async function handleApproveMission(id: string) {
    setRefreshing(id);
    try {
      if (isDemoUser()) {
        await new Promise((r) => setTimeout(r, 500));
        setMissions((prev) => prev.map((m) => m.id === id ? { ...m, approved: true } : m));
      } else {
        await api.request('POST', `/agent/missions/${id}/approve`);
        await load();
      }
    } finally {
      setRefreshing(null);
    }
  }

  async function handleStartMission(id: string) {
    setRefreshing(id);
    try {
      if (isDemoUser()) {
        await new Promise((r) => setTimeout(r, 600));
        setMissions((prev) => prev.map((m) => m.id === id ? { ...m, status: 'running', started_at: new Date().toISOString() } : m));
      } else {
        await api.request('POST', `/agent/missions/${id}/start`);
        await load();
      }
    } finally {
      setRefreshing(null);
    }
  }

  async function handleCancelMission(id: string) {
    if (!window.confirm('Cancel this mission?')) return;
    setRefreshing(id);
    try {
      if (isDemoUser()) {
        await new Promise((r) => setTimeout(r, 400));
        setMissions((prev) => prev.map((m) => m.id === id ? { ...m, status: 'cancelled' } : m));
      } else {
        await api.request('POST', `/agent/missions/${id}/cancel`);
        await load();
      }
    } finally {
      setRefreshing(null);
    }
  }

  const pendingMissions = missions.filter((m) => m.status === 'pending').length;
  const runningMissions = missions.filter((m) => m.status === 'running').length;
  const completedMissions = missions.filter((m) => m.status === 'completed').length;
  const approvalQueue = missions.filter((m) => !m.approved && m.status === 'pending').length;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Bot className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />
            Agent Control Plane
            {demoUi && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">Demo</span>}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Create and manage AI agent missions. Approve, run, and monitor agent tasks.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading} aria-label="Refresh" className="p-2 rounded-lg border border-border hover:bg-muted/40 text-muted-foreground transition-colors disabled:opacity-50">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
          <button onClick={() => setShowCreate(!showCreate)} className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors" style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>
            <Plus className="w-4 h-4" /> Create Mission
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg px-4 py-3 text-sm bg-red-500/10 border border-red-500/30 text-red-400">{error}</div>}

      {showCreate && (
        <div className="rounded-xl border border-border p-4 space-y-3" style={{ background: 'hsl(var(--card))' }}>
          <h2 className="text-sm font-bold text-foreground">Create New Mission</h2>
          {createMsg && <p className="text-xs text-primary">{createMsg}</p>}
          <form onSubmit={handleCreateMission} className="space-y-3">
            <input
              placeholder="Mission name"
              value={createForm.name}
              onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
              required
            />
            <textarea
              placeholder="Mission description"
              value={createForm.description}
              onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm min-h-[72px]"
            />
            <div className="flex flex-wrap gap-3">
              <select
                value={createForm.agent_id}
                onChange={(e) => setCreateForm((f) => ({ ...f, agent_id: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-border bg-background text-sm flex-1"
                required
              >
                <option value="">Select Agent</option>
                {DEMO_AGENTS.map((agent) => (
                  <option key={agent.id} value={agent.id}>{agent.name} ({agent.capability})</option>
                ))}
              </select>
              <select
                value={createForm.priority}
                onChange={(e) => setCreateForm((f) => ({ ...f, priority: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-border bg-background text-sm w-32"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={creating} className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-50">
                {creating ? 'Creating...' : 'Create Mission'}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg text-sm font-semibold border border-border text-muted-foreground hover:bg-muted/40">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Pending" value={pendingMissions} icon={Clock} accent="warning" sublabel="Awaiting execution" />
        <StatCard title="Running" value={runningMissions} icon={Zap} accent="info" sublabel="Active missions" />
        <StatCard title="Completed" value={completedMissions} icon={CheckCircle2} accent="success" sublabel="Finished successfully" />
        {canApprove && (
          <StatCard title="Approval Queue" value={approvalQueue} icon={AlertCircle} accent={approvalQueue > 0 ? 'danger' : 'success'} sublabel="Needs approval" />
        )}
      </div>

      {canApprove && approvalQueue > 0 && (
        <div className="rounded-xl border border-yellow-500/30 overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-yellow-500/5">
            <span className="text-sm font-semibold text-yellow-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Approval Queue
            </span>
            <span className="text-[11px] text-yellow-400">{approvalQueue} missions pending approval</span>
          </div>
          <div className="divide-y divide-border">
            {missions.filter((m) => !m.approved && m.status === 'pending').map((mission) => (
              <div key={mission.id} className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bot className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{mission.name}</p>
                    <p className="text-xs text-muted-foreground">{mission.agent_name} • {formatRelativeTime(mission.created_at)}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleApproveMission(mission.id)}
                  disabled={refreshing === mission.id}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground disabled:opacity-50"
                >
                  Approve
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 rounded-xl border border-border overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Missions</span>
            <span className="text-[11px] text-muted-foreground">{missions.length} missions</span>
          </div>
          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground animate-pulse">Loading missions...</div>
          ) : missions.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No missions yet. Create one to get started.</div>
          ) : (
            <div className="divide-y divide-border">
              {missions.map((mission) => (
                <div
                  key={mission.id}
                  onClick={() => setSelectedMission(mission.id === selectedMission?.id ? null : mission)}
                  className={cn('px-5 py-4 cursor-pointer transition-colors', mission.id === selectedMission?.id ? 'bg-primary/5' : 'hover:bg-muted/20')}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">{mission.name}</span>
                        <span className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full border', STATUS_STYLES[mission.status])}>
                          {mission.status}
                        </span>
                        <span className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full border', PRIORITY_STYLES[mission.priority])}>
                          {mission.priority}
                        </span>
                        {!mission.approved && <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full border bg-yellow-500/15 text-yellow-400 border-yellow-500/30">Pending Approval</span>}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{mission.description}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Bot className="w-3 h-3" /> {mission.agent_name}</span>
                        <span className="text-[11px] text-muted-foreground">{formatRelativeTime(mission.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {mission.status === 'pending' && mission.approved && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleStartMission(mission.id); }}
                          disabled={refreshing === mission.id}
                          className="p-1.5 rounded-lg bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors disabled:opacity-50"
                          aria-label="Start"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      {mission.status === 'running' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCancelMission(mission.id); }}
                          disabled={refreshing === mission.id}
                          className="p-1.5 rounded-lg bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25 transition-colors disabled:opacity-50"
                          aria-label="Pause"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {selectedMission ? (
            <div className="rounded-xl border border-border p-5 space-y-4 sticky top-4" style={{ background: 'hsl(var(--card))' }}>
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="text-sm font-bold text-foreground">{selectedMission.name}</h3>
                </div>
                <span className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full border', STATUS_STYLES[selectedMission.status])}>
                  {selectedMission.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{selectedMission.description}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg p-3 border border-border" style={{ background: 'hsl(var(--background))' }}>
                  <p className="text-[10px] text-muted-foreground uppercase">Agent</p>
                  <p className="text-xs font-semibold text-foreground mt-0.5">{selectedMission.agent_name}</p>
                </div>
                <div className="rounded-lg p-3 border border-border" style={{ background: 'hsl(var(--background))' }}>
                  <p className="text-[10px] text-muted-foreground uppercase">Priority</p>
                  <p className="text-xs font-semibold text-foreground mt-0.5 capitalize">{selectedMission.priority}</p>
                </div>
                <div className="rounded-lg p-3 border border-border" style={{ background: 'hsl(var(--background))' }}>
                  <p className="text-[10px] text-muted-foreground uppercase">Created</p>
                  <p className="text-xs font-semibold text-foreground mt-0.5">{formatRelativeTime(selectedMission.created_at)}</p>
                </div>
                <div className="rounded-lg p-3 border border-border" style={{ background: 'hsl(var(--background))' }}>
                  <p className="text-[10px] text-muted-foreground uppercase">Status</p>
                  <p className="text-xs font-semibold text-foreground mt-0.5">{selectedMission.approved ? 'Approved' : 'Pending Approval'}</p>
                </div>
              </div>
              {selectedMission.started_at && (
                <div className="rounded-lg p-3 border border-border" style={{ background: 'hsl(var(--background))' }}>
                  <p className="text-[10px] text-muted-foreground uppercase">Started</p>
                  <p className="text-xs font-semibold text-foreground mt-0.5">{formatRelativeTime(selectedMission.started_at)}</p>
                </div>
              )}
              {selectedMission.result && (
                <div className="rounded-lg p-3 border border-border" style={{ background: 'hsl(var(--background))' }}>
                  <p className="text-[10px] text-muted-foreground uppercase mb-1">Result</p>
                  <p className="text-xs text-foreground">{selectedMission.result}</p>
                </div>
              )}
              {selectedMission.completed_at && (
                <div className="rounded-lg p-3 border border-border" style={{ background: 'hsl(var(--background))' }}>
                  <p className="text-[10px] text-muted-foreground uppercase">Completed</p>
                  <p className="text-xs font-semibold text-foreground mt-0.5">{formatRelativeTime(selectedMission.completed_at)}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-border p-10 flex flex-col items-center justify-center text-center" style={{ background: 'hsl(var(--card))' }}>
              <Bot className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Select a mission to see details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
