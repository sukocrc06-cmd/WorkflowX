import type { Metadata } from 'next';
import { CheckIcon } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { ProgressRing } from '@/components/app/progress-ring';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ROADMAP, percent, statusOf, type RoadmapStatus } from '@/features/roadmap/data';
import { authEnabled } from '@/lib/supabase/env';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Yol Haritası' };
const LABEL: Record<RoadmapStatus, string> = { done: 'Tamamlandı', proto: 'Prototipte var', todo: 'Başlanmadı' };

export default function Roadmap() {
  const all = ROADMAP.flatMap(p => p.items), cnt = (s: RoadmapStatus) => all.filter(i => statusOf(i, authEnabled) === s).length;
  const allPct = percent(all, authEnabled);
  return (
    <>
      <PageHeader title="Yol Haritası" description="WorkFlowX'in geliştirme ilerlemesi. “Prototipte var” = index.html'de çalışıyor, bu uygulamaya henüz taşınmadı (yarım puan)." />
      <Card className="mb-4 p-5 motion-safe:animate-rise">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p><span className="text-[40px] leading-none font-semibold tracking-[-0.04em] tabular-nums">%{allPct}</span> <span className="text-muted-foreground">genel ilerleme</span></p>
          <ul className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-success" />{LABEL.done} · {cnt('done')}</li>
            <li className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-warning" />{LABEL.proto} · {cnt('proto')}</li>
            <li className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-border-strong" />{LABEL.todo} · {cnt('todo')}</li>
          </ul>
        </div>
        <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${LABEL.done} ${cnt('done')}, ${LABEL.proto} ${cnt('proto')}, ${LABEL.todo} ${cnt('todo')}`}>
          <i className="bg-success" style={{ width: `${(cnt('done') / all.length) * 100}%` }} /><i className="bg-warning" style={{ width: `${(cnt('proto') / all.length) * 100}%` }} />
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        {ROADMAP.map((p, idx) => { const pc = percent(p.items, authEnabled); return (
          <Card key={p.n} id={`faz-${p.n}`} style={{ animationDelay: `${idx * 35}ms` }}
            className={cn('p-5 motion-safe:animate-rise', p.now && 'border-[color-mix(in_oklab,var(--primary)_45%,var(--border))] shadow-[0_0_0_3px_var(--brand-glow)]')}>
            <div className="flex items-center gap-3">
              <div className="relative shrink-0"><ProgressRing value={pc / 100} label={`Faz ${p.n} ilerlemesi`} className="size-11" stroke={8} /><b className="absolute inset-0 grid place-items-center text-[10.5px] tabular-nums">%{pc}</b></div>
              <h2 className="flex min-w-0 flex-wrap items-center gap-2 text-[15px] font-semibold"><span className="font-serif text-muted-foreground italic">Faz {p.n}</span>{p.tr}
                <Badge variant={p.v === 'MVP' ? 'solid' : 'default'}>{p.v}</Badge>{p.now && <Badge variant="brand">Şu an</Badge>}</h2>
            </div>
            <ul className="mt-3 divide-y">
              {p.items.map(i => { const s = statusOf(i, authEnabled); return (
                <li key={i.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <span aria-hidden="true" className={cn('grid size-[18px] shrink-0 place-items-center rounded-full border-[1.5px]', s === 'done' && 'border-success bg-success text-white', s === 'proto' && 'border-warning bg-[linear-gradient(90deg,var(--warning)_50%,transparent_50%)]', s === 'todo' && 'border-border-strong')}>{s === 'done' && <CheckIcon className="size-3" strokeWidth={3} />}</span>
                  <span className="flex-1">{i.tr}</span><span className="text-xs whitespace-nowrap text-muted-foreground">{LABEL[s]}</span>
                </li>); })}
            </ul>
          </Card>); })}
      </div>
    </>
  );
}
