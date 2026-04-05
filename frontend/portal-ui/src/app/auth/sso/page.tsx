'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSsoLoginUrl } from '@/lib/auth-config';

export default function AuthSsoPage() {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    setUrl(getSsoLoginUrl());
  }, []);

  useEffect(() => {
    if (url) {
      window.location.href = url;
    }
  }, [url]);

  if (url) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
        <p className="text-gray-300">Redirecting to SSO…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center max-w-md mx-auto">
      <h1 className="text-xl font-semibold text-white mb-2">SSO not configured</h1>
      <p className="text-gray-400 text-sm mb-6">
        Set <code className="text-violet-300">NEXT_PUBLIC_SSO_LOGIN_URL</code> in the portal environment to your
        identity provider login URL (for example Keycloak or OAuth authorize URL). Rebuild the app after changing env.
      </p>
      <Link href="/auth/login" className="text-blue-400 hover:text-blue-300 text-sm font-medium">
        ← Back to login
      </Link>
    </div>
  );
}
