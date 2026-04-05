'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Users, BarChart3, Activity, Bot,
  Coins, ClipboardList, Wallet, Gift, ShieldAlert,
  ChevronLeft, Menu, Store, Bell, UserRound, FileCode2,
} from 'lucide-react';
import type { User } from '@/lib/api';
import { getStoredUser, isAuthenticated, clearAuth, clearAuthCookie } from '@/lib/auth';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useHydratedDemoUser } from '@/hooks/use-hydrated-demo-user';
import { NotificationBell } from '@/components/dashboard/notification-bell';
import { NavUserMenu } from '@/components/dashboard/nav-user-menu';

// ── Nav structure ──────────────────────────────────────────────
type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; roles?: string[] };

const NAV_GROUPS_BASE: { label: string; items: NavItem[] }[] = [
  {
    label: 'Core',
    items: [
      { href: '/dashboard/overview', label: 'Overview', icon: LayoutDashboard },
      { href: '/dashboard/profile', label: 'Profile', icon: UserRound },
      { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/dashboard/monitoring', label: 'Monitoring', icon: Activity },
      { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    label: 'Platform',
    items: [
      { href: '/dashboard/ubi', label: 'UBI Claims', icon: Coins },
      { href: '/dashboard/tasks', label: 'Task Market', icon: ClipboardList },
      { href: '/dashboard/treasury', label: 'Treasury', icon: Wallet },
      { href: '/dashboard/rewards', label: 'Rewards', icon: Gift },
      { href: '/dashboard/agents', label: 'Agents', icon: Bot },
      { href: '/dashboard/marketplace', label: 'Marketplace', icon: Store },
    ],
  },
  {
    label: 'Admin',
    items: [
      { href: '/dashboard/users', label: 'Users', icon: Users, roles: ['admin'] },
      { href: '/dashboard/env-files', label: 'Env files', icon: FileCode2, roles: ['admin'] },
      { href: '/dashboard/god', label: 'God Mode', icon: ShieldAlert, roles: ['admin'] },
    ],
  },
];

function navGroupsForUser(roles: string[] | undefined) {
  const r = roles ?? [];
  const privileged = r.includes('admin') || r.includes('moderator') || r.includes('developer');
  return NAV_GROUPS_BASE.map((g) => ({
    ...g,
    items: g.items.filter((item) => {
      if (item.href === '/dashboard/monitoring') return privileged;
      if (!item.roles) return true;
      return item.roles.some((role) => r.includes(role));
    }),
  })).filter((g) => g.items.length > 0);
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  /** null = not hydrated yet; avoids SSR vs client mismatch (localStorage only exists on client). */
  const [sessionUser, setSessionUser] = useState<User | null | undefined>(undefined);
  const demo = useHydratedDemoUser();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setSessionUser(getStoredUser());
    if (!isAuthenticated()) {
      router.push('/auth/login');
      return;
    }
    const token = typeof window !== 'undefined' ? localStorage.getItem('ubi_token') : null;
    if (token && token !== 'demo-token') {
      api
        .getMe()
        .then((u) => {
          localStorage.setItem('ubi_user', JSON.stringify(u));
          setSessionUser(u);
        })
        .catch(() => {});
    }
  }, [router]);

  const handleLogout = async () => {
    try {
      await api.logout();
    } finally {
      clearAuthCookie();
      clearAuth();
      router.push('/auth/login');
    }
  };

  const navGroups =
    sessionUser === undefined ? NAV_GROUPS_BASE : navGroupsForUser(sessionUser?.roles);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border flex-shrink-0">
        {!collapsed && (
          <div>
            <span className="text-base font-extrabold tracking-tight" style={{ color: 'hsl(var(--primary))' }}>UBI</span>
            <span className="text-base font-extrabold text-foreground ml-1">Platform</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1.5 rounded-lg hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors hidden lg:flex"
        >
          <ChevronLeft className={cn('w-4 h-4 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 mb-1.5">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-all',
                      active
                        ? 'text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40',
                      collapsed && 'justify-center px-2',
                    )}
                    style={active ? { background: 'hsl(var(--primary))' } : undefined}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="flex-shrink-0 border-t border-border p-2" aria-hidden="true" />
    </div>
  );

  return (
    <div className="min-h-screen flex" style={{ background: 'hsl(var(--background))' }}>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col border-r border-border flex-shrink-0 transition-all duration-200',
          collapsed ? 'w-16' : 'w-60',
        )}
        style={{ background: 'hsl(var(--card))' }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-50 w-60 flex flex-col border-r border-border" style={{ background: 'hsl(var(--card))' }}>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar — account + notifications on the right (all breakpoints) */}
        <header
          className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border px-4"
          style={{ background: 'hsl(var(--card))' }}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted/40 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="truncate text-sm font-bold" style={{ color: 'hsl(var(--primary))' }}>
              UBI Platform
              {sessionUser?.roles?.includes('admin') && (
                <span className="ml-2 text-[10px] font-semibold text-muted-foreground">· Admin</span>
              )}
              {sessionUser?.roles?.includes('moderator') && !sessionUser?.roles?.includes('admin') && (
                <span className="ml-2 text-[10px] font-semibold text-muted-foreground">· Moderator</span>
              )}
              {sessionUser?.roles?.includes('developer') &&
                !sessionUser?.roles?.includes('admin') &&
                !sessionUser?.roles?.includes('moderator') && (
                  <span className="ml-2 text-[10px] font-semibold text-muted-foreground">· Developer</span>
                )}
            </span>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
            <NotificationBell />
            <NavUserMenu user={sessionUser} onSignOut={handleLogout} />
          </div>
        </header>

        {demo && (
          <div className="flex items-center gap-2 px-6 py-2 text-xs font-medium text-yellow-400 border-b border-yellow-500/20" style={{ background: 'hsl(44 100% 50% / 0.06)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
            Demo mode — all data is simulated. No real transactions are made.
          </div>
        )}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
