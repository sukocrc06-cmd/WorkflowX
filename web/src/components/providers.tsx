'use client';
import * as React from 'react';
import { ThemeProvider } from 'next-themes';
import { TooltipProvider } from '@/components/ui/tooltip';

export const ACCENTS = [
  ['indigo', 'Çivit', '#5b5bd6'], ['violet', 'Mor', '#7c3aed'], ['blue', 'Mavi', '#2563eb'], ['teal', 'Deniz', '#0f766e'],
  ['green', 'Yeşil', '#15803d'], ['orange', 'Turuncu', '#c2410c'], ['rose', 'Gül', '#d61f4c'], ['graphite', 'Grafit', '#3f414b'],
] as const;
export type Accent = (typeof ACCENTS)[number][0];
const ACCENT_KEY = 'workflowx.accent';
const isAccent = (v: unknown): v is Accent => ACCENTS.some(([k]) => k === v);

/* Applied before paint (see layout.tsx) so the chosen accent never flashes. */
export const accentBootScript = `try{var a=localStorage.getItem('${ACCENT_KEY}');if(${JSON.stringify(ACCENTS.map(a => a[0]))}.indexOf(a)>-1)document.documentElement.dataset.accent=a}catch(e){}`;

const AccentCtx = React.createContext<{ accent: Accent; setAccent: (a: Accent) => void }>({ accent: 'indigo', setAccent: () => {} });
export const useAccent = () => React.useContext(AccentCtx);

/** One-shot colour cross-fade when theme or accent changes (skipped with reduced motion). */
export function themeFade() {
  if (typeof window === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const r = document.documentElement; r.classList.add('theming');
  window.clearTimeout((themeFade as unknown as { t?: number }).t);
  (themeFade as unknown as { t?: number }).t = window.setTimeout(() => r.classList.remove('theming'), 450);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = React.useState<Accent>('indigo');
  React.useEffect(() => { try { const a = localStorage.getItem(ACCENT_KEY); if (isAccent(a)) setAccentState(a) } catch { /* storage blocked */ } }, []);
  const setAccent = React.useCallback((a: Accent) => {
    if (!isAccent(a)) return; themeFade(); setAccentState(a); document.documentElement.dataset.accent = a;
    try { localStorage.setItem(ACCENT_KEY, a) } catch { /* storage blocked */ }
  }, []);
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AccentCtx.Provider value={{ accent, setAccent }}>
        <TooltipProvider>{children}</TooltipProvider>
      </AccentCtx.Provider>
    </ThemeProvider>
  );
}
