'use client';

import { User } from './api';

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('ubi_user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('ubi_token');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function isAdmin(user: User | null): boolean {
  return user?.roles?.includes('admin') ?? false;
}

export function isModerator(user: User | null): boolean {
  return user?.roles?.includes('moderator') ?? false;
}

export function isDeveloper(user: User | null): boolean {
  return user?.roles?.includes('developer') ?? false;
}

export function canManageTasks(user: User | null): boolean {
  return isAdmin(user) || isModerator(user);
}

export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('ubi_token');
  localStorage.removeItem('ubi_user');
}

/** Set the ubi-auth cookie so Next.js middleware lets authenticated requests through. */
export function setAuthCookie(): void {
  if (typeof window === 'undefined') return;
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `ubi-auth=1; path=/; expires=${expires}; SameSite=Lax`;
}

/** Clear the ubi-auth cookie (call on logout). */
export function clearAuthCookie(): void {
  if (typeof window === 'undefined') return;
  document.cookie = 'ubi-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}
