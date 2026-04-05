'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Bell, Search, LogOut, ChevronRight, User, Crown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/utils';
import { getStoredUser, clearAuth, clearAuthCookie } from '@/lib/auth';

const BREADCRUMB_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  overview: 'Overview',
  analytics: 'Analytics',
  monitoring: 'Live Monitor',
  services: 'Services',
  infrastructure: 'Infrastructure',
  network: 'Network',
  users: 'Users',
  clients: 'Clients',
  employees: 'Employees',
  permissions: 'Permissions',
  audit: 'Audit Log',
  god: 'God Mode',
  database: 'Database Ops',
  integrations: 'Integrations',
  notifications: 'Notifications',
  settings: 'Settings',
  tasks: 'Tasks',
  treasury: 'Treasury',
  documents: 'Documents',
};

function Breadcrumbs() {
  const pathname = usePathname();
  const parts = pathname.split('/').filter(Boolean);
  return (
    <nav className="flex items-center gap-1 text-sm">
      {parts.map((part, i) => {
        const isLast = i === parts.length - 1;
        const label = BREADCRUMB_LABELS[part] ?? part.charAt(0).toUpperCase() + part.slice(1);
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
            <span className={cn(isLast ? 'text-foreground font-semibold' : 'text-muted-foreground')}>
              {label}
            </span>
          </span>
        );
      })}
    </nav>
  );
}

interface TopbarProps {
  userRole?: string;
}

export function Topbar({ userRole = 'client' }: TopbarProps) {
  const router = useRouter();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [userName, setUserName] = useState('User');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const stored = getStoredUser();
    if (stored) {
      setUserName(stored.username ?? 'User');
      setUserEmail(stored.email ?? '');
    }
  }, []);

  const initials = getInitials(userName);

  const handleSignOut = () => {
    clearAuthCookie();
    clearAuth();
    router.push('/auth/login');
  };

  const mockNotifications = [
    { id: 1, text: 'System health check completed', time: '2m ago', dot: 'bg-green-500' },
    { id: 2, text: 'New user registration: john@example.com', time: '8m ago', dot: 'bg-primary' },
    { id: 3, text: 'Treasury balance updated', time: '15m ago', dot: 'bg-accent' },
    { id: 4, text: 'UBI distribution scheduled', time: '1h ago', dot: 'bg-muted-foreground' },
  ];

  return (
    <header
      className="h-14 flex items-center justify-between px-5 border-b border-border flex-shrink-0 z-30"
      style={{ background: 'hsl(var(--card))' }}
    >
      {/* Breadcrumbs */}
      <Breadcrumbs />

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground cursor-pointer hover:border-primary/50 transition-colors"
          style={{ background: 'hsl(var(--muted))' }}
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-xs">Search… (⌘K)</span>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen((v) => !v); setUserOpen(false); }}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <Bell style={{ width: '1.1rem', height: '1.1rem' }} />
            <span
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full animate-pulse"
              style={{ background: 'hsl(var(--destructive))' }}
            />
          </button>

          {notifOpen && (
            <div
              className="absolute right-0 top-11 w-80 rounded-xl border border-border shadow-2xl z-50 overflow-hidden"
              style={{ background: 'hsl(var(--popover))' }}
            >
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Notifications</span>
                <button className="text-[11px] text-primary hover:underline">Clear all</button>
              </div>
              <div className="divide-y divide-border">
                {mockNotifications.map((n) => (
                  <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted transition-colors cursor-pointer">
                    <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', n.dot)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-snug">{n.text}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => { setUserOpen((v) => !v); setNotifOpen(false); }}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
                color: 'hsl(var(--primary-foreground))',
              }}
            >
              {initials}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-foreground leading-tight">{userName}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">
                {userRole === 'owner' ? '⚡ Owner' : userRole === 'admin' ? '🛡 Admin' : userRole === 'employee' ? 'Employee' : 'Client'}
              </p>
            </div>
          </button>

          {userOpen && (
            <div
              className="absolute right-0 top-11 w-56 rounded-xl border border-border shadow-2xl z-50 overflow-hidden"
              style={{ background: 'hsl(var(--popover))' }}
            >
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold text-foreground">{userName}</p>
                <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                {userRole === 'owner' && (
                  <div className="flex items-center gap-1 mt-1">
                    <Crown className="w-3 h-3" style={{ color: 'hsl(var(--primary))' }} />
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'hsl(var(--primary))' }}>
                      System Owner
                    </span>
                  </div>
                )}
              </div>
              <div className="p-2">
                <a href="/dashboard/settings" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <User className="w-4 h-4" /> Profile &amp; Settings
                </a>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
