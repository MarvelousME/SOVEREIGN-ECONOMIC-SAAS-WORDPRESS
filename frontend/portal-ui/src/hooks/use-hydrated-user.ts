'use client';

import { useState, useEffect } from 'react';
import { getStoredUser } from '@/lib/auth';
import type { User } from '@/lib/api';

export function useHydratedUser(): User | null {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    setUser(getStoredUser());
  }, []);
  return user;
}
