'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { setAuthCookie } from '@/lib/auth';
import { DEMO_USERNAME, DEMO_PASSWORD, DEV_PERSONAS } from '@/lib/demo';
import { getSsoLoginUrl } from '@/lib/auth-config';
import { KeyRound } from 'lucide-react';

// Demo login stores a fake JWT-shaped token and a demo user object so that
// isDemoUser() returns true and all screens use mock data — no API needed.
function loginAsDemo() {
  const demoUser = {
    id: 0,
    username: DEMO_USERNAME,
    email: 'demo@ubi-platform.example',
    roles: ['subscriber'],
    status: 'active',
    kyc_verified: false,
  };
  localStorage.setItem('ubi_token', 'demo-token');
  localStorage.setItem('ubi_user', JSON.stringify(demoUser));
  setAuthCookie();
}

export default function LoginPage() {
  const router = useRouter();
  const ssoUrl = getSsoLoginUrl();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [personaLoading, setPersonaLoading] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.login(form.username, form.password);
      setAuthCookie();
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoLogin() {
    setDemoLoading(true);
    setError('');
    // Try real API first (a "demo" account may exist in the DB)
    try {
      await api.login(DEMO_USERNAME, DEMO_PASSWORD);
    } catch {
      // Fall back to client-only demo mode
      loginAsDemo();
    }
    router.push('/dashboard');
  }

  async function loginAsPersona(username: string, password: string, key: string) {
    setPersonaLoading(key);
    setError('');
    try {
      await api.login(username, password);
      setAuthCookie();
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setPersonaLoading(null);
    }
  }

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center p-4 py-10">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 mb-4">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3a3 3 0 110 6 3 3 0 010-6zm0 14.2a7.2 7.2 0 01-6-3.22c.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08a7.2 7.2 0 01-6 3.22z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">UBI Platform</h1>
          <p className="text-gray-400 mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-2xl p-8 border border-gray-800 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Enter your username"
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading || demoLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          {ssoUrl ? (
            <a
              href={ssoUrl}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-violet-500/40 bg-violet-500/10 py-3 px-6 text-sm font-semibold text-violet-200 transition-colors hover:bg-violet-500/20"
            >
              <KeyRound className="h-4 w-4" />
              Continue with SSO
            </a>
          ) : (
            <Link
              href="/auth/sso"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-700 py-3 px-6 text-sm font-semibold text-gray-400 transition-colors hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-200"
            >
              <KeyRound className="h-4 w-4" />
              Continue with SSO
            </Link>
          )}

          {/* Demo Login Button */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-gray-900 px-3 text-gray-500">or</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading || demoLoading}
            className="w-full flex items-center justify-center gap-2 border border-yellow-500/40 hover:border-yellow-400/60 bg-yellow-500/10 hover:bg-yellow-500/15 text-yellow-300 hover:text-yellow-200 font-semibold py-3 px-6 rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {demoLoading ? (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {demoLoading ? 'Loading demo…' : 'Try Demo (no account needed)'}
          </button>

          <p className="text-center text-gray-400 text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="text-blue-400 hover:text-blue-300">
              Register
            </Link>
          </p>
        </form>

          <div className="mt-6 space-y-2">
            <p className="text-center text-gray-500 text-xs font-medium uppercase tracking-wider">Dev personas (API)</p>
            <div className="flex flex-wrap justify-center gap-2">
              {DEV_PERSONAS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  title={p.hint}
                  disabled={loading || demoLoading || !!personaLoading}
                  onClick={() => loginAsPersona(p.username, p.password, p.id)}
                  className="text-[11px] px-2.5 py-1.5 rounded-lg border border-gray-700 bg-gray-800/80 text-gray-300 hover:border-blue-500/50 hover:text-white transition-colors disabled:opacity-50"
                >
                  {personaLoading === p.id ? '…' : p.label}
                </button>
              ))}
            </div>
            <p className="text-center text-gray-600 text-[11px]">
              Uses seeded users from <code className="text-gray-500">api/dev-seed.sql</code> + <code className="text-gray-500">dev-patch.sql</code>.
            </p>
          </div>

          <p className="text-center text-gray-600 text-xs mt-4">
          Demo account can use simulated data when the API is offline.
        </p>
      </div>
    </div>
  );
}
