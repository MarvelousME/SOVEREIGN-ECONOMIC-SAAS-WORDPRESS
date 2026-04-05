'use client';

import { useState, useMemo } from 'react';
import {
  Users, Search, Plus, Filter, ChevronDown, ChevronUp,
  Eye, Edit, Ban, Trash2, UserCheck, RefreshCw, Download,
  ArrowUpDown, Crown, Shield, Briefcase, User,
  CheckCircle2, XCircle, Clock, Mail, Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';
import { useHydratedDemoUser } from '@/hooks/use-hydrated-demo-user';

// ── Mock data ──────────────────────────────────────────────────
type UserRole = 'owner' | 'admin' | 'employee' | 'client';
type UserStatus = 'active' | 'suspended' | 'pending' | 'banned';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  balance: number;
  tasks: number;
  reputation: number;
  joined: string;
  lastSeen: string;
  country: string;
}

const USERS: UserRecord[] = [
  { id: 'u001', name: 'Sarah Chen', email: 'sarah@example.com', role: 'client', status: 'active', balance: 340, tasks: 89, reputation: 4.9, joined: '2024-01-15', lastSeen: '2024-01-27T12:30:00Z', country: 'US' },
  { id: 'u002', name: 'Marcus Osei', email: 'marcus@nexus.io', role: 'employee', status: 'active', balance: 1240, tasks: 215, reputation: 4.7, joined: '2023-11-01', lastSeen: '2024-01-27T11:00:00Z', country: 'GH' },
  { id: 'u003', name: 'Priya Nair', email: 'priya@corp.com', role: 'client', status: 'suspended', balance: 0, tasks: 12, reputation: 2.1, joined: '2024-01-20', lastSeen: '2024-01-22T08:00:00Z', country: 'IN' },
  { id: 'u004', name: 'James Wolff', email: 'jwolff@agency.com', role: 'admin', status: 'active', balance: 5600, tasks: 0, reputation: 5.0, joined: '2023-06-01', lastSeen: '2024-01-27T13:00:00Z', country: 'DE' },
  { id: 'u005', name: 'Aiko Tanaka', email: 'aiko@platform.ai', role: 'client', status: 'pending', balance: 120, tasks: 3, reputation: 3.8, joined: '2024-01-24', lastSeen: '2024-01-24T16:00:00Z', country: 'JP' },
  { id: 'u006', name: 'Carlos Rivera', email: 'crivera@ubi.org', role: 'employee', status: 'active', balance: 920, tasks: 178, reputation: 4.5, joined: '2023-09-12', lastSeen: '2024-01-27T10:30:00Z', country: 'MX' },
  { id: 'u007', name: 'Amara Diallo', email: 'amara@sahel.net', role: 'client', status: 'active', balance: 780, tasks: 134, reputation: 4.8, joined: '2023-10-05', lastSeen: '2024-01-26T20:00:00Z', country: 'SN' },
  { id: 'u008', name: 'Finn Larsson', email: 'finn@nordic.se', role: 'client', status: 'active', balance: 2100, tasks: 302, reputation: 4.95, joined: '2023-07-18', lastSeen: '2024-01-27T09:00:00Z', country: 'SE' },
  { id: 'u009', name: 'Mei-Xia Li', email: 'mei@cloudwork.cn', role: 'employee', status: 'active', balance: 3400, tasks: 520, reputation: 4.85, joined: '2023-08-22', lastSeen: '2024-01-27T14:00:00Z', country: 'CN' },
  { id: 'u010', name: 'Owen Bryce', email: 'obryce@banned.com', role: 'client', status: 'banned', balance: 0, tasks: 7, reputation: 0.5, joined: '2024-01-10', lastSeen: '2024-01-18T07:00:00Z', country: 'AU' },
];

const ROLE_ICON: Record<UserRole, React.ElementType> = { owner: Crown, admin: Shield, employee: UserCheck, client: User };
const ROLE_STYLE: Record<UserRole, string> = {
  owner: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  admin: 'text-red-400 bg-red-400/10 border-red-400/20',
  employee: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  client: 'text-green-400 bg-green-400/10 border-green-400/20',
};
const STATUS_STYLE: Record<UserStatus, string> = {
  active: 'text-green-400 bg-green-400/10',
  suspended: 'text-yellow-400 bg-yellow-400/10',
  pending: 'text-blue-400 bg-blue-400/10',
  banned: 'text-red-400 bg-red-400/10',
};
const STATUS_ICON: Record<UserStatus, React.ElementType> = { active: CheckCircle2, suspended: Clock, pending: Clock, banned: XCircle };

type SortKey = 'name' | 'role' | 'status' | 'balance' | 'tasks' | 'reputation' | 'joined';

export default function UsersPage() {
  const demo = useHydratedDemoUser();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('joined');
  const [sortAsc, setSortAsc] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = [...USERS];
    if (search) result = result.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));
    if (roleFilter !== 'all') result = result.filter((u) => u.role === roleFilter);
    if (statusFilter !== 'all') result = result.filter((u) => u.status === statusFilter);
    result.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortAsc ? cmp : -cmp;
    });
    return result;
  }, [search, roleFilter, statusFilter, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(true); }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allSelected = filtered.length > 0 && filtered.every((u) => selected.has(u.id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((u) => u.id)));
  };

  const detail = USERS.find((u) => u.id === detailId);

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortAsc ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3 text-primary" />;
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />
            User Governance
            {demo && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">Demo</span>}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage, govern, and monitor all platform users.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
          >
            <Plus className="w-4 h-4" /> Add User
          </button>
        </div>
      </div>

      {/* Filters */}
      <div
        className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-border"
        style={{ background: 'hsl(var(--card))' }}
      >
        {/* Search */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-border" style={{ background: 'hsl(var(--muted))' }}>
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>

        {/* Role filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
          className="px-3 py-2 rounded-lg border border-border text-sm text-foreground outline-none cursor-pointer"
          style={{ background: 'hsl(var(--muted))' }}
        >
          <option value="all">All Roles</option>
          <option value="owner">Owner</option>
          <option value="admin">Admin</option>
          <option value="employee">Employee</option>
          <option value="client">Client</option>
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as UserStatus | 'all')}
          className="px-3 py-2 rounded-lg border border-border text-sm text-foreground outline-none cursor-pointer"
          style={{ background: 'hsl(var(--muted))' }}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
          <option value="banned">Banned</option>
        </select>

        <div className="ml-auto text-xs text-muted-foreground">
          {filtered.length} of {USERS.length} users
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl border animate-pulse-once"
          style={{ background: 'hsl(var(--primary)/0.1)', borderColor: 'hsl(var(--primary)/0.3)' }}
        >
          <span className="text-sm font-medium text-foreground">{selected.size} selected</span>
          <div className="flex items-center gap-2 ml-2">
            {[
              { icon: Mail, label: 'Message' },
              { icon: UserCheck, label: 'Promote' },
              { icon: Ban, label: 'Suspend' },
              { icon: Trash2, label: 'Delete', danger: true },
            ].map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.label}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                    a.danger ? 'text-destructive hover:bg-destructive/10' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" /> {a.label}
                </button>
              );
            })}
          </div>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors">
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'hsl(var(--muted))' }}>
                <th className="px-4 py-3 text-left w-10">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="cursor-pointer" />
                </th>
                {([
                  { key: 'name', label: 'User' },
                  { key: 'role', label: 'Role' },
                  { key: 'status', label: 'Status' },
                  { key: 'balance', label: 'Balance' },
                  { key: 'tasks', label: 'Tasks' },
                  { key: 'reputation', label: 'Rep.' },
                  { key: 'joined', label: 'Joined' },
                ] as { key: SortKey; label: string }[]).map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => toggleSort(col.key)}
                  >
                    <div className="flex items-center gap-1.5">
                      {col.label} <SortIcon k={col.key} />
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((u) => {
                const RoleIcon = ROLE_ICON[u.role];
                const StatusIcon = STATUS_ICON[u.status];
                const isSelected = selected.has(u.id);
                return (
                  <tr
                    key={u.id}
                    className={cn(
                      'hover:bg-muted/30 transition-colors',
                      isSelected && 'bg-primary/5',
                      detailId === u.id && 'bg-primary/8'
                    )}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(u.id)}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                          style={{ background: 'hsl(var(--primary)/0.15)', color: 'hsl(var(--primary))' }}
                        >
                          {u.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{u.name}</p>
                          <p className="text-[11px] text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border', ROLE_STYLE[u.role])}>
                        <RoleIcon className="w-2.5 h-2.5" /> {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full', STATUS_STYLE[u.status])}>
                        <StatusIcon className="w-2.5 h-2.5" /> {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-foreground">${u.balance.toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-foreground">{u.tasks}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold" style={{ color: u.reputation >= 4.5 ? '#10b981' : u.reputation >= 3 ? '#f59e0b' : '#ef4444' }}>
                        ★ {u.reputation.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(u.joined).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setDetailId(detailId === u.id ? null : u.id)} title="View detail" className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-primary transition-colors">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button title="Edit" className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-primary transition-colors">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button title="Suspend" className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Inline detail panel */}
        {detail && (
          <div
            className="border-t border-border p-5"
            style={{ background: 'hsl(var(--muted)/0.4)' }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-black flex-shrink-0"
                  style={{ background: 'hsl(var(--primary)/0.2)', color: 'hsl(var(--primary))' }}
                >
                  {detail.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <p className="font-bold text-foreground">{detail.name}</p>
                  <p className="text-sm text-muted-foreground">{detail.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Last seen: {formatRelativeTime(detail.lastSeen)} · 🌍 {detail.country}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 text-center">
                {[
                  { label: 'Balance', value: `$${detail.balance.toLocaleString()}` },
                  { label: 'Tasks', value: detail.tasks },
                  { label: 'Reputation', value: `★ ${detail.reputation}` },
                  { label: 'Status', value: detail.status },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">{stat.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-muted text-muted-foreground transition-colors">
                  Edit Role
                </button>
                <button
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{ background: 'hsl(var(--destructive))', color: 'hsl(var(--destructive-foreground))' }}
                >
                  {detail.status === 'active' ? 'Suspend' : 'Reactivate'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
