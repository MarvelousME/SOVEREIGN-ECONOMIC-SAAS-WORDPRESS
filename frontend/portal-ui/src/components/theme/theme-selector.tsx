'use client';

import { useState, useRef, useEffect } from 'react';
import { Palette, X, Check } from 'lucide-react';
import { themes } from '@/themes/themes';
import { useThemeStore } from '@/store/use-theme-store';
import { cn } from '@/lib/utils';

export function ThemeSelector() {
  const [open, setOpen] = useState(false);
  const { currentTheme, setTheme } = useThemeStore();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const active = themes.find((t) => t.id === currentTheme) ?? themes[0];

  return (
    <div ref={panelRef} className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3">
      {/* Theme panel */}
      <div
        className={cn(
          'transition-all duration-300 origin-bottom-right',
          open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-90 pointer-events-none'
        )}
      >
        <div
          className="w-[340px] rounded-2xl border border-border shadow-2xl overflow-hidden"
          style={{
            background: 'hsl(var(--card))',
            boxShadow: '0 0 40px hsl(var(--primary)/0.2), 0 20px 60px rgba(0,0,0,0.6)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} />
              <span className="text-sm font-semibold text-foreground tracking-wide">Theme Studio</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Current theme preview bar */}
          <div
            className="px-4 py-2 flex items-center gap-3 text-xs border-b border-border"
            style={{ background: 'hsl(var(--muted))' }}
          >
            <div
              className="w-5 h-5 rounded-full flex-shrink-0 ring-2 ring-primary"
              style={{ background: active.preview }}
            />
            <span className="text-muted-foreground">
              Active: <span className="text-foreground font-medium">{active.emoji} {active.name}</span>
            </span>
          </div>

          {/* Theme grid */}
          <div className="p-3 grid grid-cols-4 gap-2 max-h-[320px] overflow-y-auto thin-scrollbar">
            {themes.map((t) => {
              const isActive = t.id === currentTheme;
              return (
                <button
                  key={t.id}
                  title={t.description}
                  onClick={() => { setTheme(t.id); }}
                  className={cn(
                    'group flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-200',
                    'hover:scale-105 active:scale-95',
                    isActive ? 'ring-2 ring-primary bg-primary/10' : 'hover:bg-muted'
                  )}
                >
                  <div className="relative">
                    <div
                      className="w-10 h-10 rounded-full ring-1 ring-border shadow-md"
                      style={{ background: t.preview }}
                    />
                    {isActive && (
                      <div
                        className="absolute inset-0 flex items-center justify-center rounded-full"
                        style={{ background: 'rgba(0,0,0,0.45)' }}
                      >
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-[9.5px] text-center leading-tight truncate w-full',
                      isActive ? 'text-primary font-semibold' : 'text-muted-foreground'
                    )}
                  >
                    {t.emoji} {t.name}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="px-4 py-2 border-t border-border text-[10px] text-muted-foreground text-center">
            {themes.length} premium themes · Click to apply instantly
          </div>
        </div>
      </div>

      {/* FAB button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open theme selector"
        className={cn(
          'w-14 h-14 rounded-full flex items-center justify-center',
          'shadow-2xl transition-all duration-300',
          'hover:scale-110 active:scale-95',
          open ? 'rotate-45' : 'rotate-0'
        )}
        style={{
          background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
          boxShadow: '0 0 24px hsl(var(--primary)/0.6), 0 4px 20px rgba(0,0,0,0.4)',
          color: 'hsl(var(--primary-foreground))',
        }}
      >
        <Palette className="w-6 h-6" />
      </button>
    </div>
  );
}
