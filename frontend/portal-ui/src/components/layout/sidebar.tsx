'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Activity, Users, BarChart3, Settings,
  ChevronLeft, ChevronRight, Shield, Zap, Briefcase,
  Bell, Database, Globe, Crown, UserCheck, CreditCard,
  FileText, Layers, Cpu, Network, Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  roles?: string[];
  section?: string;
}

const NAV: NavItem[] = [
  // ── Overview
  { href: '/dashboard/overview', label: 'Overview', icon: LayoutDashboard, section: 'Platform' },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3, section: 'Platform' },

  // ── Operations
  { href: '/dashboard/tasks', label: 'Tasks', icon: Zap, section: 'Operations' },
  { href: '/dashboard/treasury', label: 'Treasury', icon: CreditCard, section: 'Operations' },
  { href: '/dashboard/documents', label: 'Documents', icon: FileText, section: 'Operations' },

  // ── Monitoring (employees + admin + owner)
  { href: '/dashboard/monitoring', label: 'Live Monitor', icon: Activity, badge: 'LIVE', section: 'System', roles: ['admin', 'owner', 'employee'] },
  { href: '/dashboard/services', label: 'Services', icon: Layers, section: 'System', roles: ['admin', 'owner', 'employee'] },
  { href: '/dashboard/infrastructure', label: 'Infrastructure', icon: Cpu, section: 'System', roles: ['admin', 'owner'] },
  { href: '/dashboard/network', label: 'Network', icon: Network, section: 'System', roles: ['admin', 'owner'] },

  // ── Governance (admin + owner only)
  { href: '/dashboard/users', label: 'Users', icon: Users, section: 'Governance', roles: ['admin', 'owner'] },
  { href: '/dashboard/clients', label: 'Clients', icon: Briefcase, section: 'Governance', roles: ['admin', 'owner'] },
  { href: '/dashboard/employees', label: 'Employees', icon: UserCheck, section: 'Governance', roles: ['admin', 'owner'] },
  { href: '/dashboard/permissions', label: 'Permissions', icon: Lock, section: 'Governance', roles: ['admin', 'owner'] },
  { href: '/dashboard/audit', label: 'Audit Log', icon: Shield, section: 'Governance', roles: ['admin', 'owner'] },

  // ── GOD (owner only)
  { href: '/dashboard/god', label: 'God Mode', icon: Crown, section: 'Owner', roles: ['owner'] },
  { href: '/dashboard/god/database', label: 'Database Ops', icon: Database, section: 'Owner', roles: ['owner'] },
  { href: '/dashboard/god/integrations', label: 'Integrations', icon: Globe, section: 'Owner', roles: ['owner'] },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell, section: 'Owner', roles: ['owner'] },

  // ── Settings
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, section: 'Account' },
];

const SECTION_ORDER = ['Platform', 'Operations', 'System', 'Governance', 'Owner', 'Account'];

function groupBySection(items: NavItem[]) {
  const map = new Map<string, NavItem[]>();
  SECTION_ORDER.forEach((s) => map.set(s, []));
  items.forEach((item) => {
    const key = item.section ?? 'Account';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  });
  return map;
}

interface SidebarProps {
  userRole?: string;
}

export function Sidebar({ userRole = 'client' }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const visible = NAV.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(userRole);
  });

  const grouped = groupBySection(visible);

  return (
    <aside
      className={cn(
        'relative flex flex-col h-screen border-r border-border transition-all duration-300 z-40',
        collapsed ? 'w-16' : 'w-60'
      )}
      style={{ background: 'hsl(var(--card))' }}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-5 border-b border-border flex-shrink-0',
          collapsed && 'justify-center px-2'
        )}
      >
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
            color: 'hsl(var(--primary-foreground))',
            boxShadow: '0 0 14px hsl(var(--primary)/0.45)',
          }}
        >
          U
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-bold text-sm tracking-wider text-foreground leading-tight">UBI Portal</p>
            <p
              className="text-[10px] uppercase tracking-widest truncate"
              style={{ color: 'hsl(var(--primary))' }}
            >
              {userRole === 'owner' ? '⚡ God Mode' : userRole === 'admin' ? '🛡 Admin' : userRole === 'employee' ? '👤 Employee' : '🏢 Client'}
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 thin-scrollbar">
        {SECTION_ORDER.map((section) => {
          const items = grouped.get(section) ?? [];
          if (items.length === 0) return null;
          return (
            <div key={section} className="mb-1">
              {!collapsed && (
                <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                  {section}
                </p>
              )}
              {items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
                      'hover:bg-primary/10 hover:text-primary',
                      collapsed && 'justify-center px-2 mx-1',
                      active
                        ? 'text-primary-foreground font-semibold'
                        : 'text-muted-foreground'
                    )}
                    style={
                      active
                        ? {
                            background: 'hsl(var(--primary))',
                            boxShadow: '0 0 12px hsl(var(--primary)/0.4)',
                          }
                        : undefined
                    }
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon
                      className={cn('flex-shrink-0', collapsed ? 'w-5 h-5' : 'w-4 h-4')}
                    />
                    {!collapsed && (
                      <span className="flex-1 truncate">{item.label}</span>
                    )}
                    {!collapsed && item.badge && (
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse"
                        style={{
                          background: 'hsl(var(--destructive))',
                          color: 'hsl(var(--destructive-foreground))',
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
              {!collapsed && <div className="h-px bg-border mx-4 mt-1" />}
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className={cn(
          'absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full',
          'flex items-center justify-center border border-border',
          'text-muted-foreground hover:text-primary transition-colors z-50'
        )}
        style={{ background: 'hsl(var(--card))' }}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>
    </aside>
  );
}
