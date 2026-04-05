'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogIn, UserPlus, KeyRound } from 'lucide-react';
import { getSsoLoginUrl } from '@/lib/auth-config';
import { cn } from '@/lib/utils';

export function AuthShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ssoDirect = getSsoLoginUrl();

  const onLogin = pathname === '/auth/login';
  const onRegister = pathname === '/auth/register';

  return (
    <div className="min-h-screen flex flex-col bg-gray-950">
      <header className="sticky top-0 z-50 flex-shrink-0 border-b border-gray-800/80 bg-gray-950/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/auth/login"
            className="text-lg font-bold tracking-tight text-white hover:text-blue-400 transition-colors"
          >
            UBI Platform
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Account">
            <Link
              href="/auth/login"
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                onLogin
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white',
              )}
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Login</span>
            </Link>
            <Link
              href="/auth/register"
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                onRegister
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white',
              )}
            >
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Register</span>
            </Link>
            {ssoDirect ? (
              <a
                href={ssoDirect}
                className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-2 text-sm font-medium text-violet-200 hover:bg-violet-500/20 transition-colors"
              >
                <KeyRound className="h-4 w-4" />
                <span className="hidden sm:inline">SSO</span>
              </a>
            ) : (
              <Link
                href="/auth/sso"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-2 text-sm font-medium text-gray-400 hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-200 transition-colors"
                title="Configure NEXT_PUBLIC_SSO_LOGIN_URL for your IdP"
              >
                <KeyRound className="h-4 w-4" />
                <span className="hidden sm:inline">SSO</span>
              </Link>
            )}
          </nav>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
