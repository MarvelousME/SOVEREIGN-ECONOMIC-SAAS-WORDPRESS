import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED = [
  '/dashboard',
  '/ubi',
  '/tasks',
  '/treasury',
  '/agents',
  '/rewards',
  '/reputation',
  '/referrals',
  '/governance',
  '/vault',
  '/settings',
  '/notifications',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  );
  if (!isProtected) return NextResponse.next();

  // Check for our auth cookie (set by the login page after successful login).
  // If the cookie is absent we let the request through and rely on the
  // client-side guard in dashboard/layout.tsx to redirect — that guard
  // also handles localStorage tokens on first render.
  const authCookie = request.cookies.get('ubi-auth');
  if (authCookie?.value) return NextResponse.next();

  // No cookie → redirect to login
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/auth/login';
  loginUrl.search = '';
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/ubi/:path*',
    '/tasks/:path*',
    '/treasury/:path*',
    '/agents/:path*',
    '/rewards/:path*',
    '/reputation/:path*',
    '/referrals/:path*',
    '/governance/:path*',
    '/vault/:path*',
    '/settings/:path*',
    '/notifications/:path*',
  ],
};
