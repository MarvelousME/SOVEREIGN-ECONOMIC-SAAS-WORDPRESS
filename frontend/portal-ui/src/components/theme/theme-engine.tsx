'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/store/use-theme-store';
import { themes, DEFAULT_THEME } from '@/themes/themes';

export function ThemeEngine() {
  const { currentTheme } = useThemeStore();

  useEffect(() => {
    const theme = themes.find((t) => t.id === currentTheme) ?? themes.find((t) => t.id === DEFAULT_THEME)!;
    const root = document.documentElement;

    root.setAttribute('data-theme', theme.id);
    Object.entries(theme.vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Ensure dark/light class aligns with theme category
    if (theme.category === 'light') {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
  }, [currentTheme]);

  return null;
}
