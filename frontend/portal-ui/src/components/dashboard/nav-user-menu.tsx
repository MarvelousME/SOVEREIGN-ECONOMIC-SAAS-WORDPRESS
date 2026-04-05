'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, UserRound, ChevronDown } from 'lucide-react';
import type { User } from '@/lib/api';
import { cn, getInitials } from '@/lib/utils';

type NavUserMenuProps = {
  user: User | null | undefined;
  onSignOut: () => void | Promise<void>;
  className?: string;
};

/**
 * Top-right account dropdown: avatar, name, email, change profile, sign out.
 * Matches dashboard theme (card/popover, primary avatar, amber email accent).
 */
export function NavUserMenu({ user, onSignOut, className }: NavUserMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const displayName = user?.username ?? 'User';
  const email = user?.email ?? '';
  const initials = getInitials(displayName);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className={cn('relative flex-shrink-0', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open ? 'true' : 'false'}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-xl px-1.5 py-1 pr-2 hover:bg-muted/50 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
        >
          {initials}
        </div>
        <ChevronDown
          className={cn('w-4 h-4 text-muted-foreground hidden sm:block transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 top-12 w-64 rounded-xl border border-border shadow-2xl z-[60] overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          style={{ background: 'hsl(var(--popover))' }}
        >
          <div className="px-4 py-3 border-b border-border flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
              <p className="text-xs text-amber-400/90 truncate mt-0.5" title={email}>
                {email || '—'}
              </p>
            </div>
          </div>
          <div className="p-2">
            <Link
              href="/dashboard/profile"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <UserRound className="w-4 h-4 flex-shrink-0" />
              Change profile
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void onSignOut();
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-400/10 hover:text-red-300 transition-colors text-left"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
