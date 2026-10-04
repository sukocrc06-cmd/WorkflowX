'use client';
import * as React from 'react';
import { CheckIcon } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { ProgressRing } from '@/components/app/progress-ring';

const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum'];
const ROWS: [string, string, number[]][] = [['Müşteri sunumu', '3 sa · Cum 17:00', [1, 1, 1, 0, 0]], ['Frontend', '6 sa · Per', [1, 0, 1, 1, 0]], ['Test ve yayın', '4 sa · Cum', [0, 0, 0, 1, 1]], ['Toplantılar', 'takvimden', [2, 2, 0, 2, 0]]];

/** Animated product mock: plan cells pop in, the card tilts toward the pointer (off with reduced motion). */
export function HeroMock() {
  const ref = React.useRef<HTMLDivElement>(null);
  const onMove = (e: React.PointerEvent) => {
    const el = ref.current; if (!el || e.pointerType !== 'mouse' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(1100px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg) rotate(-1deg)`;
  };
  let k = 0;
  return (
    <div className="relative" aria-hidden="true" onPointerMove={onMove} onPointerLeave={() => { if (ref.current) ref.current.style.transform = '' }}>
      <div ref={ref} className="rounded-[20px] border bg-card p-5 shadow-pop transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] [transform:perspective(1100px)_rotateY(-4deg)_rotate(-1deg)]">
        <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground"><b className="text-sm text-foreground">Bu hafta</b><span>Önerilen plan · 13 sa</span></div>
        <div className="grid grid-cols-[120px_1fr] gap-3 text-[11px] tracking-[.06em] text-muted-foreground uppercase"><span>Görev</span><div className="grid grid-cols-5 gap-1.5 text-center">{DAYS.map(d => <span key={d}>{d}</span>)}</div></div>
        {ROWS.map(([t, s, cells]) => (
          <div key={t} className="grid grid-cols-[120px_1fr] items-center gap-3 border-b border-dashed py-2.5 last:border-0">
            <div className="text-[13px] font-semibold">{t}<small className="block font-normal text-muted-foreground">{s}</small></div>
            <div className="grid grid-cols-5 gap-1.5">{cells.map((v, i) => v === 1
              ? <span key={i} style={{ animationDelay: `${600 + (k++) * 90}ms` }} className="h-[26px] rounded-md border border-primary bg-[color-mix(in_oklab,var(--primary)_16%,var(--card))] motion-safe:animate-[pop_.5s_var(--ease-spring)_both]" />
              : <span key={i} className={v === 2 ? 'h-[26px] rounded-md bg-[repeating-linear-gradient(135deg,var(--border)_0_4px,var(--muted)_4px_8px)]' : 'h-[26px] rounded-md bg-muted'} />)}</div>
          </div>
        ))}
      </div>
      <div className="absolute -bottom-6 -left-4 flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-[12.5px] font-medium shadow-pop motion-safe:animate-[rise_.7s_var(--ease-spring)_1.5s_both] sm:-left-8">
        <span className="grid size-[22px] place-items-center rounded-md bg-success-soft text-success"><CheckIcon className="size-3.5" /></span>Plan önerisi hazır · onayını bekliyor
      </div>
      <div className="absolute -top-6 -right-2 flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-[12.5px] shadow-pop motion-safe:animate-[rise_.7s_var(--ease-spring)_1.9s_both] sm:-right-6">
        <ProgressRing value={0.72} label="" className="size-[30px]" stroke={8} /><span><b>%72</b> kapasite</span>
      </div>
      <div className="absolute right-5 -bottom-5 hidden -space-x-1.5 rounded-xl border bg-card px-2.5 py-1.5 shadow-pop motion-safe:animate-[rise_.7s_var(--ease-spring)_2.3s_both] sm:flex">
        {['Ayşe Yıldız', 'Mert Kaya', 'Selin Er'].map(n => <Avatar key={n} name={n} className="size-6 text-[9.5px] ring-2 ring-card" />)}
      </div>
    </div>
  );
}
