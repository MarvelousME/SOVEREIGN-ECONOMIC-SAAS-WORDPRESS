import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_THEME } from '@/themes/themes';

interface ThemeState {
  currentTheme: string;
  setTheme: (id: string) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      currentTheme: DEFAULT_THEME,
      setTheme: (id) => set({ currentTheme: id }),
    }),
    { name: 'ubi-theme' }
  )
);
