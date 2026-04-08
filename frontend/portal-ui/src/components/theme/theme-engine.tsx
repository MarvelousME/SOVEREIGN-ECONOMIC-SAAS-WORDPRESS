'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/store/use-theme-store';
import { themes, DEFAULT_THEME } from '@/themes/themes';
import { getStoredUser } from '@/lib/auth';
import { getWorkspaceBrandingRuntime } from '@/lib/workspace-social-api';

export function ThemeEngine() {
  const { currentTheme, runtimeThemeOverride, setTheme, setRuntimeThemeOverride, clearRuntimeThemeOverride } =
    useThemeStore();

  useEffect(() => {
    const user = getStoredUser() as ({ workspaceId?: string; workspace_id?: string } & Record<string, unknown>) | null;
    const workspaceId = user?.workspaceId || user?.workspace_id;

    if (!workspaceId) {
      clearRuntimeThemeOverride();
      return;
    }

    let cancelled = false;
    getWorkspaceBrandingRuntime(workspaceId)
      .then((binding) => {
        if (cancelled) return;
        if (binding.themeId) {
          setTheme(binding.themeId);
        }
        setRuntimeThemeOverride(binding.themeOverrides || {});
      })
      .catch(() => {
        if (cancelled) return;
        clearRuntimeThemeOverride();
      });

    return () => {
      cancelled = true;
    };
  }, [clearRuntimeThemeOverride, setRuntimeThemeOverride, setTheme]);

  useEffect(() => {
    const theme = themes.find((t) => t.id === currentTheme) ?? themes.find((t) => t.id === DEFAULT_THEME)!;
    const root = document.documentElement;

    root.setAttribute('data-theme', theme.id);
    const resolvedVars = { ...theme.vars, ...runtimeThemeOverride };
    Object.entries(resolvedVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Ensure dark/light class aligns with theme category
    if (theme.category === 'light') {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
  }, [currentTheme, runtimeThemeOverride]);

  return null;
}
