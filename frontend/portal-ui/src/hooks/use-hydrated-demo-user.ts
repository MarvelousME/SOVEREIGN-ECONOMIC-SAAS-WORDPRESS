'use client';

import { useState, useEffect } from 'react';
import { isDemoUser } from '@/lib/demo';

/**
 * Mirrors isDemoUser() after mount only. Always false on SSR and on the first
 * client render so markup matches the server and hydration succeeds.
 */
export function useHydratedDemoUser(): boolean {
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    setDemo(isDemoUser());
  }, []);
  return demo;
}
