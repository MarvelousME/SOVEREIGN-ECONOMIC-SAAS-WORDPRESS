import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_THEME } from '@/themes/themes';

interface ThemeState {
  currentTheme: string;
  runtimeThemeOverride: Record<string, string>;
  setTheme: (id: string) => void;
  setRuntimeThemeOverride: (vars: Record<string, string>) => void;
  clearRuntimeThemeOverride: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      currentTheme: DEFAULT_THEME,
      runtimeThemeOverride: {},
      setTheme: (id) => set({ currentTheme: id }),
      setRuntimeThemeOverride: (vars) => set({ runtimeThemeOverride: vars }),
      clearRuntimeThemeOverride: () => set({ runtimeThemeOverride: {} }),
    }),
    { name: 'ubi-theme' }
  )
);
