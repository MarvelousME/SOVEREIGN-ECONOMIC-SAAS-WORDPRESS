'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ClipboardList, Search, RefreshCw, CheckCircle2, XCircle,
  Clock, Users, TrendingUp, Filter,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import { cn, formatRelativeTime } from '@/lib/utils';
import api, { Task, PaginatedResponse } from '@/lib/api';
import { isDemoUser, DEMO_TASKS } from '@/lib/demo';
import { useHydratedDemoUser } from '@/hooks/use-hydrated-demo-user';
import { getStoredUser, canManageTasks, isAdmin } from '@/lib/auth';

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: 'bg-green-500/15 text-green-400 border-green-500/30',
  medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  hard: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  expert: 'bg-red-500/15 text-red-400 border-red-500/30',
};

const CATEGORIES = ['All', 'Moderation', 'Translation', 'Data', 'Security', 'Design', 'Writing', 'Development', 'Research'];

export default function TasksPage() {
  const demoUi = useHydratedDemoUser();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [difficulty, setDifficulty] = useState('all');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [applying, setApplying] = useState<number | null>(null);
  const [applyMsg, setApplyMsg] = useState<{ id: number; text: string; ok: boolean } | null>(null);

  const user = typeof window !== 'undefined' ? getStoredUser() : null;
  const taskAdmin = !!(user && canManageTasks(user) && !isDemoUser());

  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    category: 'content',
    difficulty: 'medium',
    reward_amount: 50,
    max_participants: 10,
  });
  const [creating, setCreating] = useState(false);
  const [adminMsg, setAdminMsg] = useState('');

  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [savingAdmin, setSavingAdmin] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const demo = isDemoUser();
    try {
      if (demo) {
        setTasks(DEMO_TASKS);
      } else {
        const filters = {
          status: 'active',
          ...(category !== 'All' && { category }),
          ...(difficulty !== 'all' && { difficulty }),
        };
        const res: PaginatedResponse<Task> = await api.getTasks(filters, 1, 50);
        setTasks(res.data);
      }
    } catch {
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [category, difficulty]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let r = [...tasks];
    if (search) r = r.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase()));
    if (isDemoUser()) {
      if (category !== 'All') r = r.filter((t) => t.category === category);
      if (difficulty !== 'all') r = r.filter((t) => t.difficulty === difficulty);
    }
    return r;
  }, [tasks, search, category, difficulty]);

  const selected = tasks.find((t) => t.id === selectedId) ?? null;

  useEffect(() => {
    if (selected) {
      setEditTitle(selected.title);
      setEditDescription(selected.description);
      setEditStatus(selected.status);
    }
  }, [selected]);

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.title.trim() || !createForm.description.trim()) return;
    setCreating(true);
    setAdminMsg('');
    try {
      await api.createTask({
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        category: createForm.category,
        difficulty: createForm.difficulty,
        reward_amount: createForm.reward_amount,
        max_participants: createForm.max_participants,
      });
      setCreateForm((f) => ({ ...f, title: '', description: '' }));
      setAdminMsg('Task created.');
      await load();
    } catch (err) {
      setAdminMsg(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveTask() {
    if (!selected) return;
    setSavingAdmin(true);
    setAdminMsg('');
    try {
      await api.updateTask(selected.id, {
        title: editTitle,
        description: editDescription,
        status: editStatus,
      });
      setAdminMsg('Task updated.');
      await load();
    } catch (err) {
      setAdminMsg(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSavingAdmin(false);
    }
  }

  async function handleDeleteTask() {
    if (!selected || !isAdmin(user)) return;
    if (!window.confirm('Delete this task permanently?')) return;
    setSavingAdmin(true);
    setAdminMsg('');
    try {
      await api.deleteTask(selected.id);
      setSelectedId(null);
      setAdminMsg('Task deleted.');
      await load();
    } catch (err) {
      setAdminMsg(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setSavingAdmin(false);
    }
  }

  async function handleApply(task: Task) {
    if (applying === task.id) return;
    setApplyMsg(null);
    setApplying(task.id);
    if (isDemoUser()) {
      await new Promise((r) => setTimeout(r, 700));
      setApplyMsg({ id: task.id, text: 'Applied successfully! (demo mode)', ok: true });
      setApplying(null);
      return;
    }
    try {
      const res = await api.assignTask(task.id);
      setApplyMsg({ id: task.id, text: res.message, ok: true });
      await load();
    } catch (e) {
      setApplyMsg({ id: task.id, text: e instanceof Error ? e.message : 'Failed to apply', ok: false });
    } finally {
      setApplying(null);
    }
  }

  const activeTasks = tasks.filter((t) => t.status === 'active').length;
  const totalReward = tasks.reduce((s, t) => s + t.reward_amount, 0);
  const spots = tasks.reduce((s, t) => s + (t.max_participants - t.current_participants), 0);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />
            Task Marketplace
            {demoUi && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">Demo</span>}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Complete tasks to earn UBI rewards. Find tasks that match your skills.</p>
        </div>
        <button onClick={load} disabled={loading} aria-label="Refresh" className="p-2 rounded-lg border border-border hover:bg-muted/40 text-muted-foreground transition-colors disabled:opacity-50">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      {error && <div className="rounded-lg px-4 py-3 text-sm bg-red-500/10 border border-red-500/30 text-red-400">{error}</div>}

      {taskAdmin && (
        <div className="rounded-xl border border-border p-4 space-y-3" style={{ background: 'hsl(var(--card))' }}>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            Task administration
            <span className="text-[10px] font-normal text-muted-foreground">(moderator / admin)</span>
          </h2>
          {adminMsg && <p className="text-xs text-primary">{adminMsg}</p>}
          <form onSubmit={handleCreateTask} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input
              placeholder="Title"
              value={createForm.title}
              onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-border bg-background text-sm sm:col-span-2"
            />
            <input
              type="number"
              placeholder="Reward UBI"
              value={createForm.reward_amount}
              onChange={(e) => setCreateForm((f) => ({ ...f, reward_amount: Number(e.target.value) || 0 }))}
              className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
            />
            <textarea
              placeholder="Description"
              value={createForm.description}
              onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-border bg-background text-sm min-h-[72px] sm:col-span-2 lg:col-span-3"
            />
            <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
              <select
                value={createForm.category}
                onChange={(e) => setCreateForm((f) => ({ ...f, category: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
              >
                {['content', 'translation', 'design', 'testing', 'development', 'Moderation', 'Translation', 'Data', 'Security', 'Writing'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={createForm.difficulty}
                onChange={(e) => setCreateForm((f) => ({ ...f, difficulty: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
              >
                {['easy', 'medium', 'hard', 'expert'].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                placeholder="Max participants"
                value={createForm.max_participants}
                onChange={(e) => setCreateForm((f) => ({ ...f, max_participants: Number(e.target.value) || 1 }))}
                className="px-3 py-2 rounded-lg border border-border bg-background text-sm w-36"
              />
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create task'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Tasks" value={activeTasks} icon={ClipboardList} accent="primary" glow sublabel="Available now" />
        <StatCard title="Total Reward Pool" value={`${totalReward.toLocaleString()} UBI`} icon={TrendingUp} accent="success" sublabel="Across all tasks" />
        <StatCard title="Open Spots" value={spots} icon={Users} accent="info" sublabel="Participation available" />
        <StatCard title="Categories" value={new Set(tasks.map((t) => t.category)).size} icon={Filter} accent="warning" sublabel="Task categories" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-border" style={{ background: 'hsl(var(--card))' }}>
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks…" className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none" />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border text-sm text-foreground outline-none"
          style={{ background: 'hsl(var(--card))' }}
        >
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border text-sm text-foreground outline-none"
          style={{ background: 'hsl(var(--card))' }}
        >
          <option value="all">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
          <option value="expert">Expert</option>
        </select>
      </div>

      {/* Content: list + detail panel */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Task list */}
        <div className="lg:col-span-3 rounded-xl border border-border overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Tasks</span>
            <span className="text-[11px] text-muted-foreground">{filtered.length} shown</span>
          </div>
          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground animate-pulse">Loading tasks…</div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No tasks match your filters.</div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((task) => (
                <div
                  key={task.id}
                  onClick={() => setSelectedId(task.id === selectedId ? null : task.id)}
                  className={cn('flex items-start gap-4 px-5 py-4 cursor-pointer transition-colors', selectedId === task.id ? 'bg-primary/5' : 'hover:bg-muted/20')}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{task.title}</span>
                      <span className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full border', DIFFICULTY_STYLES[task.difficulty])}>
                        {task.difficulty}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[11px] text-muted-foreground">{task.category}</span>
                      <span className="text-[11px] text-muted-foreground">{task.current_participants}/{task.max_participants} participants</span>
                      {task.deadline && <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {formatRelativeTime(task.deadline)}</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-green-400">{task.reward_amount} UBI</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="rounded-xl border border-border p-5 space-y-4 sticky top-4" style={{ background: 'hsl(var(--card))' }}>
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="text-sm font-bold text-foreground">{selected.title}</h3>
                  <span className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full border', DIFFICULTY_STYLES[selected.difficulty])}>
                    {selected.difficulty}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{selected.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Category', value: selected.category },
                  { label: 'Reward', value: `${selected.reward_amount} ${selected.reward_currency}` },
                  { label: 'Participants', value: `${selected.current_participants} / ${selected.max_participants}` },
                  { label: 'Posted', value: formatRelativeTime(selected.created_at) },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg p-3 border border-border" style={{ background: 'hsl(var(--background))' }}>
                    <p className="text-[10px] text-muted-foreground uppercase">{item.label}</p>
                    <p className="text-xs font-semibold text-foreground mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>
              {selected.proof_requirements && (
                <div className="rounded-lg p-3 border border-border" style={{ background: 'hsl(var(--background))' }}>
                  <p className="text-[10px] text-muted-foreground uppercase mb-1">Proof Required</p>
                  <p className="text-xs text-foreground">{selected.proof_requirements}</p>
                </div>
              )}
              {applyMsg?.id === selected.id && (
                <p className={cn('text-sm flex items-center gap-1.5', applyMsg.ok ? 'text-green-400' : 'text-red-400')}>
                  {applyMsg.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {applyMsg.text}
                </p>
              )}
              {taskAdmin && (
                <div className="rounded-lg border border-border p-3 space-y-2" style={{ background: 'hsl(var(--background))' }}>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Edit task</p>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-2 py-1.5 rounded border border-border bg-background text-xs"
                  />
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full px-2 py-1.5 rounded border border-border bg-background text-xs min-h-[60px]"
                  />
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-2 py-1.5 rounded border border-border bg-background text-xs"
                  >
                    <option value="active">active</option>
                    <option value="paused">paused</option>
                    <option value="completed">completed</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={savingAdmin}
                      onClick={handleSaveTask}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold bg-primary/90 text-primary-foreground"
                    >
                      Save changes
                    </button>
                    {isAdmin(user) && (
                      <button
                        type="button"
                        disabled={savingAdmin}
                        onClick={handleDeleteTask}
                        className="px-3 py-2 rounded-lg text-xs font-semibold border border-red-500/50 text-red-400"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )}
              <button
                onClick={() => handleApply(selected)}
                disabled={applying === selected.id || selected.current_participants >= selected.max_participants}
                className="w-full py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
              >
                {applying === selected.id ? <><RefreshCw className="w-4 h-4 animate-spin inline mr-1.5" /> Applying…</> :
                  selected.current_participants >= selected.max_participants ? 'Task Full' : 'Apply for This Task'}
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-border p-10 flex flex-col items-center justify-center text-center" style={{ background: 'hsl(var(--card))' }}>
              <ClipboardList className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Select a task to see details and apply.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
