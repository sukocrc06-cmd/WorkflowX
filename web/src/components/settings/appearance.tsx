'use client';
import * as React from 'react';
import { useTheme } from 'next-themes';
import { MonitorIcon, MoonIcon, SunIcon, CheckIcon } from 'lucide-react';
import { ACCENTS, useAccent, themeFade, type Accent } from '@/components/providers';
import { cn } from '@/lib/utils';

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const { accent, setAccent } = useAccent();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const opts = [['system', 'Sistem', MonitorIcon], ['light', 'Aydınlık', SunIcon], ['dark', 'Karanlık', MoonIcon]] as const;
  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-2 text-[13px] font-medium text-muted-foreground">Tema</legend>
        <div className="grid grid-cols-3 gap-2 sm:max-w-md">
          {opts.map(([v, l, Icon]) => { const on = mounted && (theme ?? 'system') === v; return (
            <label key={v} className={cn('relative flex cursor-pointer flex-col items-center gap-2 rounded-xl border bg-card p-3 text-sm font-medium shadow-soft transition-[border-color,box-shadow,transform] hover:-translate-y-px has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/40', on && 'border-primary shadow-[0_0_0_3px_var(--brand-glow)]')}>
              <input type="radio" name="theme" value={v} checked={on} onChange={() => { themeFade(); setTheme(v) }} className="sr-only" />
              <Icon className={cn('size-5 text-muted-foreground', on && 'text-primary')} aria-hidden="true" />{l}
            </label>); })}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-[13px] font-medium text-muted-foreground">Vurgu rengi</legend>
        <div className="flex flex-wrap gap-3">
          {ACCENTS.map(([k, l, hex]) => { const on = accent === k; return (
            <label key={k} className="flex cursor-pointer flex-col items-center gap-1.5 text-[11.5px] text-muted-foreground has-[:focus-visible]:[&>span]:outline-2 has-[:focus-visible]:[&>span]:outline-offset-4 has-[:focus-visible]:[&>span]:outline-foreground">
              <input type="radio" name="accent" value={k} checked={on} onChange={() => setAccent(k as Accent)} className="sr-only" />
              <span className={cn('grid size-9 place-items-center rounded-full text-white shadow-[inset_0_-6px_12px_rgb(0_0_0/.18)] transition-transform duration-300 ease-[var(--ease-spring)] hover:scale-110', on && 'ring-2 ring-foreground ring-offset-[3px] ring-offset-card')} style={{ background: hex }}>{on && <CheckIcon className="size-4" aria-hidden="true" />}</span>
              <span className={cn(on && 'font-semibold text-foreground')}>{l}</span>
            </label>); })}
        </div>
      </fieldset>
      <p className="text-xs text-muted-foreground">Değişiklikler hemen uygulanır ve bu cihazda hatırlanır. Hareket azaltma tercihin işletim sisteminden okunur.</p>
    </div>
  );
}
