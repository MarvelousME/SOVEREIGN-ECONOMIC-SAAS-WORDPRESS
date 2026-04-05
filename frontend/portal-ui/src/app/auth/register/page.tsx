'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { KeyRound } from 'lucide-react';
import api from '@/lib/api';
import { getSsoLoginUrl } from '@/lib/auth-config';

export default function RegisterPage() {
  const router = useRouter();
  const ssoUrl = getSsoLoginUrl();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    const newErrors: string[] = [];
    if (form.username.length < 3) newErrors.push('Username must be at least 3 characters');
    if (!/^[a-zA-Z0-9_]+$/.test(form.username))
      newErrors.push('Username: letters, numbers, underscores only');
    if (form.password.length < 12) newErrors.push('Password must be at least 12 characters');
    if (!/[A-Z]/.test(form.password)) newErrors.push('Password must contain an uppercase letter');
    if (!/[0-9]/.test(form.password)) newErrors.push('Password must contain a number');
    if (!/[@$!%*?&]/.test(form.password))
      newErrors.push('Password must contain a special character (@$!%*?&)');
    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      await api.register(form.username, form.email, form.password);
      router.push('/dashboard');
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Registration failed']);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center p-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Create Account</h1>
          <p className="text-gray-400 mt-2">Join the UBI Platform</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-gray-900 rounded-2xl p-8 border border-gray-800 space-y-5"
        >
          {errors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 space-y-1">
              {errors.map((e, i) => (
                <p key={i} className="text-red-400 text-sm">
                  {e}
                </p>
              ))}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="your_username"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Min 12 chars, upper, number, special"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Min 12 characters with uppercase, number, and special character
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>

          {ssoUrl ? (
            <a
              href={ssoUrl}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-violet-500/40 bg-violet-500/10 py-3 px-6 text-sm font-semibold text-violet-200 transition-colors hover:bg-violet-500/20"
            >
              <KeyRound className="h-4 w-4" />
              Register with SSO
            </a>
          ) : (
            <Link
              href="/auth/sso"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-700 py-3 px-6 text-sm font-semibold text-gray-400 transition-colors hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-200"
            >
              <KeyRound className="h-4 w-4" />
              Register with SSO
            </Link>
          )}

          <p className="text-center text-gray-400 text-sm">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-blue-400 hover:text-blue-300">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
